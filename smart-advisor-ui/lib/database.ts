import { sql } from '@vercel/postgres';

/**
 * Drop all tables and recreate them. (Nuclear Reset)
 */
export async function resetDB() {
    await sql`DROP TABLE IF EXISTS accounts CASCADE;`;
    await sql`DROP TABLE IF EXISTS users CASCADE;`;
    await sql`DROP TABLE IF EXISTS visitor_logs CASCADE;`;
    await sql`DROP TABLE IF EXISTS student_profile CASCADE;`;
    await sql`DROP TABLE IF EXISTS student_progress CASCADE;`;
    await initDB();
}

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

    // New authentication tables
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            student_id TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            name TEXT,
            image TEXT,
            created_at TIMESTAMP DEFAULT (NOW())
        );
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL,
            provider_account_id TEXT NOT NULL,
            UNIQUE(provider, provider_account_id)
        );
    `;

    // Add student_id column if it doesn't exist (migrations are better, but this handles simple schema evolution)
    try {
        await sql`ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS student_id TEXT;`;
    } catch (e) {
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

// ─── User Authentication Methods ─────────────────────────────────────────────

export interface DBUser {
    id: number;
    student_id: string | null;
    email: string | null;
    password_hash: string | null;
    name: string | null;
    image: string | null;
}

export async function getUserById(id: number): Promise<DBUser | null> {
    const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
    return (rows[0] as DBUser) || null;
}

export async function getUserByStudentId(studentId: string): Promise<DBUser | null> {
    const { rows } = await sql`SELECT * FROM users WHERE student_id = ${studentId}`;
    return (rows[0] as DBUser) || null;
}

export async function getUserByEmail(email: string): Promise<DBUser | null> {
    const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
    return (rows[0] as DBUser) || null;
}

export async function createUser(data: Partial<DBUser>): Promise<DBUser> {
    console.log("DB: Creating/Updating user with data:", { ...data, password_hash: data.password_hash ? "[HASHED]" : null });
    try {
        // We use ON CONFLICT on student_id if provided, otherwise on email
        let query;
        if (data.student_id) {
            query = sql`
                INSERT INTO users (student_id, email, password_hash, name, image)
                VALUES (${data.student_id}, ${data.email || null}, ${data.password_hash || null}, ${data.name || null}, ${data.image || null})
                ON CONFLICT (student_id) DO UPDATE SET
                    password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
                    email = COALESCE(EXCLUDED.email, users.email),
                    name = COALESCE(EXCLUDED.name, users.name),
                    image = COALESCE(EXCLUDED.image, users.image)
                RETURNING *
            `;
        } else if (data.email) {
            query = sql`
                INSERT INTO users (student_id, email, password_hash, name, image)
                VALUES (${data.student_id || null}, ${data.email}, ${data.password_hash || null}, ${data.name || null}, ${data.image || null})
                ON CONFLICT (email) DO UPDATE SET
                    student_id = COALESCE(EXCLUDED.student_id, users.student_id),
                    password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
                    name = COALESCE(EXCLUDED.name, users.name),
                    image = COALESCE(EXCLUDED.image, users.image)
                RETURNING *
            `;
        } else {
            query = sql`
                INSERT INTO users (student_id, email, password_hash, name, image)
                VALUES (${data.student_id || null}, ${data.email || null}, ${data.password_hash || null}, ${data.name || null}, ${data.image || null})
                RETURNING *
            `;
        }

        const { rows } = await query;
        console.log("DB: User created/updated successfully with ID:", rows[0].id);
        return rows[0] as DBUser;
    } catch (error) {
        console.error("DB Error in createUser:", error);
        throw error;
    }
}

export async function linkAccount(userId: number, provider: string, providerAccountId: string) {
    await sql`
        INSERT INTO accounts (user_id, provider, provider_account_id)
        VALUES (${userId}, ${provider}, ${providerAccountId})
        ON CONFLICT (provider, provider_account_id) DO NOTHING
    `;
}

export async function updateUserDetails(id: number, data: Partial<DBUser>) {
    await sql`
        UPDATE users 
        SET 
            student_id = COALESCE(${data.student_id}, student_id),
            password_hash = COALESCE(${data.password_hash}, password_hash),
            name = COALESCE(${data.name}, name),
            image = COALESCE(${data.image}, image)
        WHERE id = ${id}
    `;
}
