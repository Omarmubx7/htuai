import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ROLE_VALUES = ['student', 'admin', 'banned'] as const;

const patchSchema = z.object({
    role: z.enum(ROLE_VALUES),
});

/**
 * Update a single user's role.
 *
 * Roles are the only field the admin can change here, and every value is
 * reversible (`user` ⇄ `admin` ⇄ `banned`) — no rows are ever deleted.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    const { id } = await params;
    const userId = Number.parseInt(id, 10);
    if (!Number.isFinite(userId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid role', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const nextRole = parsed.data.role;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, email: true, student_id: true },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Never lock the platform out of its own admin: refuse to demote the
        // last remaining admin account.
        if (user.role === 'admin' && nextRole !== 'admin') {
            const adminCount = await prisma.user.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                return NextResponse.json(
                    { error: 'This is the last admin account — promote another admin first.' },
                    { status: 409 }
                );
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { role: nextRole },
            select: { id: true, role: true, name: true, email: true, student_id: true },
        });

        // Append-only audit trail (best-effort; never blocks the change).
        await prisma.adminLog
            .create({
                data: {
                    type: 'user_role_change',
                    message: `Role for ${updated.email ?? updated.student_id ?? `#${updated.id}`} set to ${nextRole}`,
                    target_id: String(updated.id),
                    details: { from: user.role, to: nextRole },
                },
            })
            .catch(() => undefined);

        return NextResponse.json({ ok: true, user: updated });
    } catch (error) {
        console.error('[admin/users] Failed to update role:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
