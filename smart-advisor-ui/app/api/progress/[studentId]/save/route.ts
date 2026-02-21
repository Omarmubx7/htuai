
import { NextRequest, NextResponse } from 'next/server';
import { saveProgress, logVisitor } from '@/lib/database';
import { getClientInfo } from '@/lib/client-info';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ studentId: string }> }
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
        const { major, completed } = body as { major: string; completed: any[] };

        if (!major || !Array.isArray(completed)) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Check prerequisites: each course PREFIXnnn (where nnn > 101) requires PREFIX+(nnn-1)
        const completedCodes = new Set(
            completed.map((c: any) => (typeof c === 'string' ? c : c.code))
        );
        for (const code of completedCodes) {
            if (typeof code !== 'string') continue;
            const match = code.match(/^([A-Za-z]+)(\d+)$/);
            if (!match) continue;
            const prefix = match[1];
            const num = parseInt(match[2], 10);
            if (num > 101) {
                const prereqCode = `${prefix}${num - 1}`;
                if (!completedCodes.has(prereqCode)) {
                    return NextResponse.json(
                        { error: 'prerequisite_not_met', details: [{ code, requires: prereqCode }] },
                        { status: 400 }
                    );
                }
            }
        }

        await saveProgress(targetId, major, completed);

        // Silent logging linked to student
        const info = await getClientInfo();
        info.student_id = targetId;
        logVisitor(info).catch(e => console.error("Logging failed", e));

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Save error:", e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
