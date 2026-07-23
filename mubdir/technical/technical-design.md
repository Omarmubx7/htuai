# Technical Design Document (Updated)

## 1. Architecture Overview
Mubdir extends HTUAI, an existing Next.js + React + Tailwind + Framer Motion GPA calculator and course tracker for HTU students. HTUAI currently runs entirely client-side with local data persistence and no shared backend. Mubdir is the first feature in the codebase that requires a real, shared, multi-user backend, because resource sharing across students cannot work with local-only storage.

## 2. Confirmed Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js + React + Tailwind + Framer Motion | Matches existing HTUAI codebase |
| Database | Neon (Postgres) — project `neon-fuchsia-desert` | Serverless Postgres, already provisioned |
| ORM | Prisma or Drizzle (recommended) | Type-safe queries against Neon |
| File Storage | External URL-first (Drive, YouTube, Dropbox links) | Avoids extra storage cost in v1 |
| Auth | Optional at first; can defer to a lightweight auth provider later | Not required for browsing |
| Hosting | Vercel | Pairs natively with Next.js and Neon |

## 3. Why Neon Instead of Supabase
The product owner already has a Neon database provisioned under the project name `neon-fuchsia-desert`. Neon is a serverless Postgres platform, fully compatible with standard SQL, Prisma, and Drizzle ORM, and integrates cleanly with Vercel deployments used by Next.js apps. There is no need to introduce Supabase since Neon already provides the Postgres database; file storage for v1 remains URL-first, so no separate object storage service is required immediately.

## 4. Core Data Model (Neon Postgres)

### 4.1 courses
- id UUID primary key default gen_random_uuid()
- name text not null
- code text
- department text
- created_at timestamptz default now()

### 4.2 resources
- id UUID primary key default gen_random_uuid()
- course_id UUID references courses(id) on delete cascade
- title text not null
- type text not null check (type in ('pdf','video','link','image','folder','other'))
- url text not null
- description text
- uploaded_by text
- semester text
- created_at timestamptz default now()

### 4.3 reports
- id UUID primary key default gen_random_uuid()
- resource_id UUID references resources(id) on delete cascade
- reason text not null
- created_by text
- created_at timestamptz default now()

## 5. Connection Setup
The Neon connection string should be stored as an environment variable (`DATABASE_URL`) in the Next.js project's `.env.local` file and in Vercel project settings. Never commit the connection string to the repository.

```
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/neon-fuchsia-desert?sslmode=require"
```

## 6. Search Design
Search remains course-first. A simple `ILIKE` query against `name` and `code` columns is sufficient for v1:

```sql
SELECT * FROM courses
WHERE name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%';
```

Postgres full-text search (`tsvector`) can be added later if the course list grows large.

## 7. API Layer
Since this is Next.js, use Route Handlers (`app/api/courses/route.ts`, `app/api/resources/route.ts`) to query Neon via Prisma/Drizzle. Keep the API surface small:
- GET /api/courses?query=
- GET /api/resources?courseId=
- POST /api/resources
- POST /api/reports

## 8. Migration Strategy
Use Prisma Migrate or Drizzle Kit against the Neon connection string to version-control schema changes. Store migration files inside `mubdir/technical/migrations/` for traceability alongside the docs.

## 9. Security Notes
- Validate resource `type` against the allowed enum server-side.
- Sanitize `title` and `description` before rendering.
- Rate-limit POST /api/resources and POST /api/reports per IP or session.
- Keep the Neon connection string out of client bundles — only use it in server-side Route Handlers.

## 10. Future Extensibility
- Add `upvotes` column to resources.
- Add `verified` boolean once a moderation threshold is defined.
- Add full-text search via `tsvector` once course catalog grows.
- Add file upload storage (e.g., Vercel Blob or S3-compatible storage) if URL-first becomes limiting.
