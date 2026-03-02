# HTU Smart Advisor — Product Requirements Document

## 1. Product Overview

**HTU Smart Advisor** is a Next.js academic advising and course-tracking platform built for Al Hussein Technical University (HTU). It allows students to manage their degree progress, plan future semesters, and synchronize academic deadlines with external calendars.

## 2. Target Audience

- **HTU Students:** Seeking a modern, mobile-friendly way to track their remaining credit hours and plan terms.
- **Admin Staff:** Seeking high-level analytics on student progress, popular courses, and system traffic.

## 3. Core Features

### 3.1 Authentication & Onboarding

- **Credentials Provider:** Students sign up/login using their University ID and a personal password.
- **Account Claiming:** First-time users "claim" their ID. Subsequent sign-ups for the same ID are rejected.
- **Google OAuth:** Support for signing in with Google accounts for ease of access.
- **Major Selection:** On first login, students select their specific major from the 8 supported HTU curriculums.

### 3.2 Student Profile

- **Persistent Profile:** Stores the student's major, name, and profile image.
- **Academic History:** Allows students to input previous cumulative GPA and earned credits to ensure accurate CGPA calculations.

### 3.3 Course Tracker (Transcript View)

- **Interactive Curriculum:** Displays all university, college, and department requirements specific to the chosen major.
- **Progress Toggling:** Students toggle courses as completed. Progress is auto-saved.
- **Prerequisite Engine:** Visual indicators for locked courses based on unmet prerequisites (AND/OR course-code logic + credit-hour thresholds + department approval locks).
- **Elective Caps:** University electives are capped at 3 selections to prevent inaccurate credit counting.
- **Courses Autocomplete:** Global search for any course in the HTU catalog.

### 3.4 Course Notes (Rich Text)

- **Tiptap Editor:** A Notion-style rich-text editor for each course.
- **Features:** Slash commands (/), floating menus, task lists, tables, and bubble menus.
- **Auto-save:** Notes are saved to the database as the student types.

### 3.5 Semester Planner

- **GET /api/planner/summary:** Returns a unified overview: CGPA, classification, active semester, upcoming 7-day events, gamification stats, study trends, and active quests.
- **GET /api/planner/semesters:** Load all semesters for the user.
- **POST /api/planner/semesters:** Create a new semester. Body: `{ name, year, type, start_date?, end_date? }`.
- **PUT /api/planner/semesters/[id]:** Update semester metadata (name, dates).
- **POST /api/planner/courses:** Add course to semester.
- **PUT /api/planner/courses/[id]:** Update course details (grades, exam dates, schedule).
- **POST /api/planner/study-sessions:** Log new study minutes.
- **Features:** Editable course table (grade, midterm/final dates, status), study-log with per-course minute tracking, GPA calculation (HTU scale), smart insights (Neglected Course Alerts, upcoming exams, GPA projection, pro study tips).

### 3.6 Google Calendar Integration

- **POST /api/connect/google/sync:** Pushes midterm, final exams, and weekly class schedules to Google Calendar. Automatically handles timezone (Asia/Amman) and adds reminders.
- **GET /api/connect/google/callback:** OAuth2 callback — exchanges auth code for tokens, saves to DB with account email storage.

### 3.7 (Future Feature)
- Reserved for future Spreadsheet integration.

### 3.8 Admin Dashboard

- **GET /api/admin/stats:** Comprehensive analytics: total students, visitor counts, major distribution, progress distribution, top courses, 30-day traffic, device breakdown, recent activity, activity heatmap, per-student credit-hour data. Auth: `x-admin-secret` header.
- **GET /api/admin/logs:** Returns recent activity log entries. Auth: `x-admin-secret` header.
- Admin pages at `/admin/dashboard` (4 tabs: Overview, Students, Visitors, Logs).

### 3.9 Database Management

- **POST /api/setup:** Initialize (create) all database tables and check connection health. Auth: `x-admin-secret` header.
- **POST /api/reset:** Nuclear reset — drops and re-creates all database tables. Auth: `x-admin-secret` header.

---

## 4. API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/courses` | None | List all courses for autocomplete |
| GET | `/api/profile/[studentId]` | Session | Get student's saved major |
| POST | `/api/profile/[studentId]/save` | Session | Save student's major |
| GET | `/api/progress/[studentId]?major=X` | Session | Get completed courses |
| POST | `/api/progress/[studentId]/save` | Session | Save completed courses |
| GET | `/api/planner/summary` | Session | Load unified hub overview |
| POST | `/api/planner/semesters` | Session | Create a new term |
| PUT | `/api/planner/courses/[id]` | Session | Update course details |
| POST | `/api/connect/google/sync` | Session + OAuth token | Push sync to Google Calendar |
| GET | `/api/connect/google/callback` | OAuth flow | Google OAuth callback |
| GET | `/api/admin/stats` | Admin secret | Get analytics data |
| POST | `/api/setup` | Admin secret | Initialize/Check DB |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth | Auth endpoints |

---

## 5. Data Model

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| **users** | id, student_id (unique), email (unique), password_hash, role | User authentication |
| **student_profile** | student_id (PK), major, previous_gpa, previous_credits | Per-student major and academic history |
| **student_progress** | (student_id, major) PK, completed (JSON), updated_at | Completed courses transcript |
| **semesters** | id (PK), user_id, name, year, type, start_date, end_date | Semester containers |
| **courses** | id (PK), semester_id, code, name, credits, grade, exam_dates | Courses within semesters |
| **study_sessions** | id (PK), user_id, course_id, duration_minutes, date | Logged study time |
| **integration_tokens** | (user_id, provider) unique, access_token, account_email | OAuth tokens |
| **calendar_events** | id, user_id, course_id, google_event_id | Tracked sync status |
| **quests** | id, user_id, type, target_value, current_value | Gamification goals |
| **visitor_logs** | id, student_id, ip_address, browser_info | Analytics tracking |

---

## 6. Business Rules

1. A student can only claim (sign up) a university ID once. Duplicate claims are rejected.
2. Passwords must be at least 6 characters and are hashed with bcrypt (cost factor 10).
3. Profile and progress endpoints enforce that the session user matches the target student ID.
4. Courses with unmet prerequisites cannot be marked as completed.
5. University electives are capped at 3 selections; department elective caps vary by degree type.
6. GPA uses HTU's D (4.0) / M (3.2) / P (2.4) / U (0.0) grading scale.
7. Admin endpoints require `x-admin-secret` header matching the `ADMIN_SECRET` environment variable.
8. The `/api/reset` endpoint drops ALL tables — it is destructive and admin-only.
9. Integration tokens (Google Calendar) are stored per-user and per-provider with auto-refresh logic.
10. Visitor logging captures IP, device info, OS, and browser on each major action.

---

## 7. Non-Functional Requirements

- **Database:** Vercel Postgres (production), with `@vercel/postgres` SDK and Prisma ORM.
- **Authentication:** NextAuth v4 with JWT strategy.
- **Deployment Target:** Vercel.
- **Framework:** Next.js 16 with App Router (Server Components + API Routes).
