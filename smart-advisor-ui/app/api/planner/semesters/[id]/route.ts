import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

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
        const semesterId = parseInt(id, 10);

        const existing = await prisma.semester.findFirst({ where: { id: semesterId, user_id: auth.user!.id } });
        if (!existing) return NextResponse.json({ error: 'Semester not found' }, { status: 404 });

        const body = await req.json();
        const { name, start_date, end_date } = body;

        const updated = await prisma.semester.update({
            where: { id: semesterId },
            data: {
                name: name !== undefined ? name : existing.name,
                start_date: start_date ? new Date(start_date) : existing.start_date,
                end_date: end_date ? new Date(end_date) : existing.end_date,
                updated_at: new Date()
            },
            include: { courses: true }
        });

        return NextResponse.json({ semester: updated });
    } catch (e) {
        console.error("PUT Semester Error:", e);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await verifyAccess(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { id } = await params;
        const semesterId = parseInt(id, 10);

        const existing = await prisma.semester.findFirst({ where: { id: semesterId, user_id: auth.user!.id } });
        if (!existing) return NextResponse.json({ error: 'Semester not found' }, { status: 404 });

        await prisma.semester.delete({
            where: { id: semesterId }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("DELETE Semester Error:", e);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
