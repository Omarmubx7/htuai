-- Mubdir Database Schema (Neon Postgres: neon-fuchsia-desert)
-- Run against the Neon connection string via psql, Prisma, or Drizzle Kit.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf','video','link','image','folder','other')),
  url TEXT NOT NULL,
  description TEXT,
  uploaded_by TEXT,
  semester TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_name ON courses (name);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses (code);
CREATE INDEX IF NOT EXISTS idx_resources_course_id ON resources (course_id);
CREATE INDEX IF NOT EXISTS idx_reports_resource_id ON reports (resource_id);

-- Seed example (replace with real HTUAI course catalog)
INSERT INTO courses (name, code, department) VALUES
  ('Advanced Programming', 'CS401', 'Computer Science'),
  ('Computer Networks', 'CS331', 'Computer Science'),
  ('Database Systems', 'CS340', 'Computer Science'),
  ('Data Structures', 'CS210', 'Computer Science'),
  ('Operating Systems', 'CS350', 'Computer Science')
ON CONFLICT DO NOTHING;
