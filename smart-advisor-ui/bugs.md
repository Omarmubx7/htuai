I thoroughly tested all the features of HTUAI. Here's the complete bug report:

***

## HTUAI Bug Report

### CRITICAL BUGS

**Bug #1 — Session Loss on Navigation Away from App** [htuai.mubx](https://htuai.mubx.dev/)
- **Severity:** Critical
- **Steps:** Log in → navigate to MUBXBot (bot.mubx.dev) → navigate back to htuai.mubx.dev → user is shown the major selection onboarding page again
- **Impact:** User loses their session every time they visit an external page (MUBXBot) or navigate via browser back/forward. This is extremely disruptive as it forces re-login and major re-selection repeatedly.
- **Location:** Session persistence / authentication token handling

**Bug #2 — Major Dropdown Redirects to Onboarding Instead of Opening a Menu** [htuai.mubx](https://htuai.mubx.dev/)
- **Severity:** High
- **Steps:** On dashboard → click the "Computer Science" major dropdown in the header → user is redirected to the major selection onboarding page
- **Expected:** Should open a dropdown to change/select major while staying on the dashboard
- **Location:** Header major dropdown (`/` route)

**Bug #3 — `/dashboard` Route Returns 404** [htuai.mubx](https://htuai.mubx.dev/dashboard)
- **Severity:** High
- **Steps:** Navigate directly to `https://htuai.mubx.dev/dashboard` → shows "404: This page could not be found" with no navigation options to return
- **Impact:** Users/bookmarks using `/dashboard` will hit a dead end

### HIGH BUGS

**Bug #4 — MUBXBot Professor Selection Logic Loop** [bot.mubx](https://bot.mubx.dev/)
- **Severity:** High
- **Steps:** Ask "what is Omar email" → bot shows 4 professor results → click on a specific professor (e.g., Islam Al Omari) → bot says "Got it. I will answer your email question for Islam Al Omari" → then sends "Islam Al Omari" as a new query → bot responds with "I found 2 professors matching 'what Islam Al Omari'" → creates an infinite loop
- **Expected:** Clicking a professor card should directly show email/contact info, not re-query
- **Location:** bot.mubx.dev — chatbot response handler

**Bug #5 — Student ID / Major Shows "Undecided" in Settings** [htuai.mubx](https://htuai.mubx.dev/planner/settings)
- **Severity:** High
- **Steps:** Dashboard → User Avatar → Profile & Settings → "My Profile" section
- **Issue:** "Student ID / Major" field shows "-  Undecided" even though the user has selected Computer Science
- **Location:** `/planner/settings` — Profile display

**Bug #6 — Credit Hours Mismatch** [htuai.mubx](https://htuai.mubx.dev/)
- **Severity:** Medium
- **Issue:** "Overall Progress" shows "0 / 135 CH" but "CH Left" card shows "144 CH" — these numbers should be consistent
- **Location:** Dashboard stats cards

### MEDIUM BUGS

**Bug #7 — INP (Interaction to Next Paint) Performance Issues** [htuai.mubx](https://htuai.mubx.dev/)
- **Severity:** Medium (Performance)
- **Issue 1:** Theme toggle button (`svg.lucide.lucide-moon`) blocked UI updates for **474.8ms**
- **Issue 2:** Custom cursor element (`circle.custom-cursor-on-hover`) blocked UI updates for **246.5ms**
- **Impact:** Noticeable UI lag when interacting with these elements

**Bug #8 — "Back to Dashboard" Link Non-Functional** [htuai.mubx](https://htuai.mubx.dev/)
- **Severity:** Medium
- **Steps:** Sign out → landing page appears → click "Back to Dashboard" in top right → nothing happens
- **Location:** Landing page (logged-out state)

### LOW / UI BUGS

**Bug #9 — Course Title ALL CAPS in Notes Modal**
- **Severity:** Low
- **Steps:** Click "Notes" on any course card (e.g., Functional Math, English Pre-Intermediate) → modal title shows "FUNCTIONAL MATH" in all caps
- **Expected:** Title should match the course card display (Title Case)

**Bug #10 — Course Code Displayed as Title in Suggest Courses** [htuai.mubx](https://htuai.mubx.dev/)
- **Severity:** Low
- **Issue:** In MUBX AI Advisor → "Suggest Courses", two recommended courses show only their codes as titles: "30303T12" and "20303T20" instead of proper course names
- **Location:** MUBX AI Advisor section

**Bug #11 — Course Card "Info" Icon Has No Action**
- **Severity:** Low
- **Steps:** Click the clock/info icon on any course card → only toggles a visual highlight state, doesn't open a detail view or tooltip
- **Expected:** Should open course details or at minimum show a tooltip

**Bug #12 — MUBXBOT Button Greyed Out in Light Mode**
- **Severity:** Low (Cosmetic)
- **Steps:** Switch to light theme → MUBXBOT button in header appears disabled/greyed out
- **Expected:** Should maintain consistent visibility in both themes

***

### Features That Worked Well
- Course Tracker curriculum (Roadmap & Categories views)
- Notes editor with auto-save (Markdown support)
- Semester Planner setup wizard
- AI-generated weekly study schedule
- Study session logging with XP gamification
- Google OAuth login flow
- Google Calendar OAuth integration
- Course completion toggle with prerequisite chain updates
- Suggest Courses AI feature
- Privacy Policy, Terms, and AI Transparency pages
- Theme toggle (dark/light)
- Reset All confirmation modal
- Semester Planner settings (notifications, exam reminders)

### Summary
**12 bugs found** across the app: 3 Critical, 2 High, 3 Medium, and 4 Low severity. The most critical issues are the session persistence bug (losing login on navigation) and the MUBXBot conversation loop. Fixing the session/auth handling and the bot's professor selection logic should be the top priorities.