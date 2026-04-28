# AI-Supported Bilingual Education Tool — Handoff

## 1. Project Summary

This project is an AI-supported bilingual education demo for preparing classroom lesson materials. It is built around a teacher workflow and a student practice workflow.

The product allows a teacher to:

- paste lesson text or upload DOCX/PDF
- translate the lesson into a target language
- generate teaching support materials
- export translated DOCX
- export teacher/student JSON packages
- export PDF handouts
- import packages in Student Workspace

DOCX is the recommended workflow. PDF upload is supported by converting PDF to DOCX through the backend `pdf2docx` endpoint, then reusing the DOCX pipeline. The old PDF overlay translation workflow should not be restored. Kazakh is the most important final evaluation language, especially for natural Cyrillic Kazakh translation and teaching-support quality.

## 2. Current Architecture

The project currently uses:

- Static browser frontend loaded from `index.html`
- React/HTM application code served as browser ES modules
- FastAPI backend proxy
- Backend-only API key storage
- OpenAI-compatible API provider
- Current default model: `gpt-5.5`

The generation pipeline is split conceptually into two stages:

- Stage A = translation
- Stage B = teaching support generation

Local dev:

- frontend: `python3 -m http.server 5500`
- backend: `uvicorn` on `127.0.0.1:8000`

## 3. Main Workflow

1. User enters manual text or uploads DOCX/PDF.
2. PDF is converted to DOCX if needed.
3. DOCX is parsed into structured blocks.
4. Stage A translates blocks with typed block logic.
5. Stage B generates teaching support.
6. Teacher reviews/edits content.
7. Teacher exports DOCX / JSON / PDF / debug report.
8. Student imports package and practices.

## 4. File-by-File Guide

### app.js

Main React application. It handles state management, hash-based page routing, teacher/student workspace UI, file upload handlers, generation button flow, export handlers, quiz interactions, progress state, cancellation, toasts, and debug report construction.

This file still contains orchestration logic for Stage A translation, batching, cache use, retry behavior, DOCX translation flow, and UI wiring. It has started being modularized, but it is still large and should become thinner over time.

### ui_text.js

UI localization strings. It contains English and Kazakh UI labels, messages, headings, button text, status messages, and label maps used by the frontend.

Do not confuse UI language with target translation language. The UI can be shown in English or Kazakh, while the lesson target language is selected separately for translation and teaching support.

### api_client.js

Frontend backend API helper. It resolves the backend base URL, points local frontend development on port `5500` to `http://127.0.0.1:8000`, calls `/api/llm/chat`, and calls `/api/pdf-to-docx`.

There is no API key here. API keys must remain backend-only.

### block_classifier.js

Stage A block classification and validation module. It decides whether blocks look like ordinary prose, headings, labels, formulas, code, contacts, entities, worksheet/question text, list items, table headers, or mixed label/identifier content.

It builds typed translation prompts, validates translated blocks, contains Kazakh/Russian/Chinese script checks, and provides preserve/translate decision helpers. This module is important for preventing ordinary prose from being accidentally preserved while still protecting formulas, code, URLs, emails, acronyms, and identifiers.

### enrichment_pipeline.js

Stage B teaching-support generation module. It builds enrichment prompts, handles Kazakh compact-complete generation, validates support completeness, validates Kazakh support quality, completes missing/incomplete fields, handles targeted completion, normalizes structured fields, and tracks enrichment debug metadata.

This is where the expanded support fields now live: glossary, simplified explanation, quiz, learning objectives, key concepts, misconceptions, teacher notes, classroom activities, differentiated support, extension questions, and student worksheet.

### docx_tools.js

DOCX import/extraction and translated DOCX export. It parses DOCX content into structured nodes and translation blocks, applies translations back to the document model, and exports translated DOCX while preserving document structure where practical.

It is intended to preserve headings, paragraphs, lists, tables, images, numbering, and most style/layout hierarchy as much as the browser-side OOXML workflow allows. Legacy `.doc` is not supported.

### pdf_tools.js

PDF handout export module. It exports teacher/student lesson packages as PDF handouts using `jsPDF`, including font handling for CJK text when needed.

This is not the old PDF overlay translation workflow. PDF upload translation now goes through backend PDF-to-DOCX conversion and then the DOCX pipeline.

### lesson_package.js

Teacher/student JSON package creation and import/export helpers. It builds lesson packages, downloads JSON, imports JSON files, validates package shape, and keeps optional fields from breaking older package workflows.

It includes expanded education-support fields and display options for teacher/student packages. Backward compatibility with older packages matters here.

### styles.css

App styling and layout. It defines the visual system for the hero, cards, workspace panels, controls, buttons, progress UI, teacher/student sections, quiz display, and responsive layout.

### index.html

Static entry HTML. It sets up the page shell, loads `styles.css`, creates the `#root` mount point, and loads `app.js` as a module.

### backend/main.py

FastAPI backend. It provides:

- `/api/llm/chat` model proxy
- `/api/pdf-to-docx` conversion endpoint
- `/api/health` endpoint

It reads `.env`, configures CORS, enforces a request-size limit, chooses model names by stage, calls an OpenAI-compatible provider, and protects the API key from the frontend. It should never expose secrets to frontend JavaScript or health responses.

### backend/requirements.txt

Backend dependencies:

- `fastapi`
- `uvicorn[standard]`
- `python-dotenv`
- `openai`
- `pdf2docx`
- `python-multipart`

These support the API server, OpenAI-compatible client calls, environment loading, multipart uploads, and PDF-to-DOCX conversion.

### backend/.env.example

Safe placeholder environment variables for backend setup. It documents `OPENAI_API_KEY`, `OPENAI_BASE_URL`, stage-specific model variables, CORS origins, and max request size.

Real `backend/.env` should not be committed.

### backend/README.md

Backend run instructions and operational notes. It explains local backend startup, API key configuration, health check, and the PDF conversion endpoint. It also notes that scanned/image-only PDFs may need OCR, which is not implemented.

### README.md

Project-level overview and local setup guide. It documents the recommended DOCX workflow, backend/frontend commands, environment variables, testing checklist, and known limitations.

### .gitignore

Protects local secrets and generated files, including `.env.local`, `backend/.env`, backend virtual environments, `__pycache__`, `.DS_Store`, `node_modules`, build outputs, and logs.

### API_SETUP.md

Older API setup documentation. Use it only as supplemental context; the current backend proxy and `backend/.env.example` are the safer source of truth for API key placement.

### ai_client.py

Older Python AI client/prototype code. It is not part of the current browser + FastAPI runtime path and should not be treated as the main production pipeline without verifying current usage.

### server.py

Older/simple server-side file in the root. The current documented backend is `backend/main.py`; verify actual usage before changing or relying on `server.py`.

### scripts/start_frontend.sh

Convenience script for starting the static frontend server.

### scripts/start_backend.sh

Convenience script for starting the FastAPI backend.

## 5. Development Phase History

### Phase 1 — Local model prototype

- experimented with Ollama/local Qwen
- proved the basic bilingual lesson generation idea
- discovered local model quality limits, especially for Kazakh and long structured translation

### Phase 2 — DOCX workflow and stability

- DOCX became recommended workflow
- added block extraction and translated DOCX export
- added batching, cache, deduplication, cancel behavior, progress UI, and debug report

### Phase 3 — Block validation and language handling

- improved block-level validation
- added rules for prose, headings, labels, contacts, URLs, acronyms, formulas, code, tables, and worksheet-like text
- fixed cases where ordinary prose was accidentally preserved
- improved Kazakh/Russian/Chinese script validation

### Phase 4A — Online API backend proxy

- moved from local Ollama calls to FastAPI backend proxy
- API keys moved backend-only
- model stages currently use `gpt-5.5`

### Phase 4B — PDF-to-DOCX workflow

- removed old experimental PDF overlay workflow
- PDF now converts to DOCX using backend `pdf2docx`
- DOCX pipeline reused for PDF-converted documents

### Phase 4C — Document-aware block mode

- introduced typed block prompts
- improved formula/textbook/resume/table/list/question handling
- pure formulas can be preserved
- formula explanations must translate prose

### Phase 4D / 4E — Expanded teaching support

- Stage B expanded beyond glossary/explanation/quiz
- added learning objectives, key concepts, misconceptions, teacher notes, classroom activities, differentiated support, extension questions, student worksheet
- added Kazakh compact-complete prompt
- added missing-field completion
- improved teacher workspace completeness

### Phase 5A — Deployment-readiness preparation

- added/updated documentation and environment setup
- clarified local backend/frontend startup
- improved `.env.example` and known limitations

### Phase 5B — Modularization

- started splitting `app.js`
- extracted `ui_text.js`
- extracted `api_client.js`
- extracted `block_classifier.js`
- extracted `enrichment_pipeline.js`
- current stage is still Phase 5B
- `app.js` is still large and contains orchestration / Stage A / UI logic
- translation pipeline and debug report may still need future extraction

## 6. Current Development Stage

Current stage: Phase 5B — modularization and stabilization.

Current status:

- Core functionality works.
- Kazakh Stage A and Stage B are the key quality targets.
- `app.js` has been partially modularized.
- `enrichment_pipeline.js` now handles Stage B logic.
- The next priority is regression testing after each refactor.
- Do not start Vite migration until Phase 5B is stable.

## 7. Current Known Priorities

1. Keep Kazakh experience stable.
2. Prevent unnecessary Stage B retries.
3. Ensure teaching support fields are complete and rendered cleanly.
4. Keep translated DOCX export working.
5. Keep teacher/student JSON import/export compatible.
6. Continue reducing `app.js` safely.
7. Later migrate frontend from `esm.sh` to Vite/local npm dependencies.
8. Later prepare production deployment with Nginx/systemd/HTTPS.

## 8. Important Design Rules

- API key must stay backend-only.
- Do not restore old PDF overlay workflow.
- Do not implement OCR unless explicitly planned.
- Do not hard-code test-specific topics.
- Do not optimize only for one document.
- Kazakh must be natural Cyrillic Kazakh, not Russian and not Latin-script Kazakh.
- Lesson title is metadata; source/translation content is the source of truth.
- If Stage A translation succeeds but Stage B fails, translated DOCX should still be exportable.
- Debug report is part of the product and should remain useful.
- Optional fields should not break imports.
- Keep backward compatibility with older JSON packages.

## 9. Local Run Instructions

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
python3 -m http.server 5500
```

Open:

```text
http://127.0.0.1:5500
```

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

## 10. Suggested Regression Checklist

After any refactor, test at least:

1. Start backend and frontend locally.
2. Upload a DOCX and generate Kazakh output.
3. Confirm Stage A translates ordinary prose into natural Cyrillic Kazakh.
4. Confirm formulas, URLs, emails, identifiers, and code-like text are preserved when appropriate.
5. Confirm Stage B fills all teaching-support sections.
6. Export translated DOCX.
7. Export teacher JSON and student JSON.
8. Import student JSON in Student Workspace.
9. Export teacher/student PDF handouts.
10. Export and inspect debug report.

## 11. Notes for Future Refactors

Keep refactors small and regression-tested. The safest near-term direction is to continue extracting pure helpers from `app.js` without changing prompts, pipeline behavior, backend behavior, UI behavior, or package schema unless that is explicitly planned.

Likely future extraction targets:

- Stage A translation orchestration
- translation batching and cache management
- debug report construction
- teacher/student workspace components
- package import/export UI glue

Do not begin dependency/tooling migration until the current Phase 5B modularization is stable.
