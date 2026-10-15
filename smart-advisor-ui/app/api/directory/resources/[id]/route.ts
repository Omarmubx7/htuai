import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Admin-only resource deletion.
 *
 * Owners no longer have a delete path — deletion is performed by an admin from
 * the moderation dashboard (`/admin/dashboard` → Resources tab), which calls
 * `/api/admin/resources/[id]`. This route is kept as an admin-gated alias so a
 * normal user can never delete a resource by calling the API directly.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    const { id } = await params;
    const resourceId = parseInt(id, 10);
    if (isNaN(resourceId)) {
        return NextResponse.json({ error: "Invalid resource ID" }, { status: 400 });
    }

    try {
        const resource = await prisma.resource.findUnique({
            where: { id: resourceId },
            select: { id: true },
        });

        if (!resource) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        await prisma.resource.delete({ where: { id: resourceId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[directory] Failed to delete resource:", error);
        return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
    }
}
