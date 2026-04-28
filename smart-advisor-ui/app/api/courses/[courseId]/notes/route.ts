import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getCourseNotes, saveCourseNotes, initDB } from "@/lib/database";

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = session.user.student_id || session.user.email || session.user.name;
  const { courseId } = await params;
  const normalizedCourseId = String(courseId).trim().toUpperCase();

  try {
    await initDB();
    const notesStr = await getCourseNotes(studentId, normalizedCourseId);

    // Check if notes are already JSON
    let notes = notesStr;
    try {
      if (notesStr && (notesStr.startsWith('{"') || notesStr.startsWith('['))) {
        notes = JSON.parse(notesStr);
      }
    } catch {
      // Keep as string if parsing fails
    }

    return NextResponse.json({
      notes,
      updatedAt: new Date().toISOString() // In a real app, this would come from the DB
    });
  } catch (e) {
    console.error("Notes GET Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = session.user.student_id || session.user.email || session.user.name;
  const { courseId } = await params;
  const normalizedCourseId = String(courseId).trim().toUpperCase();
  const { notes } = await req.json();

  try {
    const notesStr = typeof notes === 'string' ? notes : JSON.stringify(notes);
    await initDB();
    await saveCourseNotes(studentId, normalizedCourseId, notesStr);
    return NextResponse.json({ success: true, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error("Notes POST Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
