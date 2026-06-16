from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import os

_user = os.getenv("DB_USER")
_password = os.getenv("DB_PASSWORD")
_name = os.getenv("DB_NAME")
_host = "ptr-test.mysql.polardb.rds.aliyuncs.com"
_port = os.getenv("DB_PORT", "3306")

DATABASE_URL = f"mysql+aiomysql://{_user}:{_password}@{_host}:{_port}/{_name}"

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI 依赖注入"""
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """建表，启动时调用"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
