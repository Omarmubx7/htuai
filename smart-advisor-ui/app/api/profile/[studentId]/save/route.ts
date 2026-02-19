import { NextRequest, NextResponse } from 'next/server';
import { saveMajor } from '@/lib/database';

export async function POST(
    request: NextRequest,
    { params }: { params: { studentId: string } }
) {
    const { studentId } = params;
    if (!studentId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const { major } = await request.json() as { major: string };
    if (!major) return NextResponse.json({ error: 'Missing major' }, { status: 400 });

    saveMajor(studentId, major);
    return NextResponse.json({ ok: true });
}
