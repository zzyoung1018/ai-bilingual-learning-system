# AI-Supported Bilingual Education Tool — Handoff

## 1. Project Summary

This project is an AI-supported bilingual education demo for preparing classroom lesson materials. It is built around a teacher workflow and a student practice workflow.

The product allows a teacher to:

- paste lesson text or upload DOCX/PDF
- translate the lesson into a target language
- generate teaching support materials (8 active fields)
- export Full Lesson DOCX with teaching support
- export teacher/student JSON packages
- export debug report
- import packages in Student Workspace

DOCX is the recommended workflow. PDF upload is supported by converting PDF to DOCX through the backend `pdf2docx` endpoint, then reusing the DOCX pipeline. The old PDF overlay translation workflow should not be restored. Kazakh is the most important final evaluation language, especially for natural Cyrillic Kazakh translation and teaching-support quality.

**Phase 5C Status (Current):** Three teaching support fields (learningObjectives, differentiatedSupport, studentWorksheet) have been removed from the system. The system now supports 8 active teaching support fields with a single source of truth defined in `support_fields.js`.

## 2. Current Architecture

The project currently uses:

- Static browser frontend loaded from `index.html`
- React/HTM application code served as browser ES modules
- FastAPI backend proxy
- Backend-only API key storage
- OpenAI-compatible API provider
- Current default model: `gpt-5.5`

The generation pipeline is split conceptually into two stages:

- **Stage A** = translation (block-by-block with typed prompts)
- **Stage B** = teaching support generation (8 active fields)

Local dev:

- frontend: `python3 -m http.server 5500`
- backend: `uvicorn main:app --reload --host 127.0.0.1 --port 8000`

## 3. Main Workflow

1. User enters manual text or uploads DOCX/PDF.
2. PDF is converted to DOCX if needed.
3. DOCX is parsed into structured blocks.
4. **Stage A** translates blocks with typed block logic.
5. **Stage B** generates teaching support (8 active fields).
6. Teacher reviews/edits content.
7. Teacher exports Full Lesson DOCX / JSON / debug report.
8. Student imports package and practices.

## 4. File-by-File Guide

### support_fields.js (NEW - Phase 5C)

**Single source of truth for active teaching support fields.**

Defines:
- `ACTIVE_SUPPORT_FIELDS` - Array of 8 active fields:
  1. glossary
  2. simplifiedExplanation
  3. keyConcepts
  4. commonMisconceptions
  5. teacherNotes
  6. classroomActivities
  7. extensionQuestions
  8. quiz

- `CRITICAL_SUPPORT_FIELDS` - Fields required for completeness:
  - glossary, simplifiedExplanation, quiz, keyConcepts

- `OPTIONAL_SUPPORT_FIELDS` - Fields that enhance but aren't critical:
  - commonMisconceptions, teacherNotes, classroomActivities, extensionQuestions

- `REMOVED_SUPPORT_FIELDS` - Fields removed in Phase 5C:
  - learningObjectives, differentiatedSupport, studentWorksheet

Helper functions:
- `isActiveSupportField(fieldName)` - Check if field is active
- `isCriticalSupportField(fieldName)` - Check if field is critical
- `isOptionalSupportField(fieldName)` - Check if field is optional
- `isRemovedSupportField(fieldName)` - Check if field was removed

**Important:** All teaching support field logic should reference these constants, not hard-coded field lists.

### app.js

Main React application. It handles state management, hash-based page routing, teacher/student workspace UI, file upload handlers, generation button flow, export handlers, quiz interactions, progress state, cancellation, toasts, and debug report construction.

This file still contains orchestration logic for Stage A translation, batching, cache use, retry behavior, DOCX translation flow, and UI wiring. It has started being modularized, but it is still large and should become thinner over time.

**Phase 5C changes:**
- UI sections for removed fields (learningObjectives, differentiatedSupport, studentWorksheet) have been removed from `LessonSupportSections()`
- DOCX export no longer passes removed fields to `exportTranslatedDocx()`
- Visible sections: Glossary, Simplified Explanation, Key Concepts, Common Misconceptions, Teacher Notes, Classroom Activities, Extension Questions, Quiz Preview
- PDF handout export buttons removed (exportTeacherPdf, exportStudentPdf functions removed)

### ui_text.js

UI localization strings. It contains English and Kazakh UI labels, messages, headings, button text, status messages, and label maps used by the frontend.

Do not confuse UI language with target translation language. The UI can be shown in English or Kazakh, while the lesson target language is selected separately for translation and teaching support.

### api_client.js

Frontend backend API helper. It resolves the backend base URL, points local frontend development on port `5500` to `http://127.0.0.1:8000`, calls `/api/llm/chat`, and calls `/api/pdf-to-docx`.

There is no API key here. API keys must remain backend-only.

**Phase 5C changes:**
- Enhanced request validation in `assertValidChatRequestBody()` to catch contract violations early
- Validates request body structure, stage field, messages array, format field, and options object

### block_classifier.js

Stage A block classification and validation module. It decides whether blocks look like ordinary prose, headings, labels, formulas, code, contacts, entities, worksheet/question text, list items, table headers, or mixed label/identifier content.

It builds typed translation prompts, validates translated blocks, contains Kazakh/Russian/Chinese script checks, and provides preserve/translate decision helpers. This module is important for preventing ordinary prose from being accidentally preserved while still protecting formulas, code, URLs, emails, acronyms, and identifiers.

**No Phase 5C changes** - Stage A translation logic unchanged.

### enrichment_pipeline.js

Stage B teaching-support generation module. It builds enrichment prompts, handles Kazakh compact-complete generation, validates support completeness, validates Kazakh support quality, completes missing/incomplete fields, handles targeted completion, normalizes structured fields, and tracks enrichment debug metadata.

**Phase 5C changes (MAJOR):**

**Imports:**
```javascript
import {
  ACTIVE_SUPPORT_FIELDS,
  CRITICAL_SUPPORT_FIELDS,
  OPTIONAL_SUPPORT_FIELDS,
  REMOVED_SUPPORT_FIELDS,
  isActiveSupportField,
  isCriticalSupportField,
  isOptionalSupportField,
  isRemovedSupportField,
} from "./support_fields.js";
```

**Version updates:**
- `PIPELINE_VERSION = "phase-5c-removed-fields-v1"`
- `ENRICHMENT_PROMPT_VERSION = "stage-b-8-fields-v1"` (exported)
- `ENRICHMENT_QUALITY_VERSION = "phase-5c-8-fields-v1"` (exported)

**Field management:**
- `SUPPORT_FIELD_NAMES = ACTIVE_SUPPORT_FIELDS` (backward compatibility)

**Fallback functions updated:**
- `createLocalFallbackLesson()` - removed 3 fields from returned object
- `createSafeEnrichmentFallbackLesson()` - removed 3 fields from returned object

**All Stage B prompts updated to 8-field schema:**

1. `buildLessonEnrichmentMessages()` - Main prompt
   - Kazakh schema: 8 fields (removed learningObjectives, differentiatedSupport, studentWorksheet)
   - General schema: 8 fields (removed learningObjectives, differentiatedSupport, studentWorksheet)
   - Limits updated to reflect 8 fields

2. `buildMinimalLessonEnrichmentMessages()` - Minimal fallback
   - Schema: 4 fields (glossary, simplifiedExplanation, quiz, keyConcepts)

3. `buildCompactRichLessonEnrichmentMessages()` - Compact retry
   - Kazakh schema: 8 fields
   - General schema: 8 fields

4. `buildMissingSupportCompletionMessages()` - Missing field completion
   - Schema: 8 fields
   - Field list filtered: `.filter((field) => isActiveSupportField(field))`
   - Only requests active fields

5. `buildEnrichmentJsonRepairMessages()` - JSON repair
   - Allowed fields: 8 active fields only

**Validation functions updated:**

1. `mergeEnrichmentPayloads()` - Only merges active fields
   ```javascript
   ["lessonTitle", ...ACTIVE_SUPPORT_FIELDS].forEach((field) => {
     // merge logic
   });
   ```

2. `mergeMissingSupportFields()` - Filters out removed fields
   ```javascript
   .filter((field) => isActiveSupportField(field))
   ```

3. `getSupportCompletenessIssues()` - Updated teacher minimums
   - Removed: differentiatedSupport, studentWorksheet from teacherMinimums
   - Removed: validation checks for differentiatedSupport and studentWorksheet

4. `getSupportIncompleteFields()` - Removed checks
   - Removed: studentWorksheet incomplete check
   - Removed: differentiatedSupport incomplete check

5. `getGeneratedSupportFieldSummary()` - Uses SUPPORT_FIELD_NAMES
   - Already updated since SUPPORT_FIELD_NAMES = ACTIVE_SUPPORT_FIELDS

6. `getSupportFieldCounts()` - Uses SUPPORT_FIELD_NAMES
   - Already updated since SUPPORT_FIELD_NAMES = ACTIVE_SUPPORT_FIELDS

**Kazakh quality rules preserved:**
- Natural Kazakh Cyrillic requirement unchanged
- No Russian requirement unchanged
- No Latin-script Kazakh requirement unchanged
- All quality validation logic unchanged

### translation_orchestrator.js

Stage A translation orchestration module. It handles block-by-block translation, batching, caching, retry logic, and translation validation.

**No Phase 5C changes** - Stage A translation logic unchanged.

### docx_tools.js

DOCX import/extraction and translated DOCX export. It parses DOCX content into structured nodes and translation blocks, applies translations back to the document model, and exports translated DOCX while preserving document structure where practical.

It is intended to preserve headings, paragraphs, lists, tables, images, numbering, and most style/layout hierarchy as much as the browser-side OOXML workflow allows. Legacy `.doc` is not supported.

**Phase 5C changes:**

**Function signatures updated:**
- `exportTranslatedDocx()` - removed 3 parameters:
  - learningObjectives (removed)
  - differentiatedSupport (removed)
  - studentWorksheet (removed)

- `appendLearningSupportSection()` - removed 3 parameters:
  - learningObjectives (removed)
  - differentiatedSupport (removed)
  - studentWorksheet (removed)

**DOCX sections renumbered 1-8 (was 1-11):**
1. Glossary
2. Simplified Explanation
3. Key Concepts (was 4)
4. Common Misconceptions (was 5)
5. Teacher Notes (was 6)
6. Classroom Activities (was 7)
7. Extension Questions (was 9)
8. Practice Quiz (was 11)

**Removed sections:**
- Section 3: Learning Objectives (removed)
- Section 8: Differentiated Support (removed)
- Section 10: Student Worksheet (removed)

### lesson_package.js

Teacher/student JSON package creation and import/export helpers. It builds lesson packages, downloads JSON, imports JSON files, validates package shape, and keeps optional fields from breaking older package workflows.

**Phase 5C backward compatibility:**
- Old packages with removed fields (learningObjectives, differentiatedSupport, studentWorksheet) can still be imported
- Removed fields are silently ignored during import
- Removed fields are not exported in new packages
- Removed fields do not appear in UI or DOCX export even if present in imported package

### styles.css

App styling and layout. It defines the visual system for the hero, cards, workspace panels, controls, buttons, progress UI, teacher/student sections, quiz display, and responsive layout.

### index.html

Static entry HTML. It sets up the page shell, loads `styles.css`, creates the `#root` mount point, and loads `app.js` as a module.

### backend/main.py

FastAPI backend. It provides:

- `/api/llm/chat` model proxy
- `/api/pdf-to-docx` PDF conversion endpoint
- `/api/health` health check
- CORS configuration for local development
- API key management (backend-only)

**No Phase 5C changes** - Backend API schema unchanged.

## 5. Recent Changes (Phase 5C)

### Phase 5C: Remove Three Teaching Support Fields

**Date:** Current session

**Goal:** Remove learningObjectives, differentiatedSupport, and studentWorksheet from the entire system to create a single source of truth for active fields.

**Changes made:**

1. **Created `support_fields.js`** - Single source of truth
   - Defines ACTIVE_SUPPORT_FIELDS (8 fields)
   - Defines CRITICAL_SUPPORT_FIELDS (4 fields)
   - Defines OPTIONAL_SUPPORT_FIELDS (4 fields)
   - Defines REMOVED_SUPPORT_FIELDS (3 fields)
   - Exports helper functions for field checking

2. **Updated `enrichment_pipeline.js`** - Stage B prompts and validation
   - Imports field constants from support_fields.js
   - Updated all 5 Stage B prompt functions to 8-field schema
   - Updated validation to check only active fields
   - Updated merge functions to filter active fields only
   - Removed validation for removed fields
   - Version strings updated to reflect 8-field schema

3. **Updated `app.js`** - UI and export
   - Removed 3 UI sections from LessonSupportSections
   - Removed 3 fields from DOCX export call
   - Removed PDF handout export buttons and functions

4. **Updated `docx_tools.js`** - DOCX export
   - Removed 3 parameters from exportTranslatedDocx
   - Removed 3 parameters from appendLearningSupportSection
   - Removed 3 sections from DOCX output
   - Renumbered remaining sections 1-8

5. **Fixed import/export regression**
   - Restored `export` keyword to ENRICHMENT_PROMPT_VERSION
   - Restored `export` keyword to ENRICHMENT_QUALITY_VERSION

**What was NOT changed:**
- Stage A translation logic
- Kazakh quality rules (natural Cyrillic, no Russian, no Latin)
- Backend API schema
- Block classification
- Document-specific logic (none added)

**Result:**
- System now has 8 active teaching support fields
- Removed fields do not appear in prompts, validation, UI, DOCX export, or debug
- Backward compatibility maintained for old packages
- All syntax checks pass

## 6. Stage A Translation (Unchanged)

Stage A translates source text block-by-block using typed prompts based on block classification.

**Block types:**
- Ordinary prose → full translation
- Headings → full translation
- Formulas → preserve
- Code → preserve
- URLs/emails → preserve
- Identifiers/acronyms → preserve with context
- Mixed content → intelligent handling

**Kazakh translation requirements:**
- Natural Cyrillic Kazakh (not Russian, not Latin-script Kazakh)
- Preserve English technical terms in parentheses when useful
- Natural sentence structures (not word-for-word translation)
- Educational terminology appropriate for classroom use

**Translation flow:**
1. Parse DOCX into blocks
2. Classify each block
3. Build typed translation prompt
4. Call model API
5. Validate translation
6. Cache result
7. Retry if validation fails

## 7. Stage B Teaching Support (Phase 5C - 8 Fields)

Stage B generates teaching support materials in the target language.

**Active support fields (8):**
1. **glossary** - 5-8 key terms with explanations
2. **simplifiedExplanation** - 200-400 word overview
3. **keyConcepts** - 3-5 lesson-specific concepts
4. **commonMisconceptions** - 2-4 misunderstandings with corrections
5. **teacherNotes** - Introduction, struggle points, examples
6. **classroomActivities** - 1-3 executable activities
7. **extensionQuestions** - 2-4 open-ended questions
8. **quiz** - Practice questions with answer key

**Critical fields (required for completeness):**
- glossary, simplifiedExplanation, quiz, keyConcepts

**Optional fields (enhance but not critical):**
- commonMisconceptions, teacherNotes, classroomActivities, extensionQuestions

**Removed fields (Phase 5C):**
- learningObjectives (removed)
- differentiatedSupport (removed)
- studentWorksheet (removed)

**Generation flow:**
1. Build enrichment context from translation
2. Generate teaching support (8 fields)
3. Validate completeness (critical fields present)
4. Validate Kazakh quality (if target is Kazakh)
5. Complete missing fields if needed
6. Return enriched lesson

**Kazakh-specific behavior:**
- Uses compact-complete prompt for efficiency
- Validates natural Cyrillic Kazakh (no Russian, no Latin)
- Validates content is grounded in lesson (not generic)
- Retries if validation fails

## 8. Key Constraints

**Do not change without explicit approval:**
- Stage A translation logic
- Stage B generation behavior
- Kazakh quality rules (natural Cyrillic, no Russian, no Latin)
- Backend API schema
- Block classification logic
- Active support fields (8 fields defined in support_fields.js)

**Always preserve:**
- Backward compatibility with old JSON packages
- Debug report usefulness
- DOCX export quality
- Natural Kazakh translation quality
- Teaching support completeness

**Safe to change:**
- UI styling and layout
- UI text and labels
- Export file naming
- Progress indicators
- Error messages

## 9. Local Run Instructions

**Backend:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env with your API key
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend:**

```bash
python3 -m http.server 5500
```

**Open:**

```text
http://127.0.0.1:5500
```

**Health check:**

```bash
curl http://127.0.0.1:8000/api/health
```

## 10. Regression Testing Checklist

After any refactor, test at least:

1. **Start services:**
   - Backend: `uvicorn main:app --reload --host 127.0.0.1 --port 8000`
   - Frontend: `python3 -m http.server 5500`
   - Open: `http://127.0.0.1:5500`

2. **Upload and generate:**
   - Upload a short DOCX (1-2 pages)
   - Target: Kazakh
   - Mode: Teacher
   - Click "Generate Lesson"

3. **Verify Stage A (translation):**
   - Ordinary prose translated to natural Cyrillic Kazakh
   - Formulas, URLs, emails preserved
   - No Russian text in translation
   - No Latin-script Kazakh in translation
   - Technical terms preserved with English in parentheses

4. **Verify Stage B (teaching support):**
   - All 8 active fields present (glossary, simplifiedExplanation, keyConcepts, commonMisconceptions, teacherNotes, classroomActivities, extensionQuestions, quiz)
   - Removed fields NOT visible in UI (learningObjectives, differentiatedSupport, studentWorksheet)
   - Content in natural Cyrillic Kazakh
   - Content grounded in lesson (not generic)
   - Quiz questions relevant to lesson

5. **Verify exports:**
   - Export Full Lesson DOCX → opens correctly, 8 sections present, removed sections NOT present
   - Export Teacher JSON → valid JSON, 8 active fields present
   - Export Student JSON → valid JSON, quiz present
   - Export Debug Report → includes metadata, no errors

6. **Verify import:**
   - Import student JSON in Student Workspace
   - Quiz displays correctly
   - Translation displays correctly

7. **Check console:**
   - No JavaScript errors
   - No import/export errors
   - No white screen

8. **Check debug metadata:**
   ```javascript
   {
     "enrichmentApiCallCount": >= 1,
     "stageBEnrichmentDurationMs": > 0,
     "teachingSupportFallbackUsed": false,
     "supportSource": "online-api",
     "supportCompletenessPassed": true,
     "enrichmentPromptVersion": "stage-b-8-fields-v1",
     "enrichmentQualityVersion": "phase-5c-8-fields-v1"
   }
   ```

## 11. Common Issues and Solutions

**Issue: White screen on load**
- Check browser console for import/export errors
- Verify all exported constants have `export` keyword
- Check syntax: `node --check app.js enrichment_pipeline.js`

**Issue: Stage B falls back to local fallback**
- Check `enrichmentApiCallCount` in debug report
- If 0: API call was skipped, check error logs
- If >= 1: API call failed, check backend logs
- Verify backend is running on port 8000

**Issue: Removed fields still appear in UI**
- Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
- Check LessonSupportSections in app.js
- Verify removed fields are not in component

**Issue: DOCX export includes removed fields**
- Check exportTranslatedDocx parameters in app.js
- Check appendLearningSupportSection in docx_tools.js
- Verify removed sections are not rendered

**Issue: Kazakh translation contains Russian**
- Check Stage A translation validation
- Check Kazakh quality validation in enrichment_pipeline.js
- Verify natural Cyrillic requirement in prompts

## 12. Future Work Suggestions

**Safe near-term improvements:**
- Extract Stage A orchestration from app.js
- Extract debug report construction from app.js
- Extract teacher/student workspace components
- Improve error messages and user feedback
- Add more comprehensive unit tests

**Requires careful planning:**
- Change active support fields (requires updating support_fields.js and all consumers)
- Change Stage A translation logic (requires extensive testing)
- Change Stage B generation logic (requires Kazakh quality validation)
- Change backend API schema (requires frontend/backend coordination)
- Migrate to build tooling (Vite, etc.)

**Do not do without explicit approval:**
- Remove or weaken Kazakh quality rules
- Add document-specific logic or hard-coded topics
- Change block classification behavior
- Remove backward compatibility for old packages
- Change API contract between frontend and backend

## 13. Documentation Files

- `handoff.md` (this file) - Project overview and handoff guide
- `PHASE_5C_REMOVE_THREE_FIELDS.md` - Phase 5C detailed changes
- `IMPORT_EXPORT_FIX.md` - Import/export regression fix
- `STAGE_B_REGRESSION_FIX.md` - Stage B online API call fix
- `README.md` - User-facing documentation (if exists)

## 14. Contact and Support

For questions about:
- **Stage A translation:** Check block_classifier.js and translation_orchestrator.js
- **Stage B generation:** Check enrichment_pipeline.js and support_fields.js
- **DOCX export:** Check docx_tools.js
- **UI/UX:** Check app.js and styles.css
- **Backend:** Check backend/main.py

**Key principles:**
- Keep changes small and testable
- Preserve Kazakh quality rules
- Maintain backward compatibility
- Test with real DOCX files
- Verify all 8 active support fields work correctly
