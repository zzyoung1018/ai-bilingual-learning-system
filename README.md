# AI Bilingual Learning System

An AI-supported bilingual education demo for preparing classroom lesson materials. Teachers can upload or paste lesson content, translate it into a target language, generate teaching support, and export materials for teacher and student use.

## Recommended Workflow

- Use DOCX upload for the most stable structured-document workflow.
- PDF upload is supported by converting the PDF to DOCX first through the backend, then using the DOCX pipeline.
- After generation, export the Full Lesson DOCX, teacher/student JSON packages, and the debug report.
- PDF handout output has been removed. PDF is supported as an input format only through backend PDF-to-DOCX conversion.

## Teaching Support Fields

The active teaching support sections are:

- glossary
- simplifiedExplanation
- keyConcepts
- commonMisconceptions
- teacherNotes
- classroomActivities
- extensionQuestions
- quiz

Full Lesson DOCX export includes the translated lesson text plus these active teaching support sections.

## Local Run Instructions

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env with your API settings
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

From the project root:

```bash
python3 -m http.server 5500
```

Open:

```text
http://127.0.0.1:5500
```

## Environment Variables

Configure these in `backend/.env`:

- `OPENAI_API_KEY`: API key for your OpenAI-compatible provider.
- `OPENAI_BASE_URL`: Base URL for the provider, ending in `/v1` for OpenAI-compatible APIs.
- `OPENAI_MODEL_TRANSLATION`: model for Stage A translation, currently `gpt-5.5`.
- `OPENAI_MODEL_ENRICHMENT`: model for Stage B teaching support, currently `gpt-5.5`.
- `OPENAI_MODEL_REPAIR`: model for JSON repair, currently `gpt-5.5`.
- `ALLOWED_ORIGINS`: comma-separated frontend/backend origins allowed by CORS.
- `MAX_REQUEST_BYTES`: request size limit, default example is `26214400` bytes.

The API key must stay in `backend/.env`. Do not place it in frontend JavaScript.

## Testing Checklist

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

PDF conversion:

```bash
curl -X POST http://127.0.0.1:8000/api/pdf-to-docx \
  -F "file=@sample.pdf" \
  --output converted.docx
```

Frontend demo:

1. Open `http://127.0.0.1:5500`.
2. Go to Teacher Workspace.
3. Upload a DOCX file.
4. Choose Kazakh as target language.
5. Generate AI learning support.
6. Export the debug report.
7. Export the translated DOCX.
8. Export teacher and student JSON packages.

## Known Limitations

- Scanned or image-only PDFs need OCR, which is not implemented.
- PPT-style PDFs may convert poorly through `pdf2docx`.
- The frontend currently loads some dependencies from `esm.sh`.
- Large documents may be slow because translation and support generation are model-driven.
