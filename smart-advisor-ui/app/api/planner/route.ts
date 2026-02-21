import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { loadPlanner, savePlanner, deletePlanner, initPlannerTables } from "@/lib/database";

// GET — load planner for current user
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as any).student_id || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    try {
        await initPlannerTables();
        const data = await loadPlanner(studentId);
        return NextResponse.json(data || { courses: null });
    } catch (e: any) {
        console.error("Planner load error:", e);
        return NextResponse.json({ error: "Failed to load" }, { status: 500 });
    }
}

// POST — save planner for current user
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as any).student_id || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    try {
        await initPlannerTables();
        const body = await req.json();
        // Validate structure
        if (!body.id || !Array.isArray(body.courses)) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }
        await savePlanner(studentId, {
            id: body.id,
            name: body.name,
            courses: body.courses,
            studySessions: body.studySessions || [],
        });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("Planner save error:", e);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}

// DELETE — reset planner for current user
export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as any).student_id || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    try {
        await initPlannerTables();
        await deletePlanner(studentId);
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("Planner delete error:", e);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
