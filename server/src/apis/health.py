from fastapi import APIRouter
from sqlalchemy import text
from core.database import AsyncSessionLocal
from core.redis import get_redis
from schemas.common import ok, err

router = APIRouter()


@router.get("/health")
async def health():
    result = {}

    # MySQL
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        result["mysql"] = "ok"
    except Exception as e:
        result["mysql"] = str(e)

    # Redis
    try:
        r = await get_redis()
        await r.ping()
        result["redis"] = "ok"
    except Exception as e:
        result["redis"] = str(e)

    all_ok = all(v == "ok" for v in result.values())
    return ok(result) if all_ok else err("degraded", data=result)
