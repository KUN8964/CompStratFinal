"""
env_config.py — 类型安全的环境变量读取工具
借鉴自参考方案二 (okx-trend-bot) 的 config.ts

核心设计（直接借鉴）：
  - envOrDefault / envFloat / envInt / envBool 四个工具函数
  - 每个函数都有明确的类型和默认值，比 os.getenv() 更健壮
  - 支持从 .env 文件加载（使用 python-dotenv）

本项目扩展：
  - 新增 envList（逗号分隔的列表）
  - 新增 require_env（必填项，缺失时抛出明确错误）
  - 新增 AppConfig 数据类，统一管理所有配置
"""

import os
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# 尝试加载 .env 文件（可选依赖）
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv 未安装时跳过


# ─── 工具函数（借鉴自 config.ts）─────────────────────────────────────────────

def env_or_default(key: str, default: str) -> str:
    """读取字符串环境变量，缺失时返回默认值。"""
    return os.environ.get(key, default)


def env_float(key: str, default: float) -> float:
    """读取浮点数环境变量，缺失或无效时返回默认值。"""
    val = os.environ.get(key)
    if val is None:
        return default
    try:
        return float(val)
    except ValueError:
        logger.warning(f"[Config] Invalid float for {key}='{val}', using default {default}")
        return default


def env_int(key: str, default: int) -> int:
    """读取整数环境变量，缺失或无效时返回默认值。"""
    val = os.environ.get(key)
    if val is None:
        return default
    try:
        return int(val)
    except ValueError:
        logger.warning(f"[Config] Invalid int for {key}='{val}', using default {default}")
        return default


def env_bool(key: str, default: bool) -> bool:
    """
    读取布尔值环境变量 — 借鉴自 config.ts envBool()
    'true'（不区分大小写）→ True，其他非空值 → False
    """
    val = os.environ.get(key)
    if val is None:
        return default
    return val.lower() == "true"


def env_list(key: str, default: list[str], separator: str = ",") -> list[str]:
    """读取逗号分隔的列表环境变量（本项目新增）。"""
    val = os.environ.get(key)
    if val is None:
        return default
    return [item.strip() for item in val.split(separator) if item.strip()]


def require_env(key: str) -> str:
    """读取必填环境变量，缺失时抛出明确错误（本项目新增）。"""
    val = os.environ.get(key)
    if not val:
        raise EnvironmentError(
            f"Required environment variable '{key}' is not set. "
            f"Please add it to your .env file or environment."
        )
    return val


# ─── 统一配置数据类（本项目扩展）────────────────────────────────────────────

@dataclass
class OKXConfig:
    api_key: str = field(default_factory=lambda: env_or_default("OKX_API_KEY", ""))
    secret: str = field(default_factory=lambda: env_or_default("OKX_SECRET", ""))
    passphrase: str = field(default_factory=lambda: env_or_default("OKX_PASSPHRASE", ""))
    sandbox: bool = field(default_factory=lambda: env_bool("OKX_SANDBOX", True))


@dataclass
class CoinGlassConfig:
    api_key: str = field(default_factory=lambda: env_or_default("COINGLASS_API_KEY", ""))
    base_url: str = field(default_factory=lambda: env_or_default(
        "COINGLASS_BASE_URL", "https://open-api-v4.coinglass.com"
    ))


@dataclass
class TradingConfig:
    symbols: list[str] = field(default_factory=lambda: env_list(
        "TRADING_SYMBOLS", ["BTC/USDT:USDT", "ETH/USDT:USDT", "SOL/USDT:USDT"]
    ))
    timeframe: str = field(default_factory=lambda: env_or_default("TIMEFRAME", "1d"))
    initial_capital: float = field(default_factory=lambda: env_float("INITIAL_CAPITAL", 10000.0))


@dataclass
class RiskConfig:
    max_daily_loss_pct: float = field(default_factory=lambda: env_float("MAX_DAILY_LOSS_PCT", 0.05))
    max_drawdown_pct: float = field(default_factory=lambda: env_float("MAX_DRAWDOWN_PCT", 0.15))
    max_latency_ms: int = field(default_factory=lambda: env_int("MAX_LATENCY_MS", 5000))
    position_size_pct: float = field(default_factory=lambda: env_float("POSITION_SIZE_PCT", 0.1))
    stop_loss_pct: float = field(default_factory=lambda: env_float("STOP_LOSS_PCT", 0.15))


@dataclass
class AppConfig:
    """
    统一应用配置 — 整合所有子配置
    使用方式：config = AppConfig()
    """
    okx: OKXConfig = field(default_factory=OKXConfig)
    coinglass: CoinGlassConfig = field(default_factory=CoinGlassConfig)
    trading: TradingConfig = field(default_factory=TradingConfig)
    risk: RiskConfig = field(default_factory=RiskConfig)
    poll_interval_ms: int = field(default_factory=lambda: env_int("POLL_INTERVAL_MS", 60000))
    log_level: str = field(default_factory=lambda: env_or_default("LOG_LEVEL", "INFO"))
    dashboard_port: int = field(default_factory=lambda: env_int("DASHBOARD_PORT", 3000))

    def validate(self) -> list[str]:
        """验证配置完整性，返回警告列表（不抛出异常）。"""
        warnings = []
        if not self.okx.api_key:
            warnings.append("OKX_API_KEY not set — live trading disabled, backtest mode only")
        if not self.coinglass.api_key:
            warnings.append("COINGLASS_API_KEY not set — funding rate signals will use estimated values")
        if self.okx.sandbox:
            warnings.append("OKX_SANDBOX=true — running in paper trading mode")
        return warnings
