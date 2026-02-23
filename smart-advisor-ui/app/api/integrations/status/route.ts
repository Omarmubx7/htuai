import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getIntegrationToken } from "@/lib/database";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ notion: false, google_calendar: false }, { status: 401 });
    }

    const studentId = (session.user as any).student_id || session.user.name;
    if (!studentId) {
        return NextResponse.json({ notion: false, google_calendar: false }, { status: 400 });
    }

    const [notionToken, googleToken] = await Promise.all([
        getIntegrationToken(studentId, "notion"),
        getIntegrationToken(studentId, "google_calendar")
    ]);

    return NextResponse.json({
        notion: !!notionToken,
        google_calendar: !!googleToken
    });
}
