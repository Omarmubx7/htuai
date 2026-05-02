# HTUAI Bug Report

> **Generated:** 2026-05-02  
> **Scope:** Source code analysis of `smart-advisor-ui/` and supporting libraries

---

## 🔴 Critical Bugs

### 1. Student ID Resolution Fails for Leading Zeros ✅ SOLVED
- **File:** `smart-advisor-ui/lib/database.ts:60-61`
- **Description:** `resolveUserByString()` parses student IDs with `Number.parseInt()`. IDs like `"001234"` become `1234`. The subsequent database lookup uses the original string, but the numeric comparison may cause issues with ID matching in certain flows.
- **Impact:** Students with leading zeros in their IDs may not be found in some lookup paths.
- **Fix:** Avoid parsing student IDs as numbers; treat them as strings consistently.

```typescript
// Current (problematic):
const numId = Number.parseInt(identity, 10);
if (!Number.isNaN(numId) && String(numId) === identity) { ... }

// Suggested:
// Remove numeric parsing for student IDs; only parse if ID is explicitly numeric-only
```

---

### 2. Groq Client May Receive Undefined API Key ✅ SOLVED
- **File:** `smart-advisor-ui/lib/groq.ts:43-50`
- **Description:** `getGroqClient()` checks if `apiKey` is falsy, then calls `requireEnv("GROQ_API_TOKEN")` which throws, but the function continues execution and passes `undefined` to `new Groq({ apiKey })`.
- **Impact:** Runtime error when GROQ_API_TOKEN is missing; error message may be unclear.
- **Fix:** Return early or re-throw after `requireEnv` throws.

```typescript
// Current:
if (!apiKey) {
    requireEnv("GROQ_API_TOKEN"); // throws but doesn't stop execution
}
return new Groq({ apiKey }); // apiKey still undefined

// Suggested:
if (!apiKey) {
    throw new Error("Missing GROQ_API_TOKEN environment variable");
}
return new Groq({ apiKey });
```

---

### 3. Buffer Not Available in Next.js Edge Runtime ✅ SOLVED
- **File:** `smart-advisor-ui/middleware.ts:4-7`
- **Description:** `generateNonce()` uses `Buffer.from()` which is not available in Next.js Edge Runtime (middleware runs in edge).
- **Impact:** Middleware will crash in production if deployed to Vercel Edge or similar environments.
- **Fix:** Use Web Crypto API or base64 encoding that works in edge runtime.

```typescript
// Current:
const bytes = new Uint8Array(16);
crypto.getRandomValues(bytes);
return Buffer.from(bytes).toString("base64"); // Buffer undefined in edge

// Suggested:
const bytes = new Uint8Array(16);
crypto.getRandomValues(bytes);
return btoa(String.fromCharCode(...bytes));
```

---

### 4. Session Callback Incorrectly Uses name as Student ID ✅ SOLVED
- **File:** `smart-advisor-ui/auth.ts:124`
- **Description:** In the `session` callback, the code tries `getUserByStudentId(session.user.name || "")`. However, `session.user.name` may contain the user's display name, not their student ID.
- **Impact:** Student ID lookup may fail; `db_id` and `student_id` may not be set correctly in session.
- **Fix:** Use `session.user.email` or the `token.student_id` from JWT instead.

```typescript
// Current:
const dbUser = await getUserByEmail(session.user.email || "") || await getUserByStudentId(session.user.name || "");

// Suggested:
const dbUser = await getUserByEmail(session.user.email || "");
// If not found by email, try student_id from token
if (!dbUser && token.student_id) {
    const dbUserByStudentId = await getUserByStudentId(token.student_id);
    // ...
}
```

---

### 5. saveProgress Uses Stale student_id in Update ✅ SOLVED
- **File:** `smart-advisor-ui/lib/database.ts:186-199`
- **Description:** When updating existing progress, the code sets `student_id: studentId` in the update payload, but the WHERE clause uses `existing.student_id` which may differ from the new `studentId` parameter if the user's ID changed.
- **Impact:** Update may fail or update wrong record if student_id changed.
- **Fix:** Use the unique `id` or `user_id` for the WHERE clause instead of the composite key with potentially stale data.

```typescript
// Current:
await prisma.studentProgress.update({
    where: { 
        student_id_major: { 
            student_id: existing.student_id, // may be stale
            major: existing.major 
        } 
    },
    data: { ..., student_id: studentId } // updates to new ID
});

// Suggested:
await prisma.studentProgress.update({
    where: { id: existing.id }, // use primary key
    data: { completed: jsonStr, updated_at: time, student_id: studentId }
});
```

---

## 🟡 Medium Bugs

### 6. calculateCGPA Incorrectly Treats GPA of 0 as Missing ✅ SOLVED
- **File:** `smart-advisor-ui/lib/grading.ts:84-87`
- **Description:** The condition `if (history?.gpa !== null && history?.gpa !== undefined && history?.credits)` treats `gpa: 0` as valid, but the `credits` check may fail if credits is `0` (falsy). Also, the condition structure is confusing.
- **Impact:** Historical GPA with value `0` may not be included in CGPA calculation.
- **Fix:** Use explicit null/undefined checks.

```typescript
// Current:
if (history?.gpa !== null && history?.gpa !== undefined && history?.credits) {
    // credits being 0 is falsy, so this block won't run
}

// Suggested:
if (history?.gpa != null && history?.credits != null) {
    totalQualityPoints += (history.gpa * history.credits);
    totalCredits += history.credits;
}
```

---

### 7. Prerequisite Check Locks Courses Not in Curriculum ✅ SOLVED
- **File:** `smart-advisor-ui/lib/advisor.ts:106-111`
- **Description:** In `evaluateLogic()`, if a course code is NOT in `allCourseCodes`, the function returns `isLocked: true`. This seems incorrect—if a course isn't in the curriculum, it shouldn't necessarily be locked due to prerequisites.
- **Impact:** Courses with codes not in the curriculum may incorrectly show as locked.
- **Fix:** Re-evaluate the logic for handling unknown course codes.

```typescript
// Current:
if (allCourseCodes.size === 0 || allCourseCodes.has(code) || code === 'HTU_PLACEMENT') {
    if (completed.has(code)) return { isLocked: false, missing: [] };
    return { isLocked: true, missing: [code] };
}
return { isLocked: true, missing: [code] }; // Always locked if not in curriculum

// Suggested: If not in curriculum, treat as satisfied (external course)
```

---

### 8. Rate Limit Cleanup Interval Never Cleared ✅ SOLVED
- **File:** `smart-advisor-ui/lib/rate-limit.ts:9-16`
- **Description:** `setInterval()` is called at module load time and never cleared. In a serverless environment, this can lead to multiple intervals running.
- **Impact:** Memory leaks; multiple cleanup intervals running in serverless functions.
- **Fix:** Store the interval ID and clear it on module cleanup, or use a more robust cleanup mechanism.

```typescript
// Current:
setInterval(() => { ... }, 5 * 60 * 1000); // never cleared

// Suggested:
const cleanupInterval = setInterval(() => { ... }, 5 * 60 * 1000);
// In a cleanup function:
// clearInterval(cleanupInterval);
```

---

### 9. ALLOWED_HOSTS Doesn't Handle Ports in x-forwarded-host ✅ SOLVED
- **File:** `smart-advisor-ui/lib/env.ts:34`
- **Description:** The `ALLOWED_HOSTS` check compares `forwardedHost` directly against the allowed list, but `x-forwarded-host` may include a port (e.g., `localhost:3000`), while the allowed list might not include the port.
- **Impact:** Valid requests from allowed hosts with ports may be rejected.
- **Fix:** Normalize the host or extract hostname without port.

```typescript
// Current:
if (ALLOWED_HOSTS.includes(forwardedHost)) { ... }

// Suggested:
const hostname = forwardedHost.split(':')[0];
if (ALLOWED_HOSTS.some(h => h.split(':')[0] === hostname)) { ... }
```

---

## 🟢 Minor Bugs

### 10. StorageEvent Constructor May Not Exist ✅ SOLVED
- **File:** `smart-advisor-ui/lib/safe-storage.ts:82-83`
- **Description:** `new StorageEvent('storage', ...)` may not be available in all environments (e.g., React Native, older browsers).
- **Impact:** Error thrown when trying to dispatch storage events.
- **Fix:** Check if `StorageEvent` exists before using it.

```typescript
// Suggested:
try {
    if (typeof StorageEvent !== 'undefined') {
        const event = new StorageEvent('storage', { key, newValue: value, ... });
        window.dispatchEvent(event);
    }
} catch (_e) { /* ignore */ }
```

---

### 11. Enum Validation Uses Strict Equality ✅ SOLVED
- **File:** `smart-advisor-ui/lib/validation.ts:71`
- **Description:** `rules.enum.includes(value)` uses strict equality. If the enum values are of different types (e.g., string vs number), the check may fail.
- **Impact:** False validation errors for type mismatches.
- **Fix:** Consider type coercion or explicit type checking.

---

### 12. Fetch Retry Has No Timeout ✅ SOLVED
- **File:** `smart-advisor-ui/lib/fetch-retry.ts:20-87`
- **Description:** The `fetchWithRetry` function doesn't set a timeout for the fetch request. A hanging request could block indefinitely.
- **Impact:** Requests may hang forever if the server doesn't respond.
- **Fix:** Add an `AbortController` with a timeout.

```typescript
// Suggested:
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    // ...
} finally {
    clearTimeout(timeoutId);
}
```

---

### 13. Non-Null Assertion on Quest current_value ✅ SOLVED
- **File:** `smart-advisor-ui/lib/gamification.ts:112`
- **Description:** `quest.current_value!` uses a non-null assertion, assuming `current_value` is always defined. However, the Prisma schema may allow `null`.
- **Impact:** Runtime error if `current_value` is `null`.
- **Fix:** Add a null check or provide a default value.

```typescript
// Current:
const newProgress = Math.min(quest.current_value! + newMinutes, quest.target_value);

// Suggested:
const currentValue = quest.current_value ?? 0;
const newProgress = Math.min(currentValue + newMinutes, quest.target_value);
```

---

### 14. Deep Clone Loses undefined Values ✅ SOLVED
- **File:** `smart-advisor-ui/lib/ai-logger.ts:42`
- **Description:** `JSON.parse(JSON.stringify(data.metadata))` is used for deep cloning, but `JSON.stringify()` drops `undefined` values.
- **Impact:** Metadata with `undefined` values will lose those values during logging.
- **Fix:** Use a proper deep clone utility or handle `undefined` explicitly.

```typescript
// Current:
metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : {},

// Suggested (if undefined handling matters):
metadata: data.metadata ? structuredClone(data.metadata) : {},
```

---

## Summary

| Severity | Count | Solved |
|----------|-------|--------|
| 🔴 Critical | 5 | ✅ 5 |
| 🟡 Medium | 4 | ✅ 4 |
| 🟢 Minor | 5 | ✅ 5 |
| **Total** | **14** | **✅ 14** |

---

## Action Plan - COMPLETED ✅

All 14 identified bugs have been fixed:

1. ✅ **Bug #1** - Student ID Resolution (database.ts)
2. ✅ **Bug #2** - Groq Client API Key (groq.ts)
3. ✅ **Bug #3** - Buffer in Edge Runtime (middleware.ts)
4. ✅ **Bug #4** - Session Callback Student ID (auth.ts)
5. ✅ **Bug #5** - saveProgress Stale ID (database.ts)
6. ✅ **Bug #6** - calculateCGPA GPA=0 (grading.ts)
7. ✅ **Bug #7** - Prerequisite Check (advisor.ts)
8. ✅ **Bug #8** - Rate Limit Cleanup (rate-limit.ts)
9. ✅ **Bug #9** - ALLOWED_HOSTS Port Handling (env.ts)
10. ✅ **Bug #10** - StorageEvent Constructor (safe-storage.ts)
11. ✅ **Bug #11** - Enum Validation (validation.ts)
12. ✅ **Bug #12** - Fetch Retry Timeout (fetch-retry.ts)
13. ✅ **Bug #13** - Quest current_value (gamification.ts)
14. ✅ **Bug #14** - Deep Clone undefined (ai-logger.ts)
