import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Same status vocabulary the student-facing planner uses. */
const STATUS_VALUES = ['planned', 'in_progress', 'completed', 'dropped', 'failed'] as const;

/** Every field optional — only the keys present are written. */
const patchSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    code: z.string().min(1).max(50).optional(),
    credits: z.number().min(0).max(30).optional(),
    instructor_name: z.string().max(200).nullable().optional(),
    location: z.string().max(200).nullable().optional(),
    status: z.enum(STATUS_VALUES).optional(),
    grade_letter: z.string().max(5).nullable().optional(),
    grade_point: z.number().min(0).max(4.3).nullable().optional(),
    final_mark: z.number().min(0).max(100).nullable().optional(),
    is_completed: z.boolean().optional(),
});

/**
 * Edit a single course. Only the fields present in the body are written; no
 * course is ever deleted and untouched columns keep their values.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    const { id } = await params;
    const courseId = Number.parseInt(id, 10);
    if (!Number.isFinite(courseId)) {
        return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
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
            { error: 'Invalid course fields', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    if (Object.keys(parsed.data).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    try {
        const existing = await prisma.course.findUnique({
            where: { id: courseId },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        const updated = await prisma.course.update({
            where: { id: courseId },
            data: parsed.data,
            select: { id: true, name: true, code: true },
        });

        await prisma.adminLog
            .create({
                data: {
                    type: 'course_edit',
                    message: `Course ${updated.code} (${updated.name}) updated`,
                    course_id: updated.id,
                    target_id: String(updated.id),
                    details: { fields: Object.keys(parsed.data) },
                },
            })
            .catch(() => undefined);

        return NextResponse.json({ ok: true, course: updated });
    } catch (error) {
        console.error('[admin/courses] Failed to update course:', error);
        return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
    }
}
