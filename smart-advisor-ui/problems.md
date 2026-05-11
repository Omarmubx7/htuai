# 🔴 Full Bug Report — MUBXAI (ai.mubx.dev)

***

## 🔴 CRITICAL BUGS (Broken — Must Fix)

***

### BUG #1 — Course Completion Checkboxes Don't Work
**Where:** Course Tracker → Curriculum View (both Roadmap & Categories tabs)
**What happens:** Clicking the circle checkbox on any course card causes a momentary visual glow/pulse on the card, but:
- Progress counter stays at **0 / 135 CH**
- "0% Complete" never updates
- "0 Courses Completed" never updates
- All 5 Critical Roadmap category bars stay at `0 / X`
- The state is **not persisted** — the circle resets immediately

**Console/DevTools error:** No JS error thrown, but the toggle state silently fails to call the API or update state. This is the most critical bug since it makes the entire core feature of the app non-functional.

***

### BUG #3 — "Save History" in True CGPA Modal → Server Error
**Where:** Course Tracker → click ⚙️ icon on "TRUE CGPA" card → "Previous Academic History" modal
**What happens:** Enter valid GPA (e.g. 3.50) and Credits (e.g. 30), click "Save History" → shows "Saving..." → returns:

> **UI Error:** `Server error`

Tested with:
- Single term: GPA 3.50, Credits 30 → ❌ Server error
- Two terms (GPA 3.50 + 0.00 terms) → ❌ Server error
The save endpoint (`POST /api/academic-history` or similar) is completely broken.

***

### BUG #5 — Google Calendar OAuth → `redirect_uri_mismatch`
**Where:** Settings → External Integrations → "Connect Account" button
**What happens:** Redirects to Google OAuth, which immediately fails with:

> **Google Error:** `Error 400: redirect_uri_mismatch`
> **Message:** "Access blocked: This app's request is invalid"
> **OAuth Client ID:** `20007779523-n260m2mq23p45pjj0do6nn049d2erq28.apps.googleusercontent.com`
> **Expected Redirect URI:** `https://ai.mubx.dev/api/connect/google/callback`

**Fix:** In [Google Cloud Console](https://console.cloud.google.com), under OAuth 2.0 → Authorized Redirect URIs, add `https://ai.mubx.dev/api/connect/google/callback`.

***

### BUG #6 — Settings Page API Failures on Load
**Where:** `/planner/settings` — page load
**What happens:** Two error toasts appear immediately on page load:

> **Toast 1:** `Could not load profile settings`
> **Toast 2:** `Could not load integration status`

The settings data fetch endpoints are returning errors. Both API calls for loading profile preferences and integration (Google Calendar) status are failing.

***

### BUG #8 — Semester Planner Page Crashes / Blank
**Where:** `/planner` — navigating to the Semester Planner
**What happens:** Page loads skeletons but immediately throws:

> **UI Error Toast:** `Failed to execute 'json' on 'Response': Unexpected end of JSON input`

**Console/DevTools error:** The server is returning an **empty response body** instead of valid JSON for the planner data endpoint. The page never renders content — stuck in infinite skeleton loader state.

***

### BUG #10 — "SUGGEST COURSES" AI Feature Fails
**Where:** Course Tracker → MUBX AI Advisor section → "SUGGEST COURSES" button
**What happens:** Clicking the button shows a very brief loading state, then renders in the AI Advisor box:

> **UI Error:** `Failed:` *(displayed in red with no further details)*

The Gemini AI course suggestion endpoint is failing silently with no useful error message shown to the user.

***

### BUG #11 — "Create Semester" Wizard Fails to Save
**Where:** Course Tracker → MUBX AI Advisor → "SET UP YOUR SEMESTER" → complete all 5 steps → click "Create Semester"
**What happens:** After going through the full wizard (select semester type → add courses → add exams → add details → finish), clicking "Create Semester" returns:

> **Error Toast:** `Failed to create semester`

The semester creation API endpoint is completely broken.

***

## ⚠️ MODERATE BUGS (UX/Minor Issues)

***

### BUG #2 — GPA Validation Only on Submit (No Inline Feedback)
**Where:** Previous Academic History modal → CUMULATIVE GPA input
**What happens:** User can type `5.00` into the GPA field with **zero visual feedback** until they hit "Save History", at which point they get the error. The input should immediately show an error when leaving the field (on `blur`) or turn red on invalid input. Currently it only validates on submit.

***

### BUG #4 — "Sync Daily Classes" Toggle Can Be Enabled Without Google Calendar
**Where:** Settings → Notifications & Sync Rules → toggle
**What happens:** The toggle can be clicked even though Google Calendar is disconnected. It briefly turns on (teal/enabled state), then auto-resets to off after ~1 second. The toggle should be **disabled/greyed out** with a tooltip ("Connect Google Calendar first") when not connected, not interactive.

***

### BUG #9 — ⓘ Prerequisite Button Does Nothing
**Where:** Course cards that have unmet prerequisites (orange ⓘ icon, e.g. English Intermediate)
**What happens:** Clicking the ⓘ button causes the card to glow/highlight, but **no tooltip, popup, or modal appears** explaining which prerequisite is missing or why the course is locked. The button appears interactive but produces no output.

***

### BUG #12 — Broken Logo Image on Privacy Page
**Where:** `/privacy` — top of the page
**What happens:** The "HTUAI Logo" `<img>` element fails to load and shows the default browser broken image placeholder. The Terms page loads the logo correctly; only the Privacy page has this issue (likely a wrong path or missing file in the `/privacy` route).

***

## ⚡ PERFORMANCE ISSUES

***

### PERF #1 — INP Issue on Dark Mode Toggle
**Element:** `svg.lucide.lucide-moon.w-5.h-5.text-violet-400`
**INP:** **234.5ms** (threshold: 200ms — Poor)
- Input delay: 12.6ms
- Processing: 85.7ms
- Render/Present: 136.2ms
The dark mode toggle is doing too much synchronous work on click — likely recalculating all Tailwind CSS classes for the entire DOM.

***

### PERF #2 — INP Issue on "Reset Planner Now" Button
**Element:** `button.px-6.py-3.bg-red-600/20...`
**INP:** **359.5ms** (threshold: 200ms — Very Poor)
Event handlers on the Reset button are blocking UI updates for 359.5ms, nearly double the "poor" threshold.

***

### PERF #3 — 5 Layout Shifts Detected (Vercel Toolbar)
The Vercel toolbar flagged **5 Cumulative Layout Shifts** across the page. These are likely caused by late-loading content (stat cards, course lists) rendering after the skeleton loaders disappear without reserved space.

***

## ✅ THINGS THAT WORK

| Feature | Status |
|---|---|
| Dark/Light mode toggle | ✅ Works (with INP perf issue) |
| Reset All confirmation dialog | ✅ Works |
| Profile dropdown (Course Tracker, Semester Planner, Sign out) | ✅ Works |
| Course Notes editor (rich text, auto-save, slash commands) | ✅ Works |
| Curriculum View toggle (Roadmap ↔ Categories) | ✅ Works |
| Course search in Semester Setup wizard | ✅ Works |
| Semester Setup Wizard (steps 1–5 UI flow) | ✅ UI works |
| MUBXBOT chat | ✅ Works |
| MUBXBOT quick actions (Copy email, Ask hours, Ask office) | ✅ Works |
| MUBXBOT Feedback form | ✅ Works |
| Privacy page | ✅ Works (broken logo only) |
| Terms of Service page | ✅ Works |
| AI Transparency page | ✅ Works |
| Footer links | ✅ Works |
| MUBXBOT → MUBXAI navigation | ✅ Works |

***

## Summary Table

| # | Bug | Severity | Location |
|---|---|---|---|
| 1 | Course checkboxes don't save/update stats | 🔴 Critical | Course Tracker |
| 3 | Save History → Server error | 🔴 Critical | CGPA modal |
| 5 | Google Calendar OAuth redirect_uri_mismatch | 🔴 Critical | Settings |
| 6 | "Could not load profile/integration settings" | 🔴 Critical | Settings page load |
| 8 | Semester Planner crashes (Unexpected end of JSON) | 🔴 Critical | /planner |
| 10 | SUGGEST COURSES → "Failed:" | 🔴 Critical | AI Advisor |
| 11 | Create Semester → "Failed to create semester" | 🔴 Critical | Semester Setup Wizard |
| 2 | GPA validation only on submit | ⚠️ Moderate | CGPA modal |
| 4 | Sync toggle clickable without Google Calendar | ⚠️ Moderate | Settings |
| 9 | ⓘ prerequisite button does nothing | ⚠️ Moderate | Course cards |
| 12 | Broken logo on Privacy page | ⚠️ Minor | /privacy |
| P1 | INP 234.5ms on dark mode toggle | ⚡ Perf | Navbar |
| P2 | INP 359.5ms on Reset Planner button | ⚡ Perf | Settings |
| P3 | 5 layout shifts detected | ⚡ Perf | Global |

The biggest clue for bugs #3, #6, #8, #10, and #11 is that they all point to **backend API endpoints returning empty or malformed responses** — likely a server crash, missing environment variables (API keys, DB connection), or a deployment issue on the backend. Check your server logs first.