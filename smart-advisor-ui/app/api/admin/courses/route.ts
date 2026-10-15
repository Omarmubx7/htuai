import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** List courses across all students for the admin Curriculum panel. Read-only. */
export async function GET(request: NextRequest) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') ?? '').trim();
    const limitRaw = Number(searchParams.get('limit') ?? 200);
    const limit = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 200, 1000);

    try {
        const courses = await prisma.course.findMany({
            where: search
                ? {
                      OR: [
                          { code: { contains: search, mode: 'insensitive' } },
                          { name: { contains: search, mode: 'insensitive' } },
                          { instructor_name: { contains: search, mode: 'insensitive' } },
                      ],
                  }
                : undefined,
            orderBy: { id: 'desc' },
            take: limit,
            select: {
                id: true,
                name: true,
                code: true,
                credits: true,
                instructor_name: true,
                location: true,
                status: true,
                grade_letter: true,
                grade_point: true,
                final_mark: true,
                is_completed: true,
                created_at: true,
                semester: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        year: true,
                        user: {
                            select: { id: true, name: true, email: true, student_id: true },
                        },
                    },
                },
            },
        });

        const total = await prisma.course.count();

        return NextResponse.json({ courses, total });
    } catch (error) {
        console.error('[admin/courses] Failed to fetch courses:', error);
        return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }
}
