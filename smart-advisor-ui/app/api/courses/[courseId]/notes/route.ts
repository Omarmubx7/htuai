import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getCourseNotes, saveCourseNotes, initPlannerTables } from "@/lib/database";

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = (session.user as any).student_id || session.user.email || session.user.name;
  const { courseId } = await params;

  try {
    await initPlannerTables();
    const notes = await getCourseNotes(studentId, courseId);
    return NextResponse.json({ notes });
  } catch (e) {
    console.error("Notes GET Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = (session.user as any).student_id || session.user.email || session.user.name;
  const { courseId } = await params;
  const { notes } = await req.json();

  try {
    await initPlannerTables();
    await saveCourseNotes(studentId, courseId, notes);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Notes POST Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
