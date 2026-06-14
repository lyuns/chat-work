from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
from typing import List
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


def generate(messages: List[Message]):
    stream = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": m.role, "content": m.content} for m in messages],
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            # JSON 序列化保留换行符等特殊字符
            yield f"data: {json.dumps(delta, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"


@app.post("/api/chat")
async def chat(req: ChatRequest):
    return StreamingResponse(generate(req.messages), media_type="text/event-stream")


@app.get("/health")
async def health():
    return {"status": "ok"}
