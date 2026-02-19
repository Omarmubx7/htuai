import { sql } from '@vercel/postgres';



/**
 * Visitor log data structure
 */
export interface VisitorLog {
    ip_address: string;
    user_agent: string;
    device_vendor: string | undefined;
    device_model: string | undefined;
    os_name: string | undefined;
    os_version: string | undefined;
    browser_name: string | undefined;
    student_id?: string;
}

/**
 * Initialize the database tables if they don't exist.
 * Note: In production, it's better to run migration scripts, but this works for simple apps.
 */
export async function initDB() {
    await sql`
        CREATE TABLE IF NOT EXISTS student_progress (
            student_id  TEXT    NOT NULL,
            major       TEXT    NOT NULL,
            completed   TEXT    NOT NULL DEFAULT '[]',
            updated_at  BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::bigint),
            PRIMARY KEY (student_id, major)
        );
    `;
    await sql`
        CREATE INDEX IF NOT EXISTS idx_student_id ON student_progress (student_id);
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS student_profile (
            student_id  TEXT    PRIMARY KEY,
            major       TEXT    NOT NULL,
            updated_at  BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::bigint)
        );
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS visitor_logs (
            id SERIAL PRIMARY KEY,
            student_id TEXT,
            ip_address TEXT,
            user_agent TEXT,
            device_vendor TEXT,
            device_model TEXT,
            os_name TEXT,
            os_version TEXT,
            browser_name TEXT,
            visited_at TIMESTAMP DEFAULT NOW()
        );
    `;

    // Add student_id column if it doesn't exist (migrations are better, but this handles simple schema evolution)
    try {
        await sql`ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS student_id TEXT;`;
    } catch (e) {
        // Find a way to check column existence safely if this fails, but IF NOT EXISTS usually works in PG
        console.log("Column check passed or failed safely", e);
    }
}


/** Log visitor information */
export async function logVisitor(data: VisitorLog): Promise<void> {
    try {
        await sql`
            INSERT INTO visitor_logs (
                student_id, ip_address, user_agent, device_vendor, device_model, os_name, os_version, browser_name
            ) VALUES (
                ${data.student_id || null}, ${data.ip_address}, ${data.user_agent}, ${data.device_vendor || null}, ${data.device_model || null}, 
                ${data.os_name || null}, ${data.os_version || null}, ${data.browser_name || null}
            )
        `;
    } catch (e) {
        console.error("Failed to log visitor:", e);
    }
}

/** Get recent visitor logs */
export async function getVisitorLogs(limit = 100): Promise<(VisitorLog & { id: number; visited_at: Date })[]> {
    try {
        const { rows } = await sql`
            SELECT * FROM visitor_logs 
            ORDER BY visited_at DESC 
            LIMIT ${limit}
        `;
        return rows as (VisitorLog & { id: number; visited_at: Date })[];
    } catch (e) {
        console.error("Failed to fetch logs:", e);
        return [];
    }
}

/** Load a student's completed courses for a specific major */
export async function loadProgress(studentId: string, major: string): Promise<string[]> {
    try {
        const { rows } = await sql`
            SELECT completed FROM student_progress 
            WHERE student_id = ${studentId} AND major = ${major}
        `;
        if (rows.length === 0) return [];
        return JSON.parse(rows[0].completed) as string[];
    } catch (e) {
        console.error("DB Load Error:", e);
        // Fallback or init table if missing
        return [];
    }
}

/** Save a student's completed courses for a specific major */
export async function saveProgress(studentId: string, major: string, completed: string[]): Promise<void> {
    const json = JSON.stringify(completed);
    await sql`
        INSERT INTO student_progress (student_id, major, completed, updated_at)
        VALUES (${studentId}, ${major}, ${json}, (EXTRACT(EPOCH FROM NOW())::bigint))
        ON CONFLICT (student_id, major) DO UPDATE SET
            completed   = EXCLUDED.completed,
            updated_at  = EXCLUDED.updated_at
    `;
}

/** Get a summary of all students */
export async function getAllStudents(): Promise<{ student_id: string; major: string; count: number }[]> {
    const { rows } = await sql`
        SELECT student_id, major, json_array_length(completed::json) as count
        FROM student_progress
        ORDER BY updated_at DESC
    `;
    return rows as { student_id: string; major: string; count: number }[];
}

/** Load the major a student previously chose (null = first-time user) */
export async function loadMajor(studentId: string): Promise<string | null> {
    try {
        const { rows } = await sql`
            SELECT major FROM student_profile WHERE student_id = ${studentId}
        `;
        return rows[0]?.major ?? null;
    } catch {
        return null;
    }
}

/** Save / update the student's chosen major */
export async function saveMajor(studentId: string, major: string): Promise<void> {
    await sql`
        INSERT INTO student_profile (student_id, major, updated_at)
        VALUES (${studentId}, ${major}, (EXTRACT(EPOCH FROM NOW())::bigint))
        ON CONFLICT (student_id) DO UPDATE SET
            major      = EXCLUDED.major,
            updated_at = EXCLUDED.updated_at
    `;
}
