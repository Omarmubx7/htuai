import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAdminLog } from "@/lib/database";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const semesterId = Number.parseInt(id, 10);

    try {
        const notes = await prisma.semesterNote.findMany({
            where: { semester_id: semesterId },
            orderBy: { created_at: "desc" }
        });
        return NextResponse.json({ notes });
    } catch (e) {
        console.error("Fetch notes error:", e);
        return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const semesterId = Number.parseInt(id, 10);

    try {
        const body = await req.json() as { title?: string; notes?: string; content?: Record<string, unknown> };
        const { title, notes, content } = body;

        const newNote = await prisma.semesterNote.create({
            data: {
                semester_id: semesterId,
                title: title || "Untitled Note",
                notes: notes || "",
                content: content || {}
            }
        });

        createAdminLog({
            type: 'semester_notes',
            message: `Student ${session.user.student_id || session.user.email} created note "${title || 'Untitled'}" in semester ${semesterId}`,
            details: { student_id: session.user.student_id, email: session.user.email, semester_id: semesterId, note_id: newNote.id, title },
            event_kind: 'note_create',
            target_id: String(newNote.id),
        }).catch(() => {});

        return NextResponse.json({ note: newNote });
    } catch (e) {
        console.error("Create note error:", e);
        return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json() as { id: number | string; title?: string; notes?: string; content?: Record<string, unknown> };
        const { id, title, notes, content } = body;

        // Verify ownership: check that the note's semester belongs to the authenticated user
        const email = session.user.email;
        const studentId = session.user.student_id || session.user.name;
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: email || undefined }, { student_id: studentId || undefined }] }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const note = await prisma.semesterNote.findUnique({
            where: { id: Number(id) },
            include: { semester: true }
        });

        if (!note || note.semester.user_id !== user.id) {
            return NextResponse.json({ error: "Note not found or access denied" }, { status: 403 });
        }

        const updated = await prisma.semesterNote.update({
            where: { id: Number(id) },
            data: {
                title: title ?? undefined,
                notes: notes ?? undefined,
                content: content ?? undefined,
                updated_at: new Date()
            }
        });
        return NextResponse.json({ note: updated });
    } catch (e) {
        console.error("Update note error:", e);
        return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        // Verify ownership before deletion
        const email = session.user.email;
        const studentId = session.user.student_id || session.user.name;
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: email || undefined }, { student_id: studentId || undefined }] }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const note = await prisma.semesterNote.findUnique({
            where: { id: Number(id) },
            include: { semester: true }
        });

        if (!note || note.semester.user_id !== user.id) {
            return NextResponse.json({ error: "Note not found or access denied" }, { status: 403 });
        }

        await prisma.semesterNote.delete({
            where: { id: Number(id) }
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Delete note error:", e);
        return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }
}
