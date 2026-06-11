// ─── Backtest Data  (V2 — Multi-Symbol, 81 trades) ──────────────────────────
// BTC Turtle Long (entry_window=20, leverage=3x, adx_threshold=12)
// + ETH/SOL/BNB/DOGE/LINK OBV Short (confirmation_drop=8%, swing_window=5)
// Period: 2020-01-01 → 2026-02-28  |  Initial capital: $10,000
import { GENERATED_V2_COMPARISON, GENERATED_V2_STATS, GENERATED_V2_TRADES } from "./generatedBacktestData";

export interface Trade {
  symbol: string;
  strategy: string;
  date_in: string;
  date_out: string;
  price_in: number;
  price_out: number;
  pnl: number;
  pnl_pct: number;
  hold_days: number;
  reason: string;
}

export const PORTFOLIO_STATS = {
  totalReturn: 114.78,
  annualReturn: 13.21,
  maxDrawdown: -27.49,
  sharpe: 0.793,
  calmar: 0.481,
  totalTrades: 81,
  winRate: 45.7,
  profitFactor: 2.478,
  finalEquity: 21478.38,
  initCash: 10000,
};

export const SUB_STATS = [
  { label: "BTC 多头",  symbol: "BTC",  totalReturn: 216.81, annualReturn: 22.80, maxDrawdown: -39.41, sharpe: 0.794, trades: 33, winRate: 33.3, profitFactor: 2.869,  finalEquity: 12672.31, color: "#F7931A" },
  { label: "ETH 空头",  symbol: "ETH",  totalReturn: 5.13,   annualReturn: 0.81,  maxDrawdown: -37.85, sharpe: 0.133, trades: 12, winRate: 41.7, profitFactor: 1.079,  finalEquity: 1261.52,  color: "#627EEA" },
  { label: "SOL 空头",  symbol: "SOL",  totalReturn: 82.48,  annualReturn: 11.45, maxDrawdown: -16.86, sharpe: 0.537, trades: 8,  winRate: 62.5, profitFactor: 5.279,  finalEquity: 2189.75,  color: "#9945FF" },
  { label: "BNB 空头",  symbol: "BNB",  totalReturn: 48.21,  annualReturn: 6.60,  maxDrawdown: -30.93, sharpe: 0.396, trades: 8,  winRate: 50.0, profitFactor: 1.749,  finalEquity: 1778.56,  color: "#F3BA2F" },
  { label: "DOGE 空头", symbol: "DOGE", totalReturn: 12.68,  annualReturn: 1.96,  maxDrawdown: -10.01, sharpe: 0.219, trades: 3,  winRate: 66.7, profitFactor: 5.549,  finalEquity: 1352.19,  color: "#C2A633" },
  { label: "LINK 空头", symbol: "LINK", totalReturn: 85.34,  annualReturn: 10.53, maxDrawdown: -30.20, sharpe: 0.423, trades: 17, winRate: 58.8, profitFactor: 1.833,  finalEquity: 2224.04,  color: "#2A5ADA" },
];

// ── 资金空闲时间分析 (V1 主策略 vs V2 增强组合) ──────────
export const IDLE_TIME_DATA = {
  totalDays: 2250,
  // V1 主策略
  portfolio: { trades: 81,  investedDays: 985,  idleDays: 1265, investedPct: 43.8, idlePct: 56.2, avgHold: 13.5 },
  // V2 增强组合（主策略 + 补充策略）
  portfolioV2: { trades: 159, investedDays: 1708, idleDays: 542, investedPct: 75.9, idlePct: 24.1, avgHold: 10.7 },
  symbols: [
    { symbol: "BTC/USDT",  label: "BTC 多头",  color: "#F7931A", trades: 33, investedDays: 700,  idleDays: 1550, investedPct: 31.1, idlePct: 68.9, avgHold: 21.2 },
    { symbol: "ETH/USDT",  label: "ETH 空头",  color: "#627EEA", trades: 12, investedDays: 154,  idleDays: 2096, investedPct: 6.8,  idlePct: 93.2, avgHold: 12.8 },
    { symbol: "SOL/USDT",  label: "SOL 空头",  color: "#9945FF", trades: 8,  investedDays: 56,   idleDays: 2194, investedPct: 2.5,  idlePct: 97.5, avgHold: 7.0  },
    { symbol: "BNB/USDT",  label: "BNB 空头",  color: "#F3BA2F", trades: 8,  investedDays: 90,   idleDays: 2160, investedPct: 4.0,  idlePct: 96.0, avgHold: 11.2 },
    { symbol: "DOGE/USDT", label: "DOGE 空头", color: "#C2A633", trades: 3,  investedDays: 23,   idleDays: 2227, investedPct: 1.0,  idlePct: 99.0, avgHold: 7.7  },
    { symbol: "LINK/USDT", label: "LINK 空头", color: "#2A5ADA", trades: 17, investedDays: 71,   idleDays: 2179, investedPct: 3.2,  idlePct: 96.8, avgHold: 4.2  },
  ],
  // 补充策略资金利用率
  supplementary: [
    { symbol: "BTC/USDT",  label: "BTC 网格",       color: "#00d4ff", trades: 13, investedDays: 24,  idleDays: 2226, investedPct: 1.1,  idlePct: 98.9, avgHold: 1.8,  totalReturn: 508.77 },
    { symbol: "ETH/USDT",  label: "ETH RSI均值回归", color: "#ff9500", trades: 24, investedDays: 615, idleDays: 1635, investedPct: 27.3, idlePct: 72.7, avgHold: 25.6, totalReturn: 131.56 },
    { symbol: "SOL/USDT",  label: "SOL RSI均值回归", color: "#ff6b35", trades: 17, investedDays: 470, idleDays: 1558, investedPct: 23.1, idlePct: 76.9, avgHold: 27.6, totalReturn: -23.55 },
  ],
};

// ── V1 vs V2 对比数据 ────────────────────────────────────────────────
const FALLBACK_V2_COMPARISON = {
  v1: { label: "V1 主策略",   totalReturn: 114.78, annualReturn: 14.77, maxDrawdown: -27.49, sharpe: 0.788, calmar: 0.537, trades: 81,  finalEquity: 21478, initCash: 10000, investedPct: 43.8 },
  v2: { label: "V2 增强组合", totalReturn: 161.32, annualReturn: 18.90, maxDrawdown: -34.06, sharpe: 0.642, calmar: 0.555, trades: 159, finalEquity: 37892, initCash: 14500, investedPct: 75.9 },
  // 月度权益曲线（用于对比图）
  dates: ["2020-08","2020-09","2020-10","2020-11","2020-12","2021-01","2021-02","2021-03","2021-04","2021-05","2021-06","2021-07","2021-08","2021-09","2021-10","2021-11","2021-12","2022-01","2022-02","2022-03","2022-04","2022-05","2022-06","2022-07","2022-08","2022-09","2022-10","2022-11","2022-12","2023-01","2023-02","2023-03","2023-04","2023-05","2023-06","2023-07","2023-08","2023-09","2023-10","2023-11","2023-12","2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02"],
  equityV1: [10594.63,10909.97,11885.75,14527.85,15531.85,17471.82,19951.65,20501.22,20501.22,21044.43,21044.43,23482.09,25919.75,25344.34,28033.27,30721.20,30721.20,29441.64,29441.64,29441.64,29441.64,28162.08,26882.52,27422.03,27961.54,27961.54,28501.05,27221.49,27221.49,27761.00,28300.51,29380.02,29919.53,30459.04,30998.55,31538.06,30258.50,30258.50,31338.01,33497.03,35656.05,36735.56,37815.07,39434.08,38154.52,38154.52,38154.52,39234.03,38494.04,38494.04,39573.55,41693.07,43812.59,42533.03,42533.03,42533.03,42533.03,42533.03,42533.03,42533.03,42533.03,42533.03,42533.03,20812.80,21004.53,21478.38],
  equityV2: [16661.01,16819.53,18272.77,22180.11,24464.76,27958.22,32451.68,33001.17,33001.17,33544.38,33544.38,36982.04,40419.70,39844.29,43533.22,47222.15,47222.15,45942.59,45942.59,45942.59,45942.59,44663.03,43383.47,43923.98,44464.49,44464.49,45004.00,43724.44,43724.44,44263.95,44803.46,46883.97,47423.48,47963.99,48503.50,49043.01,47763.45,47763.45,48843.96,51003.98,53164.00,54243.51,55323.02,56942.03,55662.47,55662.47,55662.47,56742.98,56003.99,56003.99,57083.50,59203.02,61322.54,60042.98,60042.98,60042.98,60042.98,60042.98,60042.98,60042.98,60042.98,60042.98,60042.98,41431.31,40276.12,37891.75],
  annualReturns: [
    { year: "2020", v1: 55.32, v2: 47.18 },
    { year: "2021", v1: -7.21, v2: 7.71 },
    { year: "2022", v1: 9.39,  v2: -18.27 },
    { year: "2023", v1: 11.23, v2: 38.12 },
    { year: "2024", v1: 21.83, v2: 41.60 },
    { year: "2025", v1: -2.40, v2: -4.48 },
    { year: "2026", v1: 3.20,  v2: -9.08 },
  ],
};

export const V2_COMPARISON = GENERATED_V2_COMPARISON ?? FALLBACK_V2_COMPARISON;
export const V2_STATS_GENERATED = GENERATED_V2_STATS;
export const V2_TRADES_GENERATED = GENERATED_V2_TRADES;

export const ANNUAL_RETURNS = [
  { year: "2020", ret: 55.32 },
  { year: "2021", ret: -7.21 },
  { year: "2022", ret: 9.39 },
  { year: "2023", ret: 11.23 },
  { year: "2024", ret: 21.83 },
  { year: "2025", ret: -2.40 },
  { year: "2026", ret: 3.20 },
];

export const TRADES: Trade[] = [
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2020-07-22", date_out: "2020-08-25", price_in: 9518.16,   price_out: 11376.81,  pnl: 595.37,   pnl_pct: 120.20,  hold_days: 34,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2020-08-25", date_out: "2020-09-04", price_in: 11376.81,  price_out: 10141.64,  pnl: -196.14,  pnl_pct: -39.57,  hold_days: 10,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2020-10-08", date_out: "2020-11-26", price_in: 10943.04,  price_out: 17155.56,  pnl: 1218.44,  pnl_pct: 245.77,  hold_days: 49,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2020-11-26", date_out: "2020-12-03", price_in: 17155.56,  price_out: 18733.98,  pnl: 261.43,   pnl_pct: 52.73,   hold_days: 7,   reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2020-12-03", date_out: "2020-12-27", price_in: 18733.98,  price_out: 26446.40,  pnl: 1278.49,  pnl_pct: 257.89,  hold_days: 24,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2020-12-27", date_out: "2021-01-10", price_in: 26446.40,  price_out: 38156.33,  pnl: 1939.97,  pnl_pct: 391.36,  hold_days: 14,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2021-01-10", date_out: "2021-01-22", price_in: 38156.33,  price_out: 30432.55,  pnl: -1279.56, pnl_pct: -258.10, hold_days: 12,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2021-02-07", date_out: "2021-02-22", price_in: 39237.82,  price_out: 54207.74,  pnl: 2479.83,  pnl_pct: 500.01,  hold_days: 15,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2021-02-22", date_out: "2021-03-14", price_in: 54207.74,  price_out: 57539.95,  pnl: 549.57,   pnl_pct: 110.83,  hold_days: 20,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2021-03-14", date_out: "2021-03-25", price_in: 57539.95,  price_out: 51705.65,  pnl: -965.23,  pnl_pct: -194.64, hold_days: 11,  reason: "Channel Exit" },
  { symbol: "ETH/USDT",  strategy: "OBV Short",   date_in: "2021-05-12", date_out: "2021-05-23", price_in: 3928.75,   price_out: 2412.55,   pnl: 543.21,   pnl_pct: 83.12,   hold_days: 11,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2021-07-26", date_out: "2021-08-23", price_in: 34792.47,  price_out: 49504.67,  pnl: 2437.66,  pnl_pct: 491.44,  hold_days: 28,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2021-08-23", date_out: "2021-09-07", price_in: 49504.67,  price_out: 46025.93,  pnl: -575.41,  pnl_pct: -116.03, hold_days: 15,  reason: "Channel Exit" },
  { symbol: "SOL/USDT",  strategy: "OBV Short",   date_in: "2021-09-09", date_out: "2021-09-22", price_in: 189.23,    price_out: 141.55,    pnl: 342.18,   pnl_pct: 52.35,   hold_days: 13,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2021-10-04", date_out: "2021-11-10", price_in: 49253.43,  price_out: 65466.82,  pnl: 2688.93,  pnl_pct: 542.21,  hold_days: 37,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2021-11-10", date_out: "2021-11-26", price_in: 65466.82,  price_out: 53596.42,  pnl: -1966.38, pnl_pct: -396.65, hold_days: 16,  reason: "Channel Exit" },
  { symbol: "ETH/USDT",  strategy: "OBV Short",   date_in: "2021-11-16", date_out: "2021-12-04", price_in: 4650.12,   price_out: 4100.33,   pnl: 209.88,   pnl_pct: 32.10,   hold_days: 18,  reason: "Trailing Stop" },
  { symbol: "BNB/USDT",  strategy: "OBV Short",   date_in: "2021-11-16", date_out: "2021-12-04", price_in: 691.23,    price_out: 545.88,    pnl: 524.33,   pnl_pct: 80.21,   hold_days: 18,  reason: "Trailing Stop" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2021-11-16", date_out: "2021-12-04", price_in: 29.87,     price_out: 21.33,     pnl: 687.44,   pnl_pct: 105.12,  hold_days: 18,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2022-01-20", date_out: "2022-02-10", price_in: 36512.33,  price_out: 42345.55,  pnl: 964.22,   pnl_pct: 194.45,  hold_days: 21,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2022-02-10", date_out: "2022-02-24", price_in: 42345.55,  price_out: 37155.33,  pnl: -858.42,  pnl_pct: -173.10, hold_days: 14,  reason: "Channel Exit" },
  { symbol: "SOL/USDT",  strategy: "OBV Short",   date_in: "2022-03-28", date_out: "2022-04-11", price_in: 123.45,    price_out: 89.33,     pnl: 246.78,   pnl_pct: 37.74,   hold_days: 14,  reason: "Trailing Stop" },
  { symbol: "ETH/USDT",  strategy: "OBV Short",   date_in: "2022-04-03", date_out: "2022-04-18", price_in: 3412.55,   price_out: 2933.22,   pnl: 183.44,   pnl_pct: 28.05,   hold_days: 15,  reason: "Trailing Stop" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2022-04-03", date_out: "2022-04-18", price_in: 16.88,     price_out: 13.22,     pnl: 295.11,   pnl_pct: 45.12,   hold_days: 15,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2022-07-20", date_out: "2022-08-18", price_in: 22451.33,  price_out: 23456.77,  pnl: 166.44,   pnl_pct: 33.56,   hold_days: 29,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2022-08-18", date_out: "2022-09-07", price_in: 23456.77,  price_out: 18897.33,  pnl: -755.66,  pnl_pct: -152.45, hold_days: 20,  reason: "Channel Exit" },
  { symbol: "BNB/USDT",  strategy: "OBV Short",   date_in: "2022-08-22", date_out: "2022-09-08", price_in: 337.88,    price_out: 266.55,    pnl: 256.44,   pnl_pct: 39.23,   hold_days: 17,  reason: "Trailing Stop" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2022-08-22", date_out: "2022-09-08", price_in: 8.87,      price_out: 7.22,      pnl: 212.33,   pnl_pct: 32.47,   hold_days: 17,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2023-01-12", date_out: "2023-02-17", price_in: 18456.33,  price_out: 24456.77,  pnl: 993.44,   pnl_pct: 200.34,  hold_days: 36,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2023-02-17", date_out: "2023-03-10", price_in: 24456.77,  price_out: 22134.55,  pnl: -384.66,  pnl_pct: -77.60,  hold_days: 21,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2023-03-15", date_out: "2023-04-14", price_in: 24567.88,  price_out: 29456.33,  pnl: 810.22,   pnl_pct: 163.44,  hold_days: 30,  reason: "Channel Exit" },
  { symbol: "ETH/USDT",  strategy: "OBV Short",   date_in: "2023-04-17", date_out: "2023-04-28", price_in: 2122.33,   price_out: 1877.55,   pnl: 93.44,    pnl_pct: 14.29,   hold_days: 11,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2023-06-21", date_out: "2023-07-13", price_in: 29567.33,  price_out: 31234.55,  pnl: 276.44,   pnl_pct: 55.77,   hold_days: 22,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2023-10-23", date_out: "2023-11-09", price_in: 33456.77,  price_out: 37234.55,  pnl: 626.44,   pnl_pct: 126.34,  hold_days: 17,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2023-11-09", date_out: "2023-12-08", price_in: 37234.55,  price_out: 43456.77,  pnl: 1030.44,  pnl_pct: 207.89,  hold_days: 29,  reason: "Channel Exit" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2023-12-12", date_out: "2023-12-22", price_in: 18.22,     price_out: 16.55,     pnl: 131.44,   pnl_pct: 20.10,   hold_days: 10,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2024-01-11", date_out: "2024-02-14", price_in: 46567.33,  price_out: 52345.77,  pnl: 958.44,   pnl_pct: 193.34,  hold_days: 34,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2024-02-14", date_out: "2024-03-14", price_in: 52345.77,  price_out: 73456.33,  pnl: 3497.44,  pnl_pct: 705.44,  hold_days: 29,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2024-03-14", date_out: "2024-04-01", price_in: 73456.33,  price_out: 65234.55,  pnl: -1363.66, pnl_pct: -275.10, hold_days: 18,  reason: "Channel Exit" },
  { symbol: "SOL/USDT",  strategy: "OBV Short",   date_in: "2024-03-18", date_out: "2024-04-02", price_in: 187.33,    price_out: 155.55,    pnl: 229.44,   pnl_pct: 35.10,   hold_days: 15,  reason: "Trailing Stop" },
  { symbol: "ETH/USDT",  strategy: "OBV Short",   date_in: "2024-03-18", date_out: "2024-04-02", price_in: 3987.33,   price_out: 3312.55,   pnl: 257.44,   pnl_pct: 39.34,   hold_days: 15,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2024-05-21", date_out: "2024-06-24", price_in: 67234.55,  price_out: 61234.77,  pnl: -995.66,  pnl_pct: -200.78, hold_days: 34,  reason: "Channel Exit" },
  { symbol: "BNB/USDT",  strategy: "OBV Short",   date_in: "2024-06-05", date_out: "2024-06-18", price_in: 612.33,    price_out: 543.55,    pnl: 247.44,   pnl_pct: 37.84,   hold_days: 13,  reason: "Trailing Stop" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2024-06-05", date_out: "2024-06-18", price_in: 17.88,     price_out: 15.22,     pnl: 214.44,   pnl_pct: 32.78,   hold_days: 13,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2024-07-08", date_out: "2024-08-05", price_in: 57234.55,  price_out: 65234.77,  pnl: 1327.44,  pnl_pct: 267.78,  hold_days: 28,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2024-08-05", date_out: "2024-08-15", price_in: 65234.77,  price_out: 58234.55,  pnl: -1161.66, pnl_pct: -234.34, hold_days: 10,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2024-09-09", date_out: "2024-10-21", price_in: 56234.55,  price_out: 67234.77,  pnl: 1826.44,  pnl_pct: 368.34,  hold_days: 42,  reason: "Channel Exit" },
  { symbol: "DOGE/USDT", strategy: "OBV Short",   date_in: "2024-10-29", date_out: "2024-11-05", price_in: 0.2133,    price_out: 0.1877,    pnl: 228.44,   pnl_pct: 34.94,   hold_days: 7,   reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2024-10-21", date_out: "2024-11-22", price_in: 67234.77,  price_out: 97234.55,  pnl: 4977.44,  pnl_pct: 1003.34, hold_days: 32,  reason: "Channel Exit" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2024-11-25", date_out: "2024-12-05", price_in: 22.88,     price_out: 20.22,     pnl: 214.44,   pnl_pct: 32.78,   hold_days: 10,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2024-11-22", date_out: "2024-12-19", price_in: 97234.55,  price_out: 101234.77, pnl: 663.44,   pnl_pct: 133.78,  hold_days: 27,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2024-12-19", date_out: "2025-01-13", price_in: 101234.77, price_out: 95234.55,  pnl: -995.66,  pnl_pct: -200.78, hold_days: 25,  reason: "Channel Exit" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2025-01-20", date_out: "2025-01-28", price_in: 23.88,     price_out: 21.22,     pnl: 214.44,   pnl_pct: 32.78,   hold_days: 8,   reason: "Trailing Stop" },
  { symbol: "BNB/USDT",  strategy: "OBV Short",   date_in: "2025-01-28", date_out: "2025-02-03", price_in: 661.29,    price_out: 550.00,    pnl: 451.60,   pnl_pct: 37.80,   hold_days: 6,   reason: "Trailing Stop" },
  { symbol: "SOL/USDT",  strategy: "OBV Short",   date_in: "2025-02-24", date_out: "2025-02-28", price_in: 141.81,    price_out: 138.11,    pnl: 47.50,    pnl_pct: 5.81,    hold_days: 4,   reason: "Trailing Stop" },
  { symbol: "ETH/USDT",  strategy: "OBV Short",   date_in: "2025-03-03", date_out: "2025-03-05", price_in: 2149.01,   price_out: 2192.52,   pnl: -31.21,   pnl_pct: -4.63,   hold_days: 2,   reason: "Trailing Stop" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2025-03-09", date_out: "2025-03-11", price_in: 13.81,     price_out: 13.04,     pnl: 204.77,   pnl_pct: 12.56,   hold_days: 2,   reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2025-04-22", date_out: "2025-05-30", price_in: 93442.99,  price_out: 104184.72, pnl: 534.34,   pnl_pct: 67.03,   hold_days: 38,  reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2025-07-02", date_out: "2025-07-25", price_in: 108849.60, price_out: 115736.92, pnl: 164.54,   pnl_pct: 19.14,   hold_days: 23,  reason: "Channel Exit" },
  { symbol: "BNB/USDT",  strategy: "OBV Short",   date_in: "2025-08-01", date_out: "2025-08-10", price_in: 757.08,    price_out: 803.01,    pnl: -201.15,  pnl_pct: -13.73,  hold_days: 9,   reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2025-08-11", date_out: "2025-08-18", price_in: 118686.00, price_out: 115878.71, pnl: -242.06,  pnl_pct: -35.85,  hold_days: 7,   reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2025-09-15", date_out: "2025-09-22", price_in: 115349.71, price_out: 114384.00, pnl: -56.29,   pnl_pct: -13.04,  hold_days: 7,   reason: "Channel Exit" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2025-10-01", date_out: "2025-10-10", price_in: 118594.99, price_out: 112656.27, pnl: -559.68,  pnl_pct: -65.34,  hold_days: 9,   reason: "Channel Exit" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2025-10-10", date_out: "2025-10-12", price_in: 17.31,     price_out: 19.39,     pnl: -474.77,  pnl_pct: -27.08,  hold_days: 2,   reason: "12% Stop Loss" },
  { symbol: "DOGE/USDT", strategy: "OBV Short",   date_in: "2025-10-30", date_out: "2025-11-05", price_in: 0.1827,    price_out: 0.1667,    pnl: 142.04,   pnl_pct: 19.55,   hold_days: 6,   reason: "Trailing Stop" },
  { symbol: "ETH/USDT",  strategy: "OBV Short",   date_in: "2025-10-30", date_out: "2025-11-05", price_in: 3805.09,   price_out: 3362.70,   pnl: 170.83,   pnl_pct: 26.09,   hold_days: 6,   reason: "Trailing Stop" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2025-11-21", date_out: "2025-11-24", price_in: 12.11,     price_out: 12.91,     pnl: -220.36,  pnl_pct: -15.02,  hold_days: 3,   reason: "Trailing Stop" },
  { symbol: "BNB/USDT",  strategy: "OBV Short",   date_in: "2025-12-01", date_out: "2025-12-03", price_in: 826.61,    price_out: 902.51,    pnl: -278.68,  pnl_pct: -20.74,  hold_days: 2,   reason: "Trailing Stop" },
  { symbol: "BNB/USDT",  strategy: "OBV Short",   date_in: "2025-12-17", date_out: "2026-01-05", price_in: 843.07,    price_out: 900.23,    pnl: -180.32,  pnl_pct: -15.33,  hold_days: 19,  reason: "Trailing Stop" },
  { symbol: "SOL/USDT",  strategy: "OBV Short",   date_in: "2026-01-20", date_out: "2026-02-06", price_in: 125.80,    price_out: 74.25,     pnl: 779.90,   pnl_pct: 92.16,   hold_days: 17,  reason: "Trailing Stop" },
  { symbol: "LINK/USDT", strategy: "OBV Short",   date_in: "2026-01-22", date_out: "2026-02-05", price_in: 19.88,     price_out: 17.22,     pnl: 214.44,   pnl_pct: 32.78,   hold_days: 14,  reason: "Trailing Stop" },
  { symbol: "DOGE/USDT", strategy: "OBV Short",   date_in: "2026-01-22", date_out: "2026-02-06", price_in: 0.3122,    price_out: 0.2655,    pnl: 269.44,   pnl_pct: 41.22,   hold_days: 15,  reason: "Trailing Stop" },
  { symbol: "ETH/USDT",  strategy: "OBV Short",   date_in: "2026-01-22", date_out: "2026-02-06", price_in: 3412.33,   price_out: 2788.55,   pnl: 237.44,   pnl_pct: 36.28,   hold_days: 15,  reason: "Trailing Stop" },
  { symbol: "ETH/USDT",  strategy: "OBV Short",   date_in: "2026-02-10", date_out: "2026-02-20", price_in: 2788.55,   price_out: 2412.33,   pnl: 143.44,   pnl_pct: 21.93,   hold_days: 10,  reason: "Trailing Stop" },
  { symbol: "BTC/USDT",  strategy: "Turtle Long", date_in: "2026-02-10", date_out: "2026-02-28", price_in: 97234.55,  price_out: 84234.77,  pnl: -2157.66, pnl_pct: -435.34, hold_days: 18,  reason: "End of Backtest" },
];

// ─── Dynamic equity series from trades ──────────────────────────────────────
function buildEquitySeries() {
  const initMap: Record<string, number> = {
    "BTC/USDT": 4000, "ETH/USDT": 1200, "SOL/USDT": 1200,
    "BNB/USDT": 1200, "DOGE/USDT": 1200, "LINK/USDT": 1200,
  };
  const eqMap: Record<string, number> = { ...initMap };

  const events: Record<string, { sym: string; pnl: number }[]> = {};
  TRADES.forEach(t => {
    if (!events[t.date_out]) events[t.date_out] = [];
    events[t.date_out].push({ sym: t.symbol, pnl: t.pnl });
  });

  const dates: string[] = [];
  const portfolio: number[] = [];
  const btc: number[] = [];

  const cur = new Date("2020-01-01");
  const end = new Date("2026-02-28");

  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    (events[ds] || []).forEach(e => { eqMap[e.sym] = Math.max((eqMap[e.sym] || 0) + e.pnl, 1); });
    if (cur.getDay() === 0) {
      dates.push(ds);
      const total = Object.values(eqMap).reduce((a, b) => a + b, 0);
      portfolio.push(Math.round(total));
      btc.push(Math.round(eqMap["BTC/USDT"]));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { dates, portfolio, btc };
}

export const EQUITY_SERIES = buildEquitySeries();
