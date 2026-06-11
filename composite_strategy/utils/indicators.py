"""
indicators.py — 纯函数技术指标库
借鉴自参考方案二 (okx-trend-bot) 的 indicators.ts

核心设计原则（直接借鉴）：
  - 纯函数：无副作用，相同输入始终产生相同输出
  - 向量化：接受 list/ndarray，返回同长度结果
  - 易测试：无依赖注入，直接 assert 即可验证

本项目新增（相比参考方案）：
  - ATR（平均真实波幅）：海龟策略仓位计算必需
  - Bollinger Bands：价格行为信号必需
  - OBV（能量潮）：山寨做空策略必需
  - RSI：均值回归策略必需
  - ADX：趋势强度过滤必需
"""

from typing import NamedTuple
import numpy as np


# ─── EMA ─────────────────────────────────────────────────────────────────────

def calc_ema(closes: list[float], period: int) -> list[float]:
    """
    指数移动平均（EMA）— 借鉴自 indicators.ts calcEMA()
    使用相同的 k = 2/(period+1) 平滑系数。
    """
    if not closes:
        return []
    k = 2.0 / (period + 1)
    ema = [sum(closes[:period]) / min(period, len(closes))]
    for price in closes[1:]:
        ema.append(price * k + ema[-1] * (1 - k))
    return ema


# ─── MACD ─────────────────────────────────────────────────────────────────────

class MACDResult(NamedTuple):
    macd: float      # DIF = EMA_fast - EMA_slow
    signal: float    # DEA = EMA(DIF, signal_period)
    histogram: float # MACD 柱 = (DIF - DEA) * 2


def calc_macd(
    closes: list[float],
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9,
) -> list[MACDResult]:
    """
    MACD 指标 — 借鉴自 indicators.ts calcMACD()
    histogram = (macd - signal) * 2，与参考方案一致。
    """
    ema_fast = calc_ema(closes, fast_period)
    ema_slow = calc_ema(closes, slow_period)
    dif = [f - s for f, s in zip(ema_fast, ema_slow)]
    dea = calc_ema(dif, signal_period)
    return [
        MACDResult(macd=d, signal=s, histogram=(d - s) * 2)
        for d, s in zip(dif, dea)
    ]


def detect_macd_crossover(macd_series: list[MACDResult]) -> tuple[bool, bool]:
    """
    检测 MACD 金叉/死叉 — 借鉴自 strategy.ts 的信号检测逻辑
    返回 (turn_positive, turn_negative)
    """
    if len(macd_series) < 2:
        return False, False
    prev, cur = macd_series[-2], macd_series[-1]
    turn_positive = prev.histogram <= 0 and cur.histogram > 0
    turn_negative = prev.histogram >= 0 and cur.histogram < 0
    return turn_positive, turn_negative


# ─── EMA 金叉/死叉 ─────────────────────────────────────────────────────────────

def detect_ema_crossover(
    closes: list[float],
    fast_period: int = 12,
    slow_period: int = 26,
) -> tuple[bool, bool]:
    """
    EMA 金叉/死叉检测 — 借鉴自 strategy.ts analyze() 中的 emaCrossUp/emaCrossDown
    返回 (cross_up, cross_down)
    """
    ema_fast = calc_ema(closes, fast_period)
    ema_slow = calc_ema(closes, slow_period)
    if len(ema_fast) < 2:
        return False, False
    cross_up = ema_fast[-2] <= ema_slow[-2] and ema_fast[-1] > ema_slow[-1]
    cross_down = ema_fast[-2] >= ema_slow[-2] and ema_fast[-1] < ema_slow[-1]
    return cross_up, cross_down


# ─── ATR（本项目新增）────────────────────────────────────────────────────────

def calc_atr(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> list[float]:
    """
    平均真实波幅（ATR）— 海龟策略仓位计算核心指标
    True Range = max(H-L, |H-prev_C|, |L-prev_C|)
    """
    tr_list = []
    for i in range(len(closes)):
        if i == 0:
            tr_list.append(highs[i] - lows[i])
        else:
            tr = max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i - 1]),
                abs(lows[i] - closes[i - 1]),
            )
            tr_list.append(tr)
    return calc_ema(tr_list, period)


# ─── Bollinger Bands（本项目新增）────────────────────────────────────────────

class BBResult(NamedTuple):
    upper: float
    middle: float
    lower: float
    bandwidth: float  # (upper - lower) / middle


def calc_bollinger_bands(
    closes: list[float],
    period: int = 20,
    std_dev: float = 2.0,
) -> list[BBResult]:
    """
    布林带 — 价格行为信号（均值回归）
    """
    results = []
    for i in range(len(closes)):
        if i < period - 1:
            results.append(BBResult(upper=0, middle=0, lower=0, bandwidth=0))
            continue
        window = closes[i - period + 1 : i + 1]
        mid = sum(window) / period
        std = (sum((x - mid) ** 2 for x in window) / period) ** 0.5
        upper = mid + std_dev * std
        lower = mid - std_dev * std
        bw = (upper - lower) / mid if mid != 0 else 0
        results.append(BBResult(upper=upper, middle=mid, lower=lower, bandwidth=bw))
    return results


# ─── RSI（本项目新增）────────────────────────────────────────────────────────

def calc_rsi(closes: list[float], period: int = 14) -> list[float]:
    """
    相对强弱指数（RSI）— 均值回归策略入场信号
    """
    rsi = [50.0] * len(closes)
    if len(closes) < period + 1:
        return rsi
    gains, losses = [], []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    for i in range(period, len(closes)):
        if avg_loss == 0:
            rsi[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi[i] = 100 - (100 / (1 + rs))
        idx = i - period
        avg_gain = (avg_gain * (period - 1) + gains[idx]) / period
        avg_loss = (avg_loss * (period - 1) + losses[idx]) / period
    return rsi


# ─── OBV（本项目新增）────────────────────────────────────────────────────────

def calc_obv(closes: list[float], volumes: list[float]) -> list[float]:
    """
    能量潮（OBV）— 山寨做空策略核心指标
    价格上涨时累加成交量，下跌时减去成交量。
    """
    obv = [0.0]
    for i in range(1, len(closes)):
        if closes[i] > closes[i - 1]:
            obv.append(obv[-1] + volumes[i])
        elif closes[i] < closes[i - 1]:
            obv.append(obv[-1] - volumes[i])
        else:
            obv.append(obv[-1])
    return obv


# ─── ADX（本项目新增）────────────────────────────────────────────────────────

def calc_adx(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> list[float]:
    """
    平均趋向指数（ADX）— 海龟策略趋势强度过滤（ADX > 18 才入场）
    """
    n = len(closes)
    adx = [0.0] * n
    if n < period * 2:
        return adx

    plus_dm, minus_dm, tr_list = [], [], []
    for i in range(1, n):
        h_diff = highs[i] - highs[i - 1]
        l_diff = lows[i - 1] - lows[i]
        plus_dm.append(h_diff if h_diff > l_diff and h_diff > 0 else 0)
        minus_dm.append(l_diff if l_diff > h_diff and l_diff > 0 else 0)
        tr = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
        tr_list.append(tr)

    def smooth(data: list[float], p: int) -> list[float]:
        s = [sum(data[:p])]
        for v in data[p:]:
            s.append(s[-1] - s[-1] / p + v)
        return s

    atr_s = smooth(tr_list, period)
    plus_s = smooth(plus_dm, period)
    minus_s = smooth(minus_dm, period)

    dx_list = []
    for a, p, m in zip(atr_s, plus_s, minus_s):
        plus_di = 100 * p / a if a else 0
        minus_di = 100 * m / a if a else 0
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di) if (plus_di + minus_di) else 0
        dx_list.append(dx)

    adx_smooth = smooth(dx_list, period)
    offset = period * 2 - 1
    for i, v in enumerate(adx_smooth):
        if offset + i < n:
            adx[offset + i] = v
    return adx
