# API Setup (Beginner Guide)

This project uses a small local backend (`server.py`) so your API key stays on your machine and is not exposed in browser code.

## 1) Open the file you need to edit

Open:

`./.env.local`

This is the main file where you paste your API info.

## 2) Paste your API information

In `.env.local`, fill these 3 lines:

1. `AI_API_KEY=...`
Put your real API key after `=`.

2. `AI_BASE_URL=...`
For OpenAI, keep:
`https://api.openai.com/v1`

3. `AI_MODEL=...`
Example:
`gpt-4.1-mini`

## 3) Save the file

After editing `.env.local`, save it.

## 4) Run the project

From this project folder, run:

```powershell
python server.py
```

Then open:

`http://127.0.0.1:4173/#/home`

## 5) Test live API generation

1. Go to **Teacher Workspace**.
2. Prefer **Upload DOCX (Recommended)** for best structure quality.
3. Use **Upload PDF (Experimental)** only for testing overlay behavior.
4. Choose target language and quiz settings.
5. Click **Generate AI Learning Support**.

If API is configured correctly, you will get live output.
If API fails, the app shows a clear message and fallback demo data so presentations can continue.

## Where to edit later

- Change prompt behavior:
  Edit `build_messages()` in `ai_client.py`
- Change API route:
  Edit `/api/generate` and `/api/translate-blocks` handlers in `server.py`
- Change UI text and flow:
  Edit `app.js`
- Change PDF import/export behavior:
  Edit `pdf_tools.js`
- Change DOCX import/export behavior:
  Edit `docx_tools.js`
- Change lesson package JSON import/export:
  Edit `lesson_package.js`

## Notes about PDF support

- PDF text extraction uses PDF.js in the browser (`pdf_tools.js`).
- PDF export uses jsPDF in the browser (`pdf_tools.js`).
- Layout-preserving PDF export uses original-page image + translated text overlay (`pdf_tools.js`).
- Formula-like regions are preserved by skipping those blocks in overlay translation.

## Notes about DOCX support

- `.docx` is the main supported Word format in this version.
- `.doc` (legacy binary Word format) is not supported yet.
- DOCX parsing uses Mammoth (`docx_tools.js`) and DOCX export uses docx.js (`docx_tools.js`).
- No extra local package install is needed in this current no-build setup.
