"""
RSI Mean Reversion Strategy — RSI 均值回归（补充策略）
用途：在山寨空头策略空闲期，利用闲置资金捕捉超跌反弹
逻辑：
  - RSI(14) < oversold_level (默认30) → 做多入场（现货，无杠杆）
  - RSI(14) > overbought_level (默认65) → 平仓出场
  - 同时设置止损：入场后下跌 stop_loss_pct 则止损
  - 同一时间只持有一个仓位
"""
import numpy as np
import pandas as pd


def _calc_rsi(close: np.ndarray, period: int = 14) -> np.ndarray:
    delta = np.diff(close, prepend=close[0])
    gain = np.where(delta > 0, delta, 0.0)
    loss = np.where(delta < 0, -delta, 0.0)
    avg_gain = np.zeros(len(close))
    avg_loss = np.zeros(len(close))
    avg_gain[period] = gain[1:period + 1].mean()
    avg_loss[period] = loss[1:period + 1].mean()
    for i in range(period + 1, len(close)):
        avg_gain[i] = (avg_gain[i - 1] * (period - 1) + gain[i]) / period
        avg_loss[i] = (avg_loss[i - 1] * (period - 1) + loss[i]) / period
    rs = np.where(avg_loss == 0, 100.0, avg_gain / avg_loss)
    rsi = 100 - 100 / (1 + rs)
    rsi[:period] = 50.0
    return rsi


class RsiMeanReversionStrategy:
    """
    RSI 超跌做多策略，适用于任意标的的日线数据。
    """

    def __init__(self, general_cfg: dict, cfg: dict):
        self.fee = general_cfg.get("fee", 0.0005)
        self.init_cash = cfg.get("init_cash", 1500.0)
        self.rsi_period = cfg.get("rsi_period", 14)
        self.oversold = cfg.get("oversold", 30)        # RSI 低于此值入场
        self.overbought = cfg.get("overbought", 65)    # RSI 高于此值出场
        self.stop_loss_pct = cfg.get("stop_loss_pct", 0.08)  # 止损比例
        self.position_pct = cfg.get("position_pct", 0.80)    # 每次用资金的比例

    def run(self, df: pd.DataFrame, symbol: str = "ETH/USDT"):
        """
        df: 日线 OHLCV DataFrame，index=datetime
        returns: (equity_series, trades_list, stats_dict)
        """
        close = df["close"].values
        dates = df.index
        n = len(close)

        rsi = _calc_rsi(close, self.rsi_period)

        cash = self.init_cash
        holdings = 0.0
        entry_price = 0.0
        entry_date = None
        equity_list = []
        trades = []
        in_position = False
        invested_days = 0

        for i in range(n):
            price = close[i]
            date = dates[i]

            if in_position:
                invested_days += 1
                # 检查止损
                if price <= entry_price * (1 - self.stop_loss_pct):
                    sell_value = holdings * price * (1 - self.fee)
                    pnl = sell_value - (holdings * entry_price * (1 + self.fee))
                    cash += sell_value
                    trades.append({
                        "symbol": symbol,
                        "strategy": "RSI MR",
                        "date_in": str(entry_date.date()),
                        "date_out": str(date.date()),
                        "price_in": round(entry_price, 4),
                        "price_out": round(price, 4),
                        "pnl": round(pnl, 4),
                        "pnl_pct": round((price / entry_price - 1) * 100, 4),
                        "hold_days": (date - entry_date).days,
                        "reason": "Stop Loss",
                    })
                    holdings = 0.0
                    in_position = False

                # 检查出场（RSI 超买）
                elif rsi[i] > self.overbought:
                    sell_value = holdings * price * (1 - self.fee)
                    pnl = sell_value - (holdings * entry_price * (1 + self.fee))
                    cash += sell_value
                    trades.append({
                        "symbol": symbol,
                        "strategy": "RSI MR",
                        "date_in": str(entry_date.date()),
                        "date_out": str(date.date()),
                        "price_in": round(entry_price, 4),
                        "price_out": round(price, 4),
                        "pnl": round(pnl, 4),
                        "pnl_pct": round((price / entry_price - 1) * 100, 4),
                        "hold_days": (date - entry_date).days,
                        "reason": "RSI Exit",
                    })
                    holdings = 0.0
                    in_position = False

            else:
                # 检查入场（RSI 超卖）
                if rsi[i] < self.oversold and cash > 100:
                    buy_value = cash * self.position_pct
                    qty = buy_value / price
                    cost = buy_value * (1 + self.fee)
                    if cash >= cost:
                        cash -= cost
                        holdings = qty
                        entry_price = price
                        entry_date = date
                        in_position = True

            equity_list.append({
                "date": date,
                "equity": cash + holdings * price,
            })

        # 强制平仓（回测结束）
        if in_position and holdings > 0:
            price = close[-1]
            sell_value = holdings * price * (1 - self.fee)
            pnl = sell_value - (holdings * entry_price * (1 + self.fee))
            cash += sell_value
            trades.append({
                "symbol": symbol,
                "strategy": "RSI MR",
                "date_in": str(entry_date.date()),
                "date_out": str(dates[-1].date()),
                "price_in": round(entry_price, 4),
                "price_out": round(price, 4),
                "pnl": round(pnl, 4),
                "pnl_pct": round((price / entry_price - 1) * 100, 4),
                "hold_days": (dates[-1] - entry_date).days,
                "reason": "End of Backtest",
            })
            equity_list[-1]["equity"] = cash

        equity_df = pd.DataFrame(equity_list).set_index("date")
        final_equity = equity_df["equity"].iloc[-1]
        total_return = (final_equity - self.init_cash) / self.init_cash * 100

        eq = equity_df["equity"]
        roll_max = eq.cummax()
        dd = (eq - roll_max) / roll_max * 100
        max_dd = dd.min()

        daily_ret = eq.pct_change().dropna()
        sharpe = (daily_ret.mean() / daily_ret.std() * np.sqrt(252)) if daily_ret.std() > 0 else 0

        wins = [t for t in trades if t["pnl"] > 0]
        losses = [t for t in trades if t["pnl"] <= 0]
        win_rate = round(len(wins) / len(trades) * 100, 1) if trades else 0
        gross_profit = sum(t["pnl"] for t in wins)
        gross_loss = abs(sum(t["pnl"] for t in losses)) or 1e-9
        pf = round(gross_profit / gross_loss, 3)

        label = symbol.split("/")[0] + " RSI均值回归"
        stats = {
            "label": label,
            "symbol": symbol.split("/")[0],
            "color": "#ff9500",
            "init_cash": self.init_cash,
            "final_equity": round(final_equity, 2),
            "total_return": round(total_return, 2),
            "annual_return": round(total_return / 6.17, 2),
            "max_drawdown": round(max_dd, 2),
            "sharpe": round(sharpe, 3),
            "trades": len(trades),
            "win_rate": win_rate,
            "profit_factor": pf,
            "invested_days": invested_days,
            "idle_days": len(equity_df) - invested_days,
        }

        return equity_df, trades, stats
