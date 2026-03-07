import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getIntegrationToken } from "@/lib/database";
import { getBaseUrl, requireEnv } from "@/lib/env";

interface GoogleExamEventPayload {
    summary: string;
    description: string;
    start: { date: string; timeZone: string };
    end: { date: string; timeZone: string };
    reminders: { useDefault: boolean; overrides: Array<{ method: string; minutes: number }> };
}

interface SyncableCourse {
    name: string;
    credits: number;
    midtermDate?: string | null;
    finalDate?: string | null;
    midtermEventId?: string | null;
    finalEventId?: string | null;
    [key: string]: unknown;
}

interface UpsertResult {
    success: boolean;
    eventId?: string;
    error?: string;
}

// GET /api/integrations/google-calendar — Generates an OAuth url to connect Calendar
export async function GET(req: NextRequest): Promise<Response> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.redirect(new URL("/?error=unauthorized", req.url));

    const clientId = requireEnv("GOOGLE_CLIENT_ID");
    const redirectUri = `${getBaseUrl(req)}/api/connect/google/callback`;
    const returnTo = req.nextUrl.searchParams.get("returnTo") || "/planner/settings";

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

async function upsertExamEvent(token: string, event: GoogleExamEventPayload, existingEventId?: string): Promise<UpsertResult> {
    let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    let method = "POST";

    if (existingEventId) {
        method = "PATCH";
        url = `${url}/${existingEventId}`;
    }

    let res = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
    });

    if (!res.ok && res.status === 404 && existingEventId) {
        res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
        });
    }

    if (!res.ok) return { success: false, error: await res.text() };
    const data = await res.json();
    return { success: true, eventId: data.id };
}

async function processCourseExam(course: SyncableCourse, type: "Midterm" | "Final", token: string): Promise<UpsertResult | null> {
    const date = type === "Midterm" ? course.midtermDate : course.finalDate;
    if (!date) return null;

    const event: GoogleExamEventPayload = {
        summary: `${course.name} — ${type}`,
        description: `${type} exam for ${course.name} (${course.credits} CH)`,
        start: { date, timeZone: "Asia/Amman" },
        end: { date, timeZone: "Asia/Amman" },
        reminders: {
            useDefault: false,
            overrides: [
                { method: "popup", minutes: 10080 },
                { method: "popup", minutes: 4320 },
                { method: "popup", minutes: 1440 },
            ]
        }
    };

    const existingId = type === "Midterm" ? course.midtermEventId : course.finalEventId;
    return upsertExamEvent(token, event, existingId);
}

// POST /api/connect/google — Push midterm/final dates as events
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as Record<string, unknown>).student_id as string || session.user.email || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    const token = await getIntegrationToken(studentId, "google_calendar");
    if (!token) {
        return NextResponse.json({ error: "Unauthorized: missing integration token" }, { status: 401 });
    }

    const payload = await req.json() as { courses?: SyncableCourse[] };
    const courses = payload.courses;
    if (!Array.isArray(courses)) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const results: Array<{ course: string; type: "Midterm" | "Final"; success: boolean; eventId?: string; error?: string }> = [];
    const updatedCourses: SyncableCourse[] = [];

    for (const course of courses) {
        const updatedCourse: SyncableCourse = { ...course };
        for (const type of ["Midterm", "Final"] as const) {
            const res = await processCourseExam(course, type, token.accessToken);
            if (!res) continue;

            results.push({ course: course.name, type, ...res });
            if (res.success) {
                if (type === "Midterm") updatedCourse.midtermEventId = res.eventId;
                else updatedCourse.finalEventId = res.eventId;
            }
        }
        updatedCourses.push(updatedCourse);
    }

    return NextResponse.json({
        success: true,
        results,
        updatedCourses,
        eventsProcessed: results.length,
        successCount: results.filter((r) => r.success).length,
        totalCount: results.length
    });
}
