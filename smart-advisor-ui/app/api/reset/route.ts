
import { NextResponse } from 'next/server';
import { resetDB } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await resetDB();
        return NextResponse.json({
            ok: true,
            message: 'DATABASE WIPED. All 74 users and all progress have been deleted. You are starting from zero.'
        });
    } catch (e) {
        console.error("Reset failed:", e);
        return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
    }
}
