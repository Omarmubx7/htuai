import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Force create tables
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

        // Insert dummy data to verify
        await sql`
            INSERT INTO student_progress (student_id, major, completed)
            VALUES ('test-user', 'computer_science', '["CS101"]')
            ON CONFLICT (student_id, major) DO UPDATE 
            SET completed = EXCLUDED.completed, updated_at = (EXTRACT(EPOCH FROM NOW())::bigint);
        `;

        return NextResponse.json({
            message: "Database Setup Complete! Tables created. Test data inserted for 'test-user'."
        });
    } catch (error) {
        console.error("Setup error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
