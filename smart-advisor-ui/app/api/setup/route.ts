import { NextResponse } from 'next/server';
import { initDB } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await initDB();
        return NextResponse.json({ ok: true, message: 'Database initialized (including visitor_logs table)' });
    } catch (e) {
        console.error("Setup failed:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
