"""
OKX 交易适配器 (OKX Trading Adapter)
======================================
直接借鉴参考方案 crypto_arbitrage_v1_okx 的 OKXAdapter，
并针对本策略（合约趋势交易）做以下适配：
- 支持永续合约（instType=SWAP）而非现货（cash）
- 新增 ping() 方法用于延迟检测
- 新增 get_account_balance() 用于风控净值更新
- 新增 get_positions() 用于持仓同步

原方案签名逻辑完整保留（HMAC-SHA256）。
"""

import hmac
import base64
import json
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


class OKXAdapter:
    """
    OKX REST API 适配器（借鉴参考方案核心签名逻辑）。
    
    使用方法（异步上下文管理器）：
        async with OKXAdapter(key, secret, passphrase) as api:
            res = await api.place_order("BTC-USDT-SWAP", "buy", "0.01")
    """

    BASE_URL = "https://www.okx.com"

    def __init__(self, api_key: str, secret_key: str, passphrase: str, simulated: bool = False):
        self.key = api_key
        self.secret = secret_key
        self.passphrase = passphrase
        self.simulated = simulated  # True = 模拟盘
        self.session = None

    async def __aenter__(self):
        import aiohttp
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()

    def _sign(self, method: str, path: str, body: str = "") -> dict:
        """
        生成 OKX API 签名请求头（直接借鉴参考方案）。
        签名内容：timestamp + method.upper() + path + body
        """
        ts = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        msg = ts + method.upper() + path + body
        sign = base64.b64encode(
            hmac.new(
                bytes(self.secret, "utf-8"),
                bytes(msg, "utf-8"),
                "sha256"
            ).digest()
        ).decode("utf-8")

        headers = {
            "OK-ACCESS-KEY": self.key,
            "OK-ACCESS-SIGN": sign,
            "OK-ACCESS-TIMESTAMP": ts,
            "OK-ACCESS-PASSPHRASE": self.passphrase,
            "Content-Type": "application/json",
        }
        if self.simulated:
            headers["x-simulated-trading"] = "1"
        return headers

    async def ping(self) -> bool:
        """延迟检测：请求公共接口（无需签名）"""
        path = "/api/v5/public/time"
        try:
            async with self.session.get(self.BASE_URL + path, timeout=2) as r:
                return r.status == 200
        except Exception:
            return False

    async def place_order(
        self,
        inst_id: str,
        side: str,
        sz: str,
        order_type: str = "market",
        price: Optional[str] = None,
        td_mode: str = "cross",      # 全仓保证金模式
        pos_side: str = "net",       # 双向持仓用 "long"/"short"
    ) -> dict:
        """
        下单接口（借鉴参考方案，扩展支持合约参数）。
        
        Parameters
        ----------
        inst_id   : str  交易对，如 "BTC-USDT-SWAP"
        side      : str  "buy" | "sell"
        sz        : str  数量（合约张数）
        order_type: str  "market" | "limit"
        price     : str  限价单价格（market 时忽略）
        td_mode   : str  "cross"（全仓）| "isolated"（逐仓）
        pos_side  : str  "net"（单向）| "long"/"short"（双向）
        """
        path = "/api/v5/trade/order"
        payload = {
            "instId": inst_id,
            "tdMode": td_mode,
            "side": side,
            "ordType": order_type,
            "sz": sz,
        }
        if pos_side != "net":
            payload["posSide"] = pos_side
        if order_type == "limit" and price:
            payload["px"] = price

        body = json.dumps(payload)
        headers = self._sign("POST", path, body)

        async with self.session.post(
            self.BASE_URL + path, data=body, headers=headers
        ) as r:
            res = await r.json()
            logger.debug(f"[OKXAdapter] place_order response: {res}")
            return res

    async def cancel_order(self, inst_id: str, ord_id: str) -> dict:
        """撤单"""
        path = "/api/v5/trade/cancel-order"
        body = json.dumps({"instId": inst_id, "ordId": ord_id})
        headers = self._sign("POST", path, body)
        async with self.session.post(self.BASE_URL + path, data=body, headers=headers) as r:
            return await r.json()

    async def get_positions(self, inst_type: str = "SWAP") -> dict:
        """获取当前持仓"""
        path = f"/api/v5/account/positions?instType={inst_type}"
        headers = self._sign("GET", path)
        async with self.session.get(self.BASE_URL + path, headers=headers) as r:
            return await r.json()

    async def get_account_balance(self) -> dict:
        """获取账户余额（用于风控净值更新）"""
        path = "/api/v5/account/balance"
        headers = self._sign("GET", path)
        async with self.session.get(self.BASE_URL + path, headers=headers) as r:
            return await r.json()

    async def get_instruments(self, inst_type: str = "SWAP") -> dict:
        """获取合约规格（最小下单量、价格精度等）"""
        path = f"/api/v5/public/instruments?instType={inst_type}"
        async with self.session.get(self.BASE_URL + path) as r:
            return await r.json()
