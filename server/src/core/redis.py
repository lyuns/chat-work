import redis.asyncio as aioredis
import os
import json
from typing import Optional

_password = os.getenv("REDIS_PASSWORD")
_host = "r-uf6vsfd1gqs3mzrv8cpd.redis.rds.aliyuncs.com"
_port = os.getenv("REDIS_PORT", "6379")

REDIS_URL = f"redis://:{_password}@{_host}:{_port}/0"
SESSION_TTL = int(os.getenv("SESSION_TTL", 3600))

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis


async def close_redis():
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


# ── 会话上下文 ─────────────────────────────────────────────

async def get_messages(session_id: str) -> list:
    r = await get_redis()
    data = await r.get(f"session:{session_id}:messages")
    return json.loads(data) if data else []


async def append_message(session_id: str, role: str, content: str):
    r = await get_redis()
    key = f"session:{session_id}:messages"
    messages = await get_messages(session_id)
    messages.append({"role": role, "content": content})
    await r.set(key, json.dumps(messages, ensure_ascii=False), ex=SESSION_TTL)


async def clear_messages(session_id: str):
    r = await get_redis()
    await r.delete(f"session:{session_id}:messages")
