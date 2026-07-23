import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    const { id } = await params;
    const resourceId = parseInt(id, 10);
    if (isNaN(resourceId)) {
        return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
    }

    try {
        const resource = await prisma.resource.findUnique({
            where: { id: resourceId },
            select: { id: true, title: true },
        });

        if (!resource) {
            return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        await prisma.resource.delete({ where: { id: resourceId } });

        return NextResponse.json({ ok: true, deleted: resource.title });
    } catch {
        return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
    }
}
