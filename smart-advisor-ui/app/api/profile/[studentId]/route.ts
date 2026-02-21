
import { NextRequest, NextResponse } from 'next/server';
import { loadMajor } from '@/lib/database';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

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
    return NextResponse.json({ studentId: targetId, major });
}
