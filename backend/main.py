import os
import re
import tempfile
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from openai import OpenAI
from pdf2docx import Converter
from pydantic import BaseModel, Field

load_dotenv()

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:8000,"
    "http://127.0.0.1:8000,"
    "http://localhost:5500,"
    "http://127.0.0.1:5500"
)
MAX_REQUEST_BYTES = int(os.getenv("MAX_REQUEST_BYTES", str(25 * 1024 * 1024)))


def parse_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def get_model_for_stage(stage: str) -> str:
    if stage == "translation":
        return os.getenv("OPENAI_MODEL_TRANSLATION", "gpt-5.5")
    if stage == "json_repair":
        return os.getenv("OPENAI_MODEL_REPAIR", "gpt-5.5")
    return os.getenv("OPENAI_MODEL_ENRICHMENT", "gpt-5.5")


def safe_download_name(filename: str, fallback: str = "converted.docx") -> str:
    base = os.path.basename(filename or fallback)
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", base).strip("._")
    return base or fallback


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
        "has_api_key": bool(os.getenv("OPENAI_API_KEY")),
        "base_url_configured": bool(os.getenv("OPENAI_BASE_URL")),
        "models": {
            "translation": get_model_for_stage("translation"),
            "enrichment": get_model_for_stage("enrichment"),
            "json_repair": get_model_for_stage("json_repair"),
        },
    }


@app.post("/api/pdf-to-docx")
async def pdf_to_docx(file: UploadFile = File(...)):
    filename = safe_download_name(file.filename or "uploaded.pdf")
    content_type = (file.content_type or "").lower()
    if not filename.lower().endswith(".pdf") and content_type not in {
        "application/pdf",
        "application/x-pdf",
    }:
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    with tempfile.TemporaryDirectory(prefix="pdf-to-docx-") as temp_dir:
        pdf_path = os.path.join(temp_dir, filename if filename.lower().endswith(".pdf") else "uploaded.pdf")
        docx_name = re.sub(r"\.pdf$", "", filename, flags=re.IGNORECASE) + ".docx"
        docx_path = os.path.join(temp_dir, docx_name)

        try:
            with open(pdf_path, "wb") as output:
                while chunk := await file.read(1024 * 1024):
                    output.write(chunk)

            if os.path.getsize(pdf_path) == 0:
                raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

            converter = Converter(pdf_path)
            try:
                converter.convert(docx_path, start=0, end=None)
            finally:
                converter.close()

            if not os.path.exists(docx_path) or os.path.getsize(docx_path) == 0:
                raise RuntimeError(
                    "PDF conversion produced an empty DOCX. pdf2docx works best for text-based PDFs; "
                    "scanned or image-only PDFs may require OCR, which is not implemented in this phase."
                )

            with open(docx_path, "rb") as converted:
                content = converted.read()
        except HTTPException:
            raise
        except Exception as err:
            raise HTTPException(
                status_code=500,
                detail=(
                    "PDF conversion failed. Try a text-based PDF or upload DOCX directly. "
                    "Scanned/image-only PDFs may not convert well because OCR is not implemented. "
                    f"{str(err)[:300]}"
                ),
            )

    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{docx_name}"'},
    )


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

    choice = response.choices[0] if response.choices else None
    message = choice.message if choice else None
    content = getattr(message, "content", "") if message else ""

    return {
        "content": content or "",
        "provider": "online-api",
        "model": model,
        "stage": payload.stage,
        "finish_reason": getattr(choice, "finish_reason", None) if choice else None,
        "usage": response.usage.model_dump() if getattr(response, "usage", None) else None,
    }
