# MUBXAI

MUBXAI is a student planning and academic support tool built to help university students stay organized, study consistently, and track progress toward graduation goals.

## What This Tool Does

MUBXAI combines course planning, study tracking, and academic insights in one place.

With MUBXAI, students can:

- Plan semesters and add courses with details like credits, instructor, and class schedule
- Log study sessions and monitor weekly study habits
- Track grades and estimate GPA outcomes (including projections)
- Get reminders for exams and deadlines
- Sync course schedules and exam dates to Google Calendar

In short: it acts as a personal academic dashboard and planner.

## Who It Is For

- University students who want better semester planning
- Students preparing for midterms/finals and trying to improve consistency
- Academic teams who want a structured planner experience for learners

## How It Works (Student Flow)

1. Create a semester
2. Set semester start and end dates
3. Add courses
4. Add course metadata (schedule, location, instructor, exam dates)
5. Log study sessions over time
6. View progress, trends, and upcoming deadlines
7. Optionally sync to Google Calendar

## Main Features

- Semester and course management
- Study log with daily/weekly trend visualization
- GPA tracking and projection cards
- Gamification and quest-based motivation
- Google Calendar integration
- Admin dashboards and logs

## Project Layout

- `smart-advisor-ui/`: Main web application (Next.js)
- `terraform/`: Infrastructure as code
- `temp_pdf/`: Utility scripts for PDF-related work
- Root docs (`*.md`): Product specs, design notes, and testing notes

## Quick Start (Developers)

Run from the app folder:

```bash
cd smart-advisor-ui
npm install
npm run dev
```

Open `http://localhost:3000`.

## Common Commands

```bash
npm run dev      # Start development server
npm run build    # Create production build
npm run start    # Run production server
npm run lint     # Run lint checks
```

## Notes

- If the UI appears stale during development, delete `.next` and restart.
- Calendar sync requires a valid Google connection and complete planner data (especially semester dates and course schedule metadata).

## More Documentation

- `smart-advisor-ui/README.md`: App-level details
- `smart-advisor-ui/README-TECHNICAL.md`: Technical notes
- `MUBXAICOMPLETE SPEC.md`: Full product/system specification
- `designdox.md`, `mobiletest.md`, `test.md`: Design and test artifacts
