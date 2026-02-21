import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getIntegrationToken } from "@/lib/database";

// GET /api/integrations/google-calendar — Push midterm/final dates as events
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as any).student_id || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    const token = await getIntegrationToken(studentId, "google_calendar");
    if (!token) {
        return NextResponse.json({ error: "Google Calendar not connected. Go to Settings to connect." }, { status: 400 });
    }

    const { courses } = await req.json();
    if (!Array.isArray(courses)) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const results: { course: string; type: string; success: boolean; error?: string }[] = [];

    for (const course of courses) {
        for (const [field, type] of [["midtermDate", "Midterm"], ["finalDate", "Final"]] as const) {
            const date = course[field];
            if (!date) continue;

            const event = {
                summary: `${course.name} — ${type}`,
                description: `${type} exam for ${course.name} (${course.credits} CH)`,
                start: { date, timeZone: "Asia/Amman" },
                end: { date, timeZone: "Asia/Amman" },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: "popup", minutes: 1440 }, // 1 day before
                        { method: "popup", minutes: 60 },   // 1 hour before
                    ]
                }
            };

            try {
                const res = await fetch(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token.accessToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(event),
                    }
                );
                if (!res.ok) {
                    const err = await res.text();
                    results.push({ course: course.name, type, success: false, error: err });
                } else {
                    results.push({ course: course.name, type, success: true });
                }
            } catch (e: any) {
                results.push({ course: course.name, type, success: false, error: e.message });
            }
        }
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({ results, successCount, totalCount: results.length });
}
