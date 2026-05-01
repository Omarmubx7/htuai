import { NextResponse, NextRequest } from 'next/server';
import { getAIUsageStats } from '@/lib/ai-logger';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const adminCheck = await requireAdmin();
    if (adminCheck) return adminCheck;

    try {
        // Get days from query params, default to 7
        const url = new URL(request.url);
        const days = Number.parseInt(url.searchParams.get('days') || '7', 10);

        const stats = await getAIUsageStats(days);

        if (!stats) {
            return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
        }

        return NextResponse.json(stats, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    } catch (error) {
        console.error('Error fetching AI usage stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
}
