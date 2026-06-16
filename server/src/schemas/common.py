from pydantic import BaseModel
from typing import Any


class Response(BaseModel):
    ret: int = 0
    msg: str = "ok"
    data: Any = None


def ok(data: Any = None, msg: str = "ok") -> Response:
    return Response(ret=0, msg=msg, data=data)


def err(msg: str = "error", ret: int = -1, data: Any = None) -> Response:
    return Response(ret=ret, msg=msg, data=data)
