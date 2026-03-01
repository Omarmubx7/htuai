import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAchievements } from "@/lib/gamification";

async function verifyAccess(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: 'Unauthorized', status: 401 };

    const email = session.user.email;
    const studentId = (session.user as any).student_id || session.user.name;

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

        const body = await req.json();

        // Allow updates of attributes
        const updatedInfo: any = { updated_at: new Date() };

        if (body.status !== undefined) updatedInfo.status = body.status;
        if (body.grade_letter !== undefined) updatedInfo.grade_letter = body.grade_letter;
        if (body.grade_point !== undefined) updatedInfo.grade_point = body.grade_point;
        if (body.final_mark !== undefined) updatedInfo.final_mark = body.final_mark;
        if (body.is_completed !== undefined) updatedInfo.is_completed = body.is_completed;
        if (body.instructor_name !== undefined) updatedInfo.instructor_name = body.instructor_name;
        if (body.location !== undefined) updatedInfo.location = body.location;
        if (body.class_schedule !== undefined) {
            // If frontend sends array, pick first element
            if (Array.isArray(body.class_schedule)) {
                updatedInfo.class_schedule = body.class_schedule[0] || "";
            } else {
                updatedInfo.class_schedule = body.class_schedule;
            }
        }
        if (body.midterm_date !== undefined) updatedInfo.midterm_date = body.midterm_date ? new Date(body.midterm_date) : null;
        if (body.final_date !== undefined) updatedInfo.final_date = body.final_date ? new Date(body.final_date) : null;

        const updated = await prisma.course.update({
            where: { id: courseId },
            data: updatedInfo
        });

        // Award XP for course completion (Spec: +150 XP)
        if (updated.is_completed && !existing.is_completed) {
            await prisma.gamificationProfile.upsert({
                where: { user_id: auth.user!.id },
                update: { xp: { increment: 150 } },
                create: { user_id: auth.user!.id, xp: 150, level: 1 }
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

        await prisma.course.delete({
            where: { id: courseId }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("DELETE Course Error:", e);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
