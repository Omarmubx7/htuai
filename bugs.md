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





# HTUAI Bug Report — Admin Dashboard & Planner Settings

**Project:** [htuai.mubx](https://htuai.mubx.dev)  
**Date:** 2026-05-03  
**Reporter:** Omar Mubaidin  
**Status:** Open  

## Scope

**Pages audited**  
- [Admin Dashboard](https://htuai.mubx.dev/admin/dashboard)  
- [Planner Settings](https://htuai.mubx.dev/planner/settings)  

## Triage Summary

This report organizes the currently observed issues into admin access, page identity/layout, planner integrations/settings, profile data binding, and counter behavior. The highest-priority problems are the blocked admin authentication flow, misleading or unusable planner actions, incorrect profile mapping, and the newly noted counter malfunction.

## Severity Guide

- 🔴 Critical — blocks core functionality or access
- 🟠 Medium — important functionality is broken, misleading, or incomplete
- 🟡 Low — polish, layout, or contextual consistency issue

---

## 🔴 BUG-001 — Invalid Admin Secret Blocks Access with No Recovery

**Area:** Admin Dashboard  
**Severity:** Critical  
**Status:** Open

### Description
The admin dashboard is stuck behind an authentication gate that shows an admin secret field, an **Unlock** action, and an inline **"Invalid admin secret"** error at the same time. The core admin experience is not reachable from the current session.

### Reproduction Steps
1. Navigate to `/admin/dashboard`
2. Observe the admin secret input field
3. Submit the form
4. Notice the inline **"Invalid admin secret"** state
5. No recovery help, reset guidance, or retry explanation is provided

### Expected Behavior
The page should clearly separate empty, loading, and rejected states. When the secret is invalid, the UI should help the user recover instead of stopping at a dead-end error.

### Suggested Fix
Add explicit UI states for `empty`, `loading`, and `error`. Clear the field after a failed attempt and show helper text such as: `Forgot the secret? Contact your system admin.`

---

## 🟠 BUG-002 — Public App Title Shown on Admin Page

**Area:** Admin Dashboard  
**Severity:** Medium  
**Status:** Open

### Description
The page `<title>` and meta snippet still show the public HTUAI marketing identity instead of an admin-specific page identity. This makes browser tabs, history, and debugging more confusing.

### Reproduction Steps
1. Navigate to `/admin/dashboard`
2. Check the browser tab title and metadata
3. Observe the page still uses the public shell identity

### Expected Behavior
Admin pages should expose a distinct identity such as `Admin — HTUAI`.

### Suggested Fix
Set route-specific metadata for all `/admin/*` pages, for example `Admin Panel | HTUAI`.

---

## 🟡 BUG-003 — Public Footer and Promo Element Visible on Locked Admin Gate

**Area:** Admin Dashboard  
**Severity:** Low  
**Status:** Open

### Description
The locked admin state still shows public footer links like Privacy, Terms, and AI Transparency, plus a **SimplyCodes** close element. This makes the protected state feel mixed into the public marketing shell instead of isolated.

### Reproduction Steps
1. Navigate to `/admin/dashboard` while unauthenticated
2. Scroll through the locked state
3. Observe the public footer and promo-related UI elements

### Expected Behavior
The admin authentication gate should use a clean protected layout with no public footer or promotional elements.

### Suggested Fix
Create a separate minimal layout for `/admin/*` routes that excludes the public footer, nav shell, and promo widgets.

---

## 🔴 BUG-004 — “Connect Sheets” CTA Conflicts With “COMING SOON” State

**Area:** Planner Settings  
**Severity:** High  
**Status:** Open

### Description
Google Sheets is labeled **COMING SOON** but still displays a **Connect Sheets** button. The label says the feature is unavailable while the CTA suggests it is usable.

### Reproduction Steps
1. Navigate to `/planner/settings`
2. Locate the Google Sheets integration row
3. Observe both the **COMING SOON** label and the **Connect Sheets** button
4. Attempt to use the CTA

### Expected Behavior
A coming-soon feature should not expose a live-looking action button unless it is intentionally disabled and explained.

### Suggested Fix
Hide the CTA or render it in a disabled state with explanatory text such as `Available soon`. A better alternative would be a passive CTA like `Notify me` or `Learn more`.

---

## 🟠 BUG-005 — Exam Reminder Dropdown Disabled With No Explanation

**Area:** Planner Settings  
**Severity:** Medium  
**Status:** Open

### Description
The **Reminder for Exams (Before Date)** dropdown is disabled, and the visible options inside it also appear disabled. There is no explanation for why the setting is locked.

### Reproduction Steps
1. Navigate to `/planner/settings`
2. Locate **Reminder for Exams (Before Date)**
3. Attempt to open or change the select field
4. Observe the control is disabled with no helper text

### Expected Behavior
If the control depends on another integration or permission, the user should be told what is required to unlock it.

### Suggested Fix
Show helper text such as `Connect Google Calendar to enable reminders.` If there is no dependency, remove the disabled state and verify the control works normally.

---

## 🟠 BUG-006 — “Sync Daily Classes Dynamically” Toggle Appears Missing or Unrendered

**Area:** Planner Settings  
**Severity:** Medium  
**Status:** Open

### Description
The **Sync daily classes dynamically** setting appears as plain text without a clearly visible switch, checkbox, or active state. This suggests the actual toggle UI may not be rendering.

### Reproduction Steps
1. Navigate to `/planner/settings`
2. Find **Sync daily classes dynamically**
3. Observe the label area closely
4. No obvious interactive control is shown

### Expected Behavior
The setting should render with a visible interactive toggle that shows whether the feature is on or off.

### Suggested Fix
Inspect the toggle component path and verify it is not blocked by missing props, CSS visibility issues, feature flags, or conditional rendering errors.

---

## 🔴 BUG-007 — Student ID Field Displays Full Name Instead of ID

**Area:** Planner Settings — Profile Section  
**Severity:** High  
**Status:** Open

### Description
Under **STUDENT ID / MAJOR**, the displayed value is `omar mubaidin - Computer Science`, which uses the name instead of the actual student ID. This strongly suggests a profile mapping bug.

### Reproduction Steps
1. Navigate to `/planner/settings`
2. Find the **STUDENT ID / MAJOR** profile field
3. Observe the first value is the user name rather than a student ID

### Expected Behavior
The field should show the actual ID and the major, for example `24110213 - Computer Science`.

### Suggested Fix
Audit the binding path and verify `studentId` is populated from the real student identifier source, not from `user.name` or `profile.displayName`.

---

## 🟠 BUG-008 — Account Role Value Missing From Profile Display

**Area:** Planner Settings — Profile Section  
**Severity:** Medium  
**Status:** Open

### Description
The **ACCOUNT ROLE** label appears without a visible value. The role may be missing, failing to render, or hidden by a styling issue.

### Reproduction Steps
1. Navigate to `/planner/settings`
2. Locate **ACCOUNT ROLE**
3. Observe there is no visible role value below or beside it

### Expected Behavior
The page should show the current role such as `Student` or use a fallback like `Role not assigned`.

### Suggested Fix
Check the profile/auth response for the `role` field. If it is null, add a fallback value. If it is missing entirely, include it in the API payload and confirm the UI maps it correctly.

---

## 🟠 BUG-009 — Counter Is Not Working Properly

**Area:** Planner Settings or related interactive UI  
**Severity:** Medium  
**Status:** Open

### Description
The counter is reported as not working properly. Based on the current note, the issue is confirmed at the product level but still needs exact scope definition, because the failing counter behavior, affected component, and expected increment/decrement logic were not yet fully documented.

### Reproduction Steps
1. Navigate to the screen containing the counter
2. Interact with the counter control
3. Observe that the displayed count does not update correctly, updates inconsistently, or fails entirely

### Expected Behavior
The counter should update immediately and reliably according to the user action, with the UI always matching the real internal state.

### Suggested Fix
Verify the counter state binding, event handler wiring, and render updates. Check for stale state, incorrect parsing, disabled handlers, async race conditions, or UI text that is not subscribed to the live value.

### Follow-up Needed
Document the exact location of the counter, its current behavior, the intended behavior, and whether the issue affects incrementing, decrementing, resetting, persistence, or display only.

---

## Bug Summary Table

| ID | Area | Severity | Title |
|---|---|---|---|
| BUG-001 | Admin Dashboard | 🔴 Critical | Invalid admin secret blocks access with no recovery |
| BUG-002 | Admin Dashboard | 🟠 Medium | Public app title shown on admin page |
| BUG-003 | Admin Dashboard | 🟡 Low | Public footer and promo element visible on locked admin gate |
| BUG-004 | Planner Settings | 🔴 High | “Connect Sheets” CTA conflicts with “COMING SOON” |
| BUG-005 | Planner Settings | 🟠 Medium | Exam reminder dropdown disabled with no explanation |
| BUG-006 | Planner Settings | 🟠 Medium | “Sync daily classes dynamically” toggle appears missing or unrendered |
| BUG-007 | Planner Settings — Profile | 🔴 High | Student ID field shows full name instead of ID |
| BUG-008 | Planner Settings — Profile | 🟠 Medium | Account role value missing from profile display |
| BUG-009 | Counter / interactive UI | 🟠 Medium | Counter is not working properly |

## Recommended Fix Order

Start with **BUG-001**, **BUG-004**, **BUG-007**, and **BUG-009** because they affect access, trust, correctness, and expected interactivity. After that, address the disabled/unrendered settings controls, then clean up admin-shell identity and layout consistency issues.
