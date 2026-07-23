
import { NextResponse, NextRequest } from 'next/server';
import { resetDB } from '@/lib/database';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }

    const adminCheck = await requireAdmin();
    if (adminCheck) return adminCheck;

    try {
        await resetDB();
        return NextResponse.json({
            ok: true,
            message: 'Database reset complete.'
        });
    } catch (e) {
        console.error("Reset failed:", e);
        return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
    }
}
