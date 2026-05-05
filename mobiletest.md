# 📱 MUBXAI Mobile UI/UX — Full Deep Test Report

***

## 🔴 CRITICAL Issues (Broken or Unusable on Mobile)

### 1. Black Screen on Page Load (Every Page)
**Every page** — Tracker, Planner, Semesters, Course Detail — shows a **completely black screen for ~2 seconds** before content loads. There is no loading spinner, skeleton screen, or any visual feedback during this blank period. This feels like a crash to mobile users. [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- **Fix:** Add a skeleton loader or loading state with a subtle spinner so users know content is coming.

***

### 2. "Notes" Button and Status Circle Are Dangerously Close Together (Accidental Taps)
On every course card, the **Notes button** and the **Status toggle circle** sit side by side with barely ~22px between them. During testing, clicking near "Notes" repeatedly triggered the **status circle** instead, accidentally marking courses as completed/incomplete — and this **permanently changed the stored data** (the credits dropped from 30 to 26 and completion from 12 to 11 courses during testing). [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- **Fix:** Increase spacing between "Notes" and the status circle to at least 44px (Apple/Google recommended minimum touch target size). Consider moving them to separate rows on mobile.

***

### 3. Bottom Navigation Bar Clips/Overlaps Page Content
On the **Semester Detail page**, the section heading "Semester Notes & Generic Pages" and the "NEW PAGE" label are visually **overlapped by the bottom navigation bar**. Content is rendered behind the fixed bottom nav without proper bottom padding. [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters/4)
- **Fix:** Add `padding-bottom` equal to the height of the bottom navigation bar (~60–70px) to all page content containers.

***

### 4. The Stats Cards Are Partially Hidden by Bottom Nav on Tracker Page
On the Course Tracker, when scrolled to the stats grid, the bottom row (COURSES + STATUS cards) is **covered by the bottom nav bar label text** — "TRACKER", "PLANNER", "SETTINGS" text overlaps the card content. [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- **Fix:** Same fix as above — add proper bottom padding to scrollable content.

***

## 🟠 HIGH Priority Issues (Poor UX on Mobile)

### 5. Course Card Header Layout is Too Cramped
On mobile, each course card header contains: **grade badge** (HTU/HNC/HND) + **Notes button** + **Status circle** — all in a single row. The available width (~420px) makes this very tight. The "Notes" label is small and the status circle is a tiny dot, making precise tapping difficult. [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- **Fix:** Stack the grade badge on its own line, or move the status circle to the card's left or right edge with a larger hit area.

***

### 6. Header Bar on Tracker Is Extremely Dense
The mobile top header packs: **MUBXAI logo** + **MUBXAI text** + **Student ID** + **Major dropdown** + **Notification badge (24)** + **Sign out** + **Theme toggle** — all into a single narrow bar. The "Computer Scien..." major text is truncated and the layout looks cluttered. [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- **Fix:** Simplify the header — show only the logo + student ID. Move Sign Out and Theme toggle into a side drawer or settings page.

***

### 7. Roadmap Toggle (Roadmap / Categories) Renders with Poor Contrast in Dark Mode
In the Curriculum View toggle, the **inactive tab** ("Roadmap" when Categories is selected) appears with very low contrast — near-white text on a dark-but-not-black background. The toggle is hard to distinguish as a selectable option on mobile small screens. [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- **Fix:** Increase contrast ratio on inactive tab. Use a clearly visible border or distinct background.

***

### 8. Critical Roadmap Section Has No Visual Grouping on Mobile
On desktop, the Critical Roadmap shows requirement categories in a 3-column grid. On mobile, it stacks vertically as a plain list with no cards or separators — making it hard to visually parse each requirement type and its progress. [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- **Fix:** Wrap each requirement row in a subtle card or add a horizontal divider between categories. Add a mini-progress bar inline.

***

### 9. "UNIVERSITY REQUIREMENTS" Section Header Breaks Into Two Lines on Mobile
In Categories view, the section heading "UNIVERSITY REQUIREMENTS" wraps across two lines, pushing the GPA and course count to a third row on small screens: [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
```
UNIVERSITY
REQUIREMENTS     GPA: 3.20   10
                              courses
```
This looks unpolished and wastes vertical space.
- **Fix:** Use a shorter label on mobile ("UNI. REQUIREMENTS") or reduce font-size. Keep GPA and course count inline on same row using `flex-wrap: nowrap` + `overflow: ellipsis`.

***

### 10. Planner: "No active tracking semester" Is Shown But No Quick CTA Is Prominent Enough
On the Planner home on mobile, the "Active Semester" card shows "No active tracking semester." with a small "Manage Semesters →" link. On mobile, users may miss this. The card looks empty and abandoned. [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner)
- **Fix:** Make the CTA a full-width purple button (like the Semester Planner button on Tracker). Add an icon and short explanatory text: "You haven't started a semester yet. Tap to add one."

***

### 11. Floating Action Button (≡ hamburger) Is Partially Clipped Off-Screen
On every page, a floating "≡" menu button appears on the **far right edge of the screen**, partially cut off. Tapping it has no visible response. It's unclear what it does. [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner)
- **Fix:** Move the FAB at least 16px inward from the screen edge. Clarify its purpose — if it opens a quick menu, show what options appear. If unused, remove it.

***

### 12. Settings Page Has No Bottom Navigation in Planner Header View
When entering Settings via the bottom nav, the back navigation shows a "←" arrow but no clear label of what page the user is on within the hierarchy. On the Course Tracker, settings isn't accessible from the top header directly on mobile. [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/settings)
- **Fix:** Add a page breadcrumb ("Planner > Settings") or at minimum keep the page title clearly labeled.

***

## 🟡 MEDIUM Priority Issues (Minor UX Friction)

### 13. My Profile: Full Name Field Is Empty
In Settings → My Profile, the **Full Name field shows blank** — only the label "FULL NAME" with nothing under it. The student's name is never collected or displayed anywhere in the app, making the profile card feel incomplete. [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/settings)
- **Fix:** Either pull the name from the University ID login system, or add an editable "Full Name" input so users can personalize their profile.

***

### 14. Study Chart in Planner Shows Only 1 Bar Out of 7 Days
The Weekly Study Habits chart on the Planner home only shows data for one day (30 minutes on one day), with 6 empty columns. On mobile, the chart is condensed and the column labels (THU–WED) are tiny and may not render clearly on small screens. [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner)
- **Fix:** On mobile, consider a simplified bar chart or change to a horizontal scroll chart with larger touch targets. Add placeholder bars for empty days (e.g., dashed outline) so the chart doesn't look broken.

***

### 15. Spring 2026 Marked as "COMPLETED" — Logic Error (Not Mobile-Only)
This was also found in the desktop test — the semester "Spring 2026" is marked **COMPLETED** when it's a future semester. On mobile, this is even more confusing since status badges are the primary info visible on small cards. A user glancing at their semesters list will think they already finished a semester that hasn't happened. [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters)
- **Fix:** Automatically set semester status based on dates. Only allow "COMPLETED" if the semester's end date has passed. Default future semesters to "Planned" or "Upcoming."

***

### 16. Exam Schedule Date/Time Fields Use Native Number Inputs (Ugly on Mobile)
In Course Detail → Exam Schedule, the date and time are composed of **individual number inputs** for Month/Day/Year and Hour/Minute. On mobile, these tiny split-field inputs are very hard to interact with and look unpolished (they appear as small boxes with up/down spinners). [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/courses/10)
- **Fix:** Replace with a native `<input type="datetime-local">` for mobile or a custom date/time picker modal. This is standard UX for mobile date entry.

***

### 17. "Add Course" Button in Semester Detail Has No Visual Feedback
The dashed "Add Course" box on the Semester Detail page is a subtle dashed border with a "+" icon. On mobile, this can be easily missed as it doesn't look like a tappable button — it blends with the background. [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters/4)
- **Fix:** Style as a full-width, visibly bordered button with color-on-hover/tap state. Add a pulsing border or purple accent to draw attention.

***

### 18. Dark Mode Toggle — Inconsistent Icon Style Between Pages
- On the **Tracker**: The theme toggle is a crescent moon icon in the **top-right header bar** [MUBXAI.mubx](https://MUBXAI.mubx.dev/)
- On the **Semester Detail and Course Detail pages**: The toggle is a standalone circular button (no header bar around it) [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/courses/10)
- On the **Settings page**: Same standalone circle button style

The inconsistency makes the UI feel disconnected across pages.
- **Fix:** Standardize the theme toggle placement and appearance across all pages.

***

### 19. Bottom Navigation Labels Are Cut Off When Content Floats Over Them
At the bottom of the Semester Detail page, the text "Semester Notes & Generic Pages" and "NEW PAGE" visually merge with "SETTINGS" and "NAV PAGE" from the bottom nav bar. The bottom nav doesn't fully separate itself from scrollable content. [MUBXAI.mubx](https://MUBXAI.mubx.dev/planner/semesters/4)
- **Fix:** Add a solid dark background (or frosted glass effect) behind the bottom nav to ensure full visual separation from page content.

***

## 🟢 What Works Well on Mobile

| Feature | Status |
|---|---|
| Dark/Light mode toggle | ✅ Works correctly on all pages |
| Bottom navigation (Tracker/Planner/Settings) | ✅ Navigates correctly |
| Stats grid (2-column layout) | ✅ Adapts well to mobile |
| Category/Roadmap toggle | ✅ Switches views correctly |
| Academic Aspirant badge card | ✅ Renders cleanly |
| Privacy Policy page | ✅ Full mobile-responsive layout |
| Terms of Service page | ✅ Full mobile-responsive layout |
| Active Quests in Planner | ✅ Progress bars display correctly |
| Course status circle toggle | ✅ Works (but too close to Notes button) |
| "Semester Planner" CTA button | ✅ Full-width, highly visible |
| Google Calendar toggle in Settings | ✅ Clear toggle switches |

***

## 📋 Summary Priority Table

| # | Issue | Severity | Page(s) Affected |
|---|---|---|---|
| 1 | Black screen on page load | 🔴 Critical | All pages |
| 2 | Notes + Status circle too close (accidental taps) | 🔴 Critical | Tracker — All course cards |
| 3 | Bottom nav overlaps page content | 🔴 Critical | Semester Detail, Tracker |
| 4 | Stats cards partially hidden by bottom nav | 🔴 Critical | Tracker |
| 5 | Cramped course card header | 🟠 High | Tracker — All course cards |
| 6 | Header bar too dense | 🟠 High | Tracker, Planner |
| 7 | Toggle contrast too low | 🟠 High | Tracker Curriculum View |
| 8 | Roadmap section no visual grouping | 🟠 High | Tracker |
| 9 | Section header wraps to 2 lines | 🟠 High | Tracker Categories view |
| 10 | No prominent CTA for empty active semester | 🟠 High | Planner |
| 11 | FAB button clipped off-screen | 🟠 High | All pages |
| 12 | Back navigation unclear in Settings | 🟠 High | Settings |
| 13 | Full name missing in Profile | 🟡 Medium | Settings |
| 14 | Study chart mostly empty | 🟡 Medium | Planner |
| 15 | Spring 2026 marked COMPLETED wrongly | 🟡 Medium | Semesters |
| 16 | Ugly split date inputs on mobile | 🟡 Medium | Course Detail |
| 17 | "Add Course" button not obvious | 🟡 Medium | Semester Detail |
| 18 | Inconsistent theme toggle style | 🟡 Medium | All pages |
| 19 | Bottom nav no background isolation | 🟡 Medium | Semester Detail |