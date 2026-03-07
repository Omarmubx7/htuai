# HTUAI — Smart Advisor UI

The Next.js 16 frontend and API layer for the **HTUAI** academic management platform.
See the [root README](../README.md) for the full project overview.

## Prerequisites

- Node.js 20+
- PostgreSQL database (Vercel Postgres, Neon, or local)
- Google OAuth credentials

## Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in this directory:

```env
# Database
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Auth
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth & Calendar
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Admin
ADMIN_SECRET=your-admin-secret
```

### 3. Run database migrations

```bash
npx prisma migrate deploy
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Database

The Prisma schema is the single source of truth for all data models:

```bash
# View schema
cat prisma/schema.prisma

# Open Prisma Studio (DB browser)
npx prisma studio

# Create a new migration after schema changes
npx prisma migrate dev --name <description>

# Generate Prisma client after schema changes
npx prisma generate
```

## Architecture Notes

- **`app/`** — Next.js App Router: pages and API Route Handlers
- **`components/`** — Reusable React components; `components/ui/` for atomic components
- **`lib/grading.ts`** — All GPA/CGPA logic lives here. **Never duplicate this logic elsewhere.**
- **`lib/safe-storage.ts`** — Always use this wrapper for `localStorage`/`sessionStorage`. Never access them directly.
- **`public/data/curriculum.json`** — Authoritative HTU course catalog. Only use course codes from this file.

## Key Conventions

- Server Components by default — add `"use client"` only when absolutely needed
- All API routes must call `getServerSession()` before processing
- All user inputs must be validated with Zod before touching the database
- Multi-table writes must use Prisma `$transaction`
- All date/time ops must use `Asia/Amman` timezone (UTC+3)

## Deploying

The app is deployed on [Vercel](https://vercel.com). Push to `main` triggers an automatic deployment.

For infrastructure changes, see the [`terraform/`](../terraform/) directory.
