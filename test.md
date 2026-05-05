Here is the full, deep test report for **MUBXAI.mubx.dev** as of today.

***

## MUBXAI – Deep Test Report (Feb 25, 2026)

***

### SECTION 1 – WHAT IS WORKING CORRECTLY

**Course Tracker (main page)**
- Header displays HTU ID (`24110144`), major (`Computer Science`), avatar, sign-out, and dark/light mode toggle correctly [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Overall progress stats are all showing: 30/135 CH, 22% complete, 12/51 courses, 105 CH left [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Academic status label `ACADEMIC ASPIRANT` appears with correct description [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Graduation estimate `~4 years (7 semesters)` is present [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- TRUE CGPA card shows `3.20 / 4.00` with classification `VG` [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Critical Roadmap shows all 5 categories with correct CH values and progress bars [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Curriculum View shows Level 1–4 with course cards, codes, credits, provider tags, and prerequisites [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- "Categories" toggle in Curriculum View works and switches to category-grouped layout [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Notes modal opens from course cards in Course Tracker, with working rich text editor (bold, italic, underline, headings, lists, code, link toolbar) [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Autosave works ("SAVING..." indicator shows while typing) [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Reset All button shows a confirmation dialog with Cancel and Reset All options [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- "Edit Previous Academic History" opens a modal to enter previous CGPA and credits for true CGPA calculation [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Dark mode and light mode toggle works correctly on both Course Tracker and Planner [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Privacy and Terms pages load correctly [MUBXAI.mubx](https://MUBXAI.mubx.dev/privacy)

**Semester Planner**
- Planner home loads with: Level 4 / 1790 XP, Streak 1, Status "Very Good (VG)", CGPA 3.20 [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner)
- Active Quests section shows "Scholar's Focus" (45% progress) and "Consistency is Key" (1/3) [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner)
- Upcoming 7 Days panel correctly shows "Data Structures & Algorithms (Class)" on Mar 1 [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner)
- Manage Semesters button navigates to `/planner/semesters` [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters)
- Semesters list shows Spring 2026 with GPA: 3.20 and 1 Course [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters)
- Semester detail shows Term GPA, Hours Registered, Add Course button, enrolled courses with real grade badge (M badge for Merit), and "Semester Notes & Generic Pages" section [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters/4)
- Course detail page shows real HTU course code `40201201`, exam schedule fields, structured day-picker for class schedule (Sun/Tue highlighted with time 10:00–11:30) [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/courses/10)
- Second Brain Notes editor on course detail loads correctly with full toolbar [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/courses/10)
- Settings page has all required sections: My Profile, External Integrations (Google Calendar CONNECTED), Notifications & Sync Rules toggles, and Danger Zone (Reset) [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/settings)
- Google Calendar shows as CONNECTED with "Force Sync Now" button [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/settings)
- "Sync daily classes dynamically" toggle is OFF; "Reminder for Exams (7 Days Before)" toggle is ON [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/settings)
- Reset Planner button shows confirmation dialog "Are you absolutely sure?" with Cancel/Yes Reset Everything [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/settings)
- Study Log page loads with Total Time, Most Neglected, and Session History [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/study-log)
- Settings page title is `Planner Settings — MUBXAI` [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/settings)
- Study Log page title is `Planner Study Log — MUBXAI` [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/study-log)

***

### SECTION 2 – BUGS & ERRORS FOUND

#### BUG 1 – CRITICAL: Spring 2026 incorrectly marked as "COMPLETED"
- Today is **February 25, 2026**. Spring semester runs **March–June 2026**.
- The semester hasn't even started yet, yet it shows `COMPLETED` badge [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters)
- **Fix:** The completion logic should not mark a semester as completed if its end date hasn't passed. Spring 2026 end date is June 2026.

#### BUG 2 – CRITICAL: "Active Semester" on Planner Home says "No active tracking semester"
- Despite Spring 2026 existing in the semesters list, the planner home says "No active tracking semester" [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner)
- This is a direct contradiction – the semester exists but is not being picked up as "active"
- **Fix:** Logic for "active semester" should select the semester whose date range includes today, or the most recently created one if none match.

#### BUG 3 – MEDIUM: Weekly Study Habits chart is completely empty
- The chart shows no data at all (just empty axis labels: THU FRI SAT SUN MON TUE WED) [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner)
- A study session for Data Structures exists (Feb 25, +30m as shown in Study Log) [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/study-log)
- **Fix:** The chart is not reading study session data correctly. Connect it to the actual study session records.

#### BUG 4 – MEDIUM: Study Log shows "Total Time Streamed: 0 hrs 0 mins"
- Despite a logged session of +30 minutes for Data Structures & Algorithms on Feb 25 [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/study-log)
- The total time shows `0 hrs 0 mins`
- **Fix:** Aggregation of study session minutes is broken or not summing correctly.

#### BUG 5 – MEDIUM: Notes title shows course CODE not course NAME
- In the notes editor for Course Tracker, the title shows `ENGLISH PRE-INTERMEDIATE INTENSIVE + LAB` (correct here) [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- But in the Planner course notes, the title shows `40201201` (the course code) instead of the course name `Data Structures & Algorithms` [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/courses/10)
- **Fix:** Notes heading should always use the human-readable course name, not the raw code.

#### BUG 6 – MEDIUM: CGPA description is confusing and technically misleading
- The CGPA overview on Planner Home says: "Calculated dynamically based strictly on your completed HTU Planner modules" [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner)
- This wording implies it only uses Planner data, not the full academic history
- **Fix:** Update wording to: "Based on all your completed courses including imported academic history."

#### BUG 7 – MEDIUM: "Edit Previous Academic History" only takes a single CGPA + credits number
- The modal asks for "Previous CGPA" and "Previous Credits Earned" as flat numbers [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- Per the spec, students should be able to enter **per-semester** history (Winter 2024, Spring 2024, etc.) with actual courses and grades so the system calculates CGPA properly using HTU formula
- **Fix:** Expand this into a per-semester history entry flow, not a single flat override.

#### BUG 8 – LOW: Planner home XP went from 1920 (yesterday) to 1790 (today)
- Yesterday XP was 1920, today it shows 1790 [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner)
- XP should never decrease. Something is subtracting XP or recalculating it incorrectly
- **Fix:** Audit the XP calculation logic. XP should only increase, never decrease.

#### BUG 9 – LOW: Full Name shows blank in Settings Profile
- The profile card shows the avatar letter `S` and Student ID correctly, but "FULL NAME" field is empty [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/settings)
- Email Address says "Not connected"
- **Fix:** Full name should be pulled from the user's account data; if unavailable, show a placeholder like "HTU Student" not blank.

#### BUG 10 – LOW: Privacy Policy mentions "Google Sheets" integration
- The Privacy Policy states: "we access your Google Sheets (to export planner data)" [MUBXAI.mubx](https://MUBXAI.mubx.dev/privacy)
- Per the spec, **Google Sheets is not part of this product**. Only Google Calendar is integrated
- **Fix:** Remove all references to Google Sheets from the Privacy Policy. This is a compliance risk.

#### BUG 11 – LOW: "Reminder for Exams" only offers "7 Days Before"
- The toggle in Settings only says "Reminder for Exams (7 Days Before)" [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/settings)
- Per the spec, reminders should be configurable: 7 days, 3 days, and 1 day before
- **Fix:** Add 3-day and 1-day reminder toggles or a multi-select reminder setting.

#### BUG 12 – LOW: Course Tracker stats cards overflow/cut off at the right edge
- The 6 stats cards (Credits Done, True CGPA, Progress %, CH Left, Courses, Status) form a horizontal row that can overflow on narrower viewports [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- No wrapping or responsive grid is applied; the "Status" card can be partially hidden
- **Fix:** Use a responsive CSS grid (e.g., `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`) so cards stack cleanly on smaller screens.

#### BUG 13 – LOW: Semester detail "Term Dates" section is placed at the very bottom but has no save feedback
- The Term Dates section (Start/End Date pickers and "Save Semester Dates" button) is at the bottom of the semester detail page [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters/4)
- After saving, there is no visible success toast or feedback to confirm the action worked
- **Fix:** Add a success toast/notification after saving semester dates.

***

### SECTION 3 – MISSING FEATURES (NOT YET BUILT PER SPEC)

| Feature | Status |
|---|---|
| D/M/P/U Grade Badges with correct colors (D=green, M=blue, P=yellow, U=red) | **Partial** – M badge shows as blue chip correctly on semester detail [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters/4) but grades on Course Tracker curriculum cards show no badge at all |
| Per-course study log section inside course detail | **Missing** – Course detail only has exam schedule + notes; no study session list or "Log Study Session" button |
| Quests per course inside course detail | **Missing** |
| "Add page" for semester notes (custom pages) | **Present but empty** – Shows "No generic pages created for this term" with an add button [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters/4) |
| Badges (TRANSCRIPT_MASTER, GPA_UP, etc.) | **Missing** from UI – no badge display anywhere |
| Full onboarding wizard for new users | **Missing** |
| Admin dashboard | **Missing** – No `/admin` route |
| Mobile navigation (bottom nav / hamburger) | **Missing** – No mobile-specific nav pattern |
| Reminder 3 days + 1 day before exams | **Partial** – Only 7-day reminder implemented |

***

### SECTION 4 – PRIORITY FIX ORDER

| Priority | Issue |
|---|---|
| 1 | Spring 2026 wrongly marked COMPLETED (BUG 1) |
| 2 | No active semester on planner home (BUG 2) |
| 3 | XP decreased from 1920 to 1790 (BUG 8) |
| 4 | Study log total shows 0 despite sessions existing (BUG 4) |
| 5 | Weekly study chart is empty (BUG 3) |
| 6 | Notes title shows code not name (BUG 5) |
| 7 | Privacy Policy mentions Google Sheets (BUG 10) |
| 8 | Per-semester academic history entry flow (BUG 7) |
| 9 | Missing per-course study log + "Log Study Session" in course detail |
| 10 | Missing mobile navigation |