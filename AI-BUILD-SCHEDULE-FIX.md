# AI Build Schedule Feature - Error Handling Improvements

## Issue Summary
The "Build Your Schedule" feature was failing with empty/unclear error messages, leaving users confused with vague feedback instead of actionable information.

## Root Causes Identified

### 1. Silent Errors with Empty Messages
- API would return a 503 status with an empty or undefined `details` field
- Client would show "empty message" toast without meaningful context
- Groq API failures were not logged with enough detail for debugging

### 2. Missing Error Message Validation
- No checks to ensure error messages weren't empty/null before showing them
- No JSON parse error handling for malformed API responses
- Rate limiting (429) responses weren't handled specially

### 3. Poor Error Context
- Stack traces weren't being logged on the server
- Client errors didn't include request context (course count, semester ID, etc.)

## Changes Made

### Server-Side: `/app/api/ai/generate-schedule/route.ts`

#### 1. **Enhanced Error Logging** (Line 172-200)
```typescript
// Now includes stack traces and full context
console.error("[AI] Schedule generation provider failed:", {
    error: errorMessage,
    major,
    coursesCount: courses.length,
    weeklyHours,
    timestamp: new Date().toISOString(),
    stack: error instanceof Error ? error.stack : undefined  // NEW
});
```

#### 2. **Meaningful User Messages** (Line 197-204)
```typescript
// Intelligent message based on error type
const userMessage = errorMessage.includes('API') || errorMessage.includes('rate') 
    ? "AI service rate limited. Using standard schedule instead."
    : "AI service temporarily unavailable. Using standard schedule instead.";

return NextResponse.json({
    error: "AI schedule generation failed",
    details: userMessage,  // Never empty
    fallback: buildFallbackStudySchedule(courses, weeklyHours)
}, { status: 503 });
```

#### 3. **Fallback Error Message** (Line 252)
```typescript
// Prevents empty "details" field in outer catch block
return NextResponse.json({ 
    error: "Failed to generate schedule",
    details: errorMessage || "An unexpected error occurred. Please try again."
}, { status: 500 });
```

### Client-Side: `/components/PlannerHomeClient.tsx`

#### 1. **JSON Parse Error Handling** (Line 337-342)
```typescript
let data: any = {};
try {
    data = await res.json();
} catch (parseErr) {
    console.error("Failed to parse API response:", parseErr);
    throw new Error("Server returned invalid response. Please try again.");
}
```

#### 2. **Rate Limit Detection** (Line 349-351)
```typescript
// Special handling for 429 rate limiting
if (res.status === 429) {
    throw new Error(data.details || "Daily AI limit reached. You can use AI 2 times per 24 hours.");
}
```

#### 3. **Safe Error Message Extraction** (Line 355-358)
```typescript
// Prevent empty strings with .trim() + fallback
const errorMsg = (data.details?.trim?.() || data.error?.trim?.() || `Server error (${res.status})`).trim();
throw new Error(errorMsg || "Failed to generate schedule");
```

#### 4. **Better Request Logging** (Line 366-371)
```typescript
// Include context for debugging
console.error("Schedule generation error:", {
    error: errorMsg,
    semesterId: activeSemester?.id,
    courseCount: activeSemester?.courses.length,  // NEW
});
```

#### 5. **Always Show Error Message** (Line 372)
```typescript
// Fallback if somehow errorMsg is still empty
toast(errorMsg || "Failed to generate schedule. Please try again.", "error");
```

## Testing Instructions

### Test Case 1: Successful Generation
1. Create a semester with 2-3 courses
2. Click "Build your schedule"
3. **Expected:** Success message with generated schedule displayed

### Test Case 2: API Failure (Simulate with Network Tab)
1. Open DevTools → Network tab
2. Add a course → Click "Build your schedule"
3. Intercept the request and respond with 503 + empty details
4. **Expected:** Clear error message, fallback schedule offered

### Test Case 3: Rate Limiting
1. Generate 2 schedules in 24 hours (uses daily quota)
2. Try to generate 3rd schedule
3. **Expected:** "Daily AI limit reached..." message

### Test Case 4: Parse Error
1. Mock API to return `{error: "test"}`  (no `details` field)
2. Click "Build your schedule"
3. **Expected:** Error message shown (no empty toast)

## Files Modified

| File | Changes |
|------|---------|
| `app/api/ai/generate-schedule/route.ts` | +3 improvements: stack traces, user messages, fallback errors |
| `components/PlannerHomeClient.tsx` | +5 improvements: parse handling, rate limits, safe extraction, context logging |

## Deployment Notes

- ✅ No breaking changes to API contracts
- ✅ Backward compatible with existing frontend
- ✅ Improves error visibility for all endpoints
- ✅ No new dependencies added
- ✅ Ready for immediate deployment

## Post-Deployment Monitoring

Monitor these server logs:
```
[AI] Schedule generation provider failed:
[AI] Failed to persist schedule to DB
generate-schedule error
```

And browser console for:
```
Schedule generation error:
Failed to parse API response:
```

## Future Enhancements

1. **Groq Prompt Improvement:** Make AI response parsing more robust
   - Currently expects strict `W:|day|code|hours|focus` format
   - Could accept JSON response directly
   - Would eliminate parsing failures

2. **Exponential Backoff Retry:** Auto-retry on 503 with backoff
   - First retry: 2s delay
   - Second retry: 5s delay
   - Third retry: 10s delay

3. **Progress Indication:** Show fallback schedule immediately while AI generates
   - "Generating optimized schedule..." with loading state
   - Fall back to standard schedule while processing
   - Update with AI version when ready

---

**Date:** May 10, 2026  
**Status:** ✅ Ready for Testing
