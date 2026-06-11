"""
BTC Turtle Trend Following Strategy (Long Only)
"""
import numpy as np
import pandas as pd
from utils.indicators import calc_atr, calc_adx

class BtcTurtleStrategy:
    def __init__(self, strategy_config, general_config):
        self.config = strategy_config
        self.general_config = general_config
        self.df = None

    def _compute_indicators(self, df):
        df = df.copy()
        cfg = self.config
        highs = df["high"].astype(float).tolist()
        lows = df["low"].astype(float).tolist()
        closes = df["close"].astype(float).tolist()
        df["atr"] = calc_atr(highs, lows, closes, period=14)
        df["adx"] = calc_adx(highs, lows, closes, period=14)
        df["ma200"] = df["close"].rolling(200).mean()
        df["is_bull"] = df["close"] > df["ma200"]
        df["entry_hi"] = df["high"].rolling(cfg["entry_window"]).max().shift(1)
        df["exit_lo_bull"] = df["low"].rolling(cfg["exit_window_bull"]).min().shift(1)
        df["exit_lo_bear"] = df["low"].rolling(cfg["exit_window_bear"]).min().shift(1)
        self.df = df.dropna()
        return self.df

    def backtest(self, df, init_cash=None):
        self._compute_indicators(df)
        
        cash = init_cash if init_cash is not None else self.config["init_cash"]
        equity = []
        trades = []
        units = []  # List of active position units
        recent_wins = []
        recent_losses = []

        cfg = self.config

        def kelly_risk():
            if len(recent_wins) + len(recent_losses) < 5:
                return (cfg["risk_min"] + cfg["risk_max"]) / 2
            wr = len(recent_wins) / (len(recent_wins) + len(recent_losses))
            avg_w = np.mean(recent_wins) if recent_wins else 0.01
            avg_l = abs(np.mean(recent_losses)) if recent_losses else 0.01
            kelly = wr - (1 - wr) / (avg_w / avg_l) if avg_l > 0 else 0
            kelly = max(0, min(kelly, 1.0))
            return cfg["risk_min"] + kelly * (cfg["risk_max"] - cfg["risk_min"])

        for i in range(len(self.df)):
            row = self.df.iloc[i]
            close = float(row["close"])
            now = self.df.index[i]

            pos_value = sum((close - u["entry_px"]) * u["size"] * cfg["leverage"] for u in units)
            pos_margin = sum(u["margin"] for u in units)
            eq = cash + pos_margin + pos_value
            equity.append(max(eq, 1.0))

            atr = float(row["atr"])
            if atr <= 0: continue

            # --- Exit Check ---
            if units:
                exit_lo = float(row["exit_lo_bull"] if row["is_bull"] else row["exit_lo_bear"])
                if float(row["low"]) < exit_lo:
                    total_pnl = sum((exit_lo - u["entry_px"]) * u["size"] * cfg["leverage"] for u in units)
                    total_margin = sum(u["margin"] for u in units)
                    fee = sum(u["size"] * exit_lo * self.general_config["fee"] for u in units)
                    cash += total_margin + total_pnl - fee
                    pnl_pct = total_pnl / total_margin if total_margin > 0 else 0
                    
                    if total_pnl > 0: recent_wins.append(pnl_pct)
                    else: recent_losses.append(pnl_pct)
                    recent_wins, recent_losses = recent_wins[-20:], recent_losses[-20:]

                    trades.append({
                        "symbol": "BTC/USDT", "strategy": "Turtle Long",
                        "date_in": units[0]["date"], "date_out": now,
                        "price_in": units[0]["entry_px"], "price_out": exit_lo,
                        "pnl": round(total_pnl - fee, 2),
                        "pnl_pct": round(pnl_pct * 100, 2),
                        "reason": "Channel Exit",
                        "hold_days": (now - units[0]["date"]).days,
                    })
                    units = []

            # --- Add-on Check ---
            if units and len(units) < cfg["max_units"]:
                last_add_px = units[-1]["add_px"]
                if close >= last_add_px + cfg["add_on_n_atr"] * atr:
                    risk_pct = kelly_risk()
                    margin = equity[-1] * risk_pct
                    size = margin * cfg["leverage"] / close
                    fee_open = size * close * self.general_config["fee"]
                    if cash >= margin + fee_open:
                        cash -= (margin + fee_open)
                        units.append({
                            "size": size, "entry_px": close, "margin": margin,
                            "add_px": close, "date": now,
                        })

            # --- Entry Check (Long Only) ---
            if not units:
                if (float(row["high"]) > float(row["entry_hi"]) and 
                    row["is_bull"] and 
                    float(row["adx"]) > cfg["adx_threshold"]):
                    risk_pct = kelly_risk()
                    margin = equity[-1] * risk_pct
                    size = margin * cfg["leverage"] / close
                    fee_open = size * close * self.general_config["fee"]
                    if cash >= margin + fee_open:
                        cash -= (margin + fee_open)
                        units.append({
                            "size": size, "entry_px": close, "margin": margin,
                            "add_px": close, "date": now,
                        })

        # --- Final Exit ---
        if units:
            close = float(self.df["close"].iloc[-1])
            total_pnl = sum((close - u["entry_px"]) * u["size"] * cfg["leverage"] for u in units)
            total_margin = sum(u["margin"] for u in units)
            cash += total_margin + total_pnl
            trades.append({
                "symbol": "BTC/USDT", "strategy": "Turtle Long",
                "date_in": units[0]["date"], "date_out": self.df.index[-1],
                "price_in": units[0]["entry_px"], "price_out": close,
                "pnl": round(total_pnl, 2),
                "pnl_pct": round(total_pnl / total_margin * 100 if total_margin else 0, 2),
                "reason": "End of Backtest",
                "hold_days": (self.df.index[-1] - units[0]["date"]).days,
            })

        return pd.Series(equity, index=self.df.index), pd.DataFrame(trades)
