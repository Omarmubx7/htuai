import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getIntegrationToken } from "@/lib/database";
import { getBaseUrl } from "@/lib/env";

// GET /api/integrations/google-calendar — Generates an OAuth url to connect Calendar
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.redirect(new URL("/?error=unauthorized", req.url));

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${getBaseUrl(req)}/api/integrations/google-calendar/callback`;
    const returnTo = req.nextUrl.searchParams.get("returnTo") || "/planner/settings";

    if (!clientId) {
        return NextResponse.redirect(new URL("/?error=google_not_configured", req.url));
    }

    // Append scopes

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email");
    url.searchParams.append("access_type", "offline");
    url.searchParams.append("prompt", "consent");
    url.searchParams.append("state", returnTo);

    return NextResponse.redirect(url.toString());
}

// POST /api/integrations/google-calendar — Push midterm/final dates as events
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as Record<string, unknown>).student_id as string || session.user.email || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    const token = await getIntegrationToken(studentId, "google_calendar");
    if (!token) {
        return NextResponse.json({ error: "Unauthorized: missing integration token. Google Calendar not connected." }, { status: 401 });
    }

    const { courses } = await req.json();
    if (!Array.isArray(courses)) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const results: { course: string; type: string; success: boolean; eventId?: string; error?: string }[] = [];
    const updatedCourses: Record<string, unknown>[] = [];

    for (const course of courses) {
        const updatedCourse = { ...course };
        for (const [field, type] of [["midtermDate", "Midterm"], ["finalDate", "Final"]] as const) {
            const date = course[field];
            if (!date) continue;

            const existingEventId = type === "Midterm" ? course.midtermEventId : course.finalEventId;
            const event = {
                summary: `${course.name} — ${type}`,
                description: `${type} exam for ${course.name} (${course.credits} CH)`,
                start: { date, timeZone: "Asia/Amman" },
                end: { date, timeZone: "Asia/Amman" },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: "popup", minutes: 10080 }, // 7 days before
                        { method: "popup", minutes: 4320 },  // 3 days before
                        { method: "popup", minutes: 1440 },  // 1 day before
                    ]
                }
            };

            try {
                let res;
                let method = "POST";
                let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

                if (existingEventId) {
                    method = "PATCH";
                    url = `${url}/${existingEventId}`;
                }

                res = await fetch(url, {
                    method,
                    headers: {
                        Authorization: `Bearer ${token.accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(event),
                });

                // If PATCH failed with 404, the event might have been deleted manually. Fallback to POST.
                if (!res.ok && res.status === 404 && existingEventId) {
                    res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token.accessToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(event),
                    });
                }

                if (!res.ok) {
                    const err = await res.text();
                    results.push({ course: course.name, type, success: false, error: err });
                } else {
                    const data = await res.json();
                    const newEventId = data.id;
                    results.push({ course: course.name, type, success: true, eventId: newEventId });

                    if (type === "Midterm") updatedCourse.midtermEventId = newEventId;
                    else updatedCourse.finalEventId = newEventId;
                }
            } catch (e: unknown) {
                results.push({ course: course.name, type, success: false, error: e instanceof Error ? e.message : String(e) });
            }
        }
        updatedCourses.push(updatedCourse);
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
        success: true,
        results,
        updatedCourses,
        eventsProcessed: results.length,
        successCount,
        totalCount: results.length
    });
}
