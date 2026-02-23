-- Migration: Create course_notes table for Plate editor
CREATE TABLE
    IF NOT EXISTS course_notes (course_id VARCHAR(64) PRIMARY KEY, notes JSONB);