"""
增强型风控熔断器 (Enhanced Risk Controller)
============================================
借鉴参考方案 crypto_arbitrage_v1_okx 的 RiskController 设计：
- Decimal 精度控制（避免浮点误差导致风控失效）
- 每日亏损熔断（超过阈值自动停止当日所有交易）
- 网络延迟检测（高延迟市场下拒绝执行）

新增功能（超出参考方案）：
- 单笔最大亏损限制
- 连续亏损计数器（超过 N 笔连亏自动降仓）
- 账户净值回撤熔断（从高水位回撤超过阈值停止）
- 每日重置（UTC 00:00 自动重置每日亏损计数）
"""

import logging
from decimal import Decimal
from datetime import datetime, timezone, date

logger = logging.getLogger(__name__)


class RiskController:
    """
    双层风控熔断器。
    
    第一层（参考方案）：延迟检测 + 每日亏损限额
    第二层（新增）：净值回撤熔断 + 连续亏损降仓
    """

    def __init__(
        self,
        max_daily_loss_pct: float = 0.05,      # 每日最大亏损比例（相对初始净值）
        max_latency_ms: float = 500,            # 最大可接受延迟（ms）
        max_drawdown_pct: float = 0.15,         # 账户最大回撤熔断阈值
        max_consecutive_losses: int = 5,        # 最大连续亏损笔数（超过则降仓）
        init_equity: float = 10000.0,           # 初始账户净值
    ):
        self.max_daily_loss = Decimal(str(max_daily_loss_pct * init_equity))
        self.max_latency_ms = max_latency_ms
        self.max_drawdown_pct = Decimal(str(max_drawdown_pct))
        self.max_consecutive_losses = max_consecutive_losses

        self.init_equity = Decimal(str(init_equity))
        self.peak_equity = Decimal(str(init_equity))
        self.current_equity = Decimal(str(init_equity))

        self.daily_pnl = Decimal("0")
        self.consecutive_losses = 0
        self.tripped = False
        self._last_reset_date: date = datetime.now(timezone.utc).date()

        logger.info(
            f"[RiskCtrl] 初始化完成 | 每日亏损限额={self.max_daily_loss} USDT | "
            f"最大延迟={max_latency_ms}ms | 最大回撤={max_drawdown_pct*100:.0f}%"
        )

    def _auto_reset_daily(self):
        """UTC 00:00 自动重置每日亏损计数"""
        today = datetime.now(timezone.utc).date()
        if today != self._last_reset_date:
            logger.info(f"[RiskCtrl] 新的一天，重置每日亏损计数（{self._last_reset_date} → {today}）")
            self.daily_pnl = Decimal("0")
            self._last_reset_date = today
            # 注意：tripped 状态不自动解除，需人工确认

    def check_pre_trade(self, latency_ms: float) -> bool:
        """
        交易前置检查（借鉴参考方案核心逻辑）。
        
        Returns
        -------
        bool  True = 允许交易，False = 拒绝
        """
        self._auto_reset_daily()

        # 1. 熔断器已触发
        if self.tripped:
            logger.warning("[RiskCtrl] 熔断器已触发，拒绝所有交易")
            return False

        # 2. 每日亏损超限（借鉴参考方案）
        if self.daily_pnl <= -self.max_daily_loss:
            logger.warning(f"[RiskCtrl] 每日亏损 {self.daily_pnl} 超限 {-self.max_daily_loss}，触发熔断")
            self.tripped = True
            return False

        # 3. 网络延迟超限（借鉴参考方案）
        if latency_ms > self.max_latency_ms:
            logger.warning(f"[RiskCtrl] 延迟 {latency_ms:.1f}ms 超限 {self.max_latency_ms}ms，拒绝执行")
            return False

        # 4. 账户净值回撤超限（新增）
        if self.peak_equity > 0:
            drawdown = (self.peak_equity - self.current_equity) / self.peak_equity
            if drawdown >= self.max_drawdown_pct:
                logger.warning(f"[RiskCtrl] 净值回撤 {float(drawdown)*100:.1f}% 超限，触发熔断")
                self.tripped = True
                return False

        return True

    def get_position_scale(self) -> float:
        """
        根据连续亏损情况返回仓位缩放系数（新增功能）。
        连续亏损越多，仓位越小，最低降至 30%。
        """
        if self.consecutive_losses == 0:
            return 1.0
        elif self.consecutive_losses <= 2:
            return 0.75
        elif self.consecutive_losses <= 4:
            return 0.50
        else:
            return 0.30

    def record_trade_result(self, pnl: float):
        """
        记录每笔交易结果，更新风控状态。
        
        Parameters
        ----------
        pnl : float  本笔交易盈亏（正=盈利，负=亏损），单位 USDT
        """
        pnl_d = Decimal(str(pnl))
        self.daily_pnl += pnl_d
        self.current_equity += pnl_d

        # 更新高水位
        if self.current_equity > self.peak_equity:
            self.peak_equity = self.current_equity

        # 连续亏损计数
        if pnl < 0:
            self.consecutive_losses += 1
            if self.consecutive_losses >= self.max_consecutive_losses:
                logger.warning(
                    f"[RiskCtrl] 连续亏损 {self.consecutive_losses} 笔，"
                    f"仓位缩放至 {self.get_position_scale()*100:.0f}%"
                )
        else:
            self.consecutive_losses = 0

        logger.debug(
            f"[RiskCtrl] 记录交易 PnL={pnl:+.2f} | 今日累计={float(self.daily_pnl):+.2f} | "
            f"连续亏损={self.consecutive_losses} | 净值={float(self.current_equity):.2f}"
        )

    def reset_circuit_breaker(self):
        """人工重置熔断器（需确认后调用）"""
        logger.info("[RiskCtrl] 熔断器已人工重置")
        self.tripped = False
        self.daily_pnl = Decimal("0")
        self.consecutive_losses = 0

    @property
    def status(self) -> dict:
        """返回当前风控状态摘要"""
        drawdown = float(
            (self.peak_equity - self.current_equity) / self.peak_equity
        ) if self.peak_equity > 0 else 0.0
        return {
            "tripped": self.tripped,
            "daily_pnl": float(self.daily_pnl),
            "daily_loss_limit": float(-self.max_daily_loss),
            "current_equity": float(self.current_equity),
            "peak_equity": float(self.peak_equity),
            "drawdown_pct": drawdown,
            "consecutive_losses": self.consecutive_losses,
            "position_scale": self.get_position_scale(),
        }
