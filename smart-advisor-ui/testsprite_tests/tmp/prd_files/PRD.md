# HTU Smart Advisor — Product Requirements Document

## 1. Product Overview

**HTU Smart Advisor** is a Next.js academic advising and course-tracking platform built for Al Hussein Technical University (HTU). It allows students to track their degree progress across 8 majors, plan semesters, calculate GPA, and integrate with Google Calendar and Notion. It includes an admin analytics dashboard.

**Tech Stack:** Next.js 16 (App Router), NextAuth 4, Vercel Postgres, bcryptjs, TypeScript, Tailwind CSS, Framer Motion.

---

## 2. User Roles

| Role | Description |
|------|-------------|
| **Student** | Authenticated via credentials (student ID + password) or Google OAuth. Can track courses, plan semesters, and use integrations. |
| **Admin** | Authenticated via `x-admin-secret` header. Can view analytics, logs, and reset/setup the database. |

---

## 3. Features & Functional Requirements

### 3.1 Authentication

- **Credentials Login:** Students sign in with university ID + password.
- **Account Claiming:** New students can sign up (claim) with a university ID and password (min 6 chars). If the ID already exists, claiming is rejected.
- **Google OAuth:** Students can also sign in via Google. On first login, a new user record is created and linked.
- **Session Management:** NextAuth manages JWT-based sessions. API routes check `getServerSession()` for auth.

### 3.2 Student Profile

- **GET /api/profile/[studentId]:** Returns the student's saved major. Session must match the target student.
- **POST /api/profile/[studentId]/save:** Saves the student's chosen major. Body: `{ major: string }`.

### 3.3 Course Tracking (Transcript View)

- Students select from 8 majors: Data Science, Computer Science, Cybersecurity, Game Design, Electrical Engineering, Energy Engineering, Industrial Engineering, Mechanical Engineering.
- Courses are displayed grouped by category: University Requirements, College Requirements, Department Requirements, Electives, University Electives, Work Market Requirements.
- Students toggle courses as completed. Progress is auto-saved.
- **Prerequisite enforcement:** Courses with unmet prerequisites are locked (AND/OR course-code logic + credit-hour thresholds + department approval locks).
- **Elective caps:** University electives capped at 3; department electives vary by degree type.
- **GET /api/progress/[studentId]?major=X:** Returns completed courses for a major.
- **POST /api/progress/[studentId]/save:** Saves completed courses. Body: `{ major: string, completed: [{ code, name }] }`.

### 3.4 Courses Autocomplete

- **GET /api/courses:** Returns a flat, sorted list of all courses across all majors `[{ name, code, ch }]`. No auth required.

### 3.5 Semester Planner

- **GET /api/planner:** Load the authenticated user's planner (courses + study sessions).
- **POST /api/planner:** Save/update planner data. Body: `{ id, name?, courses[], studySessions[] }`.
- **DELETE /api/planner:** Delete the user's planner.
- Features: editable course table (grade, midterm/final dates, status), study-log with per-course hour tracking, GPA calculation (HTU D/M/P/U scale), smart insights (at-risk warnings, upcoming exams, study tips, GPA projection), weekly summary.

### 3.6 Google Calendar Integration

- **POST /api/integrations/google-calendar:** Pushes midterm & final exam dates as Google Calendar events with reminders (1 day + 1 hour before). Body: `{ courses: [{ name, midtermDate?, finalDate?, credits }] }`. Requires stored Google OAuth token.
- **GET /api/integrations/google-calendar/callback:** OAuth2 callback — exchanges authorization code for tokens, saves to DB, redirects to `/planner`.

### 3.7 Notion Integration

- **POST /api/integrations/notion:** Syncs courses to a Notion database. Body: `{ courses[], semesterName?, createNewPage? }`. Requires stored Notion OAuth token.
- **GET /api/integrations/notion/callback:** OAuth2 callback — exchanges auth code for access token, creates "Study Plan" page, redirects to `/planner`.

### 3.8 Admin Dashboard

- **GET /api/admin/stats:** Comprehensive analytics: total students, visitor counts, major distribution, progress distribution, top courses, 30-day traffic, device breakdown, recent activity, activity heatmap, per-student credit-hour data. Auth: `x-admin-secret` header.
- **GET /api/admin/logs:** Returns the 100 most recent visitor log entries. Auth: `x-admin-secret` header.
- Admin pages at `/admin/dashboard` (3 tabs: Overview, Students, Visitors) and `/admin/logs`.

### 3.9 Database Management

- **POST /api/setup:** Initialize (create) all database tables without dropping existing data. Auth: `x-admin-secret` header.
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
| GET | `/api/planner` | Session | Load planner data |
| POST | `/api/planner` | Session | Save planner data |
| DELETE | `/api/planner` | Session | Delete planner |
| POST | `/api/integrations/google-calendar` | Session + OAuth token | Push exam dates to Google Calendar |
| GET | `/api/integrations/google-calendar/callback` | OAuth flow | Google OAuth callback |
| POST | `/api/integrations/notion` | Session + OAuth token | Sync courses to Notion |
| GET | `/api/integrations/notion/callback` | OAuth flow | Notion OAuth callback |
| GET | `/api/admin/stats` | Admin secret | Get analytics data |
| GET | `/api/admin/logs` | Admin secret | Get visitor logs |
| POST | `/api/setup` | Admin secret | Initialize DB tables |
| POST | `/api/reset` | Admin secret | Reset all DB tables |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth | Auth endpoints |

---

## 5. Data Model

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| **users** | id, student_id (unique), email (unique), password_hash, name, image | User authentication |
| **accounts** | user_id (FK→users), provider, provider_account_id | OAuth provider accounts |
| **student_profile** | student_id (PK), major, updated_at | Per-student major selection |
| **student_progress** | (student_id, major) PK, completed (JSON), updated_at | Completed courses per major |
| **visitor_logs** | id, student_id, ip_address, device/OS/browser, visited_at | Analytics tracking |
| **planner_semesters** | id (PK), student_id, name, courses (JSON), study_sessions (JSON) | Semester planner data |
| **integration_tokens** | (student_id, provider) unique, access_token, refresh_token, expires_at, metadata | OAuth tokens for integrations |

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
9. Integration tokens (Google Calendar, Notion) are stored per-student and per-provider.
10. Visitor logging captures IP, device info, OS, and browser on each page load.

---

## 7. Non-Functional Requirements

- **Database:** Vercel Postgres (production), with `@vercel/postgres` SDK.
- **Authentication:** NextAuth v4 with JWT strategy.
- **Deployment Target:** Vercel.
- **Framework:** Next.js 16 with App Router (Server Components + API Routes).
