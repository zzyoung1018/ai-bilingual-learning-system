# API Setup (Beginner Guide)

This project uses a local FastAPI backend (`backend/main.py`) so your API key stays on your machine and is not exposed in browser code.

## 1) Open the file you need to edit

Open:

`./backend/.env`

This is the main file where you paste your API info.

## 2) Paste your API information

In `backend/.env`, configure these values:

1. `OPENAI_API_KEY=...`
Put your real API key after `=`.

2. `OPENAI_BASE_URL=...`
For OpenAI-compatible providers, use a `/v1` base URL, for example:
`https://api.openai.com/v1`

3. `OPENAI_MODEL_TRANSLATION=...`
Example:
`gpt-5.5`

4. `OPENAI_MODEL_ENRICHMENT=...`
Example:
`gpt-5.5`

5. `OPENAI_MODEL_REPAIR=...`
Example:
`gpt-5.5`

## 3) Save the file

After editing `.env.local`, save it.

## 4) Run the project

From this project folder, run:

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal from the project root, run:

```bash
python3 -m http.server 5500
```

Then open:

`http://127.0.0.1:5500/#/home`

## 5) Test live API generation

1. Go to **Teacher Workspace**.
2. Prefer **Upload DOCX (Recommended)** for best structure quality.
3. Use **Upload PDF** only when you want the backend to convert it to DOCX first.
4. Choose target language and quiz settings.
5. Click **Generate AI Learning Support**.

If API is configured correctly, you will get live output.
If API fails, the app shows a clear message and fallback demo data so presentations can continue.

## Where to edit later

- Change prompt behavior:
  Edit Stage A prompt helpers in `block_classifier.js` or Stage B prompts in `enrichment_pipeline.js`
- Change API route:
  Edit `/api/llm/chat` and `/api/pdf-to-docx` handlers in `backend/main.py`
- Change UI text and flow:
  Edit `app.js`
- Change PDF input conversion behavior:
  Edit `backend/main.py`
- Change DOCX import/export behavior:
  Edit `docx_tools.js`
- Change lesson package JSON import/export:
  Edit `lesson_package.js`

## Notes about PDF support

- PDF input is converted to DOCX by the backend `/api/pdf-to-docx` endpoint, then processed through the DOCX workflow.
- PDF handout output has been removed.
- The old browser PDF overlay workflow should not be restored in Phase 5C.

## Notes about DOCX support

- `.docx` is the main supported Word format in this version.
- `.doc` (legacy binary Word format) is not supported yet.
- DOCX parsing uses Mammoth (`docx_tools.js`) and DOCX export uses docx.js (`docx_tools.js`).
- No extra local package install is needed in this current no-build setup.
