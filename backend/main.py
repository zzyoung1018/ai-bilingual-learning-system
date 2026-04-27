import os
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:8000,"
    "http://127.0.0.1:8000,"
    "http://localhost:5500,"
    "http://127.0.0.1:5500"
)
MAX_REQUEST_BYTES = int(os.getenv("MAX_REQUEST_BYTES", str(2 * 1024 * 1024)))


def parse_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def get_model_for_stage(stage: str) -> str:
    if stage == "translation":
        return os.getenv("OPENAI_MODEL_TRANSLATION", "gpt-5.5")
    if stage == "json_repair":
        return os.getenv("OPENAI_MODEL_REPAIR", "gpt-5.4-pro")
    return os.getenv("OPENAI_MODEL_ENRICHMENT", "gpt-5.4-pro")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    stage: Literal["translation", "enrichment", "json_repair"]
    messages: list[ChatMessage] = Field(..., min_length=1)
    format: Literal["json", "text"] = "text"
    options: dict[str, Any] = Field(default_factory=dict)


app = FastAPI(title="AI Bilingual Learning System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_REQUEST_BYTES:
                raise HTTPException(status_code=413, detail="Request body is too large.")
        except ValueError:
            pass
    return await call_next(request)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "provider": "online-api",
        "models": {
            "translation": get_model_for_stage("translation"),
            "enrichment": get_model_for_stage("enrichment"),
            "json_repair": get_model_for_stage("json_repair"),
        },
    }


def build_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")
    if not base_url:
        raise HTTPException(status_code=500, detail="OPENAI_BASE_URL is not configured.")
    return OpenAI(api_key=api_key, base_url=base_url)


def build_completion_kwargs(
    payload: ChatRequest,
    model: str,
    include_response_format: bool,
) -> dict[str, Any]:
    options = payload.options or {}
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [message.model_dump() for message in payload.messages],
    }

    if "temperature" in options:
        kwargs["temperature"] = options["temperature"]
    if "top_p" in options:
        kwargs["top_p"] = options["top_p"]

    max_tokens = options.get("max_tokens", options.get("num_predict"))
    if max_tokens:
        kwargs["max_tokens"] = int(max_tokens)

    if include_response_format and payload.format == "json":
        kwargs["response_format"] = {"type": "json_object"}

    return kwargs


@app.post("/api/llm/chat")
def llm_chat(payload: ChatRequest):
    client = build_client()
    model = get_model_for_stage(payload.stage)
    include_response_format = payload.format == "json"

    try:
        response = client.chat.completions.create(
            **build_completion_kwargs(payload, model, include_response_format)
        )
    except Exception as first_error:
        try:
            response = client.chat.completions.create(
                **build_completion_kwargs(payload, model, False)
            )
        except Exception:
            try:
                response = client.chat.completions.create(
                    **build_completion_kwargs(payload, model, False)
                )
            except Exception as retry_error:
                raise HTTPException(
                    status_code=502,
                    detail=f"Model provider request failed: {str(retry_error)[:500]}",
                )

    message = response.choices[0].message if response.choices else None
    content = getattr(message, "content", "") if message else ""

    return {
        "content": content or "",
        "provider": "online-api",
        "model": model,
        "stage": payload.stage,
        "usage": response.usage.model_dump() if getattr(response, "usage", None) else None,
    }
