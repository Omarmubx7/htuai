import { NextResponse, NextRequest } from 'next/server';
import { getAIUsageStats } from '@/lib/ai-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const secret = request.headers.get('x-admin-secret');
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get days from query params, default to 7
        const url = new URL(request.url);
        const days = parseInt(url.searchParams.get('days') || '7', 10);

        const stats = await getAIUsageStats(days);

        if (!stats) {
            return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
        }

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching AI usage stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
