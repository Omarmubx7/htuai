
import { NextResponse } from 'next/server';
import { resetDB } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const secret = request.headers.get('x-admin-secret');
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
