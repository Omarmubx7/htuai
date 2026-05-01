import { NextResponse, NextRequest } from 'next/server';
import { initDB } from '@/lib/database';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdmin();
    if (adminCheck) return adminCheck;

    try {
        await initDB();
        return NextResponse.json({ ok: true, message: 'Database initialized' });
    } catch (e) {
        console.error("Setup failed:", e);
        return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
    }
}
