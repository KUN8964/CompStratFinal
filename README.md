# Composite Strategy System

复合量化策略项目，包含 Python 回测/执行骨架和 React 前端仪表盘。

## 项目结构

```text
composite_strategy/
  run_backtest.py              # V1：BTC 海龟多头 + 山寨 OBV 做空
  run_backtest_v2.py           # V2：V1 + BTC 网格 + ETH/SOL RSI 均值回归
  config.py                    # 默认参数
  strategies/                  # 策略模块
  execution/                   # OKX 执行、风控、异步下单骨架
  utils/                       # 缓存、指标、环境配置工具
  data/                        # 行情缓存
  data_output/                 # 回测报告、交易记录、JSON 输出
  scripts/sync_frontend_data.py # 将 V2 JSON 同步为前端 TS 数据

composite-strategy-web/
  client/src/pages/Home.tsx    # 主仪表盘
  client/src/lib/data.ts       # 前端内置数据与生成数据入口
```

## 常用命令

安装 Python 依赖：

```bash
cd composite_strategy
python3 -m pip install -r requirements.txt
```

运行 V1 回测：

```bash
cd composite_strategy
python3 run_backtest.py
```

运行 V2 回测：

```bash
cd composite_strategy
python3 run_backtest_v2.py
```

同步 V2 回测结果到前端：

```bash
cd composite_strategy
python3 scripts/sync_frontend_data.py
```

启动前端：

```bash
cd composite-strategy-web
pnpm install
pnpm dev
```

## 输出文件

V1/V2 报告输出统一放在 `composite_strategy/data_output/`：

- `report.png`：V1 报告图
- `report_v2.png`：V2 报告图
- `trades.csv`：V1 交易记录
- `trades_v2.csv`：V2 交易记录
- `backtest_v2_data.json`：V2 前端同步数据源
- `idle_time_data.json`：资金利用率分析结果

## 配置说明

两个回测入口都支持传入 JSON 配置文件：

```bash
python3 run_backtest_v2.py my_config.json
```

自定义配置会和 `config.py` 的默认配置做递归合并，只写需要覆盖的字段即可。

## 当前边界

`execution/`、`utils/env_config.py`、`strategies/funding_arb_signal.py` 已提供实盘接入骨架，但尚未完整接入主回测循环。现在项目的稳定主线是离线回测和前端报告展示；实盘交易前还需要补充账户同步、订单状态确认、仓位恢复、异常告警和模拟盘验证。
