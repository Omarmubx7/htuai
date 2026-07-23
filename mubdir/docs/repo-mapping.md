# Repo Mapping — HTUAI to Mubdir

## Confirmed Facts About HTUAI
- Framework: Next.js + React + Tailwind + Framer Motion
- Current persistence: local/client-side only (no shared backend)
- Current purpose: real-time GPA calculator and course tracking tool for HTU students

## Why This Matters for Mubdir
Because HTUAI has no shared backend today, Mubdir is the first feature that introduces a real multi-user database. This is a meaningful architectural addition, not a small extension, and should be treated as its own module inside the app.

## Suggested Integration Points
- New route: `app/resources/page.tsx` (or `pages/resources.tsx` depending on router version used in HTUAI)
- New API routes: `app/api/courses/route.ts`, `app/api/resources/route.ts`, `app/api/reports/route.ts`
- New lib file: `lib/db.ts` for the Neon/Prisma or Neon/Drizzle client singleton
- New env variable: `DATABASE_URL` pointing to the `neon-fuchsia-desert` Neon project
- Reuse existing HTUAI design tokens (Tailwind config, color palette, motion patterns) so Mubdir feels native to the app rather than bolted on

## Data Migration Note
If HTUAI already has a hardcoded list of courses (for GPA calculation) stored in a constants file or JSON, that list should be the seed source for the Neon `courses` table, instead of manually re-entering course names. This avoids naming mismatches between the GPA tool and the resource directory.

## Open Questions to Confirm With the Repo Owner
1. Is HTUAI using the App Router (`app/`) or Pages Router (`pages/`)?
2. Where is the existing hardcoded course list stored?
3. Is there an existing ORM setup, or will Prisma/Drizzle be introduced fresh with this feature?
4. Should Mubdir require login, or stay fully open for browsing with optional login only for uploading?
