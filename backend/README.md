# Backend API

Lightweight FastAPI proxy for model calls. API keys stay in backend environment variables and are never placed in frontend JavaScript.

## Run locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Before starting, edit `.env` and set `OPENAI_API_KEY` plus `OPENAI_BASE_URL`. Optional model variables are `OPENAI_MODEL_TRANSLATION`, `OPENAI_MODEL_ENRICHMENT`, and `OPENAI_MODEL_REPAIR`.

You can also run from the project root:

```bash
./scripts/start_backend.sh
```

## Health check

```bash
curl http://127.0.0.1:8000/api/health
```

The health response reports model names and configuration booleans. It never returns the API key or base URL value.

## PDF conversion

The frontend sends PDF uploads to `POST /api/pdf-to-docx`. The backend converts the PDF with `pdf2docx` and returns a DOCX file. This works best for text-based PDFs; scanned or image-only PDFs may need OCR, which is not implemented in this phase.
