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

Before starting, edit `.env` and set `OPENAI_API_KEY` plus `OPENAI_BASE_URL`.
