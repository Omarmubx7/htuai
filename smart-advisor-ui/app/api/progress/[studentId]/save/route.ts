import { NextRequest, NextResponse } from 'next/server';
import { saveProgress } from '@/lib/database';

export async function POST(
    request: NextRequest,
    { params }: { params: { studentId: string } }
) {
    const { studentId } = await params;

    if (!studentId || studentId.length < 3) {
        return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { major, completed } = body as { major: string; completed: string[] };

        if (!major || !Array.isArray(completed)) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        await saveProgress(studentId, major, completed);
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("Save error:", e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
