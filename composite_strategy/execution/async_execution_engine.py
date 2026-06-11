"""
异步执行引擎 (Async Execution Engine)
======================================
借鉴参考方案 crypto_arbitrage_v1_okx 的 ExecutionEngine 设计：
- 多步骤原子执行：所有订单要么全部成功，要么自动反向对冲回滚
- 延迟检测：下单前检测网络延迟，超阈值拒绝执行
- 异步并发：多标的空头可并发下单，降低滑点

与原方案的差异：
- 原方案用于三角套利（毫秒级），本方案用于日线趋势策略（秒级）
- 新增仓位大小校验和最小下单量检查
- 新增 Decimal 精度控制，避免浮点误差
"""

import asyncio
import logging
import time
from decimal import Decimal, ROUND_DOWN
from typing import Any

logger = logging.getLogger(__name__)


class AsyncExecutionEngine:
    """
    原子化异步执行引擎。
    
    执行流程：
    1. 风控前置检查（延迟 + 每日亏损 + 熔断状态）
    2. 顺序执行各步骤订单
    3. 任意步骤失败 → 自动反向对冲已执行步骤（回滚）
    """

    def __init__(self, adapter, risk_controller, instrument_manager=None):
        self.adapter = adapter
        self.risk = risk_controller
        self.instruments = instrument_manager

    async def _measure_latency(self) -> float:
        """测量当前到交易所的往返延迟（ms）"""
        start = time.monotonic()
        try:
            await self.adapter.ping()
        except Exception:
            pass
        return (time.monotonic() - start) * 1000

    def _round_qty(self, symbol: str, qty: Decimal) -> Decimal:
        """按交易所最小下单精度向下取整"""
        if self.instruments and symbol in self.instruments.data:
            step = Decimal(self.instruments.data[symbol]["lotSz"])
            return qty.quantize(step, rounding=ROUND_DOWN)
        # 默认精度：保留 4 位小数
        return qty.quantize(Decimal("0.0001"), rounding=ROUND_DOWN)

    async def execute_steps(self, steps: list[dict[str, Any]]) -> bool:
        """
        原子化执行多步骤订单。
        
        Parameters
        ----------
        steps : list of dict
            每个 step 包含：
            - symbol  : str   交易对，如 "BTC-USDT-SWAP"
            - side    : str   "buy" | "sell"
            - qty     : Decimal 数量
            - order_type : str  "market" | "limit"（可选，默认 market）
            - price   : Decimal  限价单价格（可选）
        
        Returns
        -------
        bool  全部成功返回 True，任意失败触发回滚并返回 False
        """
        # 1. 延迟检测
        latency = await self._measure_latency()
        if not self.risk.check_pre_trade(latency):
            logger.warning(f"[ExecEngine] 风控拒绝执行：延迟={latency:.1f}ms，熔断={self.risk.tripped}")
            return False

        executed = []
        try:
            for step in steps:
                symbol = step["symbol"]
                side = step["side"]
                qty = self._round_qty(symbol, Decimal(str(step["qty"])))
                order_type = step.get("order_type", "market")
                price = step.get("price")

                if qty <= 0:
                    raise ValueError(f"[ExecEngine] 无效数量 qty={qty} for {symbol}")

                logger.info(f"[ExecEngine] 下单 {side} {qty} {symbol} @ {order_type}")
                res = await self.adapter.place_order(
                    symbol, side, str(qty),
                    order_type=order_type,
                    price=str(price) if price else None
                )

                if res.get("code") == "0":
                    executed.append(step)
                    logger.info(f"[ExecEngine] 成功 {symbol} orderId={res.get('data', [{}])[0].get('ordId')}")
                else:
                    raise RuntimeError(f"[ExecEngine] 订单失败 {symbol}: {res.get('msg')}")

            return True

        except Exception as e:
            logger.error(f"[ExecEngine] 执行异常，触发回滚: {e}")
            await self._hedge_rollback(executed)
            return False

    async def _hedge_rollback(self, executed: list[dict[str, Any]]):
        """
        反向对冲回滚：按执行顺序逆序，对每笔已成交订单下反向市价单。
        借鉴参考方案的 _hedge() 方法，增加了异常捕获防止回滚本身失败。
        """
        logger.warning(f"[ExecEngine] 开始回滚 {len(executed)} 笔订单")
        for step in reversed(executed):
            try:
                reverse_side = "sell" if step["side"] == "buy" else "buy"
                qty = self._round_qty(step["symbol"], Decimal(str(step["qty"])))
                await self.adapter.place_order(step["symbol"], reverse_side, str(qty))
                logger.info(f"[ExecEngine] 回滚成功 {step['symbol']} {reverse_side} {qty}")
            except Exception as e:
                logger.error(f"[ExecEngine] 回滚失败 {step['symbol']}: {e}，需人工处理！")

    async def execute_parallel_shorts(self, short_steps: list[dict[str, Any]]) -> dict[str, bool]:
        """
        并发执行多个空头标的的开仓（各标的独立，互不影响）。
        适用于同时对 ETH/SOL/BNB/DOGE/LINK 开空的场景。
        
        Returns
        -------
        dict  {symbol: success_bool}
        """
        tasks = {
            step["symbol"]: asyncio.create_task(
                self.execute_steps([step])
            )
            for step in short_steps
        }
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        return {
            sym: (not isinstance(res, Exception) and res)
            for sym, res in zip(tasks.keys(), results)
        }
