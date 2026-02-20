import { NextResponse } from 'next/server';
import { initDB } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const secret = request.headers.get('x-admin-secret');
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        await initDB();
        return NextResponse.json({ ok: true, message: 'Database initialized' });
    } catch (e) {
        console.error("Setup failed:", e);
        return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
    }
}
