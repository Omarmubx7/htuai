import { NextResponse } from 'next/server';
import { getVisitorLogs } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const secret = request.headers.get('x-admin-secret');
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const logs = await getVisitorLogs(100);
        return NextResponse.json(logs);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}
