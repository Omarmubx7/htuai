import { sql } from '@vercel/postgres';

/**
 * Drop all tables and recreate them. (Nuclear Reset)
 */
export async function resetDB() {
    // Drop in correct order of dependencies
    await sql`DROP TABLE IF EXISTS user_badges CASCADE;`;
    await sql`DROP TABLE IF EXISTS badges CASCADE;`;
    await sql`DROP TABLE IF EXISTS quests CASCADE;`;
    await sql`DROP TABLE IF EXISTS gamification_profiles CASCADE;`;
    await sql`DROP TABLE IF EXISTS calendar_events CASCADE;`;
    await sql`DROP TABLE IF EXISTS integration_tokens CASCADE;`;
    await sql`DROP TABLE IF EXISTS admin_logs CASCADE;`;
    await sql`DROP TABLE IF EXISTS study_sessions CASCADE;`;
    await sql`DROP TABLE IF EXISTS gpa_history CASCADE;`;
    await sql`DROP TABLE IF EXISTS course_notes CASCADE;`;
    await sql`DROP TABLE IF EXISTS courses CASCADE;`;
    await sql`DROP TABLE IF EXISTS semesters CASCADE;`;
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
 */
export async function initDB() {
    // Core Identity & Legacy Stats
    await sql`
        CREATE TABLE IF NOT EXISTS student_progress (
            student_id  TEXT    NOT NULL,
            major       TEXT    NOT NULL,
            completed   TEXT    NOT NULL DEFAULT '[]',
            updated_at  BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::bigint),
            PRIMARY KEY (student_id, major)
        );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_student_id ON student_progress (student_id);`;

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

    // 4.1 User
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            student_id TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            name TEXT,
            image TEXT,
            role TEXT DEFAULT 'student',
            created_at TIMESTAMP DEFAULT (NOW()),
            updated_at TIMESTAMP DEFAULT (NOW())
        );
    `;

    // 4.12 Admin Log
    await sql`
        CREATE TABLE IF NOT EXISTS admin_logs (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            message TEXT,
            details JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW()
        );
    `;

    // Auth Accounts
    await sql`
        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL,
            provider_account_id TEXT NOT NULL,
            UNIQUE(provider, provider_account_id)
        );
    `;

    // 4.2 Semester
    await sql`
        CREATE TABLE IF NOT EXISTS semesters (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL, -- winter | spring | summer
            year INTEGER NOT NULL,
            name TEXT NOT NULL,
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            semester_gpa FLOAT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `;

    // 4.3 Course
    await sql`
        CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            credits FLOAT NOT NULL,
            instructor_name TEXT,
            location TEXT,
            class_schedule JSONB DEFAULT '[]',
            status TEXT DEFAULT 'planned', -- planned | in_progress | completed | dropped
            grade_letter TEXT, -- D | M | P | U
            grade_point FLOAT,
            final_mark FLOAT,
            is_completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `;

    // 4.4 CourseNote
    await sql`
        CREATE TABLE IF NOT EXISTS course_notes (
            id SERIAL PRIMARY KEY,
            student_id TEXT, -- Legacy key support
            course_id TEXT, -- Can be code or reference id
            db_course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            content JSONB DEFAULT '{}',
            notes TEXT, -- Legacy HTML/String support
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `;

    // 4.5 StudySession
    await sql`
        CREATE TABLE IF NOT EXISTS study_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            date DATE DEFAULT CURRENT_DATE,
            duration_minutes INTEGER NOT NULL,
            type TEXT NOT NULL, -- reading | practice | project | review | other
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `;

    // 4.6 GPAHistory
    await sql`
        CREATE TABLE IF NOT EXISTS gpa_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL,
            semester_gpa FLOAT,
            cumulative_gpa FLOAT NOT NULL,
            classification TEXT, -- EX | VG | Good | Satisfactory | Unclassified
            created_at TIMESTAMP DEFAULT NOW()
        );
    `;

    // 4.7 Integration
    await sql`
        CREATE TABLE IF NOT EXISTS integration_tokens (
            id SERIAL PRIMARY KEY,
            student_id TEXT, -- Legacy key support
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL, -- google_calendar
            access_token TEXT NOT NULL,
            refresh_token TEXT,
            expires_at BIGINT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(student_id, provider)
        );
    `;

    // 4.8 CalendarEvent
    await sql`
        CREATE TABLE IF NOT EXISTS calendar_events (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
            type TEXT NOT NULL, -- class | midterm | final | assignment_due | other
            google_event_id TEXT,
            title TEXT NOT NULL,
            start_datetime TIMESTAMP NOT NULL,
            end_datetime TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `;

    // 4.9 GamificationProfile
    await sql`
        CREATE TABLE IF NOT EXISTS gamification_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            current_streak_days INTEGER DEFAULT 0,
            longest_streak_days INTEGER DEFAULT 0,
            last_activity_date DATE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `;

    // 4.10 Badge
    await sql`
        CREATE TABLE IF NOT EXISTS badges (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS user_badges (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
            awarded_at TIMESTAMP DEFAULT NOW()
        );
    `;

    // 4.11 Quest
    await sql`
        CREATE TABLE IF NOT EXISTS quests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            scope TEXT DEFAULT 'global', -- course | semester | global
            target_course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
            target_semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL,
            type TEXT NOT NULL,
            target_value FLOAT NOT NULL,
            current_value FLOAT DEFAULT 0,
            status TEXT DEFAULT 'active', -- active | completed | expired
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `;
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
    role: string;
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
    try {
        let query;
        if (data.student_id) {
            query = sql`
                INSERT INTO users (student_id, email, password_hash, name, image, role)
                VALUES (${data.student_id}, ${data.email || null}, ${data.password_hash || null}, ${data.name || null}, ${data.image || null}, ${data.role || 'student'})
                ON CONFLICT (student_id) DO UPDATE SET
                    password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
                    email = COALESCE(EXCLUDED.email, users.email),
                    name = COALESCE(EXCLUDED.name, users.name),
                    image = COALESCE(EXCLUDED.image, users.image),
                    role = COALESCE(EXCLUDED.role, users.role),
                    updated_at = NOW()
                RETURNING *
            `;
        } else if (data.email) {
            query = sql`
                INSERT INTO users (student_id, email, password_hash, name, image, role)
                VALUES (${data.student_id || null}, ${data.email}, ${data.password_hash || null}, ${data.name || null}, ${data.image || null}, ${data.role || 'student'})
                ON CONFLICT (email) DO UPDATE SET
                    student_id = COALESCE(EXCLUDED.student_id, users.student_id),
                    password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
                    name = COALESCE(EXCLUDED.name, users.name),
                    image = COALESCE(EXCLUDED.image, users.image),
                    role = COALESCE(EXCLUDED.role, users.role),
                    updated_at = NOW()
                RETURNING *
            `;
        } else {
            query = sql`
                INSERT INTO users (student_id, email, password_hash, name, image, role)
                VALUES (${data.student_id || null}, ${data.email || null}, ${data.password_hash || null}, ${data.name || null}, ${data.image || null}, ${data.role || 'student'})
                RETURNING *
            `;
        }

        const { rows } = await query;
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

export async function saveIntegrationToken(
    studentId: string,
    provider: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: number,
    metadata?: Record<string, any>
) {
    await sql`
        INSERT INTO integration_tokens (student_id, provider, access_token, refresh_token, expires_at, metadata, updated_at)
        VALUES (${studentId}, ${provider}, ${accessToken}, ${refreshToken || null}, ${expiresAt || null}, ${JSON.stringify(metadata || {})}, NOW())
        ON CONFLICT (student_id, provider) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = COALESCE(EXCLUDED.refresh_token, integration_tokens.refresh_token),
            expires_at = EXCLUDED.expires_at,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
    `;
}

export async function getIntegrationToken(studentId: string, provider: string) {
    const { rows } = await sql`
        SELECT * FROM integration_tokens WHERE student_id = ${studentId} AND provider = ${provider}
    `;
    if (rows.length === 0) return null;
    return {
        accessToken: rows[0].access_token,
        refreshToken: rows[0].refresh_token,
        expiresAt: rows[0].expires_at ? Number(rows[0].expires_at) : null,
        metadata: JSON.parse(rows[0].metadata || '{}'),
    };
}

export async function deleteIntegrationToken(studentId: string, provider: string) {
    await sql`DELETE FROM integration_tokens WHERE student_id = ${studentId} AND provider = ${provider}`;
}

export async function getCourseNotes(studentId: string, courseId: string): Promise<string | null> {
    try {
        const { rows } = await sql`
            SELECT notes FROM course_notes 
            WHERE student_id = ${studentId} AND course_id = ${courseId}
            LIMIT 1
        `;
        return rows[0]?.notes || null;
    } catch (e) {
        console.error("DB: getCourseNotes error:", e);
        return null;
    }
}

export async function saveCourseNotes(studentId: string, courseId: string, notes: string): Promise<void> {
    await sql`
        INSERT INTO course_notes (student_id, course_id, notes, updated_at)
        VALUES (${studentId}, ${courseId}, ${notes}, NOW())
        ON CONFLICT (student_id, course_id) DO UPDATE SET
            notes = EXCLUDED.notes,
            updated_at = NOW()
    `;
}
