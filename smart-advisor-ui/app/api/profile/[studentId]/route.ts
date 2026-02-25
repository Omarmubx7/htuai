
import { NextRequest, NextResponse } from 'next/server';
import { loadMajor } from '@/lib/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ studentId: string }> }
) {
    const session = await getServerSession(authOptions);
    const { studentId: targetId } = await params;

    if (!targetId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const authedSid = (session?.user as any)?.student_id || session?.user?.name;

    if (!session || authedSid !== targetId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const major = await loadMajor(targetId);
    const profile = await prisma.studentProfile.findUnique({
        where: { student_id: targetId },
        select: { previous_gpa: true, previous_credits: true }
    });

    return NextResponse.json({
        studentId: targetId,
        major,
        previous_gpa: profile?.previous_gpa || null,
        previous_credits: profile?.previous_credits || null
    });
}
