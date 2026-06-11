"""
资金费率套利信号 (Funding Rate Arbitrage Signal)
================================================
借鉴参考方案 crypto_arbitrage_v1_okx 的 CoinGlassDataFetcher 设计：
- 通过 CoinGlass API 获取多交易所资金费率数据
- 识别资金费率异常（极端正/负值）作为反转信号

与原方案的差异：
- 原方案用于跨交易所套利（同时在高费率交易所做空、低费率做多）
- 本方案将资金费率作为趋势策略的辅助信号：
  * 极端正资金费率（>0.1%/8h）→ 多头过热，增强 OBV 做空信号权重
  * 极端负资金费率（<-0.05%/8h）→ 空头过热，增强 BTC 海龟做多信号权重
  * 资金费率 RoC（变化率）急剧上升 → 预警踩踏风险

数据来源：
- 回测模式：从 CCXT 历史数据估算（资金费率历史数据有限，用 OI 变化代理）
- 实盘模式：CoinGlass API（借鉴参考方案的 aiohttp 异步获取）
"""

import asyncio
import logging
from typing import Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


# ─── 回测用：基于价格和成交量估算资金费率信号 ────────────────────────────────

def compute_funding_signal(df: pd.DataFrame, window: int = 8) -> pd.Series:
    """
    在历史回测中，用价格偏离和成交量变化估算资金费率压力信号。
    
    逻辑：
    - 价格相对 MA 偏离越大 + 成交量越高 → 资金费率越可能极端
    - 返回 [-1, 1] 的信号值：
        * 接近 +1 → 多头过热（资金费率极端正），利空
        * 接近 -1 → 空头过热（资金费率极端负），利多
    
    Parameters
    ----------
    df : DataFrame  包含 close, volume 列
    window : int    滚动窗口（小时，对应日线数据约 1/3 天）
    
    Returns
    -------
    pd.Series  funding_pressure 信号序列
    """
    df = df.copy()
    
    # 价格偏离 MA（归一化）
    ma = df["close"].rolling(window).mean()
    price_dev = (df["close"] - ma) / ma
    
    # 成交量相对强度
    vol_ma = df["volume"].rolling(window).mean()
    vol_ratio = df["volume"] / vol_ma.replace(0, np.nan)
    
    # 资金费率压力 = 价格偏离 × 成交量强度（有方向性）
    funding_pressure = price_dev * vol_ratio.clip(0, 3)
    
    # 归一化到 [-1, 1]
    rolling_std = funding_pressure.rolling(window * 3).std()
    normalized = (funding_pressure / rolling_std.replace(0, np.nan)).clip(-1, 1)
    
    return normalized.fillna(0).rename("funding_pressure")


def get_funding_weight_multiplier(funding_pressure: float) -> dict:
    """
    根据资金费率压力信号，返回各子策略的权重调整系数。
    
    Parameters
    ----------
    funding_pressure : float  当前资金费率压力值 [-1, 1]
    
    Returns
    -------
    dict  {strategy: multiplier}
    """
    if funding_pressure > 0.6:
        # 多头极度过热：增强做空信号，压制做多信号
        return {
            "btc_turtle": 0.5,      # BTC 多头降仓
            "alt_obv_short": 1.5,   # 山寨做空加仓
            "grid_trading": 0.7,    # 网格缩小区间
            "rsi_mean_reversion": 0.3,  # 均值回归谨慎
        }
    elif funding_pressure > 0.3:
        # 多头偏热：轻微调整
        return {
            "btc_turtle": 0.8,
            "alt_obv_short": 1.2,
            "grid_trading": 0.9,
            "rsi_mean_reversion": 0.7,
        }
    elif funding_pressure < -0.5:
        # 空头极度过热：增强做多信号，压制做空信号
        return {
            "btc_turtle": 1.5,      # BTC 多头加仓
            "alt_obv_short": 0.4,   # 山寨做空降仓
            "grid_trading": 1.2,    # 网格扩大区间
            "rsi_mean_reversion": 1.5,  # 超跌反弹机会
        }
    elif funding_pressure < -0.2:
        return {
            "btc_turtle": 1.2,
            "alt_obv_short": 0.7,
            "grid_trading": 1.1,
            "rsi_mean_reversion": 1.2,
        }
    else:
        # 中性区间：不调整
        return {
            "btc_turtle": 1.0,
            "alt_obv_short": 1.0,
            "grid_trading": 1.0,
            "rsi_mean_reversion": 1.0,
        }


# ─── 实盘用：异步获取 CoinGlass 资金费率（借鉴参考方案） ─────────────────────

class FundingRateMonitor:
    """
    实盘资金费率监控器（借鉴参考方案 CoinGlassDataFetcher 的异步设计）。
    
    使用方法：
        monitor = FundingRateMonitor(api_key="your_coinglass_key")
        rates = await monitor.fetch_multi(["BTC", "ETH", "SOL"])
    """

    COINGLASS_URL = "https://open-api.coinglass.com/public/v2/funding_rate"
    
    # 极端资金费率阈值（8小时）
    EXTREME_POSITIVE = 0.001   # +0.1% → 多头过热
    EXTREME_NEGATIVE = -0.0005  # -0.05% → 空头过热

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self._cache: dict = {}
        self._cache_ts: float = 0

    async def fetch_funding(self, symbol: str) -> dict:
        """
        获取单个标的的资金费率（借鉴参考方案的 aiohttp 异步请求）。
        """
        try:
            import aiohttp
            headers = {"coinglassSecret": self.api_key} if self.api_key else {}
            async with aiohttp.ClientSession(headers=headers) as session:
                async with session.get(
                    f"{self.COINGLASS_URL}?symbol={symbol}",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as r:
                    data = await r.json()
                    return data
        except Exception as e:
            logger.warning(f"[FundingMonitor] 获取 {symbol} 资金费率失败: {e}")
            return {}

    async def fetch_multi(self, symbols: list[str]) -> dict[str, float]:
        """
        并发获取多个标的的当前资金费率。
        
        Returns
        -------
        dict  {symbol: funding_rate_8h}
        """
        tasks = {sym: asyncio.create_task(self.fetch_funding(sym)) for sym in symbols}
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        
        rates = {}
        for sym, res in zip(tasks.keys(), results):
            if isinstance(res, Exception) or not res:
                rates[sym] = 0.0
                continue
            try:
                # CoinGlass 返回格式：data[0]["fundingRate"]
                rate = float(res.get("data", [{}])[0].get("fundingRate", 0))
                rates[sym] = rate
            except (IndexError, KeyError, TypeError):
                rates[sym] = 0.0
        
        return rates

    def classify_market_state(self, rates: dict[str, float]) -> str:
        """
        根据多标的资金费率综合判断市场状态。
        
        Returns
        -------
        str  "overheated_long" | "overheated_short" | "neutral"
        """
        if not rates:
            return "neutral"
        
        avg_rate = sum(rates.values()) / len(rates)
        extreme_positive_count = sum(1 for r in rates.values() if r > self.EXTREME_POSITIVE)
        extreme_negative_count = sum(1 for r in rates.values() if r < self.EXTREME_NEGATIVE)
        
        if extreme_positive_count >= len(rates) * 0.6 or avg_rate > self.EXTREME_POSITIVE:
            return "overheated_long"
        elif extreme_negative_count >= len(rates) * 0.5 or avg_rate < self.EXTREME_NEGATIVE:
            return "overheated_short"
        else:
            return "neutral"
