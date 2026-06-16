from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.auth import verify_password, create_access_token
from models.user import User
from schemas.auth import LoginRequest
from schemas.common import ok, err

router = APIRouter(prefix="/api/auth")


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.ld_user_name == req.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.ld_user_pass):
        return err("用户名或密码错误", ret=401)
    if user.status != 1:
        return err("账号已禁用", ret=403)

    token = create_access_token(user.ld_user_id, user.ld_user_name)
    return ok({"token": token, "username": user.ld_user_name})
