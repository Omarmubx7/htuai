import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Store the DB file in the project root (outside public/)
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'students.db');

// Ensure data/ directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
    if (_db) return _db;

    _db = new Database(DB_PATH);

    // Enable WAL mode for fast concurrent reads
    _db.pragma('journal_mode = WAL');

    // Progress table
    _db.exec(`
        CREATE TABLE IF NOT EXISTS student_progress (
            student_id  TEXT    NOT NULL,
            major       TEXT    NOT NULL,
            completed   TEXT    NOT NULL DEFAULT '[]',
            updated_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            PRIMARY KEY (student_id, major)
        );
        CREATE INDEX IF NOT EXISTS idx_student_id ON student_progress (student_id);

        -- Profile table: stores the student's chosen major
        CREATE TABLE IF NOT EXISTS student_profile (
            student_id  TEXT    PRIMARY KEY,
            major       TEXT    NOT NULL,
            updated_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );
    `);

    return _db;
}

/** Load a student's completed courses for a specific major */
export function loadProgress(studentId: string, major: string): string[] {
    const db = getDb();
    const row = db
        .prepare('SELECT completed FROM student_progress WHERE student_id = ? AND major = ?')
        .get(studentId, major) as { completed: string } | undefined;

    if (!row) return [];
    try {
        return JSON.parse(row.completed) as string[];
    } catch {
        return [];
    }
}

/** Save a student's completed courses for a specific major */
export function saveProgress(studentId: string, major: string, completed: string[]): void {
    const db = getDb();
    db.prepare(`
        INSERT INTO student_progress (student_id, major, completed, updated_at)
        VALUES (?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT (student_id, major) DO UPDATE SET
            completed   = excluded.completed,
            updated_at  = excluded.updated_at
    `).run(studentId, major, JSON.stringify(completed));
}

/** Get a summary of all students (for admin view later) */
export function getAllStudents(): { student_id: string; major: string; count: number }[] {
    const db = getDb();
    return db.prepare(`
        SELECT student_id, major, json_array_length(completed) as count
        FROM student_progress
        ORDER BY updated_at DESC
    `).all() as { student_id: string; major: string; count: number }[];
}

/** Load the major a student previously chose (null = first-time user) */
export function loadMajor(studentId: string): string | null {
    const db = getDb();
    const row = db
        .prepare('SELECT major FROM student_profile WHERE student_id = ?')
        .get(studentId) as { major: string } | undefined;
    return row?.major ?? null;
}

/** Save / update the student's chosen major */
export function saveMajor(studentId: string, major: string): void {
    const db = getDb();
    db.prepare(`
        INSERT INTO student_profile (student_id, major, updated_at)
        VALUES (?, ?, strftime('%s', 'now'))
        ON CONFLICT (student_id) DO UPDATE SET
            major      = excluded.major,
            updated_at = excluded.updated_at
    `).run(studentId, major);
}
