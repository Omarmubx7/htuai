import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * List user accounts for the admin Users panel.
 * Read-only; never mutates the table.
 */
export async function GET(request: NextRequest) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') ?? '').trim();
    const limitRaw = Number(searchParams.get('limit') ?? 200);
    const limit = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 200, 1000);

    try {
        const users = await prisma.user.findMany({
            where: search
                ? {
                      OR: [
                          { name: { contains: search, mode: 'insensitive' } },
                          { email: { contains: search, mode: 'insensitive' } },
                          { student_id: { contains: search, mode: 'insensitive' } },
                      ],
                  }
                : undefined,
            orderBy: { id: 'desc' },
            take: limit,
            select: {
                id: true,
                name: true,
                email: true,
                student_id: true,
                role: true,
                created_at: true,
                _count: { select: { resources: true, semesters: true, visitor_logs: true } },
            },
        });

        const total = await prisma.user.count();

        return NextResponse.json({ users, total });
    } catch (error) {
        console.error('[admin/users] Failed to fetch users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
