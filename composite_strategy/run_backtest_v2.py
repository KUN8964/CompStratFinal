"""
Enhanced Backtest V2 — 含补充策略的复合组合回测
新增：
  - BTC 现货网格交易（利用 BTC 多头空闲期资金）
  - ETH RSI 均值回归（利用山寨空头空闲期资金）
对比：
  - V1 组合（主策略）vs V2 组合（主策略 + 补充策略）
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
from strategies.grid_trading import GridTradingStrategy
from strategies.rsi_mean_reversion import RsiMeanReversionStrategy
from config import default_config

warnings.filterwarnings("ignore", category=FutureWarning, module="pandas")
matplotlib.use("Agg")

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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "data_output")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ─── 补充策略配置 ────────────────────────────────────────────────────────────
SUPPLEMENTARY_CONFIG = {
    "btc_grid": {
        "init_cash": 2000.0,     # 从 BTC 闲置资金池中划拨
        "grid_count": 12,
        "grid_pct": 0.012,       # 每格 1.2% 间距
        "position_pct": 0.07,    # 每格仓位 7%
        "rebalance_days": 20,    # 每 20 天重设网格中心
        "max_hold_pct": 0.55,
    },
    "eth_rsi": {
        "init_cash": 1500.0,     # 从 ETH 闲置资金池中划拨
        "rsi_period": 14,
        "oversold": 32,
        "overbought": 63,
        "stop_loss_pct": 0.09,
        "position_pct": 0.85,
    },
    "sol_rsi": {
        "init_cash": 1000.0,
        "rsi_period": 14,
        "oversold": 30,
        "overbought": 65,
        "stop_loss_pct": 0.10,
        "position_pct": 0.80,
    },
}


class BacktestRunnerV2:
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
        while True:
            ohlcv = exchange.fetch_ohlcv(symbol, timeframe, since=since_ts, limit=1000)
            if not ohlcv:
                break
            all_ohlcv.extend(ohlcv)
            since_ts = ohlcv[-1][0] + 1
            if len(ohlcv) < 1000:
                break
            time.sleep(0.3)
        df = pd.DataFrame(all_ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
        df.set_index("timestamp", inplace=True)
        df.to_csv(cache_path)
        print(f"  {symbol}: Fetched {len(df)} k-lines.")
        return df

    def run_all(self):
        cfg = self.config
        gen = cfg["general"]

        print("\n" + "="*60)
        print("  COMPOSITE STRATEGY V2 BACKTEST")
        print("  主策略 + 补充策略（网格 + RSI均值回归）")
        print("="*60)

        # ── 获取数据 ──────────────────────────────────────────────────
        print("\n[1/4] 获取行情数据...")
        symbols_needed = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "DOGE/USDT", "LINK/USDT"]
        data = {}
        for sym in symbols_needed:
            data[sym] = self.fetch_data(sym)

        # ── 主策略回测（与 V1 相同）──────────────────────────────────
        print("\n[2/4] 运行主策略回测...")
        all_equities = {}
        all_trades = []
        sub_stats = []

        # BTC 海龟
        btc_strat = BtcTurtleStrategy(cfg["btc_turtle"], gen)
        btc_eq_s, btc_trades_df = btc_strat.backtest(data["BTC/USDT"])
        all_equities["BTC多头"] = btc_eq_s
        all_trades.append(btc_trades_df)
        btc_final = btc_eq_s.iloc[-1]
        btc_init = cfg["btc_turtle"]["init_cash"]
        btc_ret = (btc_final / btc_init - 1) * 100
        sub_stats.append({"label": "BTC 多头", "symbol": "BTC", "color": "#F7931A",
                          "init_cash": btc_init, "final_equity": round(btc_final, 2),
                          "total_return": round(btc_ret, 2), "trades": len(btc_trades_df)})
        print(f"  BTC 海龟: {len(btc_trades_df)} 笔, 收益 {btc_ret:.2f}%")

        # 山寈 OBV 做空
        alt_symbols = cfg.get("alt_symbols", ["ETH/USDT", "SOL/USDT"])
        alt_cash = cfg.get("alt_cash_per_symbol", 1200.0)
        for sym in alt_symbols:
            strat = AltObvShortStrategy(cfg["alt_obv_short"], gen)
            eq_s, trades_df = strat.backtest(data[sym], symbol=sym, init_cash=alt_cash)
            key = sym.split("/")[0] + "空头"
            all_equities[key] = eq_s
            all_trades.append(trades_df)
            final = eq_s.iloc[-1]
            ret = (final / alt_cash - 1) * 100
            sub_stats.append({"label": sym.split("/")[0] + " 空头", "symbol": sym.split("/")[0],
                              "color": "#627EEA", "init_cash": alt_cash, "final_equity": round(final, 2),
                              "total_return": round(ret, 2), "trades": len(trades_df)})
            print(f"  {sym} OBV做空: {len(trades_df)} 笔, 收益 {ret:.2f}%")

        # ── 补充策略回测 ──────────────────────────────────────────────
        print("\n[3/4] 运行补充策略回测...")
        supp_equities = {}
        supp_trades = []
        supp_stats = []

        # BTC 网格
        grid_strat = GridTradingStrategy(gen, SUPPLEMENTARY_CONFIG["btc_grid"])
        grid_eq, grid_tr, grid_stat = grid_strat.run(data["BTC/USDT"])
        supp_equities["BTC网格"] = grid_eq["equity"]
        supp_trades.extend(grid_tr)
        supp_stats.append(grid_stat)
        print(f"  BTC 网格: {grid_stat['trades']} 笔卖出, 收益 {grid_stat['total_return']:.2f}%")

        # ETH RSI 均值回归
        eth_rsi_strat = RsiMeanReversionStrategy(gen, SUPPLEMENTARY_CONFIG["eth_rsi"])
        eth_rsi_eq, eth_rsi_tr, eth_rsi_stat = eth_rsi_strat.run(data["ETH/USDT"], "ETH/USDT")
        supp_equities["ETH均值回归"] = eth_rsi_eq["equity"]
        supp_trades.extend(eth_rsi_tr)
        supp_stats.append(eth_rsi_stat)
        print(f"  ETH RSI均值回归: {eth_rsi_stat['trades']} 笔, 收益 {eth_rsi_stat['total_return']:.2f}%")

        # SOL RSI 均值回归
        sol_rsi_strat = RsiMeanReversionStrategy(gen, SUPPLEMENTARY_CONFIG["sol_rsi"])
        sol_rsi_eq, sol_rsi_tr, sol_rsi_stat = sol_rsi_strat.run(data["SOL/USDT"], "SOL/USDT")
        supp_equities["SOL均值回归"] = sol_rsi_eq["equity"]
        supp_trades.extend(sol_rsi_tr)
        supp_stats.append(sol_rsi_stat)
        print(f"  SOL RSI均值回归: {sol_rsi_stat['trades']} 笔, 收益 {sol_rsi_stat['total_return']:.2f}%")

        # ── 合并权益曲线 ──────────────────────────────────────────────
        print("\n[4/4] 计算组合统计...")

        # 对齐日期索引
        common_idx = btc_eq_s.index
        for eq in list(all_equities.values()) + list(supp_equities.values()):
            common_idx = common_idx.intersection(eq.index)

        def align(series):
            return series.reindex(common_idx).ffill()

        # V1 组合（主策略）
        init_cash_v1 = (cfg["btc_turtle"]["init_cash"] +
                        len(alt_symbols) * cfg.get("alt_cash_per_symbol", 1200.0))
        main_eq_list = [align(eq) for eq in all_equities.values()]
        v1_equity = main_eq_list[0].copy()
        for s in main_eq_list[1:]:
            v1_equity = v1_equity + s

        # V2 组合（主策略 + 补充策略）
        supp_init = sum(s["init_cash"] for s in supp_stats)
        supp_eq_list = [align(eq) for eq in supp_equities.values()]
        v2_equity = v1_equity.copy()
        for s in supp_eq_list:
            v2_equity = v2_equity + s
        init_cash_v2 = init_cash_v1 + supp_init

        def calc_stats(equity_series, init_cash, label):
            eq = equity_series
            final = eq.iloc[-1]
            total_ret = (final - init_cash) / init_cash * 100
            years = (eq.index[-1] - eq.index[0]).days / 365.25
            annual_ret = ((final / init_cash) ** (1 / years) - 1) * 100 if years > 0 else 0
            roll_max = eq.cummax()
            dd = (eq - roll_max) / roll_max * 100
            max_dd = dd.min()
            daily_ret = eq.pct_change().dropna()
            sharpe = (daily_ret.mean() / daily_ret.std() * np.sqrt(252)) if daily_ret.std() > 0 else 0
            calmar = abs(annual_ret / max_dd) if max_dd != 0 else 0
            return {
                "label": label,
                "init_cash": init_cash,
                "final_equity": round(final, 2),
                "total_return": round(total_ret, 2),
                "annual_return": round(annual_ret, 2),
                "max_drawdown": round(max_dd, 2),
                "sharpe": round(sharpe, 3),
                "calmar": round(calmar, 3),
            }

        v1_stats = calc_stats(v1_equity, init_cash_v1, "V1 主策略")
        v2_stats = calc_stats(v2_equity, init_cash_v2, "V2 主策略+补充")

        # 计算 V2 资金利用率
        total_days = len(common_idx)
        # 合并 V1 交易记录
        all_trades_df = pd.concat([t for t in all_trades if not t.empty]) if any(not t.empty for t in all_trades) else pd.DataFrame()
        # V1 持仓天数：统计所有V1交易覆盖的唯一交易日
        if not all_trades_df.empty and "date_in" in all_trades_df.columns:
            v1_invested = len(set().union(*[
                set(pd.date_range(row["date_in"], row["date_out"]))
                for _, row in all_trades_df.iterrows()
                if pd.notna(row["date_in"]) and pd.notna(row["date_out"])
            ]))
        else:
            v1_invested = 0
        # V2 补充策略的持仓天数
        supp_invested = sum(s["invested_days"] for s in supp_stats)
        # 合并后的有效持仓天数（近似）
        v2_invested = min(total_days, v1_invested + supp_invested // 2)
        v2_invested_pct = round(v2_invested / total_days * 100, 1)
        v2_idle_pct = round(100 - v2_invested_pct, 1)

        total_trades_v2 = len(all_trades_df) + len(supp_trades)
        supp_trades_df = pd.DataFrame(supp_trades)
        all_trades_v2_df = pd.concat(
            [df for df in [all_trades_df, supp_trades_df] if not df.empty],
            ignore_index=True,
        ) if (not all_trades_df.empty or not supp_trades_df.empty) else pd.DataFrame()

        print(f"\n{'='*60}")
        print(f"  V1 主策略:  收益 {v1_stats['total_return']:.2f}%  夏普 {v1_stats['sharpe']:.3f}  MDD {v1_stats['max_drawdown']:.2f}%")
        print(f"  V2 组合:    收益 {v2_stats['total_return']:.2f}%  夏普 {v2_stats['sharpe']:.3f}  MDD {v2_stats['max_drawdown']:.2f}%")
        print(f"  V2 资金利用率: {v2_invested_pct}%  (V1: 43.8%)")
        print(f"  V2 总交易次数: {total_trades_v2}")
        print(f"{'='*60}\n")

        # ── 生成报告图 ────────────────────────────────────────────────
        self._plot_report(
            common_idx, v1_equity, v2_equity,
            all_equities, supp_equities,
            v1_stats, v2_stats, sub_stats, supp_stats,
            v1_invested_pct=43.8, v2_invested_pct=v2_invested_pct,
        )

        # ── 保存 JSON 数据供网站使用 ──────────────────────────────────
        self._save_json(
            common_idx, v1_equity, v2_equity,
            v1_stats, v2_stats, sub_stats, supp_stats,
            all_trades_v2_df,
            v2_invested_pct, v2_idle_pct, total_trades_v2,
        )

        if not all_trades_v2_df.empty:
            trades_path = os.path.join(OUTPUT_DIR, "trades_v2.csv")
            all_trades_v2_df.to_csv(trades_path, index=False)
            print(f"  V2 交易记录已保存: {trades_path}")

        return v2_stats

    def _plot_report(self, idx, v1_eq, v2_eq, main_eqs, supp_eqs,
                     v1_stats, v2_stats, sub_stats, supp_stats,
                     v1_invested_pct, v2_invested_pct):
        fig = plt.figure(figsize=(20, 16), facecolor="#0d1117")
        gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.45, wspace=0.35)

        DARK = "#0d1117"
        CARD = "#161b22"
        BORDER = "#30363d"
        TEXT = "#e6edf3"
        MUTED = "#8b949e"
        GREEN = "#00ff88"
        RED = "#ff3366"
        BLUE = "#00d4ff"
        ORANGE = "#F7931A"

        def style_ax(ax, title=""):
            ax.set_facecolor(CARD)
            ax.tick_params(colors=MUTED, labelsize=8)
            for spine in ax.spines.values():
                spine.set_color(BORDER)
            ax.grid(color=BORDER, linestyle="--", linewidth=0.5, alpha=0.5)
            if title:
                ax.set_title(title, color=TEXT, fontsize=10, fontweight="bold", pad=8)

        dates = idx.to_pydatetime()

        # 1. V1 vs V2 净值曲线对比
        ax1 = fig.add_subplot(gs[0, :2])
        style_ax(ax1, "V1 主策略 vs V2 增强组合 净值曲线")
        ax1.plot(dates, v1_eq.values / v1_eq.iloc[0], color=MUTED, linewidth=1.5, label=f"V1 主策略 +{v1_stats['total_return']:.1f}%", linestyle="--")
        ax1.plot(dates, v2_eq.values / v2_eq.iloc[0], color=GREEN, linewidth=2.0, label=f"V2 增强组合 +{v2_stats['total_return']:.1f}%")
        ax1.fill_between(dates, v1_eq.values / v1_eq.iloc[0], v2_eq.values / v2_eq.iloc[0],
                         where=v2_eq.values >= v1_eq.values, alpha=0.15, color=GREEN)
        ax1.set_ylabel("归一化净值", color=MUTED, fontsize=8)
        ax1.legend(loc="upper left", fontsize=8, framealpha=0.2, labelcolor=TEXT)
        ax1.axhline(1.0, color=BORDER, linewidth=0.8)

        # 2. 资金利用率对比（条形图）
        ax2 = fig.add_subplot(gs[0, 2])
        style_ax(ax2, "资金利用率对比")
        labels = ["V1 主策略", "V2 增强组合"]
        invested = [v1_invested_pct, v2_invested_pct]
        idle = [100 - v for v in invested]
        x = np.arange(len(labels))
        ax2.bar(x, invested, color=GREEN, alpha=0.8, label="持仓", width=0.5)
        ax2.bar(x, idle, bottom=invested, color=BORDER, alpha=0.6, label="空闲", width=0.5)
        ax2.set_xticks(x)
        ax2.set_xticklabels(labels, color=TEXT, fontsize=9)
        ax2.set_ylim(0, 110)
        ax2.set_ylabel("占比 (%)", color=MUTED, fontsize=8)
        for i, (inv, idl) in enumerate(zip(invested, idle)):
            ax2.text(i, inv / 2, f"{inv}%", ha="center", va="center", color=DARK, fontsize=10, fontweight="bold")
            ax2.text(i, inv + idl / 2, f"{idl}%", ha="center", va="center", color=MUTED, fontsize=9)
        ax2.legend(fontsize=8, framealpha=0.2, labelcolor=TEXT)

        # 3. 主策略子策略净值
        ax3 = fig.add_subplot(gs[1, :2])
        style_ax(ax3, "各子策略净值曲线（主策略）")
        colors_main = ["#F7931A", "#627EEA", "#9945FF", "#F3BA2F", "#C2A633", "#2A5ADA"]
        for (name, eq), color in zip(main_eqs.items(), colors_main):
            aligned = eq.reindex(idx).ffill()
            ax3.plot(dates, aligned.values / aligned.iloc[0], color=color, linewidth=1.2, label=name, alpha=0.85)
        ax3.set_ylabel("归一化净值", color=MUTED, fontsize=8)
        ax3.legend(loc="upper left", fontsize=7, framealpha=0.2, labelcolor=TEXT, ncol=3)
        ax3.axhline(1.0, color=BORDER, linewidth=0.8)

        # 4. 补充策略净值
        ax4 = fig.add_subplot(gs[1, 2])
        style_ax(ax4, "补充策略净值曲线")
        colors_supp = [BLUE, "#ff9500", "#ff6b35"]
        for (name, eq), color in zip(supp_eqs.items(), colors_supp):
            aligned = eq.reindex(idx).ffill()
            ax4.plot(dates, aligned.values / aligned.iloc[0], color=color, linewidth=1.5, label=name, alpha=0.9)
        ax4.set_ylabel("归一化净值", color=MUTED, fontsize=8)
        ax4.legend(loc="upper left", fontsize=8, framealpha=0.2, labelcolor=TEXT)
        ax4.axhline(1.0, color=BORDER, linewidth=0.8)

        # 5. 回撤对比
        ax5 = fig.add_subplot(gs[2, :2])
        style_ax(ax5, "V1 vs V2 最大回撤对比")
        for eq, color, label in [(v1_eq, MUTED, "V1"), (v2_eq, GREEN, "V2")]:
            roll_max = eq.cummax()
            dd = (eq - roll_max) / roll_max * 100
            ax5.fill_between(dates, dd.values, 0, color=color, alpha=0.3, label=label)
            ax5.plot(dates, dd.values, color=color, linewidth=0.8)
        ax5.set_ylabel("回撤 (%)", color=MUTED, fontsize=8)
        ax5.legend(fontsize=8, framealpha=0.2, labelcolor=TEXT)

        # 6. 关键指标对比表
        ax6 = fig.add_subplot(gs[2, 2])
        ax6.set_facecolor(CARD)
        ax6.axis("off")
        ax6.set_title("关键指标对比", color=TEXT, fontsize=10, fontweight="bold", pad=8)
        metrics = [
            ("总收益", f"{v1_stats['total_return']:.2f}%", f"{v2_stats['total_return']:.2f}%"),
            ("年化收益", f"{v1_stats['annual_return']:.2f}%", f"{v2_stats['annual_return']:.2f}%"),
            ("最大回撤", f"{v1_stats['max_drawdown']:.2f}%", f"{v2_stats['max_drawdown']:.2f}%"),
            ("夏普比率", f"{v1_stats['sharpe']:.3f}", f"{v2_stats['sharpe']:.3f}"),
            ("资金利用率", f"{v1_invested_pct}%", f"{v2_invested_pct}%"),
            ("期末净值", f"${v1_stats['final_equity']:,.0f}", f"${v2_stats['final_equity']:,.0f}"),
        ]
        col_labels = ["指标", "V1 主策略", "V2 增强"]
        table_data = [[m[0], m[1], m[2]] for m in metrics]
        tbl = ax6.table(
            cellText=table_data,
            colLabels=col_labels,
            loc="center",
            cellLoc="center",
        )
        tbl.auto_set_font_size(False)
        tbl.set_fontsize(9)
        for (r, c), cell in tbl.get_celld().items():
            cell.set_facecolor(DARK if r == 0 else CARD)
            cell.set_text_props(color=GREEN if c == 2 and r > 0 else (MUTED if r == 0 else TEXT))
            cell.set_edgecolor(BORDER)
            cell.set_linewidth(0.5)

        fig.suptitle(
            "复合量化策略 V2 — 主策略 + 补充策略 回测报告",
            color=TEXT, fontsize=14, fontweight="bold", y=0.98,
        )

        out_path = os.path.join(OUTPUT_DIR, "report_v2.png")
        plt.savefig(out_path, dpi=150, bbox_inches="tight", facecolor=DARK)
        plt.close()
        print(f"  报告已保存: {out_path}")

    def _save_json(self, idx, v1_eq, v2_eq, v1_stats, v2_stats,
                   sub_stats, supp_stats, trades_df,
                   v2_invested_pct, v2_idle_pct, total_trades_v2):
        # 每月净值（用于年度收益计算）
        v2_monthly = v2_eq.resample("ME").last()
        annual_returns = {}
        for year, grp in v2_monthly.groupby(v2_monthly.index.year):
            if len(grp) >= 2:
                ret = (grp.iloc[-1] / grp.iloc[0] - 1) * 100
            else:
                ret = 0
            annual_returns[str(year)] = round(ret, 2)

        # 逐年收益（基于年初年末）
        v2_annual = []
        for yr in range(2020, 2027):
            yr_data = v2_eq[v2_eq.index.year == yr]
            if len(yr_data) >= 2:
                ret = (yr_data.iloc[-1] / yr_data.iloc[0] - 1) * 100
                v2_annual.append({"year": str(yr), "ret": round(ret, 2)})

        # 权益曲线（每月采样）
        v1_monthly_eq = v1_eq.resample("ME").last()
        v2_monthly_eq = v2_eq.resample("ME").last()
        common_m = v1_monthly_eq.index.intersection(v2_monthly_eq.index)

        data_out = {
            "v1_stats": v1_stats,
            "v2_stats": v2_stats,
            "sub_stats": sub_stats,
            "supp_stats": supp_stats,
            "v2_annual": v2_annual,
            "v2_invested_pct": v2_invested_pct,
            "v2_idle_pct": v2_idle_pct,
            "total_trades_v2": total_trades_v2,
            "equity_dates": [str(d.date()) for d in common_m],
            "equity_v1": [round(v, 2) for v in v1_monthly_eq.reindex(common_m).values],
            "equity_v2": [round(v, 2) for v in v2_monthly_eq.reindex(common_m).values],
            "trades": self._serialize_trades(trades_df),
        }

        out_path = os.path.join(OUTPUT_DIR, "backtest_v2_data.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data_out, f, ensure_ascii=False, indent=2)
        print(f"  JSON 数据已保存: {out_path}")

        legacy_path = "/tmp/backtest_v2_data.json"
        try:
            with open(legacy_path, "w", encoding="utf-8") as f:
                json.dump(data_out, f, ensure_ascii=False, indent=2)
            print(f"  兼容 JSON 数据已保存: {legacy_path}")
        except OSError:
            pass

    @staticmethod
    def _serialize_trades(trades_df):
        if trades_df is None or trades_df.empty:
            return []
        out = trades_df.copy()
        for col in ["date_in", "date_out"]:
            if col in out.columns:
                out[col] = pd.to_datetime(out[col], errors="coerce").dt.strftime("%Y-%m-%d")
        return out.replace({np.nan: None}).to_dict(orient="records")


def deep_merge(base, override):
    """Recursively merge user config into defaults without dropping nested keys."""
    merged = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


if __name__ == "__main__":
    config = deepcopy(default_config)
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1]) as f:
            config = deep_merge(config, json.load(f))

    runner = BacktestRunnerV2(config)
    runner.run_all()
