Here’s a single, big, unified text spec that merges:  
- Old Course Tracker description  
- New Planner/GPA/gamification feature  
- Product + Design + Performance  
- Tech stack, DB, APIs, UX, testing, everything  

You can paste this into one `.md` or `.txt` file and give it to your dev.

***

# MUBXAI – COMPLETE SPEC (COURSE TRACKER + NEW PLANNER)

Author: Omar Mubaidin
Date: 2026

***

## 0. PRODUCT OVERVIEW

MUBXAI is a web app for **all HTU students** that helps them understand and manage their academic journey.

It has two main parts:

1. **Course Tracker (existing v1)**  
   - Degree‑level view: shows program requirements, completion, and roadmap.

2. **Semester Planner & GPA (new)**  
   - Per‑semester planning (winter, spring, summer).  
   - GPA per semester and CGPA with HTU grading.  
   - Study log and in‑app notes (Notion‑like, with files).  
   - One‑way Google Calendar sync for classes/exams.  
   - Personal gamification.  
   - Admin dashboard for a single admin.

The goal is to give students:

- A clear view of degree progress (credits, categories).  
- A live planner for current/past semesters.  
- Motivation and structure (XP, streaks, quests).  
- Integration with their calendar so important dates are never missed.

***

## 1. EXISTING APP – COURSE TRACKER (V1)

This section describes what already exists and **must not be broken**.

### 1.1 Product overview (v1)

MUBXAI currently is a degree progress tracker for HTU Computer Science students that centralizes their curriculum, visualizes completion, and helps them understand what to take next to graduate on time. [studentmanager](https://www.studentmanager.app)

**Goals (current):**

- Give students a clear view of their overall degree progress (credits, courses, categories).  
- Help students understand prerequisites and when they can take key courses like training and capstone.  
- Provide a foundation for future features like semester planning and GPA tracking.

**Target users (current):**

- Primary: HTU CS students (all levels).  
- Secondary: Advisors who might use the view to quickly understand a student’s status.

### 1.2 Authentication & identity (v1)

- Display logged-in student HTU ID (e.g., `14741`) and major (e.g., `Computer Science`) in the header.  
- “Sign out” button in main header.

Authentication is simple:

- Username + password, or  
- Sign in with Google.  
No complex SSO/2FA is required for now.

### 1.3 Global degree progress (v1)

On the Course Tracker page, show:

- **Total credit hours:**
  - Completed vs required (e.g., `11 / 135 CH`).  
  - Remaining credit hours (e.g., `124 CH remaining`).

- **Courses completed:**
  - Completed vs total (e.g., `4 / 51`).

- **Overall completion percentage:**
  - e.g., `8%`.

- **Academic status label:**
  - Text like “ACADEMIC ASPIRANT” based on completion percentage, with a short explanation.

- **Time-to-graduation estimate:**
  - e.g., “~4 years (8 semesters)”.

### 1.4 Requirement breakdown (v1)

“Critical Roadmap” section summarizing remaining CH to complete the degree.

Category cards, each showing completed vs total CH:

- University Requirements (e.g., `11 / 24 CH`).  
- University Elective (e.g., `0 / 3 CH`).  
- College Requirements (e.g., `0 / 21 CH`).  
- Department Requirements (e.g., `0 / 78 CH`).  
- Department Elective (e.g., `0 / 9 CH`).

### 1.5 Curriculum view (v1)

“Curriculum View” section with “Browse by academic year” helper text.

- Roadmap‑style layout of full 4‑year CS curriculum, organized by levels:  
  - Level 1, Level 2, Level 3, Level 4.

For each course:

- Course name.  
- Course code.  
- Credit hours.  
- Provider tag (HTU, HNC, HND, UE‑I, UE‑II, UE‑III).  
- Prerequisites: either specific courses, required CH, or “No prerequisites”.

Some advanced courses show visual prerequisite progress:

- Example: HNC Training → “11 / 85 CH” requirement progress.  
- Example: Capstone Project I → “11 / 90 CH” requirement progress.

### 1.6 Interface & layout / footer (v1)

- Header:  
  - Logo “MUBXAI”, subtitle “Course Tracker”, student info, sign-out.

- Global “Reset All” button (intended for local progress reset — detailed behavior TBD).

- Toggle labels for “Roadmap / Categories” view modes (behavior can be expanded later).

- Footer:  
  - Links to Privacy and Terms pages.  
  - Credit line “Made with ❤️ by MUBX” linking to mubx.dev.

### 1.7 Non‑functional (v1)

- Web app, responsive layout (desktop‑first but mobile usable).  
- Production-ready deployment (e.g., Vercel).  
- Fast load for curriculum and summary stats.

***

## 2. NEW MODULE – SEMESTER PLANNER & GPA

This is the main new feature we are specifying.

### 2.1 Audience & scope (new)

- For **all HTU students** (not only CS).  
- Should be designed so that other majors can plug in their curriculum later.  
- Planner & GPA uses existing login.

### 2.2 HTU semesters

Semesters types:

- **Winter**: October – February.  
- **Spring**: March – June.  
- **Summer**: July – September.

Each student can have multiple semester records with type + year.

***

## 3. HTU GRADING & GPA RULES (GLOBAL TRUTH)

Grade mapping (per course):

- `D` – Distinction → `4.0`  
- `M` – Merit → `3.2`  
- `P` – Pass → `2.4`  
- `U` – Unclassified → `0.0` for GPA calculation. [sis.htu.edu](https://sis.htu.edu.jo/pearson/Guides/assessment,%20feedback%20and%20grading%20btec%20hn%20units.pdf)

Cumulative classification:

- `3.6–4.0` → Excellent (EX)  
- `3.2–3.59` → Very Good (VG)  
- `2.8–3.19` → Good  
- `2.4–2.79` → Satisfactory  
- `<2.4` → Unclassified. [wearefreemovers](https://www.wearefreemovers.com/grading-conversion/)

Passing rule:

- Minimum pass per course & cumulative: **2.4 (P)**. [sis.htu.edu](https://sis.htu.edu.jo/pearson/Guides/assessment,%20feedback%20and%20grading%20btec%20hn%20units.pdf)

Formulas:

- For n completed courses with credits \(c_i\) and grade points \(g_i\):

  \[
  \text{GPA} = \frac{\sum_{i=1}^n c_i \cdot g_i}{\sum_{i=1}^n c_i}
  \]

- Semester GPA: use completed courses within a semester.  
- CGPA: use all completed courses.

- Round GPA to 2 decimals.  
- Classification based on CGPA.

No developer may change these rules without a product decision.

***

## 4. DOMAIN MODEL (FULL DATA MODEL)

Entities (for planner & shared features) – as described in your previous answers.

### 4.1 User

- `id` (UUID)  
- `email`  
- `name`  
- `role` (`student` | `admin`)  
- `created_at`, `updated_at`

### 4.2 Semester

- `id`  
- `user_id` → User  
- `type` (`winter` | `spring` | `summer`)  
- `year`  
- `name` (e.g., `Winter 2026`)  
- `start_date`, `end_date`  
- `semester_gpa` (float, nullable)  
- `created_at`, `updated_at`

### 4.3 Course

- `id`  
- `semester_id` → Semester  
- `name`  
- `code`  
  - MUST be real HTU course code, not generated.  
- `credits`  
- `instructor_name` (optional)  
- `location` (optional)  
- `class_schedule` (JSON; days + times)  
- `status` (`planned` | `in_progress` | `completed` | `dropped`)  
- `grade_letter` (`D` | `M` | `P` | `U` | null)  
- `grade_point` (float, nullable)  
- `final_mark` (optional)  
- `is_completed` (bool)  
- `created_at`, `updated_at`

### 4.4 CourseNote

- `id`  
- `course_id` (unique per course)  
- `content` (rich text JSON)  
- `created_at`, `updated_at`

### 4.5 StudySession

- `id`  
- `user_id` → User  
- `course_id` → Course  
- `date`  
- `duration_minutes`  
- `type` (`reading` | `practice` | `project` | `review` | `other`)  
- `notes` (optional)  
- `created_at`

### 4.6 GPAHistory

- `id`  
- `user_id`  
- `semester_id` (optional)  
- `semester_gpa` (optional)  
- `cumulative_gpa`  
- `classification` (`EX` | `VG` | `Good` | `Satisfactory` | `Unclassified`)  
- `created_at`

### 4.7 Integration (Google Calendar)

- `id`  
- `user_id`  
- `type` (`google_calendar`)  
- `access_token` (encrypted)  
- `refresh_token` (optional, encrypted)  
- `expires_at` (optional)  
- `metadata` (JSON; e.g., calendar ID)  
- `created_at`, `updated_at`

### 4.8 CalendarEvent

- `id`  
- `user_id`  
- `course_id` (optional)  
- `type` (`class` | `midterm` | `final` | `assignment_due` | `other`)  
- `google_event_id` (optional)  
- `title`  
- `start_datetime`  
- `end_datetime`  
- `created_at`, `updated_at`

### 4.9 GamificationProfile

- `id`  
- `user_id` (unique)  
- `xp` (int)  
- `level` (int)  
- `current_streak_days` (int)  
- `longest_streak_days` (int)  
- `last_activity_date` (optional)  
- `created_at`, `updated_at`

### 4.10 Badge / UserBadge

**Badge**

- `id`  
- `code` (unique)  
- `name`  
- `description`  
- `icon` (optional)  
- `created_at`

**UserBadge**

- `id`  
- `user_id`  
- `badge_id`  
- `awarded_at`

### 4.11 Quest

- `id`  
- `user_id`  
- `scope` (`course` | `semester` | `global`)  
- `target_course_id` (optional)  
- `target_semester_id` (optional)  
- `type` (`gpa_improvement` | `hours_studied` | `assignments_completed` | `streak` | `other`)  
- `target_value`  
- `current_value` (default 0)  
- `status` (`active` | `completed` | `expired`)  
- `expires_at` (optional)  
- `created_at`, `updated_at`

### 4.12 AdminLog

- `id`  
- `type` (`error` | `sync_event` | `usage_snapshot`)  
- `message`  
- `details` (JSON)  
- `created_at`

***

## 5. FEATURES – NEW MODULE BEHAVIOR

### 5.1 Onboarding

- User logs in (existing login).  
- On first visit to Planner:
  - Short wizard:
    - Step 1: Set current semester (type + year).  
    - Step 2: Optionally add past semesters.  
    - Step 3: Add at least one course to current semester.

Planner does not modify Course Tracker requirements.

### 5.2 Managing semesters and courses

- User can:
  - Add/edit/delete semesters (of allowed types).  
  - Add courses using:
    - Curriculum data (select by code/name), or  
    - Manual entry (must provide real code + name + credits).

- Course code: must always be **real**; no random IDs shown to user.

### 5.3 GPA calculations & views

- When grades are entered:

  - Compute semester GPA for that semester.  
  - Compute CGPA across all completed courses.  
  - Determine classification.  
  - Store snapshots in GPAHistory.

- Views:

  - Planner home:
    - CGPA, classification.  
    - Current semester summary.  
    - Gamification summary.

  - Semester detail:
    - Semester GPA.  
    - CGPA.  
    - Courses list with grade badges.

### 5.4 Notes & semester “second brain”

- Each semester has a “Notes” area:
  - List of pages:
    - Default course pages.
    - Additional user-created pages.

- Each course has a notes document:
  - Rich text (like Notion): headings, lists, checklists, callouts, highlights, inline attachments.  
  - Stored as JSON in CourseNote.

- Behavior:
  - Autosave on edit.  
  - User always edits within MUBXAI; no external Notion.

### 5.5 Study log

- For any course, user can log:

  - Date (default today).  
  - Duration (minutes).  
  - Type.  
  - Short note.

- Planner shows:

  - Total hours per course.  
  - Weekly/monthly charts.  
  - “Most neglected course” (fewest hours, upcoming exam).

### 5.6 Google Calendar integration (one‑way)

- Connect Google button in Settings:
  - Uses Google OAuth (Calendar scope).  
  - Stores tokens in Integration.

- Sync options (user toggles):

  - Sync class schedule:  
    - Create recurring events with `class_schedule` times.  
  - Sync exams:  
    - Create events for midterm/final (once those dates are known).

- Reminders:

  - For exam events, default reminders: 7, 3, 1 days before.

- Updates:

  - If schedule or exam date changes, update existing event using `google_event_id`.  
  - No reading from Calendar → MUBXAI.

### 5.7 Gamification (personal)

- XP rules (example set):

  - Study session: `duration_minutes * 1` XP, up to 100 XP/day.  
  - Course completed: +150 XP.  
  - Semester GPA improved vs previous: +200 XP.  
  - Planner opened on a given day: +10 XP (once per day).

- Level:

  - `level = floor(xp / 500) + 1`.

- Streaks:

  - Study streak:  
    - Count consecutive days with ≥1 study session.  
    - Reset to 0 if no session on a day.  
    - Maintain `current_streak_days` and `longest_streak_days`.

- Quests:

  - Auto‑generated for each course/semester:
    - “Reach P or above in this course.”  
    - “Study 10 hours this week.”  
    - “Raise CGPA by 0.1 this semester.”  
  - Quests track `current_value`; when `>= target_value`, mark `completed`, give XP and badge.

- Badges:

  - Examples:  
    - TRANSCRIPT_MASTER, GPA_UP, CONSISTENT_STUDY_5, COURSE_RESCUE.

No leaderboards or social comparison in v1.

### 5.8 Admin dashboard

- One admin user (identified by email or role).

Admin can:

- See overview:

  - # of users.  
  - Daily/weekly active.  
  - Average CGPA.  
  - Average study hours.

- See logs:

  - Errors from Google Calendar.  
  - Other system errors.

Admin has full privileges; no separate roles.

### 5.9 Reset

- In settings, “Reset my planner”:

  - Shows warning: “This will delete all your planner data (semesters, courses, notes, study sessions, gamification). This cannot be undone.”  
  - On confirm:
    - Delete all planner‑related data for user.  
  - Keep:
    - User account.  
    - Course Tracker degree data.

***

## 6. DESIGN – UI/UX

### 6.1 Design principles

- Mobile‑first:
  - Design for mobile (320–430px) first.  
  - Desktop is enhanced layout, not separate product. [developers.google](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing)

- Simplicity:
  - Separate flows into multiple screens on mobile (not one super‑long page).  
  - Show most important information first (GPA, CGPA, current semester).

- Eye‑friendly:
  - Good contrast.  
  - Balanced whitespace.  
  - Limited, consistent color palette.

### 6.2 Screens (mobile)

1. Planner Home:
   - CGPA + classification.  
   - Current semester card.  
   - XP + streak.  
   - Short list of active quests.  

2. Semesters List:
   - List of all semesters (name, GPA).  
   - Add semester button.

3. Semester Detail:
   - Header: name, type, year, GPA + CGPA.  
   - List of course cards:
     - Name, code, credits.  
     - Grade badge, total hours.  
   - Button: “Semester notes”.

4. Course Detail:
   - Header: course name, code, credits, grade badge.  
   - Main content: rich notes editor.  
   - Below/other tab: study log and quests.

5. Semester Notes:
   - List of pages:
     - One per course.  
     - “Add page”.  
   - Selecting a page → rich editor.

6. Settings:
   - Account info (read-only).  
   - Google integration:
     - Connect/disconnect.  
     - Toggles for classes & exams.  
   - Reset planner button + confirmation.

7. Admin:
   - Cards for metrics.  
   - Table/list of logs.

Desktop shows more at once (e.g., left column: stats; right: list; bottom: gamification), but same content.

### 6.3 Components

- GradeBadge:
  - Single letter: D/M/P/U.  
  - Colors: D=green, M=blue, P=yellow, U=red.

- XPBar:
  - Level and XP progress.

- StreakIndicator:
  - Current streak and longest streak.

- QuestCard:
  - Name, progress bar, reward.

- BadgeChip:
  - Small icon + badge name.

- RichTextEditor:
  - Wraps Lexical/Tiptap.

***

## 7. TECH STACK & IMPLEMENTATION

### 7.1 Stack

- Frontend:
  - Next.js 14, React 18, TypeScript.  
  - Tailwind CSS.  
  - React Query.  
  - react-hook-form.  
  - Lexical (or Tiptap) for notes. [nextnative](https://nextnative.dev/blog/mobile-app-ui-design-best-practices)

- Backend:
  - Node.js 20.  
  - NestJS (or Express with modular structure).  
  - TypeScript.

- Database:
  - PostgreSQL 15+.  
  - Prisma ORM.

- External:
  - Google Calendar API (v3) via `googleapis` library. [apix-drive](https://apix-drive.com/en/blog/other/google-calendar-integration-api)

### 7.2 API endpoints (examples)

Planner:

- `GET /api/planner/summary`  
- `GET /api/planner/semesters`  
- `POST /api/planner/semesters`  
- `GET /api/planner/semesters/:id`  
- `POST /api/planner/semesters/:id/courses`  
- `PATCH /api/courses/:id`  
- `GET /api/courses/:id/notes`  
- `PUT /api/courses/:id/notes`  
- `POST /api/study-sessions`  
- `GET /api/study-sessions?semesterId=...`  

Gamification:

- `GET /api/gamification/profile`  
- `GET /api/gamification/quests`  

Integration:

- `POST /api/integrations/google/connect`  
- `GET /api/integrations/google/callback`  
- `POST /api/integrations/google/sync`  

Reset:

- `POST /api/planner/reset`  

Admin:

- `GET /api/admin/overview`  
- `GET /api/admin/logs`

All require auth except the Google OAuth callback.

***

## 8. PERFORMANCE, RESPONSIVENESS, SEO, TESTING

### 8.1 Performance

Targets:

- Mobile FMP < 2s over 4G.  
- Planner summary API < 300 ms for typical use. [webflow](https://webflow.com/blog/mobile-first-design)

Optimizations:

- Code splitting per route in Next.js.  
- Lazy load rich editor & admin charts.  
- Cache curriculum/degree data.  
- Index DB on `user_id`, `semester_id`, `course_id`.

### 8.2 Responsiveness

- Breakpoints:
  - Mobile: default (<768px).  
  - Tablet: `md` (≥768px).  
  - Desktop: `lg` (≥1024px).

- Mobile: single column, separate screens.  
- Desktop: multi‑column, more info visible.

### 8.3 SEO / GEO / AEO / Analytics

SEO (for public pages):

- Semantic HTML and meta tags.  
- Mobile‑friendly layout. [developers.google](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=en)

GEO:

- Default timezone: `Asia/Amman`.  
- All dates/times shown accordingly.

AEO:

- If/when you publish public FAQ or docs, use clear headings and Q&A sections; optionally use FAQ schema later. [scribe](https://scribe.com/library/software-documentation)

Analytics:

- Track views/events for planner, but don’t log raw grades or personal identifiers.

### 8.4 Testing

- Unit tests:
  - GPA functions & classification.  
  - Gamification XP/streak/quest logic. [geeksforgeeks](https://www.geeksforgeeks.org/software-testing/testing-documentation-software-engineering/)

- Integration tests:
  - Add semester → add courses → grades → check GPAs.  
  - Study log → XP & streak.  
  - Google Calendar sync (mock API).

- UI tests:
  - Mobile flows (onboarding, course notes, logging study, connecting Google).  
  - Desktop layout sanity.

***

## 9. HARD RULES FOR DEV

1. Do **not** change existing Course Tracker degree logic without explicit approval.  
2. Course codes must always be **real HTU codes**, never generated.  
3. All GPA logic must use the HTU rules module; don’t re‑implement in UI.  
4. Notes are stored and edited **inside MUBXAI** only; no Notion.  
5. Google Calendar is one‑way (MUBXAI → Google).  
6. Gamification is personal only (no leaderboards).  
7. Mobile UX uses separate screens, not one giant view.  

This single document is the full reference. All implementation decisions must align with it.