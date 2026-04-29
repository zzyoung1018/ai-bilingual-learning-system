# Stage B API Fix Verification Checklist

## Pre-Test Setup

1. **Start Backend Server**
   ```bash
   cd backend
   python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
   ```
   
2. **Verify Backend Health**
   ```bash
   curl http://127.0.0.1:8000/api/health
   ```
   Should return: `{"status": "ok", "provider": "online-api", ...}`

3. **Start Frontend Server**
   ```bash
   python3 -m http.server 5500
   ```

4. **Open Browser**
   Navigate to: `http://127.0.0.1:5500/index.html`

## Test Cases

### Test 1: Short Manual Text → Kazakh
**Input:**
- Source text: "The water cycle describes how water evaporates from the surface of the earth, rises into the atmosphere, cools and condenses into rain or snow in clouds, and falls again to the surface as precipitation."
- Target language: Kazakh
- Mode: Teacher

**Expected Results:**
- ✅ Stage A: `translatedBlockCount` close to `totalSourceBlocks`
- ✅ Stage A: `failedBlockCount = 0`
- ✅ Stage A: `documentFallbackThresholdTriggered = false`
- ✅ Stage B: `enrichmentApiCallCount >= 1`
- ✅ Stage B: `stageBEnrichmentDurationMs > 0`
- ✅ Stage B: `teachingSupportFallbackUsed = false`
- ✅ Stage B: `supportSource = "online-api"` or `"mixed-online-completion"`
- ✅ Console: No backend 422 errors
- ✅ Console: No "[object Response]" JSON parse errors
- ✅ Generated fields: glossary, simplifiedExplanation, quiz, learningObjectives, etc.

### Test 2: Biography DOCX → Kazakh
**Input:**
- Upload a DOCX file with biographical content (e.g., about a historical figure)
- Target language: Kazakh
- Mode: Teacher

**Expected Results:**
- ✅ Stage A: Translation succeeds for most blocks
- ✅ Stage B: Online enrichment succeeds
- ✅ No fallback to local teaching support
- ✅ Quiz questions are grounded in the actual document content
- ✅ Glossary terms are from the document, not generic

### Test 3: Math/Science DOCX → Kazakh
**Input:**
- Upload a DOCX file with mathematical or scientific content
- Target language: Kazakh
- Mode: Teacher

**Expected Results:**
- ✅ Stage A: Formulas preserved correctly
- ✅ Stage B: Online enrichment succeeds
- ✅ Technical terms handled appropriately
- ✅ No fallback to local teaching support

## Debug Console Checks

Open browser DevTools (F12) and check Console tab:

### Should NOT See:
- ❌ `Backend HTTP 422` errors
- ❌ `Unexpected token 'o', "[object Response]" is not valid JSON`
- ❌ `Invalid chat request body` errors (unless there's a real bug)

### Should See:
- ✅ `[Translation] Starting block translation...`
- ✅ `[Translation] Block translation completed`
- ✅ `[Enrichment] Starting teaching support generation...`
- ✅ `[Enrichment] Teaching support generation completed`

## Metadata Verification

After generation, check the lesson metadata (in browser console or exported JSON):

```javascript
// Should show:
{
  "teachingSupportFallbackUsed": false,
  "supportSource": "online-api",  // or "mixed-online-completion"
  "enrichmentApiCallCount": 1,    // or more
  "stageBEnrichmentDurationMs": 5000,  // some positive number
  "enrichmentFailureReason": "",  // empty if successful
  "kazakhValidationPassed": true, // for Kazakh target
  "supportCompletenessPassed": true
}
```

## API Request Validation

The frontend now validates requests before sending to backend:

1. **Request body must be an object** (not array)
2. **stage field required** (string: "translation", "enrichment", or "json_repair")
3. **messages must be non-empty array**
4. **Each message must have role and content**
5. **format field required** (string: "json" or "text")
6. **options must be an object** (not array)

If validation fails, error is thrown on frontend with clear message.

## Backend Response Format

Backend returns:
```json
{
  "content": "string (the model's response)",
  "provider": "online-api",
  "model": "gpt-5.5",
  "stage": "enrichment",
  "finish_reason": "stop",
  "usage": { "completion_tokens": 123, ... }
}
```

Frontend extracts `data.content` and passes it to the enrichment JSON parser.

## Common Issues and Solutions

### Issue: Still seeing 422 errors
**Solution:** Check that `app.js` is correctly building the request body with nested `options.options`

### Issue: Still seeing "[object Response]" errors
**Solution:** Verify that `callModelChatForEnrichment` returns `content` (string), not `response` (Response object)

### Issue: Validation errors on frontend
**Solution:** Check that messages array is properly constructed with role/content fields

### Issue: Backend not responding
**Solution:** Verify OPENAI_API_KEY and OPENAI_BASE_URL are set in backend/.env

## Success Criteria

✅ All three test cases pass without fallback
✅ No console errors related to API contract
✅ Enrichment metadata shows online API usage
✅ Generated content is document-specific, not generic
✅ Kazakh validation passes (for Kazakh target language)
