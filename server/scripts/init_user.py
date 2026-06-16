"""
一次性脚本：创建初始测试用户
运行：cd server && python scripts/init_user.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

import hashlib
from core.database import AsyncSessionLocal, init_db
from core.auth import hash_password
from models.user import User  # noqa: 触发模型注册
from sqlalchemy import select


USERS = [
    {"username": "zyp",  "password": "test123",  "desc": "主账号"},
    {"username": "test", "password": "test12345", "desc": "测试账号"},
]


def sha256(text: str) -> str:
    """与前端 crypto.subtle SHA-256 行为一致"""
    return hashlib.sha256(text.encode()).hexdigest()


async def main():
    await init_db()
    async with AsyncSessionLocal() as session:
        for u in USERS:
            result = await session.execute(
                select(User).where(User.ld_user_name == u["username"])
            )
            if result.scalar_one_or_none():
                print(f"用户 {u['username']} 已存在，跳过")
                continue
            session.add(User(
                ld_user_name=u["username"],
                ld_user_pass=hash_password(sha256(u["password"])),  # bcrypt(sha256(pwd))
                status=1,
            ))
            print(f"✅ 用户 {u['username']}（{u['desc']}）创建成功")
        await session.commit()


async def run():
    await main()
    from core.database import engine
    await engine.dispose()

asyncio.run(run())
