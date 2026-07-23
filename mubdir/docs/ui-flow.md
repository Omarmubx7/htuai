# UI Flow — Mubdir

## 1. Entry Point
Mubdir is added as a new route/tab inside the existing HTUAI Next.js app (e.g. `/resources`), reachable from the main navigation alongside GPA calculator and course tracker.

## 2. Browse Flow
1. User lands on `/resources`.
2. User types a course name or code into the search bar.
3. Matching courses appear in a left-side list (from Neon `courses` table via `/api/courses`).
4. User selects a course.
5. All resources for that course load from `/api/resources?courseId=` and render in the main panel.
6. User can filter resources by type (pdf, video, link, image, folder, other).
7. User clicks "Open resource" to open the URL in a new tab.

## 3. Upload Flow
1. User clicks "Upload resource".
2. User selects a course from a searchable dropdown (backed by the same `courses` table — no free-text course entry, to avoid duplicates).
3. User selects a resource type.
4. User pastes a URL (Drive, YouTube, Dropbox, etc.) or, in a later version, uploads a file.
5. User adds a title, optional description, and optional semester.
6. User submits — POST to `/api/resources` inserts a row into Neon.
7. Confirmation state shown; new resource appears immediately in the course list.

## 4. Report Flow
1. User clicks "Report" on any resource card.
2. A short reason field appears (broken link, wrong course, inappropriate).
3. POST to `/api/reports` inserts a row referencing the resource.
4. Resource remains visible until manually reviewed (no automatic hiding in v1).

## 5. Empty States
- No search results: show "No matching course found" with a suggestion to check spelling.
- Course with zero resources: show "No resources yet — be the first to upload" with a direct CTA into the upload flow pre-filled with that course.

## 6. Mobile Behavior
- Course list collapses into a horizontal scroll or a dropdown selector above the resource list.
- Filters become a horizontal scrollable chip row.
- Upload form stacks into a single column.
- All tap targets remain at least 44x44px.

## 7. State Ownership
- Course list and selected course: client-side state (React), fetched from Neon via API routes.
- Resource list: re-fetched whenever the selected course or active filter changes.
- Upload form: local form state until successful submit, then cleared.
