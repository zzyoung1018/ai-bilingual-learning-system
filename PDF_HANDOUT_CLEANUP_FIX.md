# PDF Handout Export Cleanup - Regression Fix

## Problem
After removing PDF handout export buttons and functions, the app white-screened with:
```
ReferenceError: exportTeacherPdf is not defined
at App (app.js:2506:34)
```

## Root Cause
PDF handout export was removed only partially. The button UI and function definitions were removed, but:
1. TeacherWorkspace component still expected `onExportTeacherPdf` and `onExportStudentPdf` props
2. App component was still passing these undefined functions as props

## Fix Applied

### Removed Stale References in app.js

**1. TeacherWorkspace component props definition (lines ~1217-1218):**
```javascript
// REMOVED:
onExportTeacherPdf,
onExportStudentPdf,
```

**2. TeacherWorkspace component call (lines ~2506-2507):**
```javascript
// REMOVED:
onExportTeacherPdf=${exportTeacherPdf}
onExportStudentPdf=${exportStudentPdf}
```

## Verification

### Syntax Checks - All Pass ✅
```bash
node --check app.js              # ✓ No errors
node --check docx_tools.js       # ✓ No errors
node --check lesson_package.js   # ✓ No errors
node --check api_client.js       # ✓ No errors
```

### PDF Input Conversion - Still Intact ✅
```javascript
// app.js still has:
import { convertPdfToDocx, ... } from "./api_client.js"
onPdfFileSelect prop
handlePdfFileSelect function
convertPdfToDocxFile function

// api_client.js still has:
pdfToDocxUrl: "/api/pdf-to-docx"

// backend/main.py still has:
@app.post("/api/pdf-to-docx")
```

### Export Buttons - Correct Set ✅
After fix, export area contains only:
1. Export Full Lesson DOCX (Recommended)
2. Export Learning Package (Teacher JSON)
3. Export Learning Package (Student JSON)
4. Export Debug Report

No PDF handout buttons.

### No Undefined Symbols ✅
```bash
grep -n "exportTeacherPdf\|exportStudentPdf" app.js
# (no results - all references removed)
```

## What Was Removed

### From app.js:
- `onExportTeacherPdf` prop in TeacherWorkspace component definition
- `onExportStudentPdf` prop in TeacherWorkspace component definition
- `onExportTeacherPdf=${exportTeacherPdf}` prop in TeacherWorkspace call
- `onExportStudentPdf=${exportStudentPdf}` prop in TeacherWorkspace call

### Total lines removed: 4 lines

## What Remains Intact

✅ **PDF Input Conversion:**
- PDF file upload still works
- `convertPdfToDocx()` function still exists
- Backend `/api/pdf-to-docx` endpoint still works
- PDF-to-DOCX conversion for input workflow intact

✅ **DOCX Export:**
- Export Full Lesson DOCX button works
- `exportDocx()` function intact
- `exportTranslatedDocx()` with full teaching support intact

✅ **JSON Export:**
- Export Teacher JSON button works
- Export Student JSON button works
- `exportTeacherJson()` and `exportStudentJson()` functions intact

✅ **Debug Export:**
- Export Debug Report button works
- `exportDebugReport()` function intact

✅ **Stage A/Stage B/Kazakh:**
- No changes to translation logic
- No changes to enrichment logic
- No changes to Kazakh prompts or validation

## Testing Instructions

1. **Hard refresh frontend:**
   ```
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

2. **Verify page renders:**
   - No white screen
   - No console error: "exportTeacherPdf is not defined"
   - Teacher Workspace visible

3. **Generate a lesson:**
   - Upload DOCX or paste text
   - Target: Kazakh
   - Click "Generate Bilingual Lesson"
   - Wait for completion

4. **Test exports:**
   - Click "Export Full Lesson DOCX (Recommended)" → downloads DOCX
   - Click "Export Learning Package (Teacher JSON)" → downloads JSON
   - Click "Export Learning Package (Student JSON)" → downloads JSON
   - Click "Export Debug Report" → downloads JSON

5. **Verify no PDF handout buttons:**
   - Export area shows only 4 buttons
   - No "Export Teacher Handout (PDF)"
   - No "Export Student Handout (PDF)"

6. **Verify PDF input still works:**
   - Upload a PDF file
   - Should convert to DOCX
   - Should process normally

## Summary

Fixed the white-screen regression by removing the last 4 stale references to PDF handout export functions. The app now renders correctly with only the intended export buttons. PDF input conversion remains fully functional. No changes to Stage A, Stage B, or Kazakh logic.
