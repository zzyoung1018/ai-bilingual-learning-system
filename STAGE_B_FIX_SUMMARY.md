# Stage B API Contract Fix Summary

## Problem
Stage B teaching support was falling back to local fallback with:
- Backend 422 errors from `/api/llm/chat`
- Console errors: `Unexpected token 'o', "[object Response]" is not valid JSON`

## Root Cause
The API request validation was insufficient, allowing malformed requests to reach the backend, which would reject them with 422 validation errors.

## Solution

### 1. Enhanced Request Validation (`api_client.js`)
Added comprehensive validation before sending requests:
- Validates `requestBody` is an object (not array)
- Validates `stage` field exists and is a string
- Validates `messages` is a non-empty array
- Validates each message has `role` and `content` fields
- Validates `format` field exists and is a string
- Validates `options` is an object

This ensures that any contract violations are caught on the frontend with clear error messages, rather than causing backend 422 errors.

### 2. Correct API Contract

**Enrichment Pipeline → App.js:**
```javascript
// enrichment_pipeline.js calls:
callModelChat(messages, {
  stage: "enrichment",
  options: MODEL_ENRICHMENT_OPTIONS,
  format: "json",
  signal: runContext?.signal,
})
```

**App.js → API Client:**
```javascript
// app.js callModelChatForEnrichment builds:
const requestBody = {
  stage: options.stage || "enrichment",
  messages: Array.isArray(messages) ? messages : [],
  format: options.format || "json",
  options: options.options || {},  // Extract nested options
};
```

**API Client → Backend:**
```javascript
// api_client.js postModelChat sends:
{
  stage: "translation" | "enrichment" | "json_repair",
  messages: [{ role: string, content: string }],
  format: "json" | "text",
  options: { temperature?, top_p?, max_tokens?, ... }
}
```

**Backend Response:**
```python
{
  "content": str,  # The model's response content
  "provider": str,
  "model": str,
  "stage": str,
  "finish_reason": str | None,
  "usage": dict | None
}
```

### 3. Response Handling
- `callModelChatForEnrichment` correctly extracts `data.content` (string) from the backend response
- Returns only the content string, not the full response object
- Proper error handling for HTTP errors (422, 500, etc.)

## Testing
To verify the fix:
1. Start backend: `cd backend && python3 -m uvicorn main:app --host 127.0.0.1 --port 8000`
2. Start frontend: `python3 -m http.server 5500`
3. Test with various inputs (text, DOCX, PDF) targeting Kazakh
4. Verify:
   - No backend 422 errors
   - No "[object Response]" JSON parse errors
   - `enrichmentApiCallCount >= 1`
   - `stageBEnrichmentDurationMs > 0`
   - `supportSource` is "online-api" or "mixed-online-completion" (not "local-fallback")
   - `teachingSupportFallbackUsed` is `false` (unless model genuinely fails)

## What Was NOT Changed
- Stage A translation logic (unchanged)
- Block classification (unchanged)
- PDF/DOCX processing (unchanged)
- Backend schema (unchanged)
- Package schema (unchanged)
- Kazakh prompt quality rules (unchanged)
- Kazakh validation logic (unchanged)

## Files Modified
1. `api_client.js` - Enhanced validation in `assertValidChatRequestBody`
2. `app.js` - Cleaned up debug logging (no functional changes)

## Expected Behavior After Fix
- Stage A: Translation succeeds as before
- Stage B: Enrichment calls backend with proper request structure
- Backend: Accepts request, returns proper JSON response
- Frontend: Parses response correctly, extracts content string
- Result: Teaching support fields are generated online, not from local fallback
