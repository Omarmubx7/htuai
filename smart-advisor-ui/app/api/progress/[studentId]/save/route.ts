
import { NextRequest, NextResponse } from 'next/server';
import { saveProgress, logVisitor } from '@/lib/database';
import { getClientInfo } from '@/lib/client-info';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function POST(
    request: NextRequest,
    { params }: { params: { studentId: string } }
) {
    const session = await getServerSession(authOptions);
    const { studentId: targetId } = await params;

    if (!targetId || targetId.length < 3) {
        return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    const authedSid = (session?.user as any)?.student_id || session?.user?.name;

    if (!session || authedSid !== targetId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { major, completed } = body as { major: string; completed: string[] };

        if (!major || !Array.isArray(completed)) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        await saveProgress(targetId, major, completed);

        // Silent logging linked to student
        const info = await getClientInfo();
        info.student_id = targetId;
        logVisitor(info).catch(e => console.error("Logging failed", e));

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("Save error:", e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
