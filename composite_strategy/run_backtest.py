"""
Main backtesting script for the composite strategy.
Usage:
    python3 run_backtest.py              # default config
    python3 run_backtest.py config.json  # custom config
"""
import json
import os
import sys
import time
import warnings
from datetime import datetime
from copy import deepcopy

import matplotlib
import matplotlib.font_manager as fm
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from strategies.btc_turtle import BtcTurtleStrategy
from strategies.alt_obv_short import AltObvShortStrategy
from config import default_config

# --- Setup ---
# 抑制已知且无影响的警告，而非全局忽略
warnings.filterwarnings("ignore", category=FutureWarning, module="pandas")
matplotlib.use("Agg")

# --- Font Setup ---
for _cjk in [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]:
    if os.path.exists(_cjk):
        fm.fontManager.addfont(_cjk)
        matplotlib.rcParams["font.family"] = fm.FontProperties(fname=_cjk).get_name()
        break
matplotlib.rcParams["axes.unicode_minus"] = False

# --- Directories ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "data_output")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


def deep_merge(base, override):
    """Recursively merge user config into defaults without dropping nested keys."""
    merged = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


class BacktestRunner:
    def __init__(self, config):
        self.config = config

    def fetch_data(self, symbol, timeframe="1d"):
        since = self.config["general"]["since"]
        safe_symbol = symbol.replace("/", "_")
        cache_path = os.path.join(DATA_DIR, f"cache_1d_{safe_symbol}.csv")
        if os.path.exists(cache_path):
            df = pd.read_csv(cache_path, index_col=0, parse_dates=True)
            print(f"  {symbol}: Loaded {len(df)} k-lines from cache.")
            return df

        print(f"  {symbol}: Fetching from exchange...")
        import ccxt
        exchange = ccxt.binance()
        all_ohlcv, since_ts = [], exchange.parse8601(since)
        retry = 0
        while True:
            try:
                batch = exchange.fetch_ohlcv(symbol, timeframe, since=since_ts, limit=1000)
                if not batch:
                    break
                since_ts = batch[-1][0] + exchange.parse_timeframe(timeframe) * 1000
                all_ohlcv.extend(batch)
                time.sleep(0.2)
                if since_ts > exchange.milliseconds():
                    break
                retry = 0
            except Exception as e:
                retry += 1
                if retry >= 3:
                    print(f"  {symbol}: Fetch failed after retries: {e}")
                    break
                time.sleep(3)

        if not all_ohlcv:
            return pd.DataFrame()

        df = pd.DataFrame(all_ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
        df.set_index("timestamp", inplace=True)
        df.to_csv(cache_path)
        print(f"  {symbol}: Fetched {len(df)} k-lines.")
        return df

    def run(self):
        print("=" * 70)
        print("  Composite Strategy Backtest  (V2 — Multi-Symbol)")
        print("=" * 70)

        alt_symbols = self.config.get("alt_symbols", ["ETH/USDT", "SOL/USDT"])
        alt_cash = self.config.get("alt_cash_per_symbol", 1500.0)

        # 1. Fetch Data
        print("\n[1/4] Fetching historical data...")
        btc_raw = self.fetch_data("BTC/USDT")
        alt_raws = {}
        for sym in alt_symbols:
            df = self.fetch_data(sym)
            if not df.empty:
                alt_raws[sym] = df

        # 2. Run BTC Turtle Strategy
        print("\n[2/4] Running BTC Turtle Long Strategy...")
        btc_strategy = BtcTurtleStrategy(self.config["btc_turtle"], self.config["general"])
        btc_eq, btc_trades = btc_strategy.backtest(btc_raw)
        print(f"  BTC: {len(btc_trades)} trades, final equity {btc_eq.iloc[-1]:.2f} USDT")

        # 3. Run Alt OBV Short Strategies
        print("\n[3/4] Running Alt OBV Short Strategies...")
        alt_cfg = self.config["alt_obv_short"].copy()
        alt_cfg["init_cash"] = alt_cash

        alt_results = {}
        all_alt_trades = []
        for sym, raw_df in alt_raws.items():
            strat = AltObvShortStrategy(alt_cfg, self.config["general"])
            eq, trades = strat.backtest(raw_df, sym, init_cash=alt_cash)
            alt_results[sym] = {"eq": eq, "trades": trades, "df": strat.df}
            print(f"  {sym}: {len(trades)} trades, final equity {eq.iloc[-1]:.2f} USDT")
            if not trades.empty:
                all_alt_trades.append(trades)

        # 4. Combine and Analyze
        print("\n[4/4] Combining results and generating report...")

        # Build equity DataFrame — align all to BTC index
        eq_dict = {"BTC": btc_eq}
        for sym, res in alt_results.items():
            label = sym.split("/")[0]
            eq_dict[label] = res["eq"]

        eq_df = pd.DataFrame(eq_dict)
        eq_df = eq_df.ffill().bfill()
        portfolio = eq_df.sum(axis=1)

        all_trades_list = [btc_trades] + all_alt_trades
        all_trades_list = [t for t in all_trades_list if not t.empty]
        all_trades = (
            pd.concat(all_trades_list).sort_values("date_in").reset_index(drop=True)
            if all_trades_list else pd.DataFrame()
        )

        # Stats
        stats_portfolio = self.calc_stats(portfolio, all_trades, "Portfolio")
        stats_btc = self.calc_stats(btc_eq, btc_trades, "BTC Long")
        alt_stats_list = []
        for sym, res in alt_results.items():
            label = sym.split("/")[0] + " Short"
            alt_stats_list.append(self.calc_stats(res["eq"], res["trades"], label))

        self.print_stats_table(stats_portfolio, stats_btc, *alt_stats_list)

        report_path = self.plot_full_report(
            portfolio, btc_eq, btc_strategy.df, btc_trades,
            alt_results, all_trades,
            stats_portfolio, stats_btc, alt_stats_list
        )

        if not all_trades.empty:
            td_path = os.path.join(OUTPUT_DIR, "trades.csv")
            all_trades.to_csv(td_path, index=False)
            print(f"  Trade log saved: {td_path}")

        print(f"\n✅ Backtest complete! Report: {report_path}")
        return report_path

    def calc_stats(self, equity_s, trades_df, label=""):
        init_cash = equity_s.iloc[0]
        total_ret = (equity_s.iloc[-1] / init_cash - 1) * 100
        years = (equity_s.index[-1] - equity_s.index[0]).days / 365.25
        ann_ret = ((equity_s.iloc[-1] / init_cash) ** (1 / max(years, 0.1)) - 1) * 100
        roll_max = equity_s.cummax()
        drawdown = (equity_s - roll_max) / roll_max * 100
        max_dd = drawdown.min()
        daily_ret = equity_s.pct_change().dropna()
        sharpe = (daily_ret.mean() / daily_ret.std() * np.sqrt(252)) if daily_ret.std() > 0 else 0
        calmar = ann_ret / abs(max_dd) if max_dd != 0 else 0

        if not trades_df.empty and "pnl" in trades_df.columns:
            wins = trades_df[trades_df["pnl"] > 0]
            losses = trades_df[trades_df["pnl"] <= 0]
            wr = len(wins) / len(trades_df) * 100 if len(trades_df) > 0 else 0
            pf = abs(wins["pnl"].sum() / losses["pnl"].sum()) if len(losses) > 0 and losses["pnl"].sum() != 0 else float("inf")
            avg_hold = trades_df["hold_days"].mean() if "hold_days" in trades_df.columns else 0
        else:
            wr = pf = avg_hold = 0

        return {
            "label": label,
            "Total Return (%)": round(total_ret, 2),
            "Annual Return (%)": round(ann_ret, 2),
            "Max Drawdown (%)": round(max_dd, 2),
            "Sharpe Ratio": round(sharpe, 3),
            "Calmar Ratio": round(calmar, 3),
            "Total Trades": len(trades_df),
            "Win Rate (%)": round(wr, 1),
            "Profit Factor": round(pf, 3),
            "Avg Hold (days)": round(avg_hold, 1),
            "Final Equity (USDT)": round(equity_s.iloc[-1], 2),
        }

    def print_stats_table(self, *stats_list):
        print("\n" + "─" * 90)
        header = f"  {'Metric':<22}" + "".join([f"{s['label']:>14}" for s in stats_list])
        print(header)
        print("  " + "─" * (len(header) - 2))
        keys = ["Total Return (%)", "Annual Return (%)", "Max Drawdown (%)", "Sharpe Ratio",
                "Calmar Ratio", "Total Trades", "Win Rate (%)", "Profit Factor", "Final Equity (USDT)"]
        for k in keys:
            row_str = f"  {k:<22}"
            for s in stats_list:
                row_str += f"{str(s.get(k, '-')):>14}"
            print(row_str)
        print("─" * 90)

    def plot_full_report(self, portfolio, btc_eq, btc_df, btc_trades,
                         alt_results, all_trades, stats_portfolio, stats_btc, alt_stats_list):
        n_alts = len(alt_results)
        n_rows = 4 + (n_alts + 1) // 2  # dynamic rows for alt charts
        fig = plt.figure(figsize=(22, 6 * n_rows), facecolor="#0d1117")
        gs = gridspec.GridSpec(n_rows, 2, figure=fig, hspace=0.50, wspace=0.32)
        bg = "#161b22"
        COLORS = {
            "BTC/USDT": "#F7931A", "ETH/USDT": "#627EEA", "SOL/USDT": "#9945FF",
            "BNB/USDT": "#F3BA2F", "DOGE/USDT": "#C2A633", "LINK/USDT": "#2A5ADA",
            "portfolio": "#00ff88"
        }

        # 1. Portfolio Equity Curve (full width)
        ax1 = fig.add_subplot(gs[0, :])
        ax1.set_facecolor(bg)
        ax1.plot(portfolio.index, portfolio.values, color=COLORS["portfolio"], lw=2.5,
                 label=f"Portfolio Equity (Final: {portfolio.iloc[-1]:.0f} USDT)")
        ax1.axhline(self.config["general"]["init_cash"], color="white", lw=0.8, ls="--", alpha=0.4,
                    label=f"Initial Cash {self.config['general']['init_cash']:.0f} USDT")
        roll_max = portfolio.cummax()
        ax1.fill_between(portfolio.index, portfolio.values, roll_max.values, alpha=0.15, color="tomato")
        total_ret = stats_portfolio["Total Return (%)"]
        sharpe = stats_portfolio["Sharpe Ratio"]
        mdd = stats_portfolio["Max Drawdown (%)"]
        n_trades = stats_portfolio["Total Trades"]
        ax1.set_title(
            f"Composite Strategy Portfolio  |  Total Return: {total_ret:+.1f}%  |  "
            f"Sharpe: {sharpe:.3f}  |  Max DD: {mdd:.1f}%  |  Trades: {n_trades}",
            color="white", fontsize=13, pad=10
        )
        ax1.set_ylabel("Equity (USDT)", color="white")
        ax1.tick_params(colors="white")
        ax1.legend(facecolor=bg, labelcolor="white", fontsize=9)
        for sp in ax1.spines.values(): sp.set_edgecolor("#444")

        # 2. Individual Strategy Equity (full width)
        ax2 = fig.add_subplot(gs[1, :])
        ax2.set_facecolor(bg)
        ax2.plot(btc_eq.index, btc_eq.values, color=COLORS["BTC/USDT"], lw=1.8,
                 label=f"BTC Long ({btc_eq.iloc[-1]:.0f} USDT, {stats_btc['Total Return (%)']:+.1f}%)")
        for sym, res in alt_results.items():
            c = COLORS.get(sym, "#aaa")
            label_sym = sym.split("/")[0]
            st = next((s for s in alt_stats_list if s["label"].startswith(label_sym)), {})
            ax2.plot(res["eq"].index, res["eq"].values, color=c, lw=1.2, alpha=0.85,
                     label=f"{label_sym} Short ({res['eq'].iloc[-1]:.0f} USDT, {st.get('Total Return (%)', 0):+.1f}%)")
        ax2.set_title("Individual Strategy Equity", color="white", fontsize=12)
        ax2.set_ylabel("Equity (USDT)", color="white")
        ax2.tick_params(colors="white")
        ax2.legend(facecolor=bg, labelcolor="white", fontsize=8, ncol=3)
        for sp in ax2.spines.values(): sp.set_edgecolor("#444")

        # 3. BTC Price + Turtle Signals (full width)
        ax3 = fig.add_subplot(gs[2, :])
        ax3.set_facecolor(bg)
        ax3.plot(btc_df.index, btc_df["close"], color=COLORS["BTC/USDT"], lw=1, alpha=0.9, label="BTC Price")
        ax3.plot(btc_df.index, btc_df["ma200"], color="white", lw=0.8, ls="--", alpha=0.5, label="MA200")
        if not btc_trades.empty:
            for _, t in btc_trades.iterrows():
                ax3.scatter(t["date_in"], t["price_in"], marker="^", color="lime", s=70, zorder=5)
                ax3.scatter(t["date_out"], t["price_out"],
                            marker="v", color="lime" if t["pnl"] > 0 else "tomato", s=70, zorder=5)
        ax3.set_title(
            f"BTC/USDT - Turtle Trend Following (Long Only)  |  {len(btc_trades)} trades",
            color="white", fontsize=11
        )
        ax3.set_ylabel("Price (USDT)", color="white")
        ax3.tick_params(colors="white")
        ax3.legend(facecolor=bg, labelcolor="white", fontsize=8)
        for sp in ax3.spines.values(): sp.set_edgecolor("#444")

        # 4. Alt charts (2 per row)
        alt_items = list(alt_results.items())
        for idx, (sym, res) in enumerate(alt_items):
            row = 3 + idx // 2
            col = idx % 2
            ax = fig.add_subplot(gs[row, col])
            ax.set_facecolor(bg)
            c = COLORS.get(sym, "#aaa")
            ax.plot(res["df"].index, res["df"]["close"], color=c, lw=1, alpha=0.9)
            div_pts = res["df"][res["df"]["divergence_top"].notna()]
            ax.scatter(div_pts.index, div_pts["divergence_top"], marker="v", color="orange", s=60, zorder=5, label="OBV Div")
            entry_pts = res["df"][res["df"]["short_signal"] == True]
            ax.scatter(entry_pts.index, entry_pts["close"], marker="v", color="tomato", s=90, zorder=6, label="Short Entry")
            sym_trades = all_trades[all_trades["symbol"] == sym] if not all_trades.empty else pd.DataFrame()
            if not sym_trades.empty:
                for _, t in sym_trades.iterrows():
                    color_exit = "lime" if t["pnl"] > 0 else "tomato"
                    ax.scatter(t["date_out"], t["price_out"], marker="^", color=color_exit, s=60, zorder=7)
            st = next((s for s in alt_stats_list if s["label"].startswith(sym.split("/")[0])), {})
            ax.set_title(
                f"{sym} - OBV Short  |  {len(sym_trades)} trades  |  {st.get('Total Return (%)', 0):+.1f}%",
                color="white", fontsize=10
            )
            ax.set_ylabel("Price", color="white")
            ax.tick_params(colors="white", labelsize=8)
            ax.legend(facecolor=bg, labelcolor="white", fontsize=7)
            for sp in ax.spines.values(): sp.set_edgecolor("#444")

        # Last row: PnL distribution + Stats table
        last_row = 3 + (n_alts + 1) // 2
        ax_pnl = fig.add_subplot(gs[last_row, 0])
        ax_pnl.set_facecolor(bg)
        if not all_trades.empty and "pnl" in all_trades.columns:
            colors_bar = ["#00ff88" if p > 0 else "#ff3366" for p in all_trades["pnl"]]
            ax_pnl.bar(range(len(all_trades)), all_trades["pnl"].values, color=colors_bar, width=0.7)
            ax_pnl.axhline(0, color="white", lw=0.8, alpha=0.5)
        ax_pnl.set_title(f"Per-Trade PnL Distribution  ({len(all_trades)} trades)", color="white", fontsize=10)
        ax_pnl.set_xlabel("Trade #", color="white")
        ax_pnl.set_ylabel("PnL (USDT)", color="white")
        ax_pnl.tick_params(colors="white", labelsize=8)
        for sp in ax_pnl.spines.values(): sp.set_edgecolor("#444")

        # Stats table
        ax_tbl = fig.add_subplot(gs[last_row, 1])
        ax_tbl.set_facecolor(bg)
        ax_tbl.axis("off")
        all_stats = [stats_portfolio, stats_btc] + alt_stats_list
        keys_show = ["Total Return (%)", "Annual Return (%)", "Max Drawdown (%)",
                     "Sharpe Ratio", "Total Trades", "Win Rate (%)", "Profit Factor"]
        col_labels = [s["label"] for s in all_stats]
        cell_data = [[str(s.get(k, "-")) for s in all_stats] for k in keys_show]
        tbl = ax_tbl.table(
            cellText=cell_data,
            rowLabels=keys_show,
            colLabels=col_labels,
            cellLoc="center", loc="center"
        )
        tbl.auto_set_font_size(False)
        tbl.set_fontsize(8)
        for (r, c), cell in tbl.get_celld().items():
            cell.set_facecolor("#1c2128" if r % 2 == 0 else "#161b22")
            cell.set_text_props(color="white")
            cell.set_edgecolor("#444")
        ax_tbl.set_title("Performance Summary", color="white", fontsize=10, pad=8)

        fig.suptitle(
            "Composite Quant Strategy  —  BTC Turtle Long + Multi-Alt OBV Short",
            color="white", fontsize=16, y=0.995
        )

        report_path = os.path.join(OUTPUT_DIR, "report.png")
        plt.savefig(report_path, dpi=150, bbox_inches="tight", facecolor="#0d1117")
        plt.close()
        print(f"  Report saved: {report_path}")
        return report_path


if __name__ == "__main__":
    config = deepcopy(default_config)
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1]) as f:
            config = deep_merge(config, json.load(f))
        print(f"Loaded config from {sys.argv[1]}")
    else:
        print("Using default config.")

    runner = BacktestRunner(config)
    runner.run()
