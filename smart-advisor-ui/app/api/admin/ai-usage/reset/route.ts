import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { createAdminLog } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    try {
        const deleted = await prisma.aIUsageLog.deleteMany({});

        await createAdminLog({
            type: 'ai_usage_reset',
            message: `Reset AI usage for all users (${deleted.count} entries removed)`,
            details: { deletedCount: deleted.count },
            event_kind: 'ai_usage_reset',
            target_id: 'all',
        });

        return NextResponse.json({ ok: true, deletedCount: deleted.count }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    } catch (error) {
        console.error('Failed to reset AI usage:', error);
        return NextResponse.json({ error: 'Failed to reset AI usage' }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
}