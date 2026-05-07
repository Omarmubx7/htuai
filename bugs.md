## MUBXAI – Full App Bug Report & UX Flaw Analysis

This document groups the discovered issues into phases so the team can fix the app in a sensible order.

## Phase 1 – Critical Stability & Data Integrity

These issues block core flows or create incorrect academic state.[^1]

### 🔴 Bug 1 — Course Detail Page Crash

**Location:** Semester Planner → Any semester → Open a course detail page[^1]

Navigating to a planner course detail page can crash the renderer and leave the screen black with only a spinner visible.[^1]

**Impact:** The course detail feature becomes unusable.[^1]
**Severity:** 🔴 Critical

***

### 🔴 Bug 2 — Notes Feature Infinite Loading

**Location:** Main Course Tracker → Any course → Notes[^1]

The notes panel opens but remains stuck on a loading state indefinitely.[^1]

**Impact:** Notes cannot be viewed or edited.[^1]
**Severity:** 🔴 Critical

***

### 🟠 Bug 3 — Previous Academic History Lacks GPA Validation

**Location:** Main Tracker → TRUE CGPA → Gear icon → Previous Academic History modal[^1]

The modal accepts invalid GPA values above 4.0 or below 0 and gives no feedback when saving fails.[^1]

**Impact:** Users can attempt to save corrupt data without understanding why it failed.[^1]
**Severity:** 🟠 Major

***

### 🟠 Bug 5 — Add Course Form Has No Validation Feedback

**Location:** Semester Planner → View Semester → Add Course[^1]

Submitting the modal with empty required fields keeps it open without any error message.[^1]

**Impact:** Users cannot tell what needs to be fixed.[^1]
**Severity:** 🟠 Major

***

### 🟠 Bug 6 — AI Suggests Already-Enrolled Courses

**Location:** Main Tracker → MUBX AI Advisor → Suggest Courses[^1]

The recommendation engine suggests courses that are already enrolled in the active semester.[^1]

**Impact:** AI suggestions feel wrong and untrustworthy.[^1]
**Severity:** 🟠 Major

***

### 🟡 Bug 8 — CGPA Overview Desync Between Tracker and Planner

**Location:** Semester Planner Dashboard → CGPA Overview[^1]

The planner shows `-.-` even when the tracker already has a real CGPA value.[^1]

**Impact:** Users see inconsistent academic summaries.[^1]
**Severity:** 🟡 Moderate

## What Works Well

The dark/light theme toggle works correctly.
The Reset All confirmation dialog is clear and well-designed.
MUBXBOT query responses work correctly with email lookup and quick actions.
Course category expansion works as expected.
The profile dropdown navigates correctly.
Reset Semester Planner has a strong confirmation flow.
The Add Term flow in the Semester Planner works correctly.

## Issue Summary

| # | Issue | Severity | Area |
| --- | --- | --- | --- |
| 1 | Course detail page black screen crash | Critical | Planner course detail |
| 2 | Notes infinite loading | Critical | Course tracker notes |
| 3 | GPA validation missing in history modal | Major | CGPA history modal |
| 4 | History modal cannot close on backdrop click | Major | CGPA history modal |
| 5 | Add Course form has no validation feedback | Major | Planner add course |
| 6 | AI suggests already-enrolled courses | Major | AI advisor |
| 7 | Notifications dropdown does not close on outside click | Major | Planner notifications |
| 8 | CGPA shows `-.-` in planner | Moderate | Planner dashboard |
| 9 | Persistent floating teal ripple | Moderate | Global |
| 10 | Broken logo image | Moderate | Planner / legal pages |
| 11 | Clicking course card toggles completion accidentally | Moderate | Course tracker |
| 12 | Exam alerts show wrong time | Moderate | Planner notifications |
| 13 | Locked course info icon does nothing | Moderate | Course cards |
| 14 | Grade labels lack explanation | UX flaw | Planner semester view |
| 15 | “Below Minimum” status is unclear | UX flaw | Planner dashboard |
| 16 | Student ID field shows email instead of ID | UX flaw | Profile & settings |
| 17 | Exam tips are raw pipe-separated text | UX flaw | AI advisor |
| 18 | Schedule day names are inconsistent | UX flaw | AI advisor schedule |
| 19 | XP gains are silent | UX flaw | Planner gamification |
| 20 | Prerequisite badges look interactive but do nothing | UX flaw | Course cards |
**Severity:** 🟡 Moderate

***

## Phase 2 – Modal, Navigation, and Interaction UX

This phase improves basic interaction patterns, closing behavior, and accidental state changes.[^1]

### 🟠 Bug 4 — Previous Academic History Modal Cannot Be Closed by Clicking Outside

**Location:** Previous Academic History modal[^1]

Clicking on the background overlay does not dismiss the modal, contrary to common modal behavior.[^1]
There is no close (X) icon, leaving "Cancel" as the only way to exit.[^1]

**Impact:** Users feel trapped in the modal and may think the UI is stuck.[^1]
**Severity:** 🟠 Major

***

### 🟠 Bug 7 — Notifications Dropdown Does Not Close on Outside Click

**Location:** Semester Planner → Bell icon (Academic Alerts)[^1]

After opening the Academic Alerts dropdown, clicks on the main page content do not close it.[^1]
The dropdown remains open until the user clicks elsewhere in the header region.[^1]

**Impact:** Breaks expected dropdown behavior and feels clunky in everyday use.[^1]
**Severity:** 🟠 Major

***

### 🟡 Bug 11 — Accidental Course Completion Toggle

**Location:** Course Tracker → Any course category[^1]

Clicking anywhere on a course card body toggles it to "completed" without a confirmation dialog.[^1]
This easily leads to accidental completions, changing totals (e.g., from 46 CH / 18 courses to 49 CH / 20 courses) with no easy per-course undo other than "Reset All".[^1]

**Impact:** Users can unintentionally corrupt their progress data, with poor recovery options.[^1]
**Severity:** 🟡 Moderate

***

### 🔵 Flaw 7 — No Clear "Back to Dashboard" in Course Tracker

**Location:** Course Tracker → Category views (e.g., University Requirements)[^1]

When viewing a specific category, there is no breadcrumb or visible "Back to Dashboard" control in the header.[^1]
Users must scroll up or rely on the browser back button to navigate, which feels indirect and non-obvious.[^1]

**Impact:** Navigation feels heavier and less intuitive for multi-step workflows.[^1]
**Type:** UX Flaw

***

## Phase 3 – Visual, Branding, and Feedback

This phase targets branding consistency, distracting visuals, and surface-level polish.[^1]

### 🟡 Bug 9 — Persistent Floating Teal Ripple Animation

**Location:** Across ai.mubx.dev and bot.mubx.dev[^1]

After many clicks, a teal/cyan circular blob appears and floats around the screen for several seconds.[^1]
The ripple element seems never removed from the DOM, overlaps UI, and distracts from content.[^1]

**Impact:** Degrades perceived quality and professionalism of the entire product.[^1]
**Severity:** 🟡 Moderate

***

### 🟡 Bug 10 — Broken Logo on Planner and Legal Pages

**Location:** Semester Planner sidebar top-left, Privacy Policy page, Terms of Service page[^1]

The MUBXAI logo fails to load and displays as a broken image icon on multiple views.[^1]
Branding appears incomplete or broken wherever this happens.[^1]

**Impact:** Weakens brand impression and trust, especially on legal pages.[^1]
**Severity:** 🟡 Moderate

***

### 🔵 Flaw 6 — Invisible and Unexplained XP Gains

**Location:** Semester Planner → Level/XP banner[^1]

User level increased from 203 to 204 and XP from 101490 to 101660 (170 XP) during simple navigation.[^1]
There is no notification, no "XP gained" event, and no explanation of which actions earn XP.[^1]

**Impact:** Gamification feels arbitrary and meaningless due to lack of transparency.[^1]
**Type:** UX Flaw

***

### 🔵 Flaw 3 — Student ID Field Mislabeling

**Location:** Settings → Profile \& Preferences → My Profile → "STUDENT ID / MAJOR"[^1]

The field labeled "STUDENT ID / MAJOR" shows the email address (e.g., `omarmubaidincs@gmail.com`) instead of a student ID value.[^1]
This mismatch between label and content is confusing and may make users question data accuracy.[^1]

**Impact:** Undermines confidence in profile correctness and terminology.[^1]
**Type:** UX Flaw

***

### 🔵 Flaw 5 — Weekly Schedule Day Name Inconsistency

**Location:** AI Advisor → Weekly Schedule[^1]

The initial schedule renders full day names such as "Sunday" and "Monday".[^1]
After clicking "BUILD YOUR SCHEDULE," the rebuilt view switches to abbreviations like "Su", "Mo", and "Tu".[^1]

**Impact:** Inconsistent presentation reduces polish and may momentarily confuse users.[^1]
**Type:** UX Flaw

***

### 🔵 Flaw 8 — Prerequisite Badges Look Interactive but Do Nothing

**Location:** Course cards → Prerequisites section (e.g., "NOT HTU_PLACEMENT" badges)[^1]

Prerequisite badges have hover states and visual styling that imply interactivity.[^1]
However, clicking them yields no tooltip, explanation, or navigation to related courses.[^1]

**Impact:** Users expect to learn why a course is locked but receive no information.[^1]
**Type:** UX Flaw

***

## Phase 4 – Academic Logic, Clarity, and Copy

This phase addresses confusing academic messaging, grading schemes, and misinterpreted time data.[^1]

### 🟡 Bug 12 — Exam Notification Times Default to 03:00 AM

**Location:** Semester Planner → Bell icon (Academic Alerts)[^1]

All exam alerts display times like "Jun 3, 03:00 AM" and "Jun 7, 03:00 AM" even though no exam times were set by the user.[^1]
This suggests stored dates at midnight UTC are being auto-converted to 03:00 AM in Jordan (UTC+3) and shown as if they were actual exam times.[^1]

**Impact:** Users see misleading, fabricated exam times and may rely on incorrect information.[^1]
**Severity:** 🟡 Moderate

***

### 🟡 Bug 13 — Non-Functional Info Icon on Locked Courses

**Location:** Course category views → Locked course cards (orange ⓘ icon)[^1]

Clicking the orange ⓘ icon on locked or prerequisite-blocked courses has no effect.[^1]
There is no tooltip, popup, or message describing the lock reason or necessary prerequisites.[^1]

**Impact:** Users cannot understand what is blocking them from enrolling in certain courses.[^1]
**Severity:** 🟡 Moderate

***

### 🔵 Flaw 1 — Cryptic Grade Labels (D, M, P, U)

**Location:** Semester Planner → Semester View → GRADE dropdown[^1]

Grades are shown as D, M, P, U (Distinction, Merit, Pass, Ungraded) with no legend or explanation.[^1]
Selecting D instantly jumps the GPA to 4.00 without making clear that D means "Distinction" and represents the top grade.[^1]

**Impact:** Users unfamiliar with BTEC/HND grading will struggle to interpret their results.[^1]
**Type:** UX Flaw

***

### 🔵 Flaw 2 — "Below Minimum" Status Unexplained

**Location:** Semester Planner Dashboard → STATUS card[^1]

The STATUS banner shows "Below Minimum" while the CGPA in the tracker is 3.20.[^1]
There is no tooltip or indicator of what "minimum" refers to (GPA threshold, credit hours, or other rule).[^1]

**Impact:** Messaging feels alarming and arbitrary with no guidance on how to fix it.[^1]
**Type:** UX Flaw


***

### 🔵 Flaw 4 — Exam Tips Shown as Raw Pipe-Separated Text

**Location:** Main Tracker → MUBX AI Advisor → EXAM TIPS section[^1]

Tips currently appear as unformatted strings like `- Sunday | 40201100 | 3 | Review for midterm`.[^1]
This pipe-separated developer format is not user-friendly and lacks structure like labels or bullets.[^1]

**Impact:** Users must mentally parse raw data instead of reading clear, concise tips.[^1]
**Type:** UX Flaw

***

## Phase 5 – Global Polish and Information Architecture

This phase deals with broader consistency issues and non-blocking improvements.[^1]

### 🔵 Flaw 6 (Reiterated) — XP System Transparency

As mentioned earlier, XP values change silently during simple navigation without any clear triggers.[^1]
To feel rewarding, the system needs explicit feedback, criteria, and possibly a history or "XP earned" feed.[^1]

**Impact:** Gamification risks becoming noise instead of motivation.[^1]
**Type:** UX Flaw

***

### Confirmed Working Features

These flows behaved correctly during testing and can serve as reference for expected quality.[^1]

Dark/Light theme toggle works reliably and applies across the app.[^1]
"Reset All" confirmation dialog in the tracker is clear and strongly warns the user before destructive actions.[^1]
MUBXBOT query responses function correctly with email lookup and quick actions on `bot.mubx.dev`.[^1]
Course category expansion in the tracker (e.g., Critical Roadmap → University Requirements) operates as expected.[^1]
Profile dropdown navigation behaves correctly.[^1]
"Reset Semester Planner" uses a strong confirmation flow before wiping data.[^1]
"Add Term" flow in the Semester Planner works end-to-end without obvious issues.[^1]

***

## Issue Index Table by Phase

| \# | Issue | Type | Severity | Phase | Location |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | Course detail page black screen crash | Bug | 🔴 | 1 | Planner → Course detail |
| 2 | Notes infinite loading spinner | Bug | 🔴 | 1 | Course Tracker → Notes |
| 3 | No GPA validation in history modal | Bug | 🟠 | 1 | CGPA History modal |
| 5 | Add Course form lacks validation feedback | Bug | 🟠 | 1 | Planner → Add Course |
| 6 | AI suggests already-enrolled courses | Bug | 🟠 | 1 | AI Advisor |
| 8 | CGPA shows `-.-` in Planner while Tracker has 3.20 | Bug | 🟡 | 1 | Planner Dashboard |
| 4 | History modal cannot close on outside click | Bug | 🟠 | 2 | CGPA History modal |
| 7 | Notifications dropdown does not close on outside click | Bug | 🟠 | 2 | Planner notifications |
| 11 | Clicking course card marks it complete with no confirmation | Bug | 🟡 | 2 | Course Tracker |
| 9 | Persistent floating teal ripple animation | Bug | 🟡 | 3 | Global |
| 10 | Broken logo image on multiple pages | Bug | 🟡 | 3 | Planner/Privacy/Terms |
| 6f | XP gains silent and unexplained | UX Flaw | — | 3 | Planner gamification |
| 3f | Student ID field shows email instead of ID | UX Flaw | — | 3 | Profile \& Settings |
| 5f | Weekly schedule day name inconsistency | UX Flaw | — | 3 | AI Advisor Schedule |
| 8f | Prerequisite badges clickable but non-functional | UX Flaw | — | 3 | Course cards |
| 12 | Exam alerts show default 03:00 AM times | Bug | 🟡 | 4 | Planner notifications |
| 13 | ⓘ icon on locked courses does nothing | Bug | 🟡 | 4 | Course cards |
| 1f | Grade labels (D/M/P/U) have no explanation | UX Flaw | — | 4 | Planner → Semester view |
| 2f | "Below Minimum" status is unexplained | UX Flaw | — | 4 | Planner Dashboard |
| 4f | Exam tips shown in raw pipe-separated format | UX Flaw | — | 4 | AI Advisor |

