import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    try {
        const resources = await prisma.resource.findMany({
            orderBy: { report_count: 'desc' },
            select: {
                id: true,
                course_code: true,
                title: true,
                type: true,
                url: true,
                file_path: true,
                description: true,
                uploaded_by: true,
                semester: true,
                report_count: true,
                created_at: true,
                reports: {
                    orderBy: { created_at: 'desc' },
                    select: {
                        id: true,
                        reason: true,
                        detail: true,
                        created_by: true,
                        created_at: true,
                    },
                },
            },
        });

        return NextResponse.json(resources);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }
}
