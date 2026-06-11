import numpy as np
import pandas as pd
from utils.indicators import calc_obv


def find_peaks(values, distance=1, prominence=0):
    """Small local-maximum detector used when scipy is unavailable."""
    arr = np.asarray(values, dtype=float)
    peaks = []
    last_peak = -distance
    for i in range(1, len(arr) - 1):
        if i - last_peak < distance:
            continue
        if arr[i] <= arr[i - 1] or arr[i] <= arr[i + 1]:
            continue
        left_min = arr[max(0, i - distance):i].min() if i > 0 else arr[i]
        right_min = arr[i + 1:min(len(arr), i + 1 + distance)].min() if i + 1 < len(arr) else arr[i]
        if arr[i] - max(left_min, right_min) < prominence:
            continue
        peaks.append(i)
        last_peak = i
    return np.asarray(peaks, dtype=int), {}

class AltObvShortStrategy:
    def __init__(self, strategy_config, general_config):
        self.config = strategy_config
        self.general_config = general_config
        self.df = None

    def _detect_short_signals(self, df, symbol):
        df = df.copy()
        cfg = self.config
        df["obv"] = calc_obv(df["close"].astype(float).tolist(), df["volume"].astype(float).tolist())

        close_arr = df["close"].values
        obv_arr = df["obv"].values

        price_peaks, _ = find_peaks(close_arr, distance=cfg["swing_window"], prominence=close_arr.mean() * 0.03)
        obv_peaks, _ = find_peaks(obv_arr, distance=cfg["swing_window"])

        df["divergence_top"] = np.nan
        df["entry_trigger_px"] = np.nan
        df["short_signal"] = False

        divergence_events = []

        for i in range(1, len(price_peaks)):
            curr_pi = price_peaks[i]
            prev_pi = price_peaks[i - 1]
            if curr_pi - prev_pi > cfg["max_lookback_days"]: continue

            curr_price = close_arr[curr_pi]
            prev_price = close_arr[prev_pi]
            if curr_price <= prev_price * (1 + cfg["min_rise_pct"]): continue

            window = cfg["swing_window"] * 2
            curr_obv_cands = obv_peaks[(obv_peaks >= max(0, curr_pi - window)) & (obv_peaks <= min(len(df) - 1, curr_pi + window))]
            prev_obv_cands = obv_peaks[(obv_peaks >= max(0, prev_pi - window)) & (obv_peaks <= min(len(df) - 1, prev_pi + window))]

            if len(curr_obv_cands) == 0 or len(prev_obv_cands) == 0:
                if len(obv_peaks) == 0: continue
                curr_obv_pi = obv_peaks[np.abs(obv_peaks - curr_pi).argmin()]
                prev_obv_pi = obv_peaks[np.abs(obv_peaks - prev_pi).argmin()]
            else:
                curr_obv_pi = curr_obv_cands[np.abs(curr_obv_cands - curr_pi).argmin()]
                prev_obv_pi = prev_obv_cands[np.abs(prev_obv_cands - prev_pi).argmin()]

            if obv_arr[curr_obv_pi] < obv_arr[prev_obv_pi]:
                peak_date = df.index[curr_pi]
                peak_price = curr_price
                trigger_px = peak_price * (1 - cfg["confirmation_drop_pct"])
                df.loc[peak_date, "divergence_top"] = peak_price
                divergence_events.append({"peak_date": peak_date, "peak_price": peak_price, "trigger_px": trigger_px})

        active_events = []
        short_signal_set = set()
        for i, row in enumerate(df.itertuples()):
            close = row.close
            now = row.Index
            for ev in divergence_events:
                if ev["peak_date"] == now:
                    active_events.append(ev)
            for ev in active_events[:]:
                if now <= ev["peak_date"]: continue
                if close <= ev["trigger_px"] and now not in short_signal_set:
                    df.loc[now, "short_signal"] = True
                    df.loc[now, "entry_trigger_px"] = ev["trigger_px"]
                    short_signal_set.add(now)
                    active_events.remove(ev)

        n_div = df["divergence_top"].notna().sum()
        n_sig = df["short_signal"].sum()
        print(f"  {symbol}: Found {n_div} OBV tops, {n_sig} triggered entries.")
        self.df = df
        return self.df

    def backtest(self, df, symbol, init_cash=None):
        self._detect_short_signals(df, symbol)
        
        cash = init_cash if init_cash is not None else self.config["init_cash"]
        equity = []
        trades = []
        position = None
        lowest = float("inf")

        cfg = self.config

        for i in range(len(self.df)):
            row = self.df.iloc[i]
            close = float(row["close"])
            low = float(row["low"])
            high = float(row["high"])
            now = self.df.index[i]

            if position: lowest = min(lowest, low)

            unrealized = 0.0
            if position:
                unrealized = position["size"] * (position["entry_px"] - close) * cfg["leverage"]
            eq = cash + unrealized + (position["margin"] if position else 0.0)
            equity.append(max(eq, 1.0))

            # --- Exit Check ---
            if position:
                stop_px = position["entry_px"] * (1 + cfg["stop_loss_pct"])
                trail_px = lowest * (1 + cfg["trailing_stop_pct"])
                exit_flag, exit_reason, exit_price = False, "", close

                if high >= stop_px:
                    stop_loss_pct_val = cfg["stop_loss_pct"] * 100
                    exit_flag, exit_reason, exit_price = True, f"{stop_loss_pct_val:.0f}% Stop Loss", stop_px
                elif close >= trail_px and lowest < position["entry_px"]:
                    exit_flag, exit_reason, exit_price = True, "Trailing Stop", trail_px

                if exit_flag:
                    pnl = position["size"] * (position["entry_px"] - exit_price) * cfg["leverage"]
                    fee = position["size"] * exit_price * self.general_config["fee"]
                    cash += position["margin"] + pnl - fee
                    trades.append({
                        "symbol": symbol, "strategy": "OBV Short",
                        "date_in": position["date"], "date_out": now,
                        "price_in": position["entry_px"], "price_out": exit_price,
                        "lowest": round(lowest, 4),
                        "pnl": round(pnl - fee, 2),
                        "pnl_pct": round((pnl - fee) / position["margin"] * 100, 2),
                        "reason": exit_reason,
                        "hold_days": (now - position["date"]).days,
                    })
                    position = None
                    lowest = float("inf")

            # --- Entry Check (Short Only) ---
            if not position and bool(row["short_signal"]):
                margin = equity[-1] * cfg["position_size_pct"]
                size = margin * cfg["leverage"] / close
                fee_open = size * close * self.general_config["fee"]
                if size > 0 and cash >= margin + fee_open:
                    cash -= (margin + fee_open)
                    position = {"size": size, "entry_px": close, "margin": margin, "date": now}
                    lowest = close

        # --- Final Exit ---
        if position:
            close = float(self.df["close"].iloc[-1])
            pnl = position["size"] * (position["entry_px"] - close) * cfg["leverage"]
            cash += position["margin"] + pnl
            trades.append({
                "symbol": symbol, "strategy": "OBV Short",
                "date_in": position["date"], "date_out": self.df.index[-1],
                "price_in": position["entry_px"], "price_out": close,
                "lowest": round(lowest, 4),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl / position["margin"] * 100 if position["margin"] else 0, 2),
                "reason": "End of Backtest",
                "hold_days": (self.df.index[-1] - position["date"]).days,
            })

        return pd.Series(equity, index=self.df.index), pd.DataFrame(trades)
