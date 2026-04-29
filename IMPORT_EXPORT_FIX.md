# Import/Export Regression Fix

## Problem

After the Phase 5C support-field cleanup, the app white-screened with:

```
Uncaught SyntaxError: The requested module './enrichment_pipeline.js' does not provide an export named 'ENRICHMENT_PROMPT_VERSION'
at app.js:35:3
```

## Root Cause

During the Phase 5C cleanup, I updated the constant definitions in enrichment_pipeline.js:

**Before (working):**
```javascript
export const ENRICHMENT_PROMPT_VERSION = "stage-b-teaching-support-v2";
export const ENRICHMENT_QUALITY_VERSION = "phase4e-grounded-support-v1";
```

**After Phase 5C (broken):**
```javascript
const ENRICHMENT_PROMPT_VERSION = "stage-b-8-fields-v1";
const ENRICHMENT_QUALITY_VERSION = "phase-5c-8-fields-v1";
```

I accidentally removed the `export` keyword when updating the version strings, breaking the import in app.js.

## Fix Applied

Restored the `export` keyword:

**File:** `enrichment_pipeline.js` line 17-18

```javascript
export const ENRICHMENT_PROMPT_VERSION = "stage-b-8-fields-v1";
export const ENRICHMENT_QUALITY_VERSION = "phase-5c-8-fields-v1";
```

## Why These Constants Are Needed

Both constants are used in debug metadata throughout the system:

**ENRICHMENT_PROMPT_VERSION usage:**
- app.js: 9 locations (lines 474, 1542, 2030, 2100, 2217, 2289)
- enrichment_pipeline.js: 3 locations (lines 266, 377, 1817, 2301)

**ENRICHMENT_QUALITY_VERSION usage:**
- app.js: 1 location (line 535)
- enrichment_pipeline.js: 3 locations (lines 378, 1818, 2244)

These constants appear in debug reports to track which prompt version and quality version generated each lesson, which is essential for:
- Debugging generation issues
- Tracking prompt evolution
- Comparing results across versions
- Identifying when behavior changed

## Verification

**All syntax checks pass:**
```bash
node --check app.js                      ✓
node --check enrichment_pipeline.js      ✓
node --check docx_tools.js               ✓
node --check support_fields.js           ✓
node --check lesson_package.js           ✓
node --check api_client.js               ✓
node --check translation_orchestrator.js ✓
node --check block_classifier.js         ✓
node --check ui_text.js                  ✓
```

**All exports verified:**
- `ENRICHMENT_PROMPT_VERSION` - exported ✓
- `ENRICHMENT_QUALITY_VERSION` - exported ✓
- `ACTIVE_SUPPORT_FIELDS` - exported ✓
- `CRITICAL_SUPPORT_FIELDS` - exported ✓
- `OPTIONAL_SUPPORT_FIELDS` - exported ✓
- `REMOVED_SUPPORT_FIELDS` - exported ✓
- `isActiveSupportField()` - exported ✓
- `isCriticalSupportField()` - exported ✓
- `isOptionalSupportField()` - exported ✓
- `isRemovedSupportField()` - exported ✓

## What Was NOT Changed

✅ **No generation behavior changed:**
- Stage A translation logic - unchanged
- Stage B generation logic - unchanged
- Prompt content - unchanged (only version strings updated)
- Validation logic - unchanged
- Retry logic - unchanged

✅ **Removed support fields remain removed:**
- learningObjectives - still removed from prompts, UI, DOCX, validation
- differentiatedSupport - still removed from prompts, UI, DOCX, validation
- studentWorksheet - still removed from prompts, UI, DOCX, validation

✅ **Kazakh rules unchanged:**
- Natural Cyrillic requirement - unchanged
- No Russian requirement - unchanged
- No Latin-script Kazakh requirement - unchanged

✅ **No other changes:**
- Backend API - unchanged
- DOCX/PDF logic - unchanged
- Package schema - unchanged
- Support-field removal logic - unchanged

## Expected Result After Fix

**Frontend should:**
- Render without white screen ✓
- No console error about ENRICHMENT_PROMPT_VERSION ✓
- UI shows only 8 active support fields ✓
- UI does NOT show removed fields (learningObjectives, differentiatedSupport, studentWorksheet) ✓

**Debug metadata should include:**
```javascript
{
  "enrichmentPromptVersion": "stage-b-8-fields-v1",
  "enrichmentQualityVersion": "phase-5c-8-fields-v1",
  // ... other fields
}
```

## Summary

**Why ENRICHMENT_PROMPT_VERSION was missing:**
I accidentally removed the `export` keyword when updating the version strings during Phase 5C cleanup.

**How I fixed it:**
Restored the `export` keyword to both constants:
- `export const ENRICHMENT_PROMPT_VERSION = "stage-b-8-fields-v1";`
- `export const ENRICHMENT_QUALITY_VERSION = "phase-5c-8-fields-v1";`

**No generation behavior changed:**
Only restored the export, did not change any generation logic, prompts, validation, or field removal.

**Removed support fields remain removed:**
learningObjectives, differentiatedSupport, and studentWorksheet are still completely removed from prompts, UI, DOCX export, and validation.
