# Phase 5C: Remove Three Teaching Support Fields

## Overview

Removed three teaching support fields from the entire system to create a single source of truth for active fields. The system now supports only 8 active teaching support fields instead of 11.

## Active Support Fields (8 fields)

1. **glossary** - Key terms with explanations
2. **simplifiedExplanation** - 200-400 word overview
3. **keyConcepts** - 3-5 lesson-specific concepts
4. **commonMisconceptions** - 2-4 misunderstandings with corrections
5. **teacherNotes** - Introduction, struggle points, examples
6. **classroomActivities** - 1-3 executable activities
7. **extensionQuestions** - 2-4 open-ended questions
8. **quiz** - Practice questions with answer key

## Removed Support Fields (3 fields)

1. **learningObjectives** - Removed from all prompts, validation, UI, DOCX export
2. **differentiatedSupport** - Removed from all prompts, validation, UI, DOCX export
3. **studentWorksheet** - Removed from all prompts, validation, UI, DOCX export

## Changes Made

### 1. Created Single Source of Truth

**File:** `support_fields.js` (new file)

Defined constants:
- `ACTIVE_SUPPORT_FIELDS` - Array of 8 active fields
- `CRITICAL_SUPPORT_FIELDS` - glossary, simplifiedExplanation, quiz, keyConcepts
- `OPTIONAL_SUPPORT_FIELDS` - commonMisconceptions, teacherNotes, classroomActivities, extensionQuestions
- `REMOVED_SUPPORT_FIELDS` - learningObjectives, differentiatedSupport, studentWorksheet

Helper functions:
- `isActiveSupportField(fieldName)`
- `isCriticalSupportField(fieldName)`
- `isOptionalSupportField(fieldName)`
- `isRemovedSupportField(fieldName)`

### 2. Updated enrichment_pipeline.js

**Imports:**
```javascript
import {
  ACTIVE_SUPPORT_FIELDS,
  CRITICAL_SUPPORT_FIELDS,
  OPTIONAL_SUPPORT_FIELDS,
  REMOVED_SUPPORT_FIELDS,
  isActiveSupportField,
  // ...
} from "./support_fields.js";
```

**Version updates:**
- `PIPELINE_VERSION = "phase-5c-removed-fields-v1"`
- `ENRICHMENT_PROMPT_VERSION = "stage-b-8-fields-v1"`
- `ENRICHMENT_QUALITY_VERSION = "phase-5c-8-fields-v1"`

**Field list:**
- `SUPPORT_FIELD_NAMES = ACTIVE_SUPPORT_FIELDS` (now uses imported constant)

**Fallback lessons:**
- `createLocalFallbackLesson()` - Removed 3 fields from returned object
- `createSafeEnrichmentFallbackLesson()` - Removed 3 fields from returned object

**Stage B prompts (all updated to 8-field schema):**

1. **buildLessonEnrichmentMessages()** - Main prompt
   - Kazakh schema: removed learningObjectives, differentiatedSupport, studentWorksheet
   - General schema: removed learningObjectives, differentiatedSupport, studentWorksheet
   - Limits updated: removed references to removed fields

2. **buildMinimalLessonEnrichmentMessages()** - Minimal fallback
   - Schema: removed learningObjectives
   - Kept only: glossary, simplifiedExplanation, quiz, keyConcepts

3. **buildCompactRichLessonEnrichmentMessages()** - Compact retry
   - Kazakh schema: removed learningObjectives, differentiatedSupport, studentWorksheet
   - General schema: removed learningObjectives, differentiatedSupport, studentWorksheet
   - Limits updated

4. **buildMissingSupportCompletionMessages()** - Missing field completion
   - Schema: removed learningObjectives, differentiatedSupport, studentWorksheet
   - Field list filtered: `filter((field) => isActiveSupportField(field))`
   - Kazakh targets: removed references to removed fields

5. **buildEnrichmentJsonRepairMessages()** - JSON repair
   - Allowed fields: removed learningObjectives, differentiatedSupport, studentWorksheet

**Validation functions:**

1. **mergeEnrichmentPayloads()** - Only merges active fields
   ```javascript
   ["lessonTitle", ...ACTIVE_SUPPORT_FIELDS].forEach((field) => {
     // merge logic
   });
   ```

2. **mergeMissingSupportFields()** - Filters out removed fields
   ```javascript
   .filter((field) => isActiveSupportField(field))
   ```

3. **getSupportCompletenessIssues()** - Updated teacher minimums
   - Removed: differentiatedSupport, studentWorksheet
   - Kept: commonMisconceptions, teacherNotes, classroomActivities, extensionQuestions
   - Removed validation for differentiatedSupport and studentWorksheet

4. **getSupportIncompleteFields()** - Removed checks
   - Removed: studentWorksheet incomplete check
   - Removed: differentiatedSupport incomplete check

5. **getGeneratedSupportFieldSummary()** - Uses SUPPORT_FIELD_NAMES
   - Already updated since SUPPORT_FIELD_NAMES now = ACTIVE_SUPPORT_FIELDS

6. **getSupportFieldCounts()** - Uses SUPPORT_FIELD_NAMES
   - Already updated since SUPPORT_FIELD_NAMES now = ACTIVE_SUPPORT_FIELDS

### 3. Updated app.js

**UI sections removed:**

`LessonSupportSections()` component:
- Removed: `<${StringListSection} title=${t.learningObjectives} />`
- Removed: `<${DifferentiatedSupportSection} title=${t.differentiatedSupport} />`
- Removed: `<${WorksheetSection} title=${t.studentWorksheet} />`

Visible sections now:
1. Key Concepts
2. Common Misconceptions (teacher only)
3. Teacher Notes (teacher only)
4. Classroom Activities (teacher only)
5. Extension Questions

**DOCX export updated:**

`exportDocx()` function:
- Removed: `learningObjectives: teacherLesson.learningObjectives || []`
- Removed: `differentiatedSupport: teacherLesson.differentiatedSupport || {}`
- Removed: `studentWorksheet: teacherLesson.studentWorksheet || []`

Passed to exportTranslatedDocx:
- glossary
- simplifiedExplanation
- keyConcepts
- commonMisconceptions
- teacherNotes
- classroomActivities
- extensionQuestions
- quiz

### 4. Updated docx_tools.js

**Function signature:**

`exportTranslatedDocx()`:
- Removed parameters: learningObjectives, differentiatedSupport, studentWorksheet

`appendLearningSupportSection()`:
- Removed parameters: learningObjectives, differentiatedSupport, studentWorksheet

**DOCX sections (renumbered):**

1. Glossary
2. Simplified Explanation
3. Key Concepts (was 4)
4. Common Misconceptions (was 5)
5. Teacher Notes (was 6)
6. Classroom Activities (was 7)
7. Extension Questions (was 9)
8. Practice Quiz (was 11)

Removed sections:
- Section 3: Learning Objectives
- Section 8: Differentiated Support
- Section 10: Student Worksheet

**Function call updated:**

Line ~1475: `appendLearningSupportSection()` call
- Removed: learningObjectives, differentiatedSupport, studentWorksheet parameters

## Stale References Found and Removed

### enrichment_pipeline.js
- Line 123-143: Old SUPPORT_FIELD_NAMES array (replaced with import)
- Line 228-270: createLocalFallbackLesson() (removed 3 fields)
- Line 329-357: createSafeEnrichmentFallbackLesson() (removed 3 fields)
- Line 665-666: Kazakh prompt schema and limits (removed 3 fields)
- Line 694-695: General prompt schema and limits (removed 3 fields)
- Line 729-730: Minimal prompt schema and limits (removed learningObjectives)
- Line 775-787: Missing-field completion schema and targets (removed 3 fields)
- Line 871-901: Compact retry prompt schema and limits (removed 3 fields)
- Line 924: JSON repair allowed fields (removed 3 fields)
- Line 1024-1040: mergeEnrichmentPayloads() field list (now uses ACTIVE_SUPPORT_FIELDS)
- Line 1286-1308: teacherMinimums validation (removed 3 fields)
- Line 1320-1331: studentWorksheet and differentiatedSupport incomplete checks (removed)
- Line 1367-1389: mergeMissingSupportFields() (added filter for active fields)

### app.js
- Line 844-846: Learning Objectives UI section (removed)
- Line 871-876: Differentiated Support UI section (removed)
- Line 883-887: Student Worksheet UI section (removed)
- Line 2360: learningObjectives in exportDocx (removed)
- Line 2365: differentiatedSupport in exportDocx (removed)
- Line 2367: studentWorksheet in exportDocx (removed)

### docx_tools.js
- Line 1151: learningObjectives parameter (removed)
- Line 1156: differentiatedSupport parameter (removed)
- Line 1158: studentWorksheet parameter (removed)
- Line 1227-1233: Section 3 Learning Objectives (removed)
- Line 1290-1297: Section 8 Differentiated Support (removed)
- Line 1308-1318: Section 10 Student Worksheet (removed)
- Line 1366: learningObjectives parameter in exportTranslatedDocx (removed)
- Line 1371: differentiatedSupport parameter in exportTranslatedDocx (removed)
- Line 1373: studentWorksheet parameter in exportTranslatedDocx (removed)
- Line 1481: learningObjectives in appendLearningSupportSection call (removed)
- Line 1486: differentiatedSupport in appendLearningSupportSection call (removed)
- Line 1488: studentWorksheet in appendLearningSupportSection call (removed)

## How ACTIVE_SUPPORT_FIELDS is Used

1. **enrichment_pipeline.js:**
   - `SUPPORT_FIELD_NAMES = ACTIVE_SUPPORT_FIELDS` - Backward compatibility
   - `mergeEnrichmentPayloads()` - Only merges active fields
   - `mergeMissingSupportFields()` - Filters to active fields only
   - `getGeneratedSupportFieldSummary()` - Iterates over active fields
   - `getSupportFieldCounts()` - Counts active fields

2. **Validation:**
   - `isActiveSupportField()` - Used in mergeMissingSupportFields filter
   - `CRITICAL_SUPPORT_FIELDS` - Used for critical validation
   - `OPTIONAL_SUPPORT_FIELDS` - Used for optional validation

3. **Prompts:**
   - All Stage B prompts now request only 8 active fields
   - JSON schemas updated to exclude removed fields
   - Field limits updated to exclude removed fields

4. **UI:**
   - Only active fields rendered in LessonSupportSections
   - Removed fields have no UI cards

5. **DOCX Export:**
   - Only active fields passed to exportTranslatedDocx
   - Only active fields rendered in appendLearningSupportSection
   - Sections renumbered 1-8

## Confirmation Checklist

### ✅ Removed fields are gone from:
- [x] Stage B prompts (all 5 prompt functions)
- [x] Validation (completeness, missing fields, incomplete fields)
- [x] UI cards (LessonSupportSections)
- [x] DOCX export (function signature, sections, calls)
- [x] Debug missing fields (getSupportCompletenessIssues)
- [x] Debug incomplete fields (getSupportIncompleteFields)
- [x] generatedSupportFields (uses SUPPORT_FIELD_NAMES)
- [x] missingOptionalSupportFields (uses SUPPORT_FIELD_NAMES)
- [x] supportFieldCounts (uses SUPPORT_FIELD_NAMES)

### ✅ Stage A was not changed:
- [x] translation_orchestrator.js - Not modified
- [x] Block classification - Not modified
- [x] Translation prompts - Not modified
- [x] Translation retry logic - Not modified

### ✅ Kazakh rules were not weakened:
- [x] Natural Kazakh Cyrillic requirement - Preserved in all prompts
- [x] No Russian requirement - Preserved in all prompts
- [x] No Latin-script Kazakh requirement - Preserved in all prompts
- [x] Kazakh validation logic - Not weakened
- [x] Kazakh prompts - Updated schema only, quality rules unchanged

### ✅ No document-specific logic was added:
- [x] No Shakespeare-specific rules
- [x] No linear-algebra-specific rules
- [x] No photosynthesis-specific rules
- [x] No hard-coded topics
- [x] All logic is generic

## Testing Instructions

### Test 1: Short DOCX → Kazakh

1. **Generate lesson:**
   ```
   - Upload short DOCX (1-2 pages)
   - Target: Kazakh
   - Mode: Teacher
   - Generate
   ```

2. **Check UI:**
   - Learning Objectives section: NOT visible
   - Differentiated Support section: NOT visible
   - Student Worksheet section: NOT visible
   - Key Concepts: visible
   - Common Misconceptions: visible
   - Teacher Notes: visible
   - Classroom Activities: visible
   - Extension Questions: visible
   - Quiz Preview: visible

3. **Check debug metadata:**
   ```javascript
   {
     "enrichmentApiCallCount": >= 1,
     "stageBEnrichmentDurationMs": > 0,
     "teachingSupportFallbackUsed": false,
     "supportSource": "online-api" or "mixed-online-completion",
     "supportCompletenessPassed": true,
     "missingOptionalSupportFields": [], // Should NOT include removed fields
     "supportIncompleteFields": [], // Should NOT include removed fields
     "generatedSupportFields": [
       "glossary",
       "simplifiedExplanation",
       "keyConcepts",
       "commonMisconceptions",
       "teacherNotes",
       "classroomActivities",
       "extensionQuestions",
       "quiz"
     ]
   }
   ```

4. **Export Full Lesson DOCX:**
   - Click "Export Full Lesson DOCX"
   - Open exported file
   - Verify sections:
     1. Glossary
     2. Simplified Explanation
     3. Key Concepts
     4. Common Misconceptions
     5. Teacher Notes
     6. Classroom Activities
     7. Extension Questions
     8. Practice Quiz
   - Verify NOT present:
     - Learning Objectives
     - Differentiated Support
     - Student Worksheet

5. **Export Teacher JSON:**
   - Click "Export Teacher JSON"
   - Open JSON file
   - Verify fields present: glossary, simplifiedExplanation, keyConcepts, commonMisconceptions, teacherNotes, classroomActivities, extensionQuestions, quiz
   - Verify fields MAY be present for backward compatibility but are not required

### Test 2: Multiple Documents

Test with:
- Short DOCX
- Medium DOCX
- Long DOCX
- Different topics

**Verify for each:**
- Stage A succeeds
- Stage B calls online API
- teachingSupportFallbackUsed = false
- supportCompletenessPassed = true
- missingOptionalSupportFields does NOT include removed fields
- UI does NOT show removed sections
- DOCX export does NOT include removed sections

### Test 3: Import Old Package

If you have an old JSON package with learningObjectives, differentiatedSupport, studentWorksheet:
- Import it
- Verify it loads without errors
- Verify removed fields are not shown in UI
- Verify removed fields are not exported to DOCX
- Verify removed fields are not counted as missing

## Summary

Successfully removed three teaching support fields (learningObjectives, differentiatedSupport, studentWorksheet) from the entire system:

1. **Created single source of truth** in `support_fields.js`
2. **Updated all Stage B prompts** to request only 8 active fields
3. **Updated validation** to check only active fields
4. **Removed UI sections** for removed fields
5. **Updated DOCX export** to include only active fields
6. **Updated debug reporting** to not count removed fields as missing

**No changes to:**
- Stage A translation logic
- Kazakh quality rules (natural Cyrillic, no Russian, no Latin)
- Backend API schema
- Document-specific logic (none added)
- Block classification
- PDF/DOCX import

**Result:**
- System now has 8 active teaching support fields
- Removed fields do not appear in prompts, validation, UI, DOCX export, or debug
- Backward compatibility maintained for old packages
- All syntax checks pass
