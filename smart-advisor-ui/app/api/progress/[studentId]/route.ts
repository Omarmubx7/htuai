
import { NextRequest, NextResponse } from 'next/server';
import { loadProgress } from '@/lib/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: { studentId: string } }
) {
    const session = await getServerSession(authOptions);
    const { studentId: targetId } = await params;
    const major = request.nextUrl.searchParams.get('major') ?? 'default';

    if (!targetId || targetId.length < 3) {
        return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    const authedSid = (session?.user as any)?.student_id || session?.user?.name;

    if (!session || authedSid !== targetId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const completed = await loadProgress(targetId, major);
    return NextResponse.json({ studentId: targetId, major, completed });
}
