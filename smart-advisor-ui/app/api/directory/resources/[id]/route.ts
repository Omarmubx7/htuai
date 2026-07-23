import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveAuthenticatedUser } from "@/lib/resolve-user";

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveAuthenticatedUser(session);

    const { id } = await params;
    const resourceId = parseInt(id, 10);
    if (isNaN(resourceId)) {
        return NextResponse.json({ error: "Invalid resource ID" }, { status: 400 });
    }

    try {
        const resource = await prisma.resource.findUnique({
            where: { id: resourceId },
            select: { id: true, uploaded_by: true, user_id: true },
        });

        if (!resource) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        const isOwner = user?.id && resource.user_id === user.id;
        const fallbackOwner = resource.uploaded_by === (session.user.name || session.user.email);
        if (!isOwner && !fallbackOwner) {
            return NextResponse.json({ error: "You can only delete your own resources" }, { status: 403 });
        }

        await prisma.resource.delete({ where: { id: resourceId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[directory] Failed to delete resource:", error);
        return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
    }
}
