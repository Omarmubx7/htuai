import { NextRequest, NextResponse } from 'next/server';
import { loadMajor } from '@/lib/database';

export async function GET(
    _req: NextRequest,
    { params }: { params: { studentId: string } }
) {
    const { studentId } = await params;
    if (!studentId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const major = await loadMajor(studentId);          // null = first-time student
    return NextResponse.json({ studentId, major });
}
