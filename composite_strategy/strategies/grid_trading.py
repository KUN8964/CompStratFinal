"""
Grid Trading Strategy — 现货网格交易（补充策略）
用途：在主策略空闲期，利用闲置资金在价格区间内挂网格单，赚取双向价差
逻辑：
  - 每 N 天重新计算网格区间（基于 ATR 或近期波动率）
  - 价格下穿网格线 → 买入 1 格仓位
  - 价格上穿网格线 → 卖出 1 格仓位
  - 持仓上限：最多持有 grid_count/2 格
"""
import numpy as np
import pandas as pd


class GridTradingStrategy:
    """
    简化的网格回测模型：
    - 将回测区间按 rebalance_days 切片，每段独立运行网格
    - 每段内模拟网格买卖，计算该段盈亏
    """

    def __init__(self, general_cfg: dict, cfg: dict):
        self.fee = general_cfg.get("fee", 0.0005)
        self.init_cash = cfg.get("init_cash", 2000.0)
        self.grid_count = cfg.get("grid_count", 10)          # 网格数量（上下各 N/2 格）
        self.grid_pct = cfg.get("grid_pct", 0.015)           # 每格间距（1.5%）
        self.position_pct = cfg.get("position_pct", 0.08)    # 每格仓位占总资金比例
        self.rebalance_days = cfg.get("rebalance_days", 30)  # 每 N 天重设网格中心
        self.max_hold_pct = cfg.get("max_hold_pct", 0.5)     # 最大持仓比例

    def run(self, df: pd.DataFrame):
        """
        df: 日线 OHLCV DataFrame，index=datetime
        returns: (equity_series, trades_list, stats_dict)
        """
        close = df["close"].values
        dates = df.index
        n = len(close)

        cash = self.init_cash
        holdings = 0.0      # 持有的标的数量（现货）
        equity_list = []
        trades = []

        # 按 rebalance_days 分段运行网格
        seg_size = self.rebalance_days
        i = 0
        while i < n:
            seg_end = min(i + seg_size, n)
            seg_close = close[i:seg_end]
            seg_dates = dates[i:seg_end]

            # 以该段第一天收盘价为网格中心
            center = seg_close[0]
            grid_lines = [center * (1 + self.grid_pct * k)
                          for k in range(-self.grid_count // 2, self.grid_count // 2 + 1)]
            grid_lines = sorted(grid_lines)

            # 记录每条网格线的状态（True=已有买单等待卖出）
            grid_filled = [False] * len(grid_lines)

            prev_price = seg_close[0]

            for j, (price, date) in enumerate(zip(seg_close, seg_dates)):
                # 检查价格穿越网格线
                for gi, gl in enumerate(grid_lines[:-1]):
                    gl_next = grid_lines[gi + 1]

                    # 价格从上方下穿 gl → 买入
                    if prev_price > gl and price <= gl and not grid_filled[gi]:
                        max_pos = self.init_cash * self.max_hold_pct
                        buy_value = self.init_cash * self.position_pct
                        if cash >= buy_value and holdings * price < max_pos:
                            qty = buy_value / price
                            cost = buy_value * (1 + self.fee)
                            if cash >= cost:
                                cash -= cost
                                holdings += qty
                                grid_filled[gi] = True
                                trades.append({
                                    "symbol": "BTC/USDT",
                                    "strategy": "Grid Buy",
                                    "date_in": str(date.date()),
                                    "date_out": str(date.date()),
                                    "price_in": round(price, 2),
                                    "price_out": round(price, 2),
                                    "pnl": round(-buy_value * self.fee, 4),
                                    "pnl_pct": round(-self.fee * 100, 4),
                                    "hold_days": 0,
                                    "reason": "Grid Buy",
                                })

                    # 价格从下方上穿 gl_next → 卖出（如果 gi 格已买入）
                    if prev_price < gl_next and price >= gl_next and grid_filled[gi]:
                        sell_qty = self.init_cash * self.position_pct / gl
                        sell_qty = min(sell_qty, holdings)
                        if sell_qty > 0:
                            sell_value = sell_qty * price * (1 - self.fee)
                            profit = sell_qty * (price - gl) - (sell_qty * gl + sell_qty * price) * self.fee
                            cash += sell_value
                            holdings -= sell_qty
                            grid_filled[gi] = False
                            trades.append({
                                "symbol": "BTC/USDT",
                                "strategy": "Grid Sell",
                                "date_in": str(date.date()),
                                "date_out": str(date.date()),
                                "price_in": round(gl, 2),
                                "price_out": round(price, 2),
                                "pnl": round(profit, 4),
                                "pnl_pct": round((price / gl - 1) * 100, 4),
                                "hold_days": 1,
                                "reason": "Grid Sell",
                            })

                equity_list.append({
                    "date": date,
                    "equity": cash + holdings * price,
                })
                prev_price = price

            i = seg_end

        equity_df = pd.DataFrame(equity_list).set_index("date")
        final_equity = equity_df["equity"].iloc[-1]
        total_return = (final_equity - self.init_cash) / self.init_cash * 100

        # 计算最大回撤
        eq = equity_df["equity"]
        roll_max = eq.cummax()
        dd = (eq - roll_max) / roll_max * 100
        max_dd = dd.min()

        # 计算夏普
        daily_ret = eq.pct_change().dropna()
        sharpe = (daily_ret.mean() / daily_ret.std() * np.sqrt(252)) if daily_ret.std() > 0 else 0

        # 计算持仓天数（有持仓的天数）
        invested_days = sum(1 for t in trades if t["strategy"] == "Grid Buy")

        stats = {
            "label": "BTC 网格",
            "symbol": "BTC",
            "color": "#00d4ff",
            "init_cash": self.init_cash,
            "final_equity": round(final_equity, 2),
            "total_return": round(total_return, 2),
            "annual_return": round(total_return / 6.17, 2),
            "max_drawdown": round(max_dd, 2),
            "sharpe": round(sharpe, 3),
            "trades": len([t for t in trades if t["strategy"] == "Grid Sell"]),
            "win_rate": 0,
            "profit_factor": 0,
            "invested_days": invested_days,
            "idle_days": len(equity_df) - invested_days,
        }

        # 计算胜率和盈利因子
        sell_trades = [t for t in trades if t["strategy"] == "Grid Sell"]
        if sell_trades:
            wins = [t for t in sell_trades if t["pnl"] > 0]
            losses = [t for t in sell_trades if t["pnl"] <= 0]
            stats["win_rate"] = round(len(wins) / len(sell_trades) * 100, 1)
            gross_profit = sum(t["pnl"] for t in wins)
            gross_loss = abs(sum(t["pnl"] for t in losses)) or 1e-9
            stats["profit_factor"] = round(gross_profit / gross_loss, 3)

        return equity_df, trades, stats
