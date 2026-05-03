import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAchievements } from "@/lib/gamification";
import { createAdminLog } from "@/lib/database";

async function verifyAccess(_req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: 'Unauthorized', status: 401 };

    const email = session.user.email;
    const studentId = session.user.student_id || session.user.email;

    const user = await prisma.user.findFirst({
        where: { OR: [{ email: email || undefined }, { student_id: studentId || undefined }] }
    });

    if (!user) return { error: 'User not found', status: 404 };
    return { user };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await verifyAccess(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { id } = await params;
        const courseId = parseInt(id, 10);

        // Ensure course belongs to user via semester
        const existing = await prisma.course.findFirst({
            where: { id: courseId },
            include: { semester: true }
        });

        if (!existing || existing.semester?.user_id !== auth.user!.id) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        const body = await req.json() as Record<string, unknown>;

        const metadataFields: Array<keyof typeof body> = [
            'instructor_name',
            'location',
            'class_schedule',
            'final_mark',
            'status'
        ];
        const isMetadataUpdate = metadataFields.some((field) => body[field] !== undefined);
        const semesterHasDateRange = Boolean(existing.semester?.start_date) && Boolean(existing.semester?.end_date);

        if (isMetadataUpdate && !semesterHasDateRange) {
            return NextResponse.json(
                { error: 'Set semester start and end dates first before editing course metadata.' },
                { status: 400 }
            );
        }

        // Allow updates of attributes
        const updatedInfo: Parameters<typeof prisma.course.update>[0]["data"] = { updated_at: new Date() };

        // Core course fields
        if (body.code !== undefined) updatedInfo.code = String(body.code).toUpperCase();
        if (body.name !== undefined) updatedInfo.name = String(body.name);
        if (body.credits !== undefined) updatedInfo.credits = Number(body.credits);
        
        // Status and grade fields
        if (body.status !== undefined) updatedInfo.status = String(body.status);
        if (body.grade_letter !== undefined) updatedInfo.grade_letter = String(body.grade_letter);
        if (body.grade_point !== undefined) updatedInfo.grade_point = Number(body.grade_point);
        if (body.final_mark !== undefined) updatedInfo.final_mark = Number(body.final_mark);
        if (body.is_completed !== undefined) updatedInfo.is_completed = Boolean(body.is_completed);
        
        // Metadata fields
        if (body.instructor_name !== undefined) updatedInfo.instructor_name = body.instructor_name as string | null;
        if (body.location !== undefined) updatedInfo.location = body.location as string | null;
        if (body.class_schedule !== undefined) {
            updatedInfo.class_schedule = body.class_schedule as object;
        }
        if (body.midterm_date !== undefined) updatedInfo.midterm_date = body.midterm_date ? new Date(String(body.midterm_date)) : null;
        if (body.final_date !== undefined) updatedInfo.final_date = body.final_date ? new Date(String(body.final_date)) : null;

        const updated = await prisma.course.update({
            where: { id: courseId },
            data: updatedInfo
        });

        const changedFields = Object.keys(body).filter(k => k !== 'updated_at');
        createAdminLog({
            type: 'course_update',
            message: `Student ${auth.user!.student_id || auth.user!.email} updated course ${existing.code} (${changedFields.join(', ')})`,
            details: { student_id: auth.user!.student_id, email: auth.user!.email, course_code: existing.code, course_id: courseId, changed_fields: changedFields, is_completed: updated.is_completed, grade_letter: updated.grade_letter },
            event_kind: 'course_update',
            target_id: String(courseId),
            course_id: courseId,
        }).catch(() => {});

        // Award XP for course completion (Spec: +150 XP)
        if (updated.is_completed && !existing.is_completed) {
            await prisma.gamificationProfile.upsert({
                where: { user_id: auth.user!.id },
                update: { xp: { increment: 150 } },
                create: { user_id: auth.user!.id, xp: 160, level: 1 } // 10 base + 150 bonus if creating new
            });
            await evaluateAchievements(auth.user!.id);
        }

        return NextResponse.json({ course: updated });
    } catch (e) {
        console.error("PUT Course Error:", e);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await verifyAccess(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { id } = await params;
        const courseId = parseInt(id, 10);

        const existing = await prisma.course.findFirst({
            where: { id: courseId },
            include: { semester: true }
        });

        if (!existing || existing.semester?.user_id !== auth.user!.id) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        const courseCode = existing.code;
        await prisma.course.delete({
            where: { id: courseId }
        });

        createAdminLog({
            type: 'course_delete',
            message: `Student ${auth.user!.student_id || auth.user!.email} deleted course ${courseCode}`,
            details: { student_id: auth.user!.student_id, email: auth.user!.email, course_code: courseCode, course_id: courseId },
            event_kind: 'course_delete',
            target_id: String(courseId),
            course_id: courseId,
        }).catch(() => {});

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("DELETE Course Error:", e);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
