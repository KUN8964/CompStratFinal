# 参考方案借鉴分析报告

**参考方案**：`crypto_arbitrage_v1_okx`（OKX 三角套利系统）  
**本项目**：复合量化策略系统 V2（BTC 海龟做多 + 山寨 OBV 做空 + 网格 + 均值回归）  
**分析日期**：2026-03-01

---

## 一、参考方案核心架构

参考方案是一套 **OKX 现货三角套利系统**，核心设计如下：

| 模块 | 实现 | 特点 |
|---|---|---|
| `CoinGlassDataFetcher` | aiohttp 异步获取资金费率 | 多交易所数据聚合 |
| `RiskController` | Decimal 精度 + 每日亏损熔断 + 延迟检测 | 轻量但精准 |
| `ExecutionEngine` | 多步骤原子执行 + 自动反向对冲回滚 | 套利场景关键设计 |
| `OKXAdapter` | HMAC-SHA256 签名 + aiohttp 异步 | 标准 OKX API 封装 |
| `InstrumentManager` | 合约规格同步 + Decimal 精度取整 | 避免下单精度错误 |
| `TriangleStrategy` | 三角套利利润计算 | 套利专用，不适用本项目 |

---

## 二、可借鉴点分析

### ✅ 直接借鉴（已实现）

**1. 原子化执行引擎 → `execution/async_execution_engine.py`**

原方案的 `ExecutionEngine._hedge()` 设计极为精妙：任意步骤失败时，按逆序对已执行订单下反向市价单，保证账户不会出现半仓状态。本项目在此基础上新增：
- `execute_parallel_shorts()`：多个山寨空头并发开仓，降低滑点
- 异步延迟检测前置检查
- 更完善的异常捕获（回滚本身失败时记录告警而非崩溃）

**2. Decimal 精度风控 → `execution/risk_controller.py`**

原方案用 `Decimal` 而非 `float` 计算每日亏损，避免浮点误差导致风控失效（如 `-49.9999999` 被误判为未超 `-50` 限额）。本项目完整继承此设计，并新增：
- 净值高水位回撤熔断（原方案无此功能）
- 连续亏损降仓系数（原方案无此功能）
- UTC 每日自动重置

**3. OKX API 签名封装 → `execution/okx_adapter.py`**

原方案的签名逻辑（`ts + method + path + body` → HMAC-SHA256 → Base64）完全正确，直接复用。本项目扩展：
- 支持永续合约（`tdMode=cross`，原方案只有现货 `cash`）
- 新增 `ping()`、`get_positions()`、`get_account_balance()` 方法
- 新增模拟盘标志（`x-simulated-trading: 1`）

**4. 资金费率数据 → `strategies/funding_arb_signal.py`**

原方案通过 CoinGlass API 获取资金费率用于套利。本项目将其转化为**趋势策略的辅助信号**：
- 极端正资金费率（>0.1%/8h）→ 多头过热 → 增强山寨做空权重
- 极端负资金费率（<-0.05%/8h）→ 空头过热 → 增强 BTC 做多权重
- 回测模式下用价格偏离 × 成交量强度代理估算

---

### ❌ 不适用本项目的设计

| 参考方案模块 | 不适用原因 |
|---|---|
| `TriangleStrategy` | 三角套利逻辑（A→B→C→A），与趋势跟踪策略完全不同 |
| `InstrumentManager.sync()` | 原方案只同步现货，本项目需要合约规格，已在 `okx_adapter.get_instruments()` 中重实现 |
| 毫秒级延迟要求 | 套利需要 <500ms 延迟，趋势策略日线级别，延迟容忍度更高（<5000ms 即可） |

---

## 三、整合后项目架构

```
composite_strategy/
├── strategies/
│   ├── btc_turtle.py           # BTC 海龟做多（原有）
│   ├── alt_obv_short.py        # 山寨 OBV 做空（原有）
│   ├── grid_trading.py         # BTC 网格（原有）
│   ├── rsi_mean_reversion.py   # RSI 均值回归（原有）
│   └── funding_arb_signal.py   # ★ 新增：资金费率辅助信号（借鉴参考方案）
├── execution/
│   ├── __init__.py
│   ├── okx_adapter.py          # ★ 新增：OKX API 适配器（借鉴参考方案签名逻辑）
│   ├── async_execution_engine.py  # ★ 新增：原子化执行引擎（借鉴参考方案）
│   └── risk_controller.py      # ★ 新增：增强型风控熔断器（借鉴参考方案）
├── run_backtest.py             # 回测入口（原有）
├── run_backtest_v2.py          # V2 增强回测（原有）
└── config.py                   # 参数配置（原有）
```

---

## 四、关键改进量化

| 维度 | 借鉴前 | 借鉴后 |
|---|---|---|
| 执行安全性 | 无回滚机制，失败可能留半仓 | 原子化执行 + 自动对冲回滚 |
| 风控精度 | float 计算，有浮点误差 | Decimal 精度，零误差 |
| 多标的开仓 | 顺序执行（约 5×延迟） | 并发执行（约 1×延迟） |
| 市场状态感知 | 无资金费率感知 | 资金费率压力信号调整各策略权重 |
| 实盘接入 | 无 OKX API 封装 | 完整签名 + 合约支持 + 模拟盘 |
