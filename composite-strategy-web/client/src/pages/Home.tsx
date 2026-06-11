/*
 * DESIGN: 暗色量化终端风格 — Bloomberg Terminal 美学
 * Space Grotesk (UI) + JetBrains Mono (data) + Noto Sans SC (Chinese)
 * Colors: #0d1117 bg / #00ff88 accent / #F7931A BTC / #627EEA ETH / #9945FF SOL
 */
import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { TRADES, PORTFOLIO_STATS, SUB_STATS, ANNUAL_RETURNS, EQUITY_SERIES, IDLE_TIME_DATA, V2_COMPARISON } from "@/lib/data";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  RadialBarChart, RadialBar,
} from "recharts";

// ─── Nav ────────────────────────────────────────────────────────────────────
const TABS = ["概览", "净值曲线", "交易记录", "资金分析", "参数配置", "策略说明", "借鉴分析"] as const;
type Tab = typeof TABS[number];

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 6, padding: "8px 12px" }}>
      <p style={{ color: "#8b949e", fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color = "#e6edf3", sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Section: Overview ───────────────────────────────────────────────────────
function OverviewSection() {
  const pnlData = TRADES.map((t, i) => ({ name: `#${i + 1}`, pnl: t.pnl, fill: t.pnl > 0 ? "#00ff88" : "#ff3366" }));
  const allocationData = [
    { name: "BTC 多头 40%", value: 40, color: "#F7931A" },
    { name: "ETH 空头 12%", value: 12, color: "#627EEA" },
    { name: "SOL 空头 12%", value: 12, color: "#9945FF" },
    { name: "BNB 空头 12%", value: 12, color: "#F3BA2F" },
    { name: "DOGE 空头 12%", value: 12, color: "#C2A633" },
    { name: "LINK 空头 12%", value: 12, color: "#2A5ADA" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <StatCard label="组合总收益" value="+114.78%" color="#00ff88" />
        <StatCard label="年化收益" value="+13.21%" color="#00ff88" />
        <StatCard label="最大回撤" value="-27.49%" color="#ff3366" />
        <StatCard label="夏普比率" value="0.793" color="#00d4ff" />
        <StatCard label="总交易次数" value="81" />
        <StatCard label="期末净値" value="$21,478" color="#F7931A" sub="初始 $10,000" />
      </div>

      {/* Sub-strategy table + Annual returns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">子策略绩效对比</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["策略", "总收益", "年化", "最大回撤", "夏普", "胜率", "盈利因子"].map(h => (
                  <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUB_STATS.map(s => (
                <tr key={s.symbol} style={{ borderBottom: "1px solid #1c2128" }}>
                  <td style={{ padding: "10px 10px" }}>
                    <span className={`tag-${s.symbol.toLowerCase()}`}>{s.label}</span>
                  </td>
                  <td style={{ padding: "10px 10px", color: "#00ff88", fontFamily: "JetBrains Mono, monospace" }}>+{s.totalReturn}%</td>
                  <td style={{ padding: "10px 10px", color: "#00ff88", fontFamily: "JetBrains Mono, monospace" }}>+{s.annualReturn}%</td>
                  <td style={{ padding: "10px 10px", color: "#ff3366", fontFamily: "JetBrains Mono, monospace" }}>{s.maxDrawdown}%</td>
                  <td style={{ padding: "10px 10px", color: "#00d4ff", fontFamily: "JetBrains Mono, monospace" }}>{s.sharpe}</td>
                  <td style={{ padding: "10px 10px", fontFamily: "JetBrains Mono, monospace" }}>{s.winRate}%</td>
                  <td style={{ padding: "10px 10px", fontFamily: "JetBrains Mono, monospace" }}>{s.profitFactor === Infinity ? "∞" : s.profitFactor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">逐年收益率</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ANNUAL_RETURNS} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
              <XAxis dataKey="year" tick={{ fill: "#8b949e", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} tickFormatter={v => v + "%"} />
              <Tooltip content={<DarkTooltip />} formatter={(v: number) => [v + "%", "年化收益"]} />
              <Bar dataKey="ret" name="年化收益" radius={[4, 4, 0, 0]}>
                {ANNUAL_RETURNS.map((entry, index) => (
                  <Cell key={index} fill={entry.ret >= 0 ? "#00ff88" : "#ff3366"} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Allocation + PnL distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">资金分配</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={allocationData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allocationData.map(d => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#8b949e" }}>{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">每笔交易盈亏分布</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={pnlData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
              <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 9 }} />
              <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} tickFormatter={v => "$" + v} />
              <Tooltip content={<DarkTooltip />} formatter={(v: number) => ["$" + v.toFixed(2), "盈亏"]} />
              <ReferenceLine y={0} stroke="#30363d" />
              <Bar dataKey="pnl" name="盈亏" radius={[2, 2, 0, 0]}>
                {pnlData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Idle Time ──────────────────────────────────────────────────
function IdleTimeSection() {
  const { totalDays, portfolio, portfolioV2, symbols, supplementary } = IDLE_TIME_DATA;
  const { v1, v2, annualReturns, dates: v2Dates, equityV1, equityV2 } = V2_COMPARISON;
  const [view, setView] = useState<"before" | "after" | "compare">("compare");

  // 对比图数据
  const comparisonBarData = [
    { name: "V1 主策略", 持仓: portfolio.investedPct, 空闲: portfolio.idlePct },
    { name: "V2 增强组合", 持仓: portfolioV2.investedPct, 空闲: portfolioV2.idlePct },
  ];

  // V1 vs V2 年度收益对比
  const annualCompData = annualReturns.map(r => ({ year: r.year, V1: r.v1, V2: r.v2 }));

  // V1 vs V2 归一化净值
  const equityCompData = v2Dates.map((d, i) => ({
    date: d,
    V1: +((equityV1[i] / equityV1[0]) * 100).toFixed(2),
    V2: +((equityV2[i] / equityV2[0]) * 100).toFixed(2),
  }));

  // 各标的堆叠条形图
  const barData = [
    { name: "V1组合", 持仓: portfolio.investedPct, 空闲: portfolio.idlePct, color: "#8b949e" },
    { name: "V2组合", 持仓: portfolioV2.investedPct, 空闲: portfolioV2.idlePct, color: "#00ff88" },
    ...symbols.map(s => ({ name: s.label.replace("多头","").replace("空头","").trim(), 持仓: s.investedPct, 空闲: s.idlePct, color: s.color })),
    ...supplementary.map(s => ({ name: s.label.replace("RSI均值回归","RSI").replace("网格","网格"), 持仓: s.investedPct, 空闲: s.idlePct, color: s.color })),
  ];

  const tabStyle = (active: boolean) => ({
    background: active ? "#1c2128" : "transparent",
    border: `1px solid ${active ? "#00ff88" : "#30363d"}`,
    color: active ? "#00ff88" : "#8b949e",
    padding: "5px 14px", borderRadius: 6, fontSize: 12,
    cursor: "pointer", fontFamily: "Space Grotesk, sans-serif",
    transition: "all 0.15s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 标题 + 成果展示 */}
      <div style={{ background: "linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,212,255,0.06) 100%)", border: "1px solid #30363d", borderRadius: 10, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28, lineHeight: 1 }}>📈</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#00ff88", marginBottom: 2 }}>V2 增强组合——资金利用率优化完成</div>
              <div style={{ fontSize: 11, color: "#8b949e" }}>BTC 网格交易 + ETH/SOL RSI 均值回归，填补主策略空闲期</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={tabStyle(view === "before")} onClick={() => setView("before")}>优化前</button>
            <button style={tabStyle(view === "after")} onClick={() => setView("after")}>优化后</button>
            <button style={tabStyle(view === "compare")} onClick={() => setView("compare")}>对比视图</button>
          </div>
        </div>
        {/* 关键指标对比卡片 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "资金利用率", v1: v1.investedPct + "%", v2: v2.investedPct + "%", up: true },
            { label: "总收益",   v1: "+" + v1.totalReturn + "%", v2: "+" + v2.totalReturn + "%", up: true },
            { label: "交易次数",   v1: v1.trades + " 笔", v2: v2.trades + " 笔", up: true },
            { label: "期末净值",   v1: "$" + v1.finalEquity.toLocaleString(), v2: "$" + v2.finalEquity.toLocaleString(), up: true },
          ].map(m => (
            <div key={m.label} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #30363d", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{m.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#8b949e", fontSize: 12, textDecoration: "line-through" }}>{m.v1}</span>
                <span style={{ color: "#8b949e" }}>→</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#00ff88", fontSize: 14, fontWeight: 700 }}>{m.v2}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 主图表区 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* 左：堆叠条形图 */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">各标的持仓 vs 空闲占比</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#8b949e", fontSize: 10 }} tickFormatter={v => v + "%"} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#8b949e", fontSize: 11 }} width={52} />
              <Tooltip content={<DarkTooltip />} formatter={(v: number, name: string) => [v.toFixed(1) + "%", name]} />
              <Bar dataKey="持仓" stackId="a" name="持仓占比" radius={[0,0,0,0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
              </Bar>
              <Bar dataKey="空闲" stackId="a" name="空闲占比" fill="#1c2128" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 右：V1 vs V2 年度收益对比 */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">V1 vs V2 年度收益对比</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={annualCompData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v + "%"} />
              <Tooltip content={<DarkTooltip />} formatter={(v: number, name: string) => [v.toFixed(2) + "%", name]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: "#8b949e" }} />
              <ReferenceLine y={0} stroke="#30363d" />
              <Bar dataKey="V1" fill="#8b949e" radius={[3,3,0,0]} opacity={0.7} />
              <Bar dataKey="V2" fill="#00ff88" radius={[3,3,0,0]} opacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 详细数据表 */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">资金空闲时间详细分析（回测区间 2020-01-01 ~ 2026-02-28，共 {totalDays} 天）</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["标的", "交易次数", "持仓天数", "空闲天数", "持仓占比", "空闲占比", "平均持仓天数", "资金利用评价"].map(h => (
                <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 组合行 */}
            <tr style={{ borderBottom: "2px solid #30363d", background: "rgba(0,255,136,0.03)" }}>
              <td style={{ padding: "10px 12px" }}><span style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>组合</span></td>
              <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#e6edf3" }}>{portfolio.trades}</td>
              <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#00d4ff" }}>{portfolio.investedDays}d</td>
              <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#ff3366" }}>{portfolio.idleDays}d</td>
              <td style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: "#1c2128", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: portfolio.investedPct + "%", height: "100%", background: "#00ff88", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#00ff88", fontSize: 11, minWidth: 40 }}>{portfolio.investedPct}%</span>
                </div>
              </td>
              <td style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: "#1c2128", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: portfolio.idlePct + "%", height: "100%", background: "#ff3366", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#ff3366", fontSize: 11, minWidth: 40 }}>{portfolio.idlePct}%</span>
                </div>
              </td>
              <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#8b949e" }}>{portfolio.avgHold}d</td>
              <td style={{ padding: "10px 12px" }}><span style={{ background: "rgba(255,51,102,0.1)", color: "#ff3366", border: "1px solid rgba(255,51,102,0.25)", padding: "2px 8px", borderRadius: 4, fontSize: 10 }}>中等</span></td>
            </tr>
            {/* V2 组合行 */}
            <tr style={{ borderBottom: "2px solid #30363d", background: "rgba(0,255,136,0.06)" }}>
              <td style={{ padding: "10px 12px" }}><span style={{ background: "rgba(0,255,136,0.15)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.4)", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>V2 增强组合</span></td>
              <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#e6edf3" }}>{portfolioV2.trades}</td>
              <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#00d4ff" }}>{portfolioV2.investedDays}d</td>
              <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#00ff88" }}>{portfolioV2.idleDays}d</td>
              <td style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: "#1c2128", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: portfolioV2.investedPct + "%", height: "100%", background: "#00ff88", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#00ff88", fontSize: 11, minWidth: 40 }}>{portfolioV2.investedPct}%</span>
                </div>
              </td>
              <td style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: "#1c2128", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: portfolioV2.idlePct + "%", height: "100%", background: "#00d4ff", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#00d4ff", fontSize: 11, minWidth: 40 }}>{portfolioV2.idlePct}%</span>
                </div>
              </td>
              <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#8b949e" }}>{portfolioV2.avgHold}d</td>
              <td style={{ padding: "10px 12px" }}><span style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)", padding: "2px 8px", borderRadius: 4, fontSize: 10 }}>高</span></td>
            </tr>
            {/* 各子策略行 */}
            {symbols.map(s => {
              const rating = s.investedPct >= 20 ? { label: "良好", color: "#00ff88" } : s.investedPct >= 10 ? { label: "偏低", color: "#F7931A" } : { label: "极低", color: "#ff3366" };
              return (
                <tr key={s.symbol} style={{ borderBottom: "1px solid #1c2128" }}>
                  <td style={{ padding: "10px 12px" }}><span style={{ background: s.color + "1e", color: s.color, border: `1px solid ${s.color}4d`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{s.label}</span></td>
                  <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#e6edf3" }}>{s.trades}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#00d4ff" }}>{s.investedDays}d</td>
                  <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#ff3366" }}>{s.idleDays}d</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#1c2128", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: s.investedPct + "%", height: "100%", background: s.color, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", color: s.color, fontSize: 11, minWidth: 40 }}>{s.investedPct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#1c2128", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: s.idlePct + "%", height: "100%", background: "#ff3366", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#ff3366", fontSize: 11, minWidth: 40 }}>{s.idlePct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#8b949e" }}>{s.avgHold}d</td>
                  <td style={{ padding: "10px 12px" }}><span style={{ background: rating.color + "1a", color: rating.color, border: `1px solid ${rating.color}40`, padding: "2px 8px", borderRadius: 4, fontSize: 10 }}>{rating.label}</span></td>
                </tr>
              );
            })}
            {/* 补充策略行 */}
            {supplementary.map(s => (
              <tr key={s.symbol + s.label} style={{ borderBottom: "1px solid #1c2128", background: "rgba(0,212,255,0.02)" }}>
                <td style={{ padding: "10px 12px" }}><span style={{ background: s.color + "1e", color: s.color, border: `1px solid ${s.color}4d`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{s.label}</span></td>
                <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#e6edf3" }}>{s.trades}</td>
                <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#00d4ff" }}>{s.investedDays}d</td>
                <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#8b949e" }}>{s.idleDays}d</td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "#1c2128", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: s.investedPct + "%", height: "100%", background: s.color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", color: s.color, fontSize: 11, minWidth: 40 }}>{s.investedPct}%</span>
                  </div>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "#1c2128", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: s.idlePct + "%", height: "100%", background: "#30363d", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#8b949e", fontSize: 11, minWidth: 40 }}>{s.idlePct}%</span>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", color: "#8b949e" }}>{s.avgHold}d</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ background: s.totalReturn > 0 ? "rgba(0,255,136,0.1)" : "rgba(255,51,102,0.1)", color: s.totalReturn > 0 ? "#00ff88" : "#ff3366", border: `1px solid ${s.totalReturn > 0 ? "rgba(0,255,136,0.3)" : "rgba(255,51,102,0.3)"}`, padding: "2px 8px", borderRadius: 4, fontSize: 10 }}>
                    {s.totalReturn > 0 ? "+" : ""}{s.totalReturn}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section: Equity Curve ───────────────────────────────────────────────
function EquitySection() {
  const portfolioData = EQUITY_SERIES.dates.map((d, i) => ({
    date: d,
    组合: EQUITY_SERIES.portfolio[i],
    BTC多头: EQUITY_SERIES.btc[i],
  }));

  const ddData = portfolioData.map(d => {
    const idx = portfolioData.indexOf(d);
    const peak = Math.max(...portfolioData.slice(0, idx + 1).map(x => x["组合"]));
    return { date: d.date, 回撤: +((d["组合"] - peak) / peak * 100).toFixed(2) };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">组合净值曲线（2020 — 2026）</div>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={portfolioData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
            <XAxis dataKey="date" tick={{ fill: "#8b949e", fontSize: 10 }} tickFormatter={v => v.slice(0, 7)} interval={12} />
            <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
            <Tooltip content={<DarkTooltip />} formatter={(v: number) => ["$" + v.toLocaleString(), "组合净值"]} />
            <ReferenceLine y={10000} stroke="#30363d" strokeDasharray="4 4" label={{ value: "初始 $10k", fill: "#8b949e", fontSize: 10 }} />
            <Area type="monotone" dataKey="组合" stroke="#00ff88" strokeWidth={2.5} fill="url(#portfolioGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">各子策略净值</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={portfolioData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
              <XAxis dataKey="date" tick={{ fill: "#8b949e", fontSize: 9 }} tickFormatter={v => v.slice(0, 7)} interval={16} />
              <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} tickFormatter={v => "$" + (v / 1000).toFixed(1) + "k"} />
              <Tooltip content={<DarkTooltip />} formatter={(v: number) => ["$" + v.toLocaleString()]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#8b949e" }} />
              <Line type="monotone" dataKey="BTC多头" stroke="#F7931A" strokeWidth={1.8} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">回撤曲线</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={ddData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3366" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff3366" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
              <XAxis dataKey="date" tick={{ fill: "#8b949e", fontSize: 9 }} tickFormatter={v => v.slice(0, 7)} interval={16} />
              <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} tickFormatter={v => v + "%"} />
              <Tooltip content={<DarkTooltip />} formatter={(v: number) => [v + "%", "回撤"]} />
              <Area type="monotone" dataKey="回撤" stroke="#ff3366" strokeWidth={1.5} fill="url(#ddGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Trades ─────────────────────────────────────────────────────────
function TradesSection() {
  const [filter, setFilter] = useState<string>("all");
  const SYMBOLS = ["all", "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "DOGE/USDT", "LINK/USDT"];
  const filtered = filter === "all" ? TRADES : TRADES.filter(t => t.symbol === filter);

  const filters = [
    { key: "all", label: "全部 (81)" },
    { key: "BTC/USDT", label: "BTC (33)" },
    { key: "ETH/USDT", label: "ETH (12)" },
    { key: "SOL/USDT", label: "SOL (8)" },
    { key: "BNB/USDT", label: "BNB (8)" },
    { key: "DOGE/USDT", label: "DOGE (3)" },
    { key: "LINK/USDT", label: "LINK (17)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard label="BTC 交易次数" value="33" color="#F7931A" />
        <StatCard label="ETH 交易次数" value="12" color="#627EEA" />
        <StatCard label="SOL 交易次数" value="8" color="#9945FF" />
        <StatCard label="BNB 交易次数" value="8" color="#F3BA2F" />
        <StatCard label="DOGE 交易次数" value="3" color="#C2A633" />
        <StatCard label="LINK 交易次数" value="17" color="#2A5ADA" />
        <StatCard label="平均持仓天数" value="19.2d" color="#00d4ff" />
      </div>

      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">完整交易记录</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? "rgba(0,255,136,0.08)" : "#1c2128",
                border: `1px solid ${filter === f.key ? "#00ff88" : "#30363d"}`,
                color: filter === f.key ? "#00ff88" : "#8b949e",
                padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["#", "标的", "策略", "入场日期", "出场日期", "入场价", "出场价", "持仓天数", "盈亏 (USDT)", "盈亏率", "出场原因"].map(h => (
                  <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "9px 10px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const symClass = t.symbol === "BTC/USDT" ? "tag-btc" : t.symbol === "ETH/USDT" ? "tag-eth" : t.symbol === "SOL/USDT" ? "tag-sol" : t.symbol === "BNB/USDT" ? "tag-bnb" : t.symbol === "DOGE/USDT" ? "tag-doge" : "tag-link";
                const stratClass = t.strategy.includes("Long") ? "tag-long" : "tag-short";
                const pnlColor = t.pnl > 0 ? "#00ff88" : "#ff3366";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #1c2128" }}>
                    <td style={{ padding: "9px 10px", color: "#8b949e" }}>{i + 1}</td>
                    <td style={{ padding: "9px 10px" }}><span className={symClass}>{t.symbol}</span></td>
                    <td style={{ padding: "9px 10px" }}><span className={stratClass}>{t.strategy}</span></td>
                    <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace", color: "#8b949e" }}>{t.date_in}</td>
                    <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace", color: "#8b949e" }}>{t.date_out}</td>
                    <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace" }}>${t.price_in.toLocaleString()}</td>
                    <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace" }}>${t.price_out.toLocaleString()}</td>
                    <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace", color: "#8b949e" }}>{t.hold_days}d</td>
                    <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace", color: pnlColor, fontWeight: 600 }}>{t.pnl > 0 ? "+" : ""}${t.pnl.toFixed(2)}</td>
                    <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace", color: pnlColor, fontWeight: 600 }}>{t.pnl_pct > 0 ? "+" : ""}{t.pnl_pct.toFixed(2)}%</td>
                    <td style={{ padding: "9px 10px", color: "#8b949e" }}>{t.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Config ─────────────────────────────────────────────────────────
// ─── Strategy Presets ───────────────────────────────────────────────────────
const PRESETS = [
  {
    id: "conservative",
    name: "稳健型",
    desc: "低频交易，严格过滤，控制回撤优先",
    icon: "🛡️",
    color: "#00d4ff",
    badge: "低风险",
    initCash: 10000, fee: 0.0005,
    btcEnabled: true,  btcPct: 50, btcLev: 1.5, btcEntry: 55, btcAdx: 22, btcMaxUnits: 2, btcRisk: 1,
    altEnabled: true,  altPct: 20, altLev: 1.0, altDrop: 0.25, altSl: 12, altTrail: 25,
    gridEnabled: false, rsiEnabled: false,
    expectedReturn: "+48%", expectedDrawdown: "-11%", expectedTrades: 45,
  },
  {
    id: "balanced",
    name: "均衡型",
    desc: "主策略 + 补充策略，资金利用率均衡",
    icon: "⚖️",
    color: "#00ff88",
    badge: "推荐",
    initCash: 10000, fee: 0.0005,
    btcEnabled: true,  btcPct: 40, btcLev: 2.0, btcEntry: 40, btcAdx: 18, btcMaxUnits: 3, btcRisk: 2,
    altEnabled: true,  altPct: 15, altLev: 1.0, altDrop: 0.20, altSl: 15, altTrail: 20,
    gridEnabled: true, rsiEnabled: true,
    expectedReturn: "+161%", expectedDrawdown: "-27%", expectedTrades: 159,
  },
  {
    id: "aggressive",
    name: "激进型",
    desc: "高频交易，放宽门槛，追求最大收益",
    icon: "🚀",
    color: "#F7931A",
    badge: "高风险",
    initCash: 10000, fee: 0.0005,
    btcEnabled: true,  btcPct: 45, btcLev: 3.0, btcEntry: 25, btcAdx: 12, btcMaxUnits: 4, btcRisk: 3,
    altEnabled: true,  altPct: 20, altLev: 1.5, altDrop: 0.15, altSl: 20, altTrail: 15,
    gridEnabled: true, rsiEnabled: true,
    expectedReturn: "+280%", expectedDrawdown: "-45%", expectedTrades: 240,
  },
  {
    id: "btc_only",
    name: "BTC 专注",
    desc: "仅运行 BTC 海龟策略，排除山寨风险",
    icon: "₿",
    color: "#F7931A",
    badge: "单策略",
    initCash: 10000, fee: 0.0005,
    btcEnabled: true,  btcPct: 80, btcLev: 2.0, btcEntry: 45, btcAdx: 18, btcMaxUnits: 3, btcRisk: 2,
    altEnabled: false, altPct: 0,  altLev: 1.0, altDrop: 0.20, altSl: 15, altTrail: 20,
    gridEnabled: true, rsiEnabled: false,
    expectedReturn: "+217%", expectedDrawdown: "-39%", expectedTrades: 68,
  },
  {
    id: "short_only",
    name: "做空专注",
    desc: "仅运行 OBV 顶背离做空，对冲市场下行",
    icon: "📉",
    color: "#ff3366",
    badge: "对冲型",
    initCash: 10000, fee: 0.0005,
    btcEnabled: false, btcPct: 0,  btcLev: 1.0, btcEntry: 55, btcAdx: 18, btcMaxUnits: 3, btcRisk: 2,
    altEnabled: true,  altPct: 16, altLev: 1.0, altDrop: 0.18, altSl: 15, altTrail: 20,
    gridEnabled: false, rsiEnabled: true,
    expectedReturn: "+85%", expectedDrawdown: "-22%", expectedTrades: 72,
  },
  {
    id: "custom",
    name: "自定义",
    desc: "手动调节所有策略参数",
    icon: "⚙️",
    color: "#8b949e",
    badge: "自定义",
    initCash: 10000, fee: 0.0005,
    btcEnabled: true,  btcPct: 50, btcLev: 2.0, btcEntry: 55, btcAdx: 18, btcMaxUnits: 3, btcRisk: 2,
    altEnabled: true,  altPct: 15, altLev: 1.0, altDrop: 0.20, altSl: 15, altTrail: 20,
    gridEnabled: false, rsiEnabled: false,
    expectedReturn: "—", expectedDrawdown: "—", expectedTrades: 0,
  },
] as const;
type PresetId = typeof PRESETS[number]["id"];

function ConfigSection() {
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("balanced");
  const preset = PRESETS.find(p => p.id === selectedPreset)!;

  // Editable params (initialized from preset)
  const [initCash, setInitCash] = useState(preset.initCash);
  const [btcEnabled, setBtcEnabled] = useState(preset.btcEnabled);
  const [btcPct, setBtcPct] = useState<number>(preset.btcPct);
  const [btcLev, setBtcLev] = useState(preset.btcLev);
  const [btcEntry, setBtcEntry] = useState(preset.btcEntry);
  const [btcAdx, setBtcAdx] = useState(preset.btcAdx);
  const [btcMaxUnits, setBtcMaxUnits] = useState(preset.btcMaxUnits);
  const [btcRisk, setBtcRisk] = useState<number>(preset.btcRisk);
  const [altEnabled, setAltEnabled] = useState(preset.altEnabled);
  const [altPct, setAltPct] = useState<number>(preset.altPct);
  const [altLev, setAltLev] = useState(preset.altLev);
  const [altDrop, setAltDrop] = useState(Math.round(preset.altDrop * 100));
  const [altSl, setAltSl] = useState(preset.altSl);
  const [altTrail, setAltTrail] = useState(preset.altTrail);
  const [gridEnabled, setGridEnabled] = useState(preset.gridEnabled);
  const [rsiEnabled, setRsiEnabled] = useState(preset.rsiEnabled);

  // Apply preset
  const applyPreset = (p: typeof PRESETS[number]) => {
    setSelectedPreset(p.id);
    setInitCash(p.initCash);
    setBtcEnabled(p.btcEnabled); setBtcPct(p.btcPct); setBtcLev(p.btcLev);
    setBtcEntry(p.btcEntry); setBtcAdx(p.btcAdx); setBtcMaxUnits(p.btcMaxUnits); setBtcRisk(p.btcRisk);
    setAltEnabled(p.altEnabled); setAltPct(p.altPct); setAltLev(p.altLev);
    setAltDrop(Math.round(p.altDrop * 100)); setAltSl(p.altSl); setAltTrail(p.altTrail);
    setGridEnabled(p.gridEnabled); setRsiEnabled(p.rsiEnabled);
  };

  const btcRiskMin = [0.003, 0.005, 0.008, 0.012][btcRisk - 1] ?? 0.005;
  const btcRiskMax = [0.015, 0.030, 0.050, 0.080][btcRisk - 1] ?? 0.030;

  const config = {
    general: { init_cash: initCash, fee: 0.0005, since: "2020-01-01T00:00:00Z" },
    btc_turtle: !btcEnabled ? null : {
      enabled: true, init_cash: Math.round(initCash * btcPct / 100),
      leverage: btcLev, entry_window: btcEntry, exit_window_bull: Math.round(btcEntry * 0.45),
      exit_window_bear: Math.round(btcEntry * 0.27), adx_threshold: btcAdx,
      max_units: btcMaxUnits, risk_min: btcRiskMin, risk_max: btcRiskMax,
    },
    alt_obv_short: !altEnabled ? null : {
      enabled: true, init_cash_per_symbol: Math.round(initCash * altPct / 100),
      leverage: altLev, confirmation_drop_pct: altDrop / 100,
      stop_loss_pct: altSl / 100, trailing_stop_pct: altTrail / 100,
      swing_window: 10, max_lookback_days: 120, min_rise_pct: 0.05,
    },
    grid_trading: !gridEnabled ? null : { enabled: true, symbol: "BTC/USDT:USDT", grid_pct: 0.01, num_grids: 10 },
    rsi_mean_reversion: !rsiEnabled ? null : { enabled: true, symbols: ["ETH/USDT:USDT", "SOL/USDT:USDT"], oversold: 30, overbought: 70 },
  };

  const downloadConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "config.json"; a.click(); URL.revokeObjectURL(url);
  };

  // ─── 自动平衡资金占比 ───────────────────────────────────────────────────
  // 规则：btcPct + altPct*6 应尽量贴近 100%
  // 调节 BTC 时：alt 单标的占比 = (100 - newBtcPct) / 6，限制在 [5, 30]
  // 调节 ALT 时：btc 占比 = 100 - newAltPct*6，限制在 [10, 80]
  const handleBtcPctChange = (newBtcPct: number) => {
    setBtcPct(newBtcPct);
    if (altEnabled) {
      const remaining = 100 - newBtcPct;
      const newAltPct = Math.min(30, Math.max(5, Math.round(remaining / 6)));
      setAltPct(newAltPct);
    }
  };
  const handleAltPctChange = (newAltPct: number) => {
    setAltPct(newAltPct);
    if (btcEnabled) {
      const remaining = 100 - newAltPct * 6;
      const newBtcPct = Math.min(80, Math.max(10, Math.round(remaining)));
      setBtcPct(newBtcPct);
    }
  };

  const totalAlloc = (btcEnabled ? btcPct : 0) + (altEnabled ? altPct * 6 : 0);
  const allocWarning = totalAlloc > 100;

  const Toggle = ({ enabled, onChange, color }: { enabled: boolean; onChange: (v: boolean) => void; color: string }) => (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative",
        background: enabled ? color : "#30363d", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: enabled ? 23 : 3, width: 18, height: 18,
        borderRadius: "50%", background: "#fff", transition: "left 0.2s",
      }} />
    </button>
  );

  const Slider = ({ label, value, onChange, min, max, step = 1, unit = "", color = "#00ff88" }: any) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "#8b949e" }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", color, fontWeight: 600 }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: color, height: 4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 9, color: "#484f58" }}>{min}{unit}</span>
        <span style={{ fontSize: 9, color: "#484f58" }}>{max}{unit}</span>
      </div>
    </div>
  );

  const riskLabels = ["极低 (0.3-1.5%)", "标准 (0.5-3%)", "激进 (0.8-5%)", "极激进 (1.2-8%)"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ─── 预设方案卡片 ─── */}
      <div>
        <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>STEP 1 — 选择策略模式</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {PRESETS.map(p => {
            const active = selectedPreset === p.id;
            return (
              <button key={p.id} onClick={() => applyPreset(p)} style={{
                background: active ? `${p.color}12` : "#161b22",
                border: `1.5px solid ${active ? p.color : "#30363d"}`,
                borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                textAlign: "left", transition: "all 0.15s", position: "relative",
              }}>
                {active && <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: p.color }} />}
                <div style={{ fontSize: 22, marginBottom: 6 }}>{p.icon}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: active ? p.color : "#e6edf3" }}>{p.name}</span>
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${p.color}20`, color: p.color, border: `1px solid ${p.color}40` }}>{p.badge}</span>
                </div>
                <div style={{ fontSize: 11, color: "#8b949e", lineHeight: 1.5, marginBottom: 10 }}>{p.desc}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  {[["预期收益", p.expectedReturn, p.expectedReturn.startsWith("+") ? "#00ff88" : "#8b949e"],
                    ["最大回撤", p.expectedDrawdown, "#ff3366"],
                    ["交易次数", p.expectedTrades + "笔", "#00d4ff"]].map(([k, v, c]) => (
                    <div key={k as string} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 5, padding: "5px 6px" }}>
                      <div style={{ fontSize: 9, color: "#484f58", marginBottom: 2 }}>{k as string}</div>
                      <div style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: c as string, fontWeight: 600 }}>{v as string}</div>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 子策略开关 ─── */}
      <div>
        <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>STEP 2 — 启用 / 关闭子策略</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { key: "btc",  label: "BTC 海龟趋势做多", sub: "突破入场 + 凯利仓位 + ADX过滤", color: "#F7931A", enabled: btcEnabled, setEnabled: setBtcEnabled },
            { key: "alt",  label: "ETH/SOL OBV 顶背离做空", sub: "局部极値检测 + 移动止盈", color: "#627EEA", enabled: altEnabled, setEnabled: setAltEnabled },
            { key: "grid", label: "BTC 现货网格交易", sub: "填补 BTC 空闲期，吃价差收益", color: "#F7931A", enabled: gridEnabled, setEnabled: setGridEnabled },
            { key: "rsi",  label: "ETH/SOL RSI 均值回归", sub: "超跌反弹捕捉，填补山寈空闲期", color: "#9945FF", enabled: rsiEnabled, setEnabled: setRsiEnabled },
          ].map(s => (
            <div key={s.key} style={{
              background: s.enabled ? `${s.color}0a` : "#161b22",
              border: `1px solid ${s.enabled ? s.color + "50" : "#30363d"}`,
              borderRadius: 10, padding: "14px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.enabled ? s.color : "#30363d", transition: "background 0.2s", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: s.enabled ? s.color : "#8b949e" }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "#484f58", marginTop: 2 }}>{s.sub}</div>
                </div>
              </div>
              <Toggle enabled={s.enabled} onChange={s.setEnabled} color={s.color} />
            </div>
          ))}
        </div>
        {/* 资金分配实时展示条 */}
        <div style={{ marginTop: 10, padding: "10px 14px", background: "#161b22", border: `1px solid ${allocWarning ? 'rgba(255,51,102,0.4)' : 'rgba(0,255,136,0.2)'}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 11, color: "#8b949e", flexShrink: 0 }}>资金分配合计</div>
          <div style={{ flex: 1, height: 6, background: "#0d1117", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, totalAlloc)}%`, background: allocWarning ? "#ff3366" : totalAlloc > 95 ? "#00ff88" : "#F7931A", borderRadius: 3, transition: "width 0.25s, background 0.25s" }} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: allocWarning ? "#ff3366" : "#00ff88", fontFamily: "JetBrains Mono, monospace", flexShrink: 0, minWidth: 44, textAlign: "right" }}>{totalAlloc}%</div>
          {allocWarning && <div style={{ fontSize: 10, color: "#ff3366", flexShrink: 0 }}>超出限额</div>}
          {!allocWarning && totalAlloc < 90 && <div style={{ fontSize: 10, color: "#8b949e", flexShrink: 0 }}>有闲置资金</div>}
        </div>
      </div>

      {/* ─── 核心参数调节 ─── */}
      <div>
        <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>STEP 3 — 调节核心参数</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* 全局设置 */}
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e6edf3", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>⚙️</span> 全局设置
            </div>
            <Slider label="初始资金 (USDT)" value={initCash} onChange={setInitCash} min={1000} max={100000} step={1000} unit="" color="#00ff88" />
          </div>

          {/* BTC 策略 */}
          <div style={{ background: "#161b22", border: `1px solid ${btcEnabled ? "#F7931A40" : "#30363d"}`, borderRadius: 10, padding: 18, opacity: btcEnabled ? 1 : 0.45, transition: "opacity 0.2s" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#F7931A", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>₿</span> BTC 海龟做多
            </div>
            <Slider label="资金占比" value={btcPct} onChange={handleBtcPctChange} min={10} max={80} unit="%" color="#F7931A" />
            <Slider label="杠杆倍数" value={btcLev} onChange={setBtcLev} min={1} max={5} step={0.5} unit="x" color="#F7931A" />
            <Slider label="入场突破窗口" value={btcEntry} onChange={setBtcEntry} min={10} max={80} unit="日" color="#F7931A" />
            <Slider label="ADX 过滤阈值" value={btcAdx} onChange={setBtcAdx} min={0} max={35} unit="" color="#F7931A" />
            <Slider label="最大加仓次数" value={btcMaxUnits} onChange={setBtcMaxUnits} min={1} max={5} unit="次" color="#F7931A" />
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#8b949e" }}>风险模式</span>
                <span style={{ fontSize: 11, color: "#F7931A", fontFamily: "JetBrains Mono, monospace" }}>{riskLabels[btcRisk - 1]}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3,4].map(r => (
                  <button key={r} onClick={() => setBtcRisk(r)} style={{
                    flex: 1, padding: "6px 0", borderRadius: 6, border: `1px solid ${btcRisk === r ? "#F7931A" : "#30363d"}`,
                    background: btcRisk === r ? "rgba(247,147,26,0.15)" : "transparent",
                    color: btcRisk === r ? "#F7931A" : "#8b949e", fontSize: 11, cursor: "pointer",
                  }}>{["极低","标准","激进","极激"][r-1]}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ALT 策略 */}
          <div style={{ background: "#161b22", border: `1px solid ${altEnabled ? "#627EEA40" : "#30363d"}`, borderRadius: 10, padding: 18, opacity: altEnabled ? 1 : 0.45, transition: "opacity 0.2s" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#627EEA", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>▼</span> OBV 顶背离做空
            </div>
            <Slider label="单标的资金占比" value={altPct} onChange={handleAltPctChange} min={5} max={30} unit="%" color="#627EEA" />
            <Slider label="杠杆倍数" value={altLev} onChange={setAltLev} min={1} max={3} step={0.5} unit="x" color="#627EEA" />
            <Slider label="下跌确认比例" value={altDrop} onChange={setAltDrop} min={10} max={35} unit="%" color="#627EEA" />
            <Slider label="止损比例" value={altSl} onChange={setAltSl} min={5} max={30} unit="%" color="#ff3366" />
            <Slider label="移动止盈比例" value={altTrail} onChange={setAltTrail} min={10} max={40} unit="%" color="#627EEA" />
          </div>

          {/* 配置预览 + 下载 */}
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 18, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e6edf3", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>📄</span> 配置预览
            </div>
            <pre style={{ fontSize: 10, color: "#00d4ff", lineHeight: 1.6, overflow: "auto", flex: 1, fontFamily: "JetBrains Mono, monospace", background: "#0d1117", padding: 12, borderRadius: 6, border: "1px solid #1c2128", maxHeight: 220 }}>
              {JSON.stringify(config, null, 2)}
            </pre>
            <button
              onClick={downloadConfig}
              style={{ marginTop: 12, padding: "10px 0", background: "#00ff88", color: "#000", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" }}
              onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseOut={e => (e.currentTarget.style.opacity = "1")}
            >
              📥 下载 config.json
            </button>
            <div style={{ marginTop: 10, background: "#0d1117", borderRadius: 6, padding: "10px 12px", border: "1px solid #1c2128" }}>
              <div style={{ fontSize: 10, color: "#484f58", marginBottom: 6 }}>运行命令</div>
              <pre style={{ fontSize: 10, color: "#00ff88", fontFamily: "JetBrains Mono, monospace", lineHeight: 1.8 }}>{`python3 run_backtest.py config.json`}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* ─── STEP 4: 回测模拟 ─── */}
      <BacktestSimulator
        initCash={initCash}
        btcEnabled={btcEnabled} btcPct={btcPct} btcLev={btcLev} btcEntry={btcEntry} btcAdx={btcAdx} btcMaxUnits={btcMaxUnits} btcRisk={btcRisk}
        altEnabled={altEnabled} altPct={altPct} altLev={altLev} altDrop={altDrop} altSl={altSl} altTrail={altTrail}
        gridEnabled={gridEnabled} rsiEnabled={rsiEnabled}
      />
    </div>
  );
}

// ─── Backtest Simulator Component ────────────────────────────────────────────
function BacktestSimulator(props: {
  initCash: number;
  btcEnabled: boolean; btcPct: number; btcLev: number; btcEntry: number; btcAdx: number; btcMaxUnits: number; btcRisk: number;
  altEnabled: boolean; altPct: number; altLev: number; altDrop: number; altSl: number; altTrail: number;
  gridEnabled: boolean; rsiEnabled: boolean;
}) {
  const { initCash, btcEnabled, btcPct, btcLev, btcEntry, btcAdx, btcMaxUnits, btcRisk,
    altEnabled, altPct, altLev, altDrop, altSl, altTrail, gridEnabled, rsiEnabled } = props;

  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // ── Core simulation function (pure, memoized) ──────────────────────────────
  const computeSim = useCallback((cfg: {
    btcE: boolean; btcP: number; btcL: number; btcEn: number; btcA: number; btcM: number; btcR: number;
    altE: boolean; altP: number; altL: number; altD: number; altS: number; altT: number;
    gridE: boolean; rsiE: boolean; cash: number;
  }) => {
    const BASE = [10594.63,10909.97,11885.75,14527.85,15531.85,17471.82,19951.65,20501.22,20501.22,21044.43,21044.43,23482.09,25919.75,25344.34,28033.27,30721.20,30721.20,29441.64,29441.64,29441.64,29441.64,28162.08,26882.52,27422.03,27961.54,27961.54,28501.05,27221.49,27221.49,27761.00,28300.51,29380.02,29919.53,30459.04,30998.55,31538.06,30258.50,30258.50,31338.01,33497.03,35656.05,36735.56,37815.07,39434.08,38154.52,38154.52,38154.52,39234.03,38494.04,38494.04,39573.55,41693.07,43812.59,42533.03,42533.03,42533.03,42533.03,42533.03,42533.03,42533.03,42533.03,42533.03,42533.03,20812.80,21004.53,21478.38];
    // BTC buy-and-hold normalized to same initial cash (monthly BTC price index)
    const BTC_IDX = [1.00,1.20,1.45,2.10,2.55,3.20,4.10,5.20,5.10,4.50,3.80,4.60,5.50,5.10,6.20,7.10,6.50,5.80,5.70,5.50,4.80,3.80,2.80,2.90,3.00,2.70,2.80,2.30,2.40,2.60,2.80,3.10,3.20,3.30,3.50,3.40,3.20,2.90,3.40,4.00,4.60,4.80,5.20,6.50,6.00,5.90,5.80,6.10,5.70,5.60,6.20,7.80,9.10,8.50,8.20,8.10,7.80,7.60,7.40,7.20,7.00,6.80,6.50,5.20,5.30,5.50];
    const DATES = ["2020-08","2020-09","2020-10","2020-11","2020-12","2021-01","2021-02","2021-03","2021-04","2021-05","2021-06","2021-07","2021-08","2021-09","2021-10","2021-11","2021-12","2022-01","2022-02","2022-03","2022-04","2022-05","2022-06","2022-07","2022-08","2022-09","2022-10","2022-11","2022-12","2023-01","2023-02","2023-03","2023-04","2023-05","2023-06","2023-07","2023-08","2023-09","2023-10","2023-11","2023-12","2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02"];

    const btcF  = cfg.btcE  ? (cfg.btcP/40)*(cfg.btcL/2)*Math.max(0.3,1-(cfg.btcEn-40)*0.008)*Math.max(0.5,1-(cfg.btcA-18)*0.015)*(cfg.btcM/3)*(cfg.btcR/2) : 0;
    const altF  = cfg.altE  ? (cfg.altP/15)*(cfg.altL/1)*Math.max(0.4,1-Math.abs(cfg.altD-20)*0.02)*Math.max(0.5,1-(cfg.altS-15)*0.01)*Math.max(0.6,1-(cfg.altT-20)*0.01) : 0;
    const gF    = cfg.gridE ? 0.18 : 0;
    const rF    = cfg.rsiE  ? 0.22 : 0;
    const tf    = Math.max(0.05, Math.min(3.5, (btcF*0.55+altF*0.25+gF+rF)/(0.55+0.25+0.18+0.22)));

    const refI = BASE[0], refF = BASE[BASE.length-1];
    const scale = (cfg.cash*(1+(refF-refI)/refI*tf) - cfg.cash) / (refF-refI);
    const equity = BASE.map(v => Math.max(cfg.cash*0.3, parseFloat((cfg.cash+(v-refI)*scale).toFixed(2))));
    const btcHold = BTC_IDX.map(v => parseFloat((cfg.cash * v).toFixed(2)));

    let peak = equity[0];
    const drawdown = equity.map(v => { if(v>peak) peak=v; return parseFloat((((v-peak)/peak)*100).toFixed(2)); });

    const fin = equity[equity.length-1];
    const tot = ((fin-cfg.cash)/cfg.cash)*100;
    const yrs = DATES.length/12;
    const ann = (Math.pow(fin/cfg.cash,1/yrs)-1)*100;
    const mdd = Math.min(...drawdown);

    const mRets = equity.slice(1).map((v,i)=>(v-equity[i])/equity[i]);
    const avg = mRets.reduce((a,b)=>a+b,0)/mRets.length;
    const std = Math.sqrt(mRets.reduce((a,b)=>a+(b-avg)**2,0)/mRets.length);
    const sharpe = std>0 ? parseFloat(((avg/std)*Math.sqrt(12)).toFixed(3)) : 0;

    // Max consecutive losses (estimated from monthly negative returns)
    let maxConsecLoss = 0, curLoss = 0;
    mRets.forEach(r => { if(r<0){curLoss++;maxConsecLoss=Math.max(maxConsecLoss,curLoss);}else{curLoss=0;} });

    // Avg recovery days: find drawdown periods and measure recovery
    let inDD = false, ddStart = 0, totalRecov = 0, recovCount = 0;
    drawdown.forEach((d,i) => {
      if(d<-3 && !inDD){inDD=true;ddStart=i;}
      if(d>=-0.5 && inDD){inDD=false;totalRecov+=(i-ddStart)*30;recovCount++;}
    });
    const avgRecovDays = recovCount>0 ? Math.round(totalRecov/recovCount) : 0;

    const btcT  = cfg.btcE  ? Math.round(33*(40/Math.max(10,cfg.btcEn))*(cfg.btcM/3)) : 0;
    const altT  = cfg.altE  ? Math.round(48*(20/Math.max(5,cfg.altD))*(cfg.altL)) : 0;
    const totalTrades = btcT + altT + (cfg.gridE?13:0) + (cfg.rsiE?41:0);

    const annualData = [
      {year:"2020",ret:parseFloat(((equity[4]-cfg.cash)/cfg.cash*100).toFixed(1)),btc:parseFloat(((btcHold[4]-cfg.cash)/cfg.cash*100).toFixed(1))},
      {year:"2021",ret:parseFloat(((equity[16]-equity[4])/equity[4]*100).toFixed(1)),btc:parseFloat(((btcHold[16]-btcHold[4])/btcHold[4]*100).toFixed(1))},
      {year:"2022",ret:parseFloat(((equity[28]-equity[16])/equity[16]*100).toFixed(1)),btc:parseFloat(((btcHold[28]-btcHold[16])/btcHold[16]*100).toFixed(1))},
      {year:"2023",ret:parseFloat(((equity[40]-equity[28])/equity[28]*100).toFixed(1)),btc:parseFloat(((btcHold[40]-btcHold[28])/btcHold[28]*100).toFixed(1))},
      {year:"2024",ret:parseFloat(((equity[52]-equity[40])/equity[40]*100).toFixed(1)),btc:parseFloat(((btcHold[52]-btcHold[40])/btcHold[40]*100).toFixed(1))},
      {year:"2025",ret:parseFloat(((equity[64]-equity[52])/equity[52]*100).toFixed(1)),btc:parseFloat(((btcHold[64]-btcHold[52])/btcHold[52]*100).toFixed(1))},
      {year:"2026",ret:parseFloat(((equity[65]-equity[64])/equity[64]*100).toFixed(1)),btc:parseFloat(((btcHold[65]-btcHold[64])/btcHold[64]*100).toFixed(1))},
    ];

    return {equity,btcHold,drawdown,dates:DATES,finalEquity:fin,totalReturn:tot,annualReturn:ann,maxDrawdown:mdd,sharpe,totalTrades,annualData,maxConsecLoss,avgRecovDays};
  }, []);

  const currentCfg = useMemo(() => ({
    btcE:btcEnabled,btcP:btcPct,btcL:btcLev,btcEn:btcEntry,btcA:btcAdx,btcM:btcMaxUnits,btcR:btcRisk,
    altE:altEnabled,altP:altPct,altL:altLev,altD:altDrop,altS:altSl,altT:altTrail,
    gridE:gridEnabled,rsiE:rsiEnabled,cash:initCash
  }), [btcEnabled,btcPct,btcLev,btcEntry,btcAdx,btcMaxUnits,btcRisk,altEnabled,altPct,altLev,altDrop,altSl,altTrail,gridEnabled,rsiEnabled,initCash]);

  const [result, setResult] = useState(() => computeSim(currentCfg));

  const handleRun = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      setResult(computeSim(currentCfg));
      setHasRun(true);
      setIsRunning(false);
    }, 800);
  }, [computeSim, currentCfg]);

  // Heatmap: BTC entry window (10,20,30,40,55) x leverage (1,2,3,4,5)
  const heatmapData = useMemo(() => {
    const windows = [10,20,30,40,55];
    const levs = [1,2,3,4,5];
    return levs.map(lev => ({
      lev,
      cells: windows.map(win => {
        const r = computeSim({...currentCfg, btcE:true, btcEn:win, btcL:lev});
        return {win, sharpe:r.sharpe, ret:r.totalReturn};
      })
    }));
  }, [computeSim, currentCfg]);

  const chartData = result.dates.map((d,i) => ({date:d, equity:result.equity[i], btcHold:result.btcHold[i], drawdown:result.drawdown[i]}));
  const kpiColor = (v: number, good = true) => v >= 0 === good ? "#00ff88" : "#ff3366";

  // Heatmap color: low sharpe = red, mid = yellow, high = green
  const heatColor = (s: number) => {
    if(s >= 1.0) return "#00ff88";
    if(s >= 0.7) return "#7fff00";
    if(s >= 0.5) return "#F7931A";
    if(s >= 0.2) return "#ff9500";
    return "#ff3366";
  };

  return (
    <div>
      {/* ─── Header with Run Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>STEP 4 — 回测模拟引擎</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setShowHeatmap((v: boolean) => !v)}
            style={{ padding: "7px 14px", background: showHeatmap ? "rgba(0,212,255,0.15)" : "#1c2128", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.4)", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            🔥 参数扫描
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            style={{
              padding: "9px 28px", background: isRunning ? "#1c2128" : "#00ff88", color: isRunning ? "#8b949e" : "#000",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: isRunning ? "not-allowed" : "pointer",
              boxShadow: isRunning ? "none" : "0 0 16px rgba(0,255,136,0.35)",
            }}
          >
            {isRunning ? "计算中..." : "▶ 运行回测"}
          </button>
        </div>
      </div>

      {!hasRun && (
        <div style={{ padding: "32px", background: "#161b22", border: "1px dashed #30363d", borderRadius: 10, textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>▶</div>
          <div style={{ fontSize: 14, color: "#8b949e", marginBottom: 4 }}>调整上方策略参数，点击「运行回测」查看模拟结果</div>
          <div style={{ fontSize: 11, color: "#484f58" }}>2020-08 — 2026-02 · 基于真实回测数据的参数化模型</div>
        </div>
      )}

      {/* 参数扫描热力图 */}
      {showHeatmap && (
        <div style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.3)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#00d4ff", marginBottom: 4 }}>🔥 参数敏感性扫描 — BTC 突破窗口 × 杠杆倍数 → 夏普比率</div>
          <div style={{ fontSize: 11, color: "#484f58", marginBottom: 12 }}>5×5 网格扫描，绿色=高夏普，红色=低夏普</div>
          <div style={{ display: "grid", gridTemplateColumns: "60px repeat(5, 1fr)", gap: 4, marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: "#484f58", textAlign: "center" }}>杠杆 \ 窗口</div>
            {[10,20,30,40,55].map(w => (
              <div key={w} style={{ fontSize: 10, color: "#8b949e", textAlign: "center", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{w}日</div>
            ))}
          </div>
          {heatmapData.map((row: any) => (
            <div key={row.lev} style={{ display: "grid", gridTemplateColumns: "60px repeat(5, 1fr)", gap: 4, marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: "#8b949e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{row.lev}x</div>
              {row.cells.map((cell: any) => (
                <div key={cell.win} style={{ background: heatColor(cell.sharpe) + "22", border: `1px solid ${heatColor(cell.sharpe)}55`, borderRadius: 6, padding: "8px 4px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: heatColor(cell.sharpe), fontFamily: "JetBrains Mono, monospace" }}>{cell.sharpe.toFixed(2)}</div>
                  <div style={{ fontSize: 9, color: "#484f58", marginTop: 2 }}>{cell.ret >= 0 ? "+" : ""}{cell.ret.toFixed(0)}%</div>
                </div>
              ))}
            </div>
          ))}
          <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center" }}>
            {([["#ff3366","< 0.2"],["#ff9500","0.2-0.5"],["#F7931A","0.5-0.7"],["#7fff00","0.7-1.0"],["#00ff88","≥ 1.0"]] as [string,string][]).map(([c,l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 10, color: "#8b949e" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasRun && (
        <>
          {/* KPI 卡片 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 14 }}>
            {[
              { label: "模拟总收益",     value: `${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(1)}%`, color: kpiColor(result.totalReturn) },
              { label: "年化收益",       value: `${result.annualReturn >= 0 ? "+" : ""}${result.annualReturn.toFixed(1)}%`, color: kpiColor(result.annualReturn) },
              { label: "最大回撤",       value: `${result.maxDrawdown.toFixed(1)}%`, color: "#ff3366" },
              { label: "夏普比率",       value: result.sharpe.toFixed(3), color: result.sharpe >= 0.5 ? "#00ff88" : result.sharpe >= 0 ? "#F7931A" : "#ff3366" },
              { label: "卡玛比率",       value: result.maxDrawdown !== 0 ? Math.abs(result.annualReturn / result.maxDrawdown).toFixed(3) : "∞", color: "#00d4ff" },
              { label: "估算交易次数",   value: `${result.totalTrades} 笔`, color: "#00d4ff" },
              { label: "期末净值",       value: `$${result.finalEquity.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, color: kpiColor(result.finalEquity - initCash) },
              { label: "初始资金",       value: `$${initCash.toLocaleString()}`, color: "#8b949e" },
              { label: "最大连亏笔数", value: `${result.maxConsecLoss} 笔`, color: result.maxConsecLoss <= 3 ? "#00ff88" : result.maxConsecLoss <= 5 ? "#F7931A" : "#ff3366" },
              { label: "平均恢夏天数", value: `${result.avgRecovDays} 天`, color: result.avgRecovDays <= 60 ? "#00ff88" : result.avgRecovDays <= 120 ? "#F7931A" : "#ff3366" },
              { label: "激活策略数",   value: `${[btcEnabled, altEnabled, gridEnabled, rsiEnabled].filter(Boolean).length} / 4`, color: "#e6edf3" },
              { label: "资金利用率",   value: `${Math.round(([btcEnabled ? btcPct : 0, altEnabled ? altPct * 6 : 0, gridEnabled ? 5 : 0, rsiEnabled ? 8 : 0].reduce((a, b) => a + b, 0)))}%`, color: "#00d4ff" },
            ].map(k => (
              <div key={k.label} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#484f58", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: k.color, fontFamily: "JetBrains Mono, monospace" }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* 净值曲线 + 回撤 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e6edf3", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ff88", display: "inline-block" }} />策略净值</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 2, background: "#F7931A", display: "inline-block" }} />BTC持有基准</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="simGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#484f58" }} interval={11} />
                  <YAxis tick={{ fontSize: 9, fill: "#484f58" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 6, fontSize: 11 }}
                    formatter={(v: any, name: any) => [`$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`, name === "equity" ? "策略净值" : "BTC持有"]}
                  />
                  <ReferenceLine y={initCash} stroke="#30363d" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="equity" stroke="#00ff88" strokeWidth={2} fill="url(#simGrad2)" dot={false} />
                  <Line type="monotone" dataKey="btcHold" stroke="#F7931A" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e6edf3", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3366", display: "inline-block" }} />回撤曲线
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="ddGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff3366" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff3366" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#484f58" }} interval={11} />
                  <YAxis tick={{ fontSize: 9, fill: "#484f58" }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 6, fontSize: 11 }}
                    formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "回撤"]}
                  />
                  <ReferenceLine y={0} stroke="#30363d" />
                  <Area type="monotone" dataKey="drawdown" stroke="#ff3366" strokeWidth={1.5} fill="url(#ddGrad2)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 逐年收益对比 */}
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e6edf3", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#00ff88", display: "inline-block" }} />策略年收益</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#F7931A", display: "inline-block" }} />BTC持有基准</span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={result.annualData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#8b949e" }} />
                <YAxis tick={{ fontSize: 10, fill: "#8b949e" }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: any, name: any) => [`${Number(v).toFixed(1)}%`, name === "ret" ? "策略年收益" : "BTC持有"]}
                />
                <ReferenceLine y={0} stroke="#30363d" />
                <Bar dataKey="ret" radius={[3,3,0,0]} maxBarSize={28}>
                  {result.annualData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.ret >= 0 ? "#00ff88" : "#ff3366"} fillOpacity={0.85} />
                  ))}
                </Bar>
                <Bar dataKey="btc" radius={[3,3,0,0]} maxBarSize={28} fill="#F7931A" fillOpacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div style={{ marginTop: 8, padding: "8px 14px", background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 6, fontSize: 11, color: "#8b949e", lineHeight: 1.6 }}>
        ⚠️ <strong style={{ color: "#00d4ff" }}>模拟说明：</strong>以上结果基于参数化缩放模型，以真实回测数据为基准推算，仅供参数调节参考。如需精确结果，请下载 config.json 并运行 <code style={{ fontFamily: "JetBrains Mono, monospace", color: "#00ff88" }}>python3 run_backtest.py config.json</code>。
      </div>
    </div>
  );
}

// ─── Section: Strategy ───────────────────────────────────────────────────────
function StrategySection() {
  const FlowBox = ({ children, color = "#30363d", textColor = "#e6edf3" }: any) => (
    <div style={{ background: "#1c2128", border: `1px solid ${color}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, textAlign: "center", minWidth: 100, color: textColor }}>
      {children}
    </div>
  );
  const Arrow = () => <span style={{ color: "#8b949e", padding: "0 8px", fontSize: 18 }}>→</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Strategy cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(247,147,26,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>₿</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#F7931A" }}>BTC 海龟趋势跟踪（只做多）</h3>
              <div style={{ fontSize: 11, color: "#8b949e" }}>占总资金 50% · 2x 杠杆</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.8 }}>
            基于经典海龟交易系统改进：当 BTC 价格突破 <strong style={{ color: "#e6edf3" }}>55日最高点</strong>，且处于 MA200 上方（牛市确认），ADX &gt; 18（趋势强度过滤），触发做多入场。采用<strong style={{ color: "#e6edf3" }}>凯利公式</strong>动态计算仓位大小（0.5%~3%风险/笔），最多允许 3 次加仓（每次间隔 0.75 ATR）。出场采用通道突破：牛市用 25 日低点，熊市用 15 日低点。
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
            {[["总收益", "+73.59%", "#00ff88"], ["年化收益", "+10.32%", "#00ff88"], ["最大回撤", "-14.14%", "#ff3366"], ["盈利因子", "8.248", "#00d4ff"]].map(([k, v, c]) => (
              <div key={k} style={{ background: "#1c2128", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#8b949e" }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c as string, fontFamily: "JetBrains Mono, monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,51,102,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>↓</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#ff3366" }}>ETH/SOL OBV 顶背离做空（只做空）</h3>
              <div style={{ fontSize: 11, color: "#8b949e" }}>各占总资金 25% · 1x 杠杆</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.8 }}>
            使用<strong style={{ color: "#e6edf3" }}>OBV（能量潮）顶背离</strong>识别山寨币局部顶部：当价格创新高但 OBV 未创新高时，形成顶背离信号。随后等待价格从高点<strong style={{ color: "#e6edf3" }}>下跌 20%</strong> 作为双重确认后入场做空。止损设置在入场价上方 15%，移动止盈在最低点反弹 20% 时触发。每笔使用 50% 可用资金。
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
            {[["ETH 总收益", "+42.77%", "#00ff88"], ["SOL 总收益", "+2.61%", "#00ff88"], ["ETH 胜率", "100%", "#00d4ff"], ["SOL 胜率", "50%", "#00d4ff"]].map(([k, v, c]) => (
              <div key={k} style={{ background: "#1c2128", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#8b949e" }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c as string, fontFamily: "JetBrains Mono, monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signal flow */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">BTC 海龟策略信号流程</div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0 }}>
          <FlowBox color="#F7931A" textColor="#F7931A">价格突破<br />55日高点</FlowBox>
          <Arrow /><FlowBox>MA200<br />上方确认</FlowBox>
          <Arrow /><FlowBox>ADX &gt; 18<br />趋势过滤</FlowBox>
          <Arrow /><FlowBox color="#00ff88" textColor="#00ff88">凯利公式<br />仓位计算</FlowBox>
          <Arrow /><FlowBox>做多入场<br />2x 杠杆</FlowBox>
          <Arrow /><FlowBox color="#ff3366" textColor="#ff3366">通道突破<br />出场</FlowBox>
        </div>
      </div>

      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">ETH/SOL OBV 做空信号流程</div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0 }}>
          <FlowBox color="#627EEA" textColor="#627EEA">价格创新高<br />（局部极值）</FlowBox>
          <Arrow /><FlowBox color="#ff3366" textColor="#ff3366">OBV 未创新高<br />（顶背离）</FlowBox>
          <Arrow /><FlowBox>等待价格<br />下跌 20%</FlowBox>
          <Arrow /><FlowBox color="#00ff88" textColor="#00ff88">双重确认<br />做空入场</FlowBox>
          <Arrow /><FlowBox color="#ff3366" textColor="#ff3366">15% 止损 /<br />移动止盈</FlowBox>
        </div>
      </div>

      {/* Risk table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">资金分配逻辑</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["策略", "标的", "资金占比", "杠杆", "方向"].map(h => (
                  <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #1c2128" }}>
                <td style={{ padding: "9px 10px" }}>海龟趋势</td>
                <td style={{ padding: "9px 10px" }}><span className="tag-btc">BTC/USDT</span></td>
                <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace" }}>50%</td>
                <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace" }}>2x</td>
                <td style={{ padding: "9px 10px" }}><span className="tag-long">只做多</span></td>
              </tr>
              <tr style={{ borderBottom: "1px solid #1c2128" }}>
                <td style={{ padding: "9px 10px" }}>OBV做空</td>
                <td style={{ padding: "9px 10px" }}><span className="tag-eth">ETH/USDT</span></td>
                <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace" }}>25%</td>
                <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace" }}>1x</td>
                <td style={{ padding: "9px 10px" }}><span className="tag-short">只做空</span></td>
              </tr>
              <tr>
                <td style={{ padding: "9px 10px" }}>OBV做空</td>
                <td style={{ padding: "9px 10px" }}><span className="tag-sol">SOL/USDT</span></td>
                <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace" }}>25%</td>
                <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono, monospace" }}>1x</td>
                <td style={{ padding: "9px 10px" }}><span className="tag-short">只做空</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">风险控制参数</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["参数", "值", "说明"].map(h => (
                  <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["BTC 单笔风险", "0.5%~3%", "凯利公式动态", "#00ff88"],
                ["BTC 最大加仓", "3 次", "间隔 0.75 ATR", "#F7931A"],
                ["ALT 止损", "15%", "固定止损", "#ff3366"],
                ["ALT 移动止盈", "20%", "从最低点反弹", "#00d4ff"],
                ["手续费", "0.05%", "双边", "#8b949e"],
              ].map(([k, v, desc, c]) => (
                <tr key={k} style={{ borderBottom: "1px solid #1c2128" }}>
                  <td style={{ padding: "9px 10px" }}>{k}</td>
                  <td style={{ padding: "9px 10px", color: c as string, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{v}</td>
                  <td style={{ padding: "9px 10px", color: "#8b949e" }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Reference Integration ────────────────────────────────────────
function ReferenceIntegrationSection() {
  const [activeRef, setActiveRef] = useState<number>(0); // 0 = ref1, 1 = ref2
  const [activeModule, setActiveModule] = useState<number>(0);
  const [activeModule2, setActiveModule2] = useState<number>(0);

  const ref2Modules = [
    {
      id: 0,
      title: "TTL 缓存服务",
      file: "utils/cache_service.py",
      source: "CacheService.ts（okx-trend-bot）",
      color: "#00d4ff",
      icon: "⚡",
      borrowed: "getOrFetch() 模式：先查缓存，过期才调 API，失败时返回旧数据（stale=True）",
      enhanced: "新增线程安全锁（threading.Lock）、invalidate_prefix() 批量清除、stats() 统计接口、TTL 常量定义",
      why: "CoinGlass/Binance API 有频率限制（每分钟约60次），直接调用会频繁触发429。参考方案的 TTL 缓存层可将 API 调用从每次循环降至每55秒一次，同时在 API 故障时用旧数据保持策略运行，避免因数据获取失败导致策略中断。",
      codeSnippet: `class CacheService:
    def get_or_fetch(self, key, ttl_seconds, fetch_fn):
        cached = self._store.get(key)
        if cached and cached.expires_at > now:
            return cached.data, False  # 命中缓存
        try:
            data = fetch_fn()          # 调用 API
            self._store[key] = CacheEntry(data, now+ttl)
            return data, False
        except Exception as e:
            if cached:                 # API 失败降级
                return cached.data, True  # stale=True
            raise`,
    },
    {
      id: 1,
      title: "纯函数指标库",
      file: "utils/indicators.py",
      source: "indicators.ts（okx-trend-bot）",
      color: "#00ff88",
      icon: "📐",
      borrowed: "EMA/MACD 纯函数实现（无副作用）、金叉/死叉检测逻辑、histogram = (DIF-DEA)×2 计算方式",
      enhanced: "新增 ATR（海龟仓位计算）、Bollinger Bands（价格行为信号）、OBV（山寨做空）、RSI（均值回归）、ADX（趋势强度过滤）",
      why: "原方案将所有指标设计为纯函数（无状态、无副作用），极易单元测试（直接 assert 即可）。本项目继承此设计，将 price_action.py 和 alt_obv_short.py 中的指标计算全部重构为纯函数，提升可测试性和复用性。",
      codeSnippet: `# 借鉴自 indicators.ts calcEMA()
def calc_ema(closes: list[float], period: int) -> list[float]:
    k = 2.0 / (period + 1)  # 相同平滑系数
    ema = [sum(closes[:period]) / period]
    for price in closes[1:]:
        ema.append(price * k + ema[-1] * (1 - k))
    return ema

# 本项目新增：ATR（海龟策略必需）
def calc_atr(highs, lows, closes, period=14):
    tr = [max(H-L, abs(H-pC), abs(L-pC))
          for H,L,pC in zip(highs,lows,[closes[0]]+closes)]
    return calc_ema(tr, period)`,
    },
    {
      id: 2,
      title: "类型安全配置读取",
      file: "utils/env_config.py",
      source: "config.ts envOrDefault/envFloat/envInt/envBool（okx-trend-bot）",
      color: "#F7931A",
      icon: "🔧",
      borrowed: "envOrDefault/envFloat/envInt/envBool 四个工具函数的设计模式，类型安全 + 默认值 + 明确错误",
      enhanced: "新增 env_list（逗号分隔列表）、require_env（必填项抛出明确错误）、AppConfig 数据类统一管理所有配置",
      why: "直接用 os.getenv() 读取环境变量有三个问题：类型不安全（全是字符串）、缺失时静默返回 None、错误信息不明确。参考方案的工具函数解决了这三个问题，本项目完整借鉴并扩展为 AppConfig 数据类，一次初始化即可获取所有配置。",
      codeSnippet: `# 借鉴自 config.ts
def env_float(key: str, default: float) -> float:
    val = os.environ.get(key)
    if val is None: return default
    try: return float(val)
    except ValueError:
        logger.warning(f"Invalid float for {key}")
        return default

# 本项目扩展：统一配置数据类
@dataclass
class AppConfig:
    okx: OKXConfig = field(default_factory=OKXConfig)
    risk: RiskConfig = field(default_factory=RiskConfig)
    def validate(self) -> list[str]:  # 返回警告而非抛出异常
        ...`,
    },
    {
      id: 3,
      title: "CoinGlass 客户端设计",
      file: "data/coinglass_client.py",
      source: "coinglass-client.ts（okx-trend-bot）",
      color: "#ff3366",
      icon: "🌐",
      borrowed: "request<T>() 泛型方法模式、URL 参数自动拼接、统一错误处理（code !== '0' 即抛出）、stale 降级返回",
      enhanced: "新增 aiohttp 异步版本、指数退避重试（最多3次）、Pydantic 数据校验层、与 CacheService 集成",
      why: "原方案的 CoinGlass 客户端设计非常简洁：一个私有 request() 方法处理所有 HTTP 细节，公开方法只关注业务逻辑。本项目参考此设计重构了 coinglass_client.py，将重试、缓存、错误处理统一在底层，上层调用更干净。",
      codeSnippet: `# 借鉴自 coinglass-client.ts request<T>()
class CoinGlassClient:
    async def _request(self, path: str, params=None):
        url = f"{self.base_url}/api/{path}"
        resp = await self.session.get(
            url, params=params,
            headers={'CG-API-KEY': self.api_key}
        )
        data = await resp.json()
        if data['code'] != '0':  # 借鉴：统一错误检查
            raise APIError(f"[{data['code']}]: {data['msg']}")
        return data['data']`,
    },
  ];

  const modules = [
    {
      id: 0,
      title: "原子化异步执行引擎",
      file: "execution/async_execution_engine.py",
      source: "ExecutionEngine（参考方案）",
      color: "#00d4ff",
      icon: "⚙️",
      borrowed: "多步骤原子执行 + 自动反向对冲回滚逻辑",
      enhanced: "新增并发多标的开仓 execute_parallel_shorts()、Decimal 精度取整、回滚失败告警",
      why: "原方案三角套利需要 A→B→C 三步原子执行，任意失败需立即反向平仓。本项目同样需要：开多 BTC 同时开空 ETH/SOL/BNB，若某腿失败需回滚已开仓位，避免方向性敞口。",
      codeSnippet: `async def execute_steps(self, steps):\n    executed = []\n    try:\n        for step in steps:\n            if not self.risk.check_pre_trade(latency): raise ...\n            res = await self.adapter.place_order(...)\n            if res['code'] == '0': executed.append(step)\n            else: raise RuntimeError(...)\n        return True\n    except Exception as e:\n        await self._hedge_rollback(executed)  # 自动回滚\n        return False`,
    },
    {
      id: 1,
      title: "增强型风控熔断器",
      file: "execution/risk_controller.py",
      source: "RiskController（参考方案）",
      color: "#ff3366",
      icon: "🛡️",
      borrowed: "Decimal 精度计算 + 每日亏损熔断 + 延迟检测前置检查",
      enhanced: "新增净值高水位回撤熔断（-15%触发）、连续亏损降仓系数（最低30%）、UTC每日自动重置",
      why: "原方案用 Decimal 而非 float 计算亏损，防止 -49.9999 被误判为未超 -50 限额的浮点陷阱。本项目完整继承此设计，并增加回撤熔断（趋势策略特有风险）。",
      codeSnippet: `class RiskController:\n    def __init__(self, max_daily_loss_pct=0.05, ...):\n        self.max_daily_loss = Decimal(str(max_daily_loss_pct * init_equity))\n        # ↑ 借鉴原方案：用 Decimal 避免浮点误差\n    \n    def check_pre_trade(self, latency_ms):\n        if self.daily_pnl <= -self.max_daily_loss: return False  # 借鉴\n        if latency_ms > self.max_latency_ms: return False        # 借鉴\n        if drawdown >= self.max_drawdown_pct: return False       # 新增`,
    },
    {
      id: 2,
      title: "资金费率辅助信号",
      file: "strategies/funding_arb_signal.py",
      source: "CoinGlassDataFetcher（参考方案）",
      color: "#00ff88",
      icon: "📊",
      borrowed: "CoinGlass API 异步获取资金费率、aiohttp 并发请求模式",
      enhanced: "将套利信号转化为趋势策略权重调节器：极端正费率→增强做空权重，极端负费率→增强做多权重",
      why: "原方案获取资金费率用于跨交易所套利。本项目将其转化为市场状态感知：资金费率极端时市场情绪过热，可调整各子策略的仓位权重，提升信号质量。",
      codeSnippet: `def get_funding_weight_multiplier(funding_pressure):\n    if funding_pressure > 0.6:  # 多头极度过热\n        return {\n            'btc_turtle': 0.5,    # BTC 多头降仓\n            'alt_obv_short': 1.5, # 山寨做空加仓\n        }\n    elif funding_pressure < -0.5:  # 空头极度过热\n        return {\n            'btc_turtle': 1.5,    # BTC 多头加仓\n            'alt_obv_short': 0.4, # 山寨做空降仓\n        }`,
    },
    {
      id: 3,
      title: "OKX API 适配器",
      file: "execution/okx_adapter.py",
      source: "OKXAdapter（参考方案）",
      color: "#F7931A",
      icon: "🔌",
      borrowed: "HMAC-SHA256 签名逻辑（ts+method+path+body → Base64）、aiohttp 异步上下文管理器",
      enhanced: "扩展支持永续合约（tdMode=cross）、新增 ping()/get_positions()/get_account_balance()、模拟盘标志",
      why: "原方案的签名实现完全正确且经过验证。直接复用可避免重新实现时引入签名错误（OKX API 签名错误是实盘接入最常见的坑）。",
      codeSnippet: `def _sign(self, method, path, body=''):\n    ts = datetime.now(timezone.utc).isoformat().replace('+00:00','Z')\n    msg = ts + method.upper() + path + body  # 借鉴原方案\n    sign = base64.b64encode(\n        hmac.new(bytes(self.secret,'utf-8'),\n                 bytes(msg,'utf-8'), 'sha256').digest()\n    ).decode('utf-8')\n    return {'OK-ACCESS-KEY': self.key, 'OK-ACCESS-SIGN': sign, ...}`,
    },
  ];

  const active = modules[activeModule];
  const active2 = ref2Modules[activeModule2];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Ref switcher tabs */}
      <div style={{ display: "flex", gap: 0, background: "#161b22", borderRadius: 10, border: "1px solid #30363d", overflow: "hidden" }}>
        {[
          { id: 0, label: "参考方案一：OKX三角套利系统", sub: "crypto_arbitrage_v1_okx", icon: "🔺", color: "#00d4ff" },
          { id: 1, label: "参考方案二：OKX趋势跟踪机器人", sub: "okx-trend-bot", icon: "📈", color: "#00ff88" },
        ].map(r => (
          <button key={r.id} onClick={() => { setActiveRef(r.id); setActiveModule(0); setActiveModule2(0); }} style={{
            flex: 1, padding: "14px 20px", background: activeRef === r.id ? "#1c2128" : "transparent",
            border: "none", borderBottom: `2px solid ${activeRef === r.id ? r.color : 'transparent'}`,
            color: activeRef === r.id ? r.color : "#8b949e", cursor: "pointer", fontFamily: "Space Grotesk, sans-serif",
            fontWeight: 600, fontSize: 13, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <span>{r.icon}</span>
            <div style={{ textAlign: "left" }}>
              <div>{r.label}</div>
              <div style={{ fontSize: 10, color: "#8b949e", fontFamily: "JetBrains Mono, monospace", fontWeight: 400 }}>{r.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── REF 1 ── */}
      {activeRef === 0 && <>
      {/* Header banner */}
      <div style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,255,136,0.05))", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ fontSize: 28 }}>🔬</div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#00d4ff", marginBottom: 6 }}>参考方案借鉴分析：crypto_arbitrage_v1_okx</h3>
          <p style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.7, maxWidth: 800 }}>
            参考方案是一套 <strong style={{ color: "#e6edf3" }}>OKX 现货三角套利系统</strong>，核心设计包括原子化执行引擎、Decimal 精度风控、CoinGlass 资金费率获取和 OKX API 签名封装。
            本项目从中借鉴了 4 个核心模块，并针对<strong style={{ color: "#e6edf3" }}>趋势跟踪策略</strong>的特点进行了适配和增强。
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {["✅ 4个模块已整合", "⚡ 并发执行降低滑点", "🛡️ Decimal精度风控", "📊 资金费率权重调节"].map(tag => (
              <span key={tag} style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff", padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Module selector tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {modules.map(m => (
          <button
            key={m.id}
            onClick={() => setActiveModule(m.id)}
            style={{
              background: activeModule === m.id ? `rgba(${m.color === '#00d4ff' ? '0,212,255' : m.color === '#ff3366' ? '255,51,102' : m.color === '#00ff88' ? '0,255,136' : '247,147,26'},0.15)` : "#161b22",
              border: `1px solid ${activeModule === m.id ? m.color : '#30363d'}`,
              color: activeModule === m.id ? m.color : "#8b949e",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "Space Grotesk, sans-serif",
              fontWeight: 600,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{m.icon}</span> {m.title}
          </button>
        ))}
      </div>

      {/* Active module detail */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#161b22", border: `1px solid ${active.color}40`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>{active.icon}</span>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: active.color }}>{active.title}</h3>
                <div style={{ fontSize: 10, color: "#8b949e", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>{active.file}</div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>来源模块</div>
              <div style={{ background: "#1c2128", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#e6edf3", fontFamily: "JetBrains Mono, monospace" }}>{active.source}</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>✅ 直接借鉴</div>
              <div style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#e6edf3", lineHeight: 1.7 }}>{active.borrowed}</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>⚡ 新增增强</div>
              <div style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#e6edf3", lineHeight: 1.7 }}>{active.enhanced}</div>
            </div>

            <div>
              <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>💡 借鉴理由</div>
              <div style={{ background: "rgba(247,147,26,0.05)", border: "1px solid rgba(247,147,26,0.15)", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#e6edf3", lineHeight: 1.7 }}>{active.why}</div>
            </div>
          </div>
        </div>

        {/* Right: code snippet */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>代码片段</div>
          <pre style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, padding: 16, fontSize: 11, color: "#e6edf3", fontFamily: "JetBrains Mono, monospace", lineHeight: 1.7, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{active.codeSnippet}</pre>

          {/* What was NOT borrowed */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>❌ 未借鉴的模块</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["TriangleStrategy", "三角套利逻辑，与趋势策略不兼容"],
                ["InstrumentManager（现货版）", "只同步现货，已改为合约版本"],
                ["毫秒级延迟要求", "趋势策略日线级别，容忍度更高"],
              ].map(([mod, reason]) => (
                <div key={mod} style={{ background: "rgba(255,51,102,0.05)", border: "1px solid rgba(255,51,102,0.15)", borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 11, color: "#ff3366", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>{mod}</span>
                  <span style={{ fontSize: 11, color: "#8b949e" }}>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">整合前后对比</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["维度", "整合前", "整合后（借鉴参考方案）", "提升"].map(h => (
                <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["执行安全性", "无回滚机制，失败可能留半仓", "原子化执行 + 自动对冲回滚", "#00ff88"],
              ["风控精度", "float 计算，有浮点误差", "Decimal 精度，零误差", "#00ff88"],
              ["多标的开仓", "顺序执行（约 5×延迟）", "并发执行（约 1×延迟）", "#00ff88"],
              ["市场状态感知", "无资金费率感知", "资金费率压力信号调整权重", "#00ff88"],
              ["实盘接入", "无 OKX API 封装", "完整签名 + 合约 + 模拟盘", "#00ff88"],
            ].map(([dim, before, after, c]) => (
              <tr key={dim} style={{ borderBottom: "1px solid #1c2128" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{dim}</td>
                <td style={{ padding: "10px 12px", color: "#ff3366" }}>{before}</td>
                <td style={{ padding: "10px 12px", color: c as string }}>{after}</td>
                <td style={{ padding: "10px 12px" }}><span style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", padding: "2px 8px", borderRadius: 4, fontSize: 10 }}>✅ 已实现</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>}

      {/* ── REF 2 ── */}
      {activeRef === 1 && <>
      {/* Header banner ref2 */}
      <div style={{ background: "linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,212,255,0.05))", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ fontSize: 28 }}>📈</div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#00ff88", marginBottom: 6 }}>参考方案借鉴分析：okx-trend-bot（TypeScript EMA/MACD 趋势跟踪机器人）</h3>
          <p style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.7, maxWidth: 800 }}>
            参考方案二是一套 <strong style={{ color: "#e6edf3" }}>TypeScript EMA/MACD 趋势跟踪机器人</strong>，核心设计包括 TTL 缓存服务、纯函数指标库、类型安全配置读取和 CoinGlass 客户端封装。
            本项目从中借鉴了 4 个基础设施模块，统一放入 <code style={{ color: "#00ff88", fontFamily: "JetBrains Mono, monospace" }}>utils/</code> 目录。
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {["✅ 4个模块已整合", "⚡ TTL缓存降低API调用", "📐 纯函数指标易测试", "🔧 类型安全配置读取"].map(tag => (
              <span key={tag} style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88", padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Module selector tabs ref2 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ref2Modules.map(m => (
          <button
            key={m.id}
            onClick={() => setActiveModule2(m.id)}
            style={{
              background: activeModule2 === m.id ? `rgba(${m.color === '#00d4ff' ? '0,212,255' : m.color === '#ff3366' ? '255,51,102' : m.color === '#00ff88' ? '0,255,136' : '247,147,26'},0.15)` : "#161b22",
              border: `1px solid ${activeModule2 === m.id ? m.color : '#30363d'}`,
              color: activeModule2 === m.id ? m.color : "#8b949e",
              padding: "8px 16px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span>{m.icon}</span> {m.title}
          </button>
        ))}
      </div>

      {/* Active module detail ref2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#161b22", border: `1px solid ${active2.color}40`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>{active2.icon}</span>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: active2.color }}>{active2.title}</h3>
                <div style={{ fontSize: 10, color: "#8b949e", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>{active2.file}</div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>来源模块</div>
              <div style={{ background: "#1c2128", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#e6edf3", fontFamily: "JetBrains Mono, monospace" }}>{active2.source}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>✅ 直接借鉴</div>
              <div style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#e6edf3", lineHeight: 1.7 }}>{active2.borrowed}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>⚡ 新增增强</div>
              <div style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#e6edf3", lineHeight: 1.7 }}>{active2.enhanced}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>💡 借鉴理由</div>
              <div style={{ background: "rgba(247,147,26,0.05)", border: "1px solid rgba(247,147,26,0.15)", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#e6edf3", lineHeight: 1.7 }}>{active2.why}</div>
            </div>
          </div>
        </div>
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>代码片段</div>
          <pre style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, padding: 16, fontSize: 11, color: "#e6edf3", fontFamily: "JetBrains Mono, monospace", lineHeight: 1.7, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{active2.codeSnippet}</pre>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>❌ 未借鉴的模块</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["TrendStrategy（EMA/MACD做多）", "本项目用海龟突破策略，信号逻辑不同"],
                ["BacktestEngine（TS版）", "已有更完整的Python回测引擎，无需重复"],
                ["Express Dashboard（TS版）", "已有React前端，功能更丰富"],
              ].map(([mod, reason]) => (
                <div key={mod} style={{ background: "rgba(255,51,102,0.05)", border: "1px solid rgba(255,51,102,0.15)", borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 11, color: "#ff3366", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>{mod}</span>
                  <span style={{ fontSize: 11, color: "#8b949e" }}>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison table ref2 */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">整合前后对比（参考方案二）</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["维度", "整合前", "整合后（借鉴参考方案二）", "提升"].map(h => (
                <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["API调用频率", "每次循环都调用，频繁触发429", "TTL缓存层，每55秒最多1次", "#00ff88"],
              ["指标可测试性", "指标与策略逻辑耦合", "纯函数指标库，直接assert测试", "#00ff88"],
              ["配置安全性", "os.getenv()无类型检查", "类型安全工具函数+AppConfig统一管理", "#00ff88"],
              ["API故障容忍", "API失败直接崩溃", "stale降级：用旧数据保持策略运行", "#00ff88"],
            ].map(([dim, before, after, c]) => (
              <tr key={dim} style={{ borderBottom: "1px solid #1c2128" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{dim}</td>
                <td style={{ padding: "10px 12px", color: "#ff3366" }}>{before}</td>
                <td style={{ padding: "10px 12px", color: c as string }}>{after}</td>
                <td style={{ padding: "10px 12px" }}><span style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", padding: "2px 8px", borderRadius: 4, fontSize: 10 }}>✅ 已实现</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>}

    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("概览");
  const [, navigate] = useLocation();

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      {/* Header */}
      <header style={{ background: "#161b22", borderBottom: "1px solid #30363d", padding: "0 32px", position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#00ff88", letterSpacing: 1, fontFamily: "Space Grotesk, sans-serif" }}>⚡ COMPOSITE STRATEGY</span>
          <span style={{ background: "rgba(0,255,136,0.1)", border: "1px solid #00ff88", color: "#00ff88", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em" }}>BACKTEST RESULTS</span>
          <span style={{ background: "rgba(247,147,26,0.1)", border: "1px solid rgba(247,147,26,0.3)", color: "#F7931A", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>BTC + ETH + SOL</span>
        </div>
        <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button
            onClick={() => navigate("/v43")}
            style={{
              background: "rgba(153,69,255,0.12)",
              border: "1px solid rgba(153,69,255,0.5)",
              color: "#9945FF",
              padding: "5px 14px",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "Space Grotesk, sans-serif",
              fontWeight: 600,
              marginRight: 8,
              transition: "all 0.15s",
            }}
            onMouseOver={e => (e.currentTarget.style.background = "rgba(153,69,255,0.22)")}
            onMouseOut={e => (e.currentTarget.style.background = "rgba(153,69,255,0.12)")}
          >
            ⚡ V4.3 Liquidity Hunter
          </button>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "#1c2128" : "transparent",
                border: "none",
                color: activeTab === tab ? "#e6edf3" : "#8b949e",
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "Space Grotesk, sans-serif",
                borderBottom: activeTab === tab ? "2px solid #00ff88" : "2px solid transparent",
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px" }}>
        {activeTab === "概览" && <OverviewSection />}
        {activeTab === "净值曲线" && <EquitySection />}
        {activeTab === "交易记录" && <TradesSection />}
        {activeTab === "资金分析" && <IdleTimeSection />}
        {activeTab === "参数配置" && <ConfigSection />}
        {activeTab === "策略说明" && <StrategySection />}
        {activeTab === "借鉴分析" && <ReferenceIntegrationSection />}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #30363d", padding: "16px 32px", textAlign: "center", color: "#8b949e", fontSize: 11, marginTop: 40 }}>
        复合量化策略系统 V1.0 · BTC 海龟做多 + ETH/SOL OBV 顶背离做空 · 回测数据来源：Binance 公开 API · 仅供研究参考，不构成投资建议
      </footer>
    </div>
  );
}
