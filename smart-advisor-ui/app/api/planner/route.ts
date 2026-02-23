import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { loadPlanner, savePlanner, deletePlanner, initPlannerTables, loadAllSemesters } from "@/lib/database";

// GET — load planner for current user
export async function GET(req: NextRequest) {
    console.log("[Planner API] GET request received");
    try {
        const session = await getServerSession(authOptions);
        console.log("[Planner API] Session resolved:", {
            hasSession: !!session,
            user: session?.user ? { name: session.user.name, email: session.user.email } : null
        });

        if (!session?.user) {
            console.warn("[Planner API] Unauthorized access attempt");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const studentId = (session.user as any).student_id || session.user.email || session.user.name;
        console.log("[Planner API] Resolved studentId:", studentId);

        if (!studentId) {
            console.error("[Planner API] No student ID found in session");
            return NextResponse.json({ error: "No student ID" }, { status: 400 });
        }

        console.log("[Planner API] Initializing tables...");
        await initPlannerTables();

        const { searchParams } = new URL(req.url);
        const all = searchParams.get("all") === "true";

        if (all) {
            console.log("[Planner API] Loading all semesters...");
            const data = await loadAllSemesters(studentId);
            return NextResponse.json(data);
        }

        console.log("[Planner API] Loading current planner...");
        const data = await loadPlanner(studentId);
        console.log("[Planner API] Load successful, returning data");
        return NextResponse.json(data || { id: "default", name: "My Planner", courses: [], studySessions: [] });
    } catch (e: any) {
        console.error("[Planner API] CRITICAL ERROR (GET):", e);
        return NextResponse.json({
            status: "error",
            error: "Failed to load planner",
            message: e.message,
            stack: e.stack
        }, { status: 500 });
    }
}

// POST — save planner for current user
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as any).student_id || session.user.email || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    try {
        await initPlannerTables();
        const body = await req.json();
        console.log(`[Planner API] Saving for student: ${studentId}`, { courses: body.courses?.length, sessions: body.studySessions?.length });

        // Validate structure
        if (!body.id || !Array.isArray(body.courses) || (body.studySessions !== undefined && !Array.isArray(body.studySessions))) {
            console.warn("[Planner API] Invalid data structure received:", body);
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }
        await savePlanner(studentId, {
            id: body.id,
            name: body.name || "My Planner",
            courses: body.courses,
            studySessions: body.studySessions || [],
        });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("[Planner API] CRITICAL ERROR (POST):", e);
        return NextResponse.json({
            status: "error",
            error: "Failed to save planner",
            message: e.message,
            stack: e.stack
        }, { status: 500 });
    }
}

// DELETE — reset planner for current user
export async function DELETE() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as any).student_id || session.user.email || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    try {
        await initPlannerTables();
        await deletePlanner(studentId);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("[Planner API] CRITICAL ERROR (DELETE):", e);
        return NextResponse.json({
            status: "error",
            error: "Failed to delete planner",
            message: e.message,
            stack: e.stack
        }, { status: 500 });
    }
}
