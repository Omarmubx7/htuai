import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { initDB } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const trace = searchParams.get('trace');

    try {
        if (trace === 'init') {
            try {
                console.log("Debug: Running initDB...");
                await initDB();
                return NextResponse.json({
                    status: 'success',
                    message: 'Database initialized Successfully'
                });
            } catch (err: any) {
                console.error("Initialization Error:", err);
                return NextResponse.json({
                    status: 'error',
                    message: err.message,
                    stack: err.stack
                }, { status: 500 });
            }
        }

        // Default: test connection and list tables
        const { rows } = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        return NextResponse.json({
            status: 'success',
            tables: rows.map(r => r.table_name)
        });
    } catch (error: any) {
        console.error("Debug Route Error:", error);
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
