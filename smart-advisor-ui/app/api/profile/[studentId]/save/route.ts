import { NextRequest, NextResponse } from 'next/server';
import { saveMajor, logVisitor } from '@/lib/database';
import { getClientInfo } from '@/lib/client-info';

export async function POST(
    request: NextRequest,
    { params }: { params: { studentId: string } }
) {
    const { studentId } = await params;
    if (!studentId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        const { major } = await request.json() as { major: string };
        if (!major) return NextResponse.json({ error: 'Missing major' }, { status: 400 });

        await saveMajor(studentId, major);

        // Silent logging linked to student
        const info = await getClientInfo();
        info.student_id = studentId;
        logVisitor(info).catch(e => console.error("Logging failed", e));

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("Save profile error:", e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
