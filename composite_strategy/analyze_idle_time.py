"""
分析各子策略及组合的资金空闲时间比例
回测区间: 2020-01-01 ~ 2026-02-28 (约 2251 天)
"""
import argparse
import json
import os
from datetime import datetime, timedelta

import pandas as pd


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TRADES = os.path.join(BASE_DIR, "data_output", "trades.csv")
DEFAULT_OUTPUT = os.path.join(BASE_DIR, "data_output", "idle_time_data.json")


def parse_args():
    parser = argparse.ArgumentParser(description="分析交易记录中的资金持仓/空闲时间。")
    parser.add_argument("--trades", default=DEFAULT_TRADES, help="交易记录 CSV 路径，默认读取 data_output/trades.csv")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="输出 JSON 路径，默认写入 data_output/idle_time_data.json")
    parser.add_argument("--start", default="2020-01-01", help="回测起始日期，格式 YYYY-MM-DD")
    parser.add_argument("--end", default="2026-02-28", help="回测结束日期，格式 YYYY-MM-DD")
    return parser.parse_args()


args = parse_args()
df = pd.read_csv(args.trades, parse_dates=["date_in", "date_out"])

BACKTEST_START = datetime.fromisoformat(args.start)
BACKTEST_END   = datetime.fromisoformat(args.end)
TOTAL_DAYS     = (BACKTEST_END - BACKTEST_START).days  # 2251

# ── 1. 每个标的的持仓天数（合并重叠区间）─────────────────────────────────────
def invested_days(symbol_df):
    """合并重叠持仓区间，返回实际持仓天数"""
    intervals = sorted(zip(symbol_df["date_in"], symbol_df["date_out"]))
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append([start, end])
    return sum((e - s).days for s, e in merged)

symbols = df["symbol"].unique()
result = {}

for sym in sorted(symbols):
    sub = df[df["symbol"] == sym]
    inv = invested_days(sub)
    idle = TOTAL_DAYS - inv
    result[sym] = {
        "trades":        int(len(sub)),
        "invested_days": int(inv),
        "idle_days":     int(idle),
        "invested_pct":  round(inv / TOTAL_DAYS * 100, 1),
        "idle_pct":      round(idle / TOTAL_DAYS * 100, 1),
        "avg_hold":      round(sub["hold_days"].mean(), 1),
    }

# ── 2. 组合层面（任意一个标的持仓即算在场）──────────────────────────────────
all_intervals = sorted(zip(df["date_in"], df["date_out"]))
merged_all = []
for start, end in all_intervals:
    if merged_all and start <= merged_all[-1][1]:
        merged_all[-1] = (merged_all[-1][0], max(merged_all[-1][1], end))
    else:
        merged_all.append([start, end])
portfolio_inv  = sum((e - s).days for s, e in merged_all)
portfolio_idle = TOTAL_DAYS - portfolio_inv

result["PORTFOLIO"] = {
    "trades":        int(len(df)),
    "invested_days": int(portfolio_inv),
    "idle_days":     int(portfolio_idle),
    "invested_pct":  round(portfolio_inv / TOTAL_DAYS * 100, 1),
    "idle_pct":      round(portfolio_idle / TOTAL_DAYS * 100, 1),
    "avg_hold":      round(df["hold_days"].mean(), 1),
}

# ── 3. 打印结果 ──────────────────────────────────────────────────────────────
print(f"\n回测区间: {BACKTEST_START.date()} ~ {BACKTEST_END.date()}  共 {TOTAL_DAYS} 天\n")
print(f"{'标的':<14} {'交易次数':>6} {'持仓天数':>8} {'空闲天数':>8} {'持仓占比':>8} {'空闲占比':>8} {'均持仓天':>8}")
print("-" * 68)
for sym, v in result.items():
    label = "【组合】" if sym == "PORTFOLIO" else sym
    print(f"{label:<14} {v['trades']:>6} {v['invested_days']:>8} {v['idle_days']:>8} "
          f"{v['invested_pct']:>7.1f}% {v['idle_pct']:>7.1f}% {v['avg_hold']:>8.1f}d")

# ── 4. 输出 JSON 供网站使用 ──────────────────────────────────────────────────
os.makedirs(os.path.dirname(args.output), exist_ok=True)
with open(args.output, "w", encoding="utf-8") as f:
    json.dump({"total_days": TOTAL_DAYS, "data": result}, f, indent=2)
print(f"\n已写入 {args.output}")
