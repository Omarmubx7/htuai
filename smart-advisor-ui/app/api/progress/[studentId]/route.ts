import { NextRequest, NextResponse } from 'next/server';
import { loadProgress } from '@/lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: { studentId: string } }
) {
    const { studentId } = await params;
    const major = request.nextUrl.searchParams.get('major') ?? 'default';

    if (!studentId || studentId.length < 3) {
        return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    const completed = await loadProgress(studentId, major);
    return NextResponse.json({ studentId, major, completed });
}
