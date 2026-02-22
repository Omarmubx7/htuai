import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getIntegrationToken, initPlannerTables } from "@/lib/database";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ google_calendar: false, google_sheets: false }, { status: 401 });
    }

    const studentId = (session.user as any).student_id || session.user.name;
    if (!studentId) {
        return NextResponse.json({ google_calendar: false, google_sheets: false }, { status: 400 });
    }

    try {
        await initPlannerTables();

        const [googleToken, sheetsToken] = await Promise.all([
            getIntegrationToken(studentId, "google_calendar"),
            getIntegrationToken(studentId, "google_sheets")
        ]);

        return NextResponse.json({
            google_calendar: !!googleToken,
            google_sheets: !!sheetsToken
        });
    } catch (e) {
        console.error("Failed to fetch integration status:", e);
        return NextResponse.json({ google_calendar: false, google_sheets: false });
    }
}
