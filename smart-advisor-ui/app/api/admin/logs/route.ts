import { NextResponse, NextRequest } from 'next/server';
import { getVisitorLogs } from '@/lib/database';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const adminCheck = await requireAdmin();
    if (adminCheck) return adminCheck;

    try {
        const logs = await getVisitorLogs(100);
        return NextResponse.json(logs);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}
