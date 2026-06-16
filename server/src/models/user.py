from sqlalchemy import Column, BigInteger, String, SmallInteger, DateTime
from sqlalchemy.sql import func
from core.database import Base


class User(Base):
    __tablename__ = "ld_user"

    ld_user_id   = Column(BigInteger, primary_key=True, autoincrement=True)
    ld_user_name = Column(String(50), unique=True, nullable=False)
    ld_user_pass = Column(String(100), nullable=False)
    status       = Column(SmallInteger, default=1, nullable=False)
    create_time  = Column(DateTime, server_default=func.now(), nullable=False)
    update_time  = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
