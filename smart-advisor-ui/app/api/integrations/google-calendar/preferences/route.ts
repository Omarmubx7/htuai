import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as any).student_id || session.user.email || session.user.name;

    try {
        const body = await req.json();
        const { preferences } = body;

        await prisma.integrationToken.updateMany({
            where: { student_id: studentId, provider: "google_calendar" },
            data: {
                metadata: preferences || {}
            }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Failed to update preferences", e);
        return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }
}
