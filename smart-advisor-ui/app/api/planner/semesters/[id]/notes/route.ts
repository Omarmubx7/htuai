import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const semesterId = parseInt(id, 10);

    try {
        const notes = await (prisma as any).semesterNote.findMany({
            where: { semester_id: semesterId },
            orderBy: { created_at: "desc" }
        });
        return NextResponse.json({ notes });
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const semesterId = parseInt(id, 10);

    try {
        const body = await req.json();
        const { title, notes, content } = body;

        const newNote = await (prisma as any).semesterNote.create({
            data: {
                semester_id: semesterId,
                title: title || "Untitled Note",
                notes: notes || "",
                content: content || {}
            }
        });
        return NextResponse.json({ note: newNote });
    } catch (e) {
        return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { id, title, notes, content } = body;

        const updated = await (prisma as any).semesterNote.update({
            where: { id: Number(id) },
            data: {
                title: title !== undefined ? title : undefined,
                notes: notes !== undefined ? notes : undefined,
                content: content !== undefined ? content : undefined,
                updated_at: new Date()
            }
        });
        return NextResponse.json({ note: updated });
    } catch (e) {
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

        await (prisma as any).semesterNote.delete({
            where: { id: Number(id) }
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }
}
