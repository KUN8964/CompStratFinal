"""
cache_service.py — TTL 缓存服务
借鉴自参考方案二 (okx-trend-bot) 的 CacheService.ts

核心设计：
  - getOrFetch() 模式：先查缓存，过期才调 API，失败时返回旧数据（stale=True）
  - 支持异步和同步两种 fetch 函数
  - 线程安全（使用 threading.Lock）
"""

import time
import threading
import asyncio
import logging
from typing import TypeVar, Callable, Any, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

T = TypeVar("T")


@dataclass
class CacheEntry:
    data: Any
    expires_at: float  # Unix timestamp (seconds)


class CacheService:
    """
    TTL 缓存服务 — 借鉴自 okx-trend-bot CacheService.ts

    用法示例:
        cache = CacheService()

        # 同步版本
        data, stale = cache.get_or_fetch(
            key="coinglass:BTC:funding",
            ttl_seconds=55,
            fetch_fn=lambda: coinglass_client.get_funding_rate("BTC")
        )

        # 异步版本
        data, stale = await cache.async_get_or_fetch(
            key="coinglass:BTC:oi",
            ttl_seconds=55,
            fetch_fn=async_fetch_oi
        )
    """

    def __init__(self):
        self._store: dict[str, CacheEntry] = {}
        self._lock = threading.Lock()

    def get_or_fetch(
        self,
        key: str,
        ttl_seconds: float,
        fetch_fn: Callable[[], T],
    ) -> Tuple[T, bool]:
        """
        同步版本：获取缓存数据，过期则重新获取。
        返回 (data, stale)，stale=True 表示数据来自过期缓存（API 调用失败时降级）。
        """
        now = time.time()
        with self._lock:
            cached = self._store.get(key)
            if cached and cached.expires_at > now:
                return cached.data, False

        # 缓存过期，重新获取
        try:
            data = fetch_fn()
            with self._lock:
                self._store[key] = CacheEntry(data=data, expires_at=now + ttl_seconds)
            return data, False
        except Exception as e:
            # API 失败时返回旧数据（stale）
            with self._lock:
                cached = self._store.get(key)
            if cached:
                logger.warning(f"[Cache] fetch failed for '{key}', returning stale data. Error: {e}")
                return cached.data, True
            raise  # 无旧数据时直接抛出

    async def async_get_or_fetch(
        self,
        key: str,
        ttl_seconds: float,
        fetch_fn: Callable[[], Any],  # 异步函数
    ) -> Tuple[Any, bool]:
        """
        异步版本：与同步版本逻辑相同，支持 async fetch_fn。
        """
        now = time.time()
        with self._lock:
            cached = self._store.get(key)
            if cached and cached.expires_at > now:
                return cached.data, False

        try:
            data = await fetch_fn()
            with self._lock:
                self._store[key] = CacheEntry(data=data, expires_at=now + ttl_seconds)
            return data, False
        except Exception as e:
            with self._lock:
                cached = self._store.get(key)
            if cached:
                logger.warning(f"[Cache] async fetch failed for '{key}', returning stale data. Error: {e}")
                return cached.data, True
            raise

    def invalidate(self, key: str) -> None:
        """手动使某个缓存键失效。"""
        with self._lock:
            self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> int:
        """使所有以 prefix 开头的键失效，返回清除数量。"""
        with self._lock:
            keys_to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._store[k]
        return len(keys_to_delete)

    def clear(self) -> None:
        """清空所有缓存。"""
        with self._lock:
            self._store.clear()

    def stats(self) -> dict:
        """返回缓存统计信息。"""
        now = time.time()
        with self._lock:
            total = len(self._store)
            alive = sum(1 for e in self._store.values() if e.expires_at > now)
        return {"total_keys": total, "alive_keys": alive, "expired_keys": total - alive}


# ─── 推荐 TTL 常量（借鉴自 api.ts 的 TTL 定义）────────────────────────────────
TTL_COINS = 10 * 60        # 支持币种列表：10 分钟
TTL_MARKET_DATA = 55       # 市场概览/OI/资金费率：55 秒（略低于 1 分钟刷新周期）
TTL_BACKTEST = 5 * 60      # 回测结果：5 分钟
TTL_KLINES = 60            # K 线数据：1 分钟
