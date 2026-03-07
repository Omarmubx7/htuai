import { NextResponse, NextRequest } from "next/server";
import { sql } from '@vercel/postgres';
import { initDB, resetDB } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const trace = searchParams.get('trace');

    try {
        if (trace === 'init') {
            try {
                await initDB();
                return NextResponse.json({
                    status: 'success',
                    message: 'Database initialized Successfully'
                });
            } catch (err: unknown) {
                console.error("Initialization Error:", err);
                return NextResponse.json({
                    status: 'error',
                    message: err instanceof Error ? err.message : 'Unknown error',
                    stack: err instanceof Error ? err.stack : undefined
                }, { status: 500 });
            }
        }

        if (trace === 'reset') {
            try {
                await resetDB();
                return NextResponse.json({
                    status: 'success',
                    message: 'Database reset and re-initialized Successfully'
                });
            } catch (err: unknown) {
                console.error("Reset Error:", err);
                return NextResponse.json({
                    status: 'error',
                    message: err instanceof Error ? err.message : 'Unknown error',
                    stack: err instanceof Error ? err.stack : undefined
                }, { status: 500 });
            }
        }

        // Default: test connection and list tables
        const { rows } = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        return NextResponse.json({
            status: 'success',
            tables: rows.map(r => r.table_name)
        });
    } catch (error: unknown) {
        console.error("Debug Route Error:", error);
        return NextResponse.json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
