import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { resolveUserByString } from "@/lib/database";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const identity = session.user.db_id?.toString()
        || (session.user as Record<string, unknown>).student_id as string
        || session.user.email
        || session.user.name;
    if (!identity) return NextResponse.json({ error: "No user identity" }, { status: 400 });

    const user = await resolveUserByString(identity);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    try {
        const body = await req.json();
        const { preferences } = body;

        await prisma.integrationToken.update({
            where: { user_id_provider: { user_id: user.id, provider: "google_calendar" } },
            data: { metadata: preferences || {} }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Failed to update preferences", e);
        return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }
}
