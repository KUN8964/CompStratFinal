/*
 * DESIGN: 暗色量化终端风格 — V4.3 Liquidity Hunter 策略系统展示
 * 完整展示 FGI状态机、6路Alpha信号、三步仓位计算、双层风控审批
 */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

// ─── Nav Tabs ────────────────────────────────────────────────────────────────
const TABS = ["系统架构", "情绪引擎", "信号引擎", "执行风控", "回测分析", "代码结构"] as const;
type Tab = typeof TABS[number];

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 6, padding: "8px 12px" }}>
      <p style={{ color: "#8b949e", fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || "#e6edf3", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Section: Architecture ────────────────────────────────────────────────────
function ArchSection() {
  const layers = [
    {
      title: "第一层：宏观情绪状态机",
      color: "#00d4ff",
      desc: "FGI 3日均值，连续2日确认状态切换",
      items: [
        { label: "极度恐惧 (FGI ≤ 20)", action: "只做多 / 仓位上限 10%", color: "#00ff88" },
        { label: "恐惧 (20 < FGI ≤ 45)", action: "谨慎做多 / 仓位上限 30%", color: "#7ee787" },
        { label: "贪婪 (45 < FGI < 80)", action: "谨慎做空 / 仓位上限 30%", color: "#f0883e" },
        { label: "极度贪婪 (FGI ≥ 80)", action: "只做空 / 仓位上限 10%", color: "#ff3366" },
      ],
    },
    {
      title: "第二层：情绪周期进度评估器",
      color: "#9945FF",
      desc: "D_current vs 历史中位数/75%分位数，输出仓位调节系数",
      items: [
        { label: "早期 (D < 历史中位数)", action: "系数 0.30 — 仅使用30%仓位上限", color: "#8b949e" },
        { label: "中期 (中位数 ≤ D ≤ P75)", action: "系数 0.60 — 使用60%仓位上限", color: "#00d4ff" },
        { label: "末期 (D > 历史P75)", action: "系数 1.00 — 使用100%仓位上限", color: "#00ff88" },
      ],
    },
    {
      title: "第三层：Alpha 信号引擎",
      color: "#F7931A",
      desc: "6路信号加权合成 ThreatOpportunityScore (0-100)",
      items: [
        { label: "清算冲击 LiqSpike", action: "权重 0.40 — 核心信号", color: "#F7931A" },
        { label: "OI-资金费率失配", action: "权重 0.20", color: "#627EEA" },
        { label: "拥挤度 Crowdedness", action: "权重 0.20", color: "#9945FF" },
        { label: "趋势确认 TrendConfirm", action: "权重 0.15", color: "#00d4ff" },
        { label: "ETF资金流 ETFFlow", action: "权重 0.05", color: "#8b949e" },
        { label: "价格行为 BB+RSI", action: "辅助过滤信号", color: "#00ff88" },
      ],
    },
    {
      title: "第四层：执行与风控层",
      color: "#ff3366",
      desc: "逐仓 + 最大3x杠杆 + ATR动态止损 + 分批建仓 + 双层审批",
      items: [
        { label: "三步仓位计算法", action: "基础仓位 → 周期调节 → 账户约束", color: "#00ff88" },
        { label: "头寸级风控", action: "逐仓/杠杆≤3x/止损优于强平价", color: "#F7931A" },
        { label: "账户级风控", action: "5持仓/30%净敞口/5%单日熔断/15%总熔断", color: "#ff3366" },
        { label: "分批建仓", action: "40% → 40% → 20% 三批入场", color: "#00d4ff" },
      ],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* System Architecture Diagram */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">系统总体架构 — Liquidity Hunter V4.3</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* Data Sources */}
          <div style={{ background: "#1c2128", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>数据源层</div>
            {[
              { name: "Coinglass API", desc: "FGI / 清算 / OI / 资金费率", color: "#F7931A" },
              { name: "Binance Public API", desc: "K线 / 成交量 / 价格", color: "#F0B90B" },
              { name: "OKX V5 API", desc: "账户 / 订单 / 持仓（私有）", color: "#00d4ff" },
            ].map(d => (
              <div key={d.name} style={{ marginBottom: 8, padding: "8px 10px", background: "#0d1117", borderRadius: 6, borderLeft: `3px solid ${d.color}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "#8b949e" }}>{d.desc}</div>
              </div>
            ))}
          </div>
          {/* Strategy Engine */}
          <div style={{ background: "#1c2128", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Python 策略引擎</div>
            {[
              { name: "情绪引擎", desc: "FGI状态机 + 周期评估器", color: "#00d4ff" },
              { name: "信号引擎", desc: "6路信号 + 加权合成器", color: "#F7931A" },
              { name: "执行引擎", desc: "仓位计算 + 风控审批", color: "#00ff88" },
              { name: "回测引擎", desc: "高保真回测 + 报告生成", color: "#9945FF" },
              { name: "FastAPI 服务", desc: "REST接口供TS后端调用", color: "#8b949e" },
            ].map(d => (
              <div key={d.name} style={{ marginBottom: 8, padding: "8px 10px", background: "#0d1117", borderRadius: 6, borderLeft: `3px solid ${d.color}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "#8b949e" }}>{d.desc}</div>
              </div>
            ))}
          </div>
          {/* TS Backend + Frontend */}
          <div style={{ background: "#1c2128", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>TypeScript 后端 + 前端</div>
            {[
              { name: "tRPC 路由层", desc: "类型安全的API路由", color: "#627EEA" },
              { name: "Drizzle ORM", desc: "MySQL/TiDB 数据访问层", color: "#00d4ff" },
              { name: "OKX 签名代理", desc: "API密钥管理 + 请求签名", color: "#F7931A" },
              { name: "React 监控面板", desc: "实时仪表盘 + 策略控制", color: "#00ff88" },
              { name: "Cron 调度器", desc: "定时任务 + 对账系统", color: "#8b949e" },
            ].map(d => (
              <div key={d.name} style={{ marginBottom: 8, padding: "8px 10px", background: "#0d1117", borderRadius: 6, borderLeft: `3px solid ${d.color}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "#8b949e" }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Data flow arrows */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "12px 0", borderTop: "1px solid #30363d" }}>
          {["Coinglass / Binance / OKX", "→", "DataSanitizer 清洗层", "→", "情绪引擎 + 信号引擎", "→", "风控审批", "→", "OrderManager 执行", "→", "数据库记录"].map((s, i) => (
            <span key={i} style={{ fontSize: 12, color: s === "→" ? "#8b949e" : "#e6edf3", padding: s === "→" ? "0 6px" : "4px 10px", background: s === "→" ? "transparent" : "#1c2128", borderRadius: s === "→" ? 0 : 4 }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Four Layers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {layers.map(layer => (
          <div key={layer.title} style={{ background: "#161b22", border: `1px solid ${layer.color}22`, borderRadius: 10, padding: 18, borderTop: `3px solid ${layer.color}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: layer.color, marginBottom: 4 }}>{layer.title}</div>
            <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 12 }}>{layer.desc}</div>
            {layer.items.map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1c2128" }}>
                <span style={{ fontSize: 12, color: item.color, fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: 11, color: "#8b949e" }}>{item.action}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Tech Stack */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">技术栈规范</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["层级", "技术栈", "版本要求", "核心职责"].map(h => (
                <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["前端", "Vite + React + TypeScript + TailwindCSS + Recharts", "React 18+, TS 5+", "监控仪表盘 / 策略控制面板"],
              ["TS 后端", "Node.js + tRPC + Drizzle ORM + Zod", "Node 20+, tRPC 11+", "用户认证 / API代理 / 数据库操作"],
              ["数据库", "MySQL / TiDB + ClickHouse", "—", "关系型数据 + 时序行情数据"],
              ["Python 引擎", "Python 3.11+ + FastAPI + Pandas + Pydantic V2", "Python 3.11+", "情绪/信号/执行/回测引擎"],
              ["测试", "Pytest (Python) + Vitest (TypeScript)", "—", "单元测试 + 集成测试"],
              ["容器化", "Docker + Docker Compose", "—", "多服务编排 + 一键部署"],
            ].map(([layer, stack, ver, role]) => (
              <tr key={layer} style={{ borderBottom: "1px solid #1c2128" }}>
                <td style={{ padding: "9px 12px", fontWeight: 600, color: "#00d4ff" }}>{layer}</td>
                <td style={{ padding: "9px 12px", fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#e6edf3" }}>{stack}</td>
                <td style={{ padding: "9px 12px", color: "#8b949e" }}>{ver}</td>
                <td style={{ padding: "9px 12px", color: "#8b949e" }}>{role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section: Sentiment Engine ────────────────────────────────────────────────
function SentimentSection() {
  const fgiData = [
    { label: "极度恐惧", range: "FGI ≤ 20", direction: "只做多", cap: "10%", capVal: 10, color: "#00ff88", days: 45 },
    { label: "恐惧", range: "20 < FGI ≤ 45", direction: "谨慎做多", cap: "30%", capVal: 30, color: "#7ee787", days: 120 },
    { label: "贪婪", range: "45 < FGI < 80", direction: "谨慎做空", cap: "30%", capVal: 30, color: "#f0883e", days: 150 },
    { label: "极度贪婪", range: "FGI ≥ 80", direction: "只做空", cap: "10%", capVal: 10, color: "#ff3366", days: 50 },
  ];

  const cycleData = [
    { stage: "早期", condition: "D < 历史中位数", coeff: 0.30, color: "#8b949e" },
    { stage: "中期", condition: "中位数 ≤ D ≤ P75", coeff: 0.60, color: "#00d4ff" },
    { stage: "末期", condition: "D > 历史P75", coeff: 1.00, color: "#00ff88" },
  ];

  const fgiSimData = Array.from({ length: 60 }, (_, i) => {
    const base = 50 + 35 * Math.sin(i / 10) + (Math.random() - 0.5) * 15;
    const fgi = Math.max(5, Math.min(95, base));
    let state = "贪婪", color = "#f0883e";
    if (fgi <= 20) { state = "极度恐惧"; color = "#00ff88"; }
    else if (fgi <= 45) { state = "恐惧"; color = "#7ee787"; }
    else if (fgi >= 80) { state = "极度贪婪"; color = "#ff3366"; }
    return { day: `D${i + 1}`, fgi: Math.round(fgi), state, color };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* FGI State Machine */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">FGI 四态情绪状态机（第一层）</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {fgiData.map(s => (
            <div key={s.label} style={{ background: "#1c2128", borderRadius: 8, padding: 16, borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>{s.range}</div>
              <div style={{ fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "#8b949e" }}>方向：</span>
                <span style={{ color: s.color, fontWeight: 600 }}>{s.direction}</span>
              </div>
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: "#8b949e" }}>仓位上限：</span>
                <span style={{ color: "#e6edf3", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{s.cap}</span>
              </div>
              <div style={{ background: "#0d1117", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${s.capVal}%`, height: "100%", background: s.color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "#1c2128", borderRadius: 8, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 3, height: 40, background: "#00d4ff", borderRadius: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#00d4ff", marginBottom: 4 }}>连续2日确认规则</div>
            <div style={{ fontSize: 12, color: "#8b949e" }}>状态切换必须满足"FGI 3日均值连续两日都处于新的情绪区间"，防止单日噪声触发状态切换。降级模式：当 Coinglass API 不可用时，自动使用缓存的最后一次有效状态。</div>
          </div>
        </div>
      </div>

      {/* FGI Simulation Chart */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">FGI 状态模拟（60日示例）</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={fgiSimData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
            <XAxis dataKey="day" tick={{ fill: "#8b949e", fontSize: 9 }} interval={9} />
            <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} domain={[0, 100]} />
            <Tooltip content={<DarkTooltip />} formatter={(v: number, _: string, p: any) => [v, p.payload.state]} />
            <Bar dataKey="fgi" name="FGI值" radius={[2, 2, 0, 0]}>
              {fgiSimData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cycle Estimator */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">情绪周期进度评估器（第二层）</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cycleData.map(c => (
                <div key={c.stage} style={{ background: "#1c2128", borderRadius: 8, padding: 14, display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${c.color}18`, border: `2px solid ${c.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: c.color, fontFamily: "JetBrains Mono, monospace" }}>{c.coeff}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{c.stage}阶段</div>
                    <div style={{ fontSize: 11, color: "#8b949e" }}>{c.condition}</div>
                    <div style={{ fontSize: 11, color: "#8b949e" }}>仓位系数：<span style={{ color: c.color, fontWeight: 600 }}>{(c.coeff * 100).toFixed(0)}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cycleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
                <XAxis dataKey="stage" tick={{ fill: "#8b949e", fontSize: 12 }} />
                <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} domain={[0, 1.2]} tickFormatter={v => (v * 100).toFixed(0) + "%"} />
                <Tooltip content={<DarkTooltip />} formatter={(v: number) => [(v * 100).toFixed(0) + "%", "仓位系数"]} />
                <Bar dataKey="coeff" name="仓位系数" radius={[6, 6, 0, 0]}>
                  {cycleData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ background: "#1c2128", borderRadius: 8, padding: 12, marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "#8b949e", lineHeight: 1.8 }}>
                历史基准通过离线脚本 <code style={{ background: "#0d1117", padding: "1px 5px", borderRadius: 3, color: "#00d4ff", fontFamily: "JetBrains Mono, monospace" }}>calc_cycle_baseline.py</code> 预先计算，存储为 <code style={{ background: "#0d1117", padding: "1px 5px", borderRadius: 3, color: "#00d4ff", fontFamily: "JetBrains Mono, monospace" }}>cycle_baseline.json</code>，实盘中直接加载使用，不在实时计算。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Signal Engine ───────────────────────────────────────────────────
function SignalSection() {
  const [activeSignal, setActiveSignal] = useState("liq_spike");

  const signals = [
    {
      id: "liq_spike",
      name: "清算冲击信号",
      file: "liq_spike.py",
      weight: 0.40,
      color: "#F7931A",
      direction: "双向",
      formula: "LiqSpikeScore = max(liq_1h, liq_4h) / liq_24h_median_30d",
      trigger: "LiqSpikeScore ≥ 3 且 vol_24h > V_MIN",
      normalize: "score = min(LiqSpikeScore / 10, 1.0)",
      desc: "捕捉显著高于历史常态的清算事件。当短期清算量是30日中位数的3倍以上时，表明市场出现了大规模强制平仓，往往预示着价格惯性延续或耗竭反转。",
    },
    {
      id: "oi_funding",
      name: "OI-资金费率失配",
      file: "oi_funding.py",
      weight: 0.20,
      color: "#627EEA",
      direction: "做空",
      formula: "OI_Rise = oi_now / oi_5min_ago\nFundingSpike = funding_rate_now - funding_rate_24h_mean",
      trigger: "OI_Rise > 1.25 AND FundingSpike > 0.01",
      normalize: "score = min((OI_Rise - 1) * 4, 1.0)",
      desc: "识别持仓量和资金费率同时飙升的多头过热状态。当5分钟内OI上涨超过25%，且资金费率大幅高于24小时均值，表明多头快速加杠杆，踩踏风险积累。",
    },
    {
      id: "funding_roc",
      name: "资金费率变动率",
      file: "funding_roc.py",
      weight: 0.10,
      color: "#ff3366",
      direction: "做空",
      formula: "roc = (funding_rate_now - funding_rate_1h_ago) / max(abs(funding_rate_1h_ago), 1e-9)",
      trigger: "roc > 3.0 AND funding_rate_now > 0.02%",
      normalize: "score = min(roc / 10, 1.0)",
      desc: "V4.3 新增信号。捕捉资金费率在1小时内的剧烈拉升，作为多头踩踏的超前预警信号。当资金费率变动率超过300%且绝对值高于0.02%，发出做空预警。",
    },
    {
      id: "crowdedness",
      name: "拥挤度信号",
      file: "crowdedness.py",
      weight: 0.20,
      color: "#9945FF",
      direction: "做空",
      formula: "LSR = long_short_ratio (大户多空比)\nfunding_rate = 当前资金费率",
      trigger: "LSR > 1.6 AND funding_rate > 0",
      normalize: "score = min((LSR - 1.0) / 2.0, 1.0)",
      desc: "识别散户多头过度拥挤的踩踏风险状态。当大户多空比超过1.6且资金费率为正，表明多头极度拥挤，一旦价格反转将触发连锁清算。",
    },
    {
      id: "trend_confirm",
      name: "趋势确认过滤器",
      file: "trend_confirm.py",
      weight: 0.15,
      color: "#00d4ff",
      direction: "双向",
      formula: "连续3个1分钟K线同向移动\n总位移 > 0.8%",
      trigger: "连续3个1m K线持续同向 + 总位移 > 0.8%",
      normalize: "score = min(total_displacement / 0.02, 1.0)",
      desc: "区分真实的趋势延续和短暂的流动性冲击噪声。清算峰值事件发生后，价格必须在同方向上连续3个1分钟K线持续移动且总位移超过0.8%，才被确认为有效信号。",
    },
    {
      id: "price_action",
      name: "价格行为信号",
      file: "price_action.py",
      weight: 0.05,
      color: "#00ff88",
      direction: "双向",
      formula: "做多: 价格 < BB下轨 AND RSI < 30\n做空: 价格 > BB上轨 AND RSI > 70",
      trigger: "BB(20,2.0) + RSI(14) + 多重确认(≥1项)",
      normalize: "score = 满足确认条件数 / 4",
      desc: "基于布林带和RSI的均值回归信号，提供精确的入场点。需满足至少1项多重确认：成交量>1.5×均量、OI方向确认、大户反向持仓>55%、4H RSI超买/超卖。资金费率过滤：做多时<0.075%，做空时>-0.075%。",
    },
  ];

  const weightData = signals.map(s => ({ name: s.name.replace("信号", "").replace("过滤器", ""), value: Math.round(s.weight * 100), color: s.color }));
  const active = signals.find(s => s.id === activeSignal)!;

  const radarData = signals.map(s => ({
    subject: s.name.replace("信号", "").replace("过滤器", "").replace("变动率", "RoC"),
    weight: Math.round(s.weight * 100),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Signal overview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">信号权重分布</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={weightData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {weightData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<DarkTooltip />} formatter={(v: number) => [v + "%", "权重"]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {weightData.map(d => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#8b949e" }}>{d.name}</span>
                  <span style={{ fontSize: 11, color: d.color, fontFamily: "JetBrains Mono, monospace", marginLeft: "auto" }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">信号强度雷达图（示例）</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#30363d" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#8b949e", fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 40]} tick={{ fill: "#8b949e", fontSize: 9 }} />
              <Radar name="权重" dataKey="weight" stroke="#00ff88" fill="#00ff88" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Signal selector + detail */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">信号详情（点击查看）</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {signals.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSignal(s.id)}
              style={{
                background: activeSignal === s.id ? `${s.color}15` : "#1c2128",
                border: `1px solid ${activeSignal === s.id ? s.color : "#30363d"}`,
                color: activeSignal === s.id ? s.color : "#8b949e",
                padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: `${active.color}15`, border: `1px solid ${active.color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 16 }}>⚡</span>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: active.color }}>{active.name}</div>
                <div style={{ fontSize: 11, color: "#8b949e", fontFamily: "JetBrains Mono, monospace" }}>{active.file} · 权重 {(active.weight * 100).toFixed(0)}% · {active.direction}</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.8, marginBottom: 14 }}>{active.desc}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ background: `${active.color}10`, border: `1px solid ${active.color}30`, borderRadius: 4, padding: "3px 10px", fontSize: 11, color: active.color }}>权重 {(active.weight * 100).toFixed(0)}%</div>
              <div style={{ background: "#1c2128", border: "1px solid #30363d", borderRadius: 4, padding: "3px 10px", fontSize: 11, color: "#8b949e" }}>方向: {active.direction}</div>
            </div>
          </div>
          <div style={{ background: "#0d1117", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 8, fontWeight: 600 }}>计算公式</div>
            <pre style={{ fontSize: 11, color: "#00d4ff", lineHeight: 1.8, fontFamily: "JetBrains Mono, monospace", marginBottom: 12, whiteSpace: "pre-wrap" }}>{active.formula}</pre>
            <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6, fontWeight: 600 }}>触发条件</div>
            <pre style={{ fontSize: 11, color: "#F7931A", lineHeight: 1.8, fontFamily: "JetBrains Mono, monospace", marginBottom: 12, whiteSpace: "pre-wrap" }}>{active.trigger}</pre>
            <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6, fontWeight: 600 }}>归一化方法</div>
            <pre style={{ fontSize: 11, color: "#00ff88", lineHeight: 1.8, fontFamily: "JetBrains Mono, monospace", whiteSpace: "pre-wrap" }}>{active.normalize}</pre>
          </div>
        </div>
      </div>

      {/* Signal Composer */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">信号加权合成器 (signal_composer.py)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ background: "#0d1117", borderRadius: 8, padding: 14 }}>
              <pre style={{ fontSize: 11, color: "#00d4ff", lineHeight: 1.8, fontFamily: "JetBrains Mono, monospace" }}>
{`Score = Σ(w_i × Norm(signal_i))

默认权重:
  LiqSpike    = 0.40  ← 核心信号
  OI-Funding  = 0.20
  Crowdedness = 0.20
  TrendConfirm= 0.15
  ETFFlow     = 0.05

情绪门控:
  "只做多" → 过滤所有做空信号
  "只做空" → 过滤所有做多信号

信号有效期: 30分钟
  过期信号不参与合成`}
              </pre>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.8, marginBottom: 12 }}>
              合成器输出 <code style={{ background: "#1c2128", padding: "1px 5px", borderRadius: 3, color: "#00d4ff", fontFamily: "JetBrains Mono, monospace" }}>CompositeSignal</code>，包含：
            </div>
            {[
              ["symbol", "交易标的", "#e6edf3"],
              ["direction", '"long" | "short" | "no_trade"', "#00ff88"],
              ["score", "综合评分 (0 ~ 100)", "#F7931A"],
              ["position_coefficient", "情绪周期系数 (0.30/0.60/1.00)", "#00d4ff"],
              ["component_scores", "各分项信号详情 Dict", "#9945FF"],
              ["sentiment_state", "当前情绪状态", "#627EEA"],
            ].map(([field, desc, color]) => (
              <div key={field} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #1c2128" }}>
                <code style={{ fontSize: 11, color: color as string, fontFamily: "JetBrains Mono, monospace", minWidth: 160 }}>{field}</code>
                <span style={{ fontSize: 11, color: "#8b949e" }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Execution & Risk ────────────────────────────────────────────────
function RiskSection() {
  const riskRules = [
    { rule: "保证金模式", value: "逐仓（强制）", level: "头寸级", color: "#F7931A" },
    { rule: "最大杠杆", value: "3x（代码硬性约束）", level: "头寸级", color: "#F7931A" },
    { rule: "止损优先于强平", value: "止损价必须优于预估强平价", level: "头寸级", color: "#F7931A" },
    { rule: "最大同时持仓", value: "5个", level: "账户级", color: "#ff3366" },
    { rule: "最大同向净敞口", value: "30%", level: "账户级", color: "#ff3366" },
    { rule: "板块集中度", value: "单板块 ≤ 50%", level: "账户级", color: "#ff3366" },
    { rule: "高相关性限制", value: "相关系数 > 0.85 的品种只能持一个", level: "账户级", color: "#ff3366" },
    { rule: "单日熔断", value: "单日回撤 > 5% → 禁止开新仓", level: "熔断", color: "#00d4ff" },
    { rule: "总熔断", value: "总回撤 > 15% → 全部平仓 + 暂停策略", level: "熔断", color: "#00d4ff" },
    { rule: "黑名单", value: "触发异常的品种加入24小时黑名单", level: "账户级", color: "#ff3366" },
    { rule: "心跳熔断", value: "心跳丢失 > 30秒 → 触发保护", level: "系统级", color: "#9945FF" },
    { rule: "系统保护", value: "FGI ≤ 10 或 ≥ 90 且波动率 > 历史90%分位 → 禁止开仓", level: "系统级", color: "#9945FF" },
  ];

  const positionSteps = [
    { step: "步骤一", title: "基础仓位计算", formula: "base_position = equity × base_risk × (score/100) × vol_adj", desc: "vol_adj = min(1.0, ATR_BASELINE / atr_14)，波动越大仓位越小", color: "#00ff88" },
    { step: "步骤二", title: "情绪周期调节", formula: "adjusted = base_position × cycle_coefficient", desc: "cycle_coefficient = 0.30（早期）/ 0.60（中期）/ 1.00（末期）", color: "#00d4ff" },
    { step: "步骤三", title: "账户约束限制", formula: "final = min(adjusted, equity × position_cap)", desc: "position_cap 由 FGI 情绪状态决定（10% 或 30%）", color: "#F7931A" },
  ];

  const batchData = [
    { name: "第一批", pct: 40, desc: "立即下单", color: "#00ff88" },
    { name: "第二批", pct: 40, desc: "第一批成交后", color: "#00d4ff" },
    { name: "第三批", pct: 20, desc: "价格进一步确认", color: "#9945FF" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Position Sizer */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">三步仓位计算法 (position_sizer.py)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {positionSteps.map((s, i) => (
            <div key={s.step} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${s.color}18`, border: `2px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: s.color }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, background: "#1c2128", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.step}：{s.title}</div>
                <code style={{ fontSize: 12, color: "#e6edf3", fontFamily: "JetBrains Mono, monospace", display: "block", marginBottom: 6 }}>{s.formula}</code>
                <div style={{ fontSize: 11, color: "#8b949e" }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            ["止损", "entry ± 2.0×ATR", "#ff3366"],
            ["第一止盈", "entry ± 2.0×ATR（平50%）", "#00ff88"],
            ["第二止盈", "entry ± 4.0×ATR（平剩余）", "#00ff88"],
            ["强平价验证", "止损价必须优于预估强平价", "#F7931A"],
          ].map(([k, v, c]) => (
            <div key={k} style={{ background: "#1c2128", borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 4 }}>{k}</div>
              <div style={{ fontSize: 11, color: c as string, fontFamily: "JetBrains Mono, monospace" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Batch Entry + Risk Rules */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">分批建仓策略 (40/40/20)</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={batchData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2128" />
              <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 12 }} />
              <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} tickFormatter={v => v + "%"} domain={[0, 50]} />
              <Tooltip content={<DarkTooltip />} formatter={(v: number) => [v + "%", "仓位比例"]} />
              <Bar dataKey="pct" name="仓位比例" radius={[6, 6, 0, 0]}>
                {batchData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {batchData.map(b => (
              <div key={b.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #1c2128" }}>
                <span style={{ color: b.color, fontWeight: 600 }}>{b.name} ({b.pct}%)</span>
                <span style={{ color: "#8b949e" }}>{b.desc}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, background: "#1c2128", borderRadius: 6, padding: 10 }}>
            <div style={{ fontSize: 11, color: "#8b949e" }}>
              <strong style={{ color: "#00d4ff" }}>Maker-First 下单策略：</strong>先以对手盘1价下限价单，5秒未成交则撤单重试（最多3次），最终降级为市价单确保成交。
            </div>
          </div>
        </div>

        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">双层风控审批流程</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "rgba(247,147,26,0.08)", border: "1px solid rgba(247,147,26,0.3)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F7931A", marginBottom: 6 }}>第一层：头寸级风控 (position_risk.py)</div>
              {["检查杠杆 ≤ 3x（代码硬性约束）", "验证逐仓保证金模式", "确认止损价优于预估强平价"].map(r => (
                <div key={r} style={{ fontSize: 11, color: "#8b949e", padding: "2px 0" }}>✓ {r}</div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", color: "#8b949e", fontSize: 18 }}>↓</div>
            <div style={{ background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.3)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ff3366", marginBottom: 6 }}>第二层：账户级风控 (account_risk.py)</div>
              {["持仓数量 < 5", "同向净敞口 ≤ 30%", "板块集中度 ≤ 50%", "高相关性检查 (r > 0.85)", "单日熔断检查 (5%)", "总熔断检查 (15%)", "黑名单检查"].map(r => (
                <div key={r} style={{ fontSize: 11, color: "#8b949e", padding: "2px 0" }}>✓ {r}</div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", color: "#8b949e", fontSize: 18 }}>↓</div>
            <div style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)", borderRadius: 8, padding: 10, textAlign: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#00ff88" }}>✓ 审批通过 → 执行下单</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Rules Table */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">完整风控规则表</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["风控规则", "参数/阈值", "层级", "触发后果"].map(h => (
                <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {riskRules.map(r => (
              <tr key={r.rule} style={{ borderBottom: "1px solid #1c2128" }}>
                <td style={{ padding: "9px 12px", fontWeight: 600 }}>{r.rule}</td>
                <td style={{ padding: "9px 12px", fontFamily: "JetBrains Mono, monospace", color: r.color }}>{r.value}</td>
                <td style={{ padding: "9px 12px" }}>
                  <span style={{ background: `${r.color}12`, border: `1px solid ${r.color}30`, color: r.color, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{r.level}</span>
                </td>
                <td style={{ padding: "9px 12px", color: "#8b949e", fontSize: 11 }}>
                  {r.level === "熔断" ? (r.rule.includes("单日") ? "禁止开新仓 (DAILY_HALT)" : "全部平仓 + 暂停 (FULL_HALT)") : "拒绝交易 + 记录原因"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section: Backtest ────────────────────────────────────────────────────────
function BacktestSection() {
  const costData = [
    { name: "手续费", value: "0.05%", desc: "双边Taker", color: "#F7931A" },
    { name: "小额滑点", value: "0.05%", desc: "< $20k", color: "#627EEA" },
    { name: "中额滑点", value: "0.10%", desc: "$20k - $100k", color: "#9945FF" },
    { name: "大额滑点", value: "0.20%", desc: "> $100k", color: "#ff3366" },
    { name: "资金费率", value: "每8小时", desc: "按实际费率结算", color: "#00d4ff" },
  ];

  const paramGrid = [
    { combo: "A（基准）", bb: "BB(20, 2.0)", rsi: "RSI(14)", atr: "2.0x" },
    { combo: "B", bb: "BB(20, 2.5)", rsi: "RSI(14)", atr: "2.5x" },
    { combo: "C", bb: "BB(14, 2.0)", rsi: "RSI(14)", atr: "2.0x" },
    { combo: "D", bb: "BB(20, 2.0)", rsi: "RSI(21)", atr: "2.0x" },
    { combo: "E（保守）", bb: "BB(20, 2.5)", rsi: "RSI(21)", atr: "3.0x" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Backtest Engine */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">高保真回测引擎 (backtest/engine.py)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3", marginBottom: 12 }}>核心设计原则</div>
            {[
              ["无未来函数", "严禁 lookahead bias，时间点 t 只使用 t 及之前的数据", "#00ff88"],
              ["成本真实", "完整模拟手续费 + 分层滑点 + 资金费率（每8小时结算）", "#F7931A"],
              ["标记价格", "所有风控计算使用标记价格，而非最新成交价", "#00d4ff"],
              ["逐仓模拟", "精确模拟逐仓保证金模式和强平价计算", "#9945FF"],
              ["分批建仓", "完整模拟 40/40/20 三批建仓逻辑", "#627EEA"],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #1c2128" }}>
                <span style={{ fontSize: 12, color: c as string, fontWeight: 600, minWidth: 90 }}>{k}</span>
                <span style={{ fontSize: 11, color: "#8b949e" }}>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3", marginBottom: 12 }}>输出报告指标</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["总收益率", "#00ff88"], ["年化收益率", "#00ff88"], ["最大回撤", "#ff3366"],
                ["夏普比率", "#00d4ff"], ["卡玛比率", "#00d4ff"], ["胜率", "#F7931A"],
                ["盈利因子", "#F7931A"], ["平均持仓天数", "#8b949e"],
                ["总手续费", "#8b949e"], ["总资金费率", "#8b949e"],
              ].map(([metric, color]) => (
                <div key={metric} style={{ background: "#1c2128", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 11, color: color as string }}>{metric}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trading Costs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">交易成本模型</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {costData.map(c => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#1c2128", borderRadius: 6 }}>
                <div>
                  <span style={{ fontSize: 12, color: c.color, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: "#8b949e", marginLeft: 8 }}>{c.desc}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.color, fontFamily: "JetBrains Mono, monospace" }}>{c.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
          <div className="card-title-bar">价格行为信号参数网格</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["组合", "布林带参数", "RSI参数", "ATR止损倍数"].map(h => (
                  <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paramGrid.map((r, i) => (
                <tr key={r.combo} style={{ borderBottom: "1px solid #1c2128", background: i === 0 ? "rgba(0,255,136,0.04)" : "transparent" }}>
                  <td style={{ padding: "8px 10px", color: i === 0 ? "#00ff88" : "#e6edf3", fontWeight: i === 0 ? 700 : 400 }}>{r.combo}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "JetBrains Mono, monospace", color: "#00d4ff" }}>{r.bb}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "JetBrains Mono, monospace", color: "#F7931A" }}>{r.rsi}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "JetBrains Mono, monospace", color: "#9945FF" }}>{r.atr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Cycle Analyzer */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">价格顶底周期分析工具 (analysis/price_cycle_analyzer.py)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            { title: "局部极值检测", desc: "使用滑动窗口识别价格的局部最高点和最低点，作为周期顶底的候选点", color: "#F7931A" },
            { title: "周期持续时间统计", desc: "统计历史上每个情绪周期（恐惧→贪婪→恐惧）的持续天数，计算中位数和75%分位数", color: "#00d4ff" },
            { title: "历史基准生成", desc: "输出 cycle_baseline.json，供 CycleEstimator 在实盘中加载使用，避免实时计算", color: "#00ff88" },
          ].map(item => (
            <div key={item.title} style={{ background: "#1c2128", borderRadius: 8, padding: 14, borderTop: `3px solid ${item.color}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.color, marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.7 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section: Code Structure ──────────────────────────────────────────────────
function CodeSection() {
  const files = [
    { path: "engine-python/config/", files: ["config.yaml", "config_loader.py"], color: "#00d4ff", desc: "Pydantic V2 配置管理器（单例 + 线程安全）" },
    { path: "engine-python/data/", files: ["coinglass_client.py", "binance_client.py", "sanitizer.py"], color: "#F7931A", desc: "数据管道 + DataSanitizer 清洗层" },
    { path: "engine-python/strategy/sentiment/", files: ["fgi_state_machine.py", "cycle_estimator.py", "sentiment_manager.py"], color: "#9945FF", desc: "FGI四态状态机 + 周期进度评估器" },
    { path: "engine-python/strategy/signals/", files: ["base_signal.py", "liq_spike.py", "oi_funding.py", "funding_roc.py", "crowdedness.py", "trend_confirm.py", "price_action.py", "signal_synthesizer.py"], color: "#F7931A", desc: "6路Alpha信号 + 加权合成器" },
    { path: "engine-python/execution/", files: ["position_sizer.py", "account_risk_manager.py", "order_manager.py", "simulated_okx_client.py"], color: "#ff3366", desc: "三步仓位计算 + 双层风控 + 订单管理" },
    { path: "engine-python/api/", files: ["main.py", "models.py"], color: "#00ff88", desc: "FastAPI 服务层（供 TS 后端调用）" },
    { path: "engine-python/monitor/", files: ["main_loop.py"], color: "#00d4ff", desc: "主控循环（每分钟执行完整策略流水线）" },
    { path: "engine-python/backtest/", files: ["engine.py", "report.py"], color: "#627EEA", desc: "高保真回测引擎 + 报告生成器" },
    { path: "engine-python/analysis/", files: ["price_cycle_analyzer.py"], color: "#9945FF", desc: "价格顶底周期分析工具" },
    { path: "backend-ts/src/lib/server/", files: ["okxProxy.ts", "db/schema.ts", "db/tradingDb.ts", "strategyScheduler.ts", "reconciliation.ts", "pythonApiClient.ts"], color: "#627EEA", desc: "TS 后端：OKX代理 + Drizzle ORM + 调度器 + 对账" },
    { path: "engine-python/tests/", files: ["test_fgi_state_machine.py", "test_signal_synthesizer.py", "conftest.py"], color: "#8b949e", desc: "Pytest 单元测试套件" },
    { path: "backend-ts/src/", files: ["okxProxy.test.ts"], color: "#8b949e", desc: "Vitest 单元测试" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">项目代码目录结构</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {files.map(group => (
            <div key={group.path} style={{ background: "#1c2128", borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <code style={{ fontSize: 12, color: group.color, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{group.path}</code>
                <span style={{ fontSize: 11, color: "#8b949e" }}>{group.desc}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {group.files.map(f => (
                  <span key={f} style={{ background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Matrix */}
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20 }}>
        <div className="card-title-bar">策略模块测试矩阵</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["测试场景", "预期结果", "状态"].map(h => (
                <th key={h} style={{ background: "#1c2128", color: "#8b949e", padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #30363d", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["FGI=15，连续2日 → 情绪状态机", "extreme_fear, long_only, 仓位上限10%"],
              ["FGI=85，连续1日 → 情绪状态机", "状态不切换（需连续2日确认）"],
              ["当前周期第3天，历史中位数7天 → 周期评估器", "输出系数 0.30（早期阶段）"],
              ["LiqSpikeScore=5，vol_24h足够 → 清算信号", "触发，is_triggered=True，方向做空"],
              ["情绪状态'只做多'，信号方向'做空' → 合成器", "信号被过滤，direction='no_trade'"],
              ["止损价劣于预估强平价 → 仓位计算器", "is_valid=False，信号作废"],
              ["已有5个持仓，尝试开第6个 → 账户风控", "approved=False，'持仓数量已达上限'"],
              ["单日回撤5.5% → 熔断检查", "返回 DAILY_HALT，禁止开新仓"],
              ["总回撤16% → 熔断检查", "返回 FULL_HALT，触发全部平仓"],
            ].map(([scenario, expected]) => (
              <tr key={scenario} style={{ borderBottom: "1px solid #1c2128" }}>
                <td style={{ padding: "9px 12px", color: "#8b949e", fontSize: 11 }}>{scenario}</td>
                <td style={{ padding: "9px 12px", color: "#e6edf3", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>{expected}</td>
                <td style={{ padding: "9px 12px" }}>
                  <span style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>✓ 已实现</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function V43Page() {
  const [activeTab, setActiveTab] = useState<Tab>("系统架构");
  const [, navigate] = useLocation();

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      {/* Header */}
      <header style={{ background: "#161b22", borderBottom: "1px solid #30363d", padding: "0 32px", position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("/")}
            style={{ background: "transparent", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
          >
            ← 返回
          </button>
          <span style={{ color: "#30363d" }}>|</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#00ff88", letterSpacing: 1, fontFamily: "Space Grotesk, sans-serif" }}>⚡ LIQUIDITY HUNTER V4.3</span>
          <span style={{ background: "rgba(0,212,255,0.1)", border: "1px solid #00d4ff", color: "#00d4ff", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em" }}>OKX 永续合约</span>
          <span style={{ background: "rgba(153,69,255,0.1)", border: "1px solid rgba(153,69,255,0.3)", color: "#9945FF", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>Python + TypeScript</span>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "#1c2128" : "transparent",
                border: "none",
                color: activeTab === tab ? "#e6edf3" : "#8b949e",
                padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
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
        {activeTab === "系统架构" && <ArchSection />}
        {activeTab === "情绪引擎" && <SentimentSection />}
        {activeTab === "信号引擎" && <SignalSection />}
        {activeTab === "执行风控" && <RiskSection />}
        {activeTab === "回测分析" && <BacktestSection />}
        {activeTab === "代码结构" && <CodeSection />}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #30363d", padding: "16px 32px", textAlign: "center", color: "#8b949e", fontSize: 11, marginTop: 40 }}>
        OKX 量化交易系统 V4.3 — Liquidity Hunter · Python 策略引擎 + TypeScript 后端 + React 前端 · 仅供研究参考，不构成投资建议
      </footer>
    </div>
  );
}
