import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getBaseUrl } from "@/lib/env";
import { getIntegrationToken } from "@/lib/database";

// GET /api/integrations/google-calendar — Generates an OAuth url to connect Calendar
export async function GET(req: NextRequest): Promise<Response> {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
        return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${getBaseUrl(req)}/api/connect/google/callback`;
    const returnTo = req.nextUrl.searchParams.get("returnTo") || "/planner/settings";

    if (!clientId) {
        return NextResponse.redirect(new URL("/?error=google_not_configured", req.url));
    }

    // Generate secure state parameter to prevent CSRF using Web Crypto API
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const state = btoa(String.fromCharCode(...array)).replace(/[=+/]/g, "").toLowerCase();
    const returnToEncoded = Buffer.from(returnTo).toString("base64url");
    const stateValue = `${state}.${returnToEncoded}`;

    // Append scopes
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email");
    url.searchParams.append("access_type", "offline");
    url.searchParams.append("prompt", "consent");
    url.searchParams.append("state", stateValue);

    const response = NextResponse.redirect(url.toString());
    
    // Store state in cookie for verification
    response.cookies.set("oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600, // 10 minutes
        path: "/"
    });
    
    return response;
}

async function upsertExamEvent(token: string, event: any, existingEventId?: string) {
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

async function processCourseExam(course: any, type: "Midterm" | "Final", token: string) {
    const date = type === "Midterm"
        ? (course.midterm_date ?? course.midtermDate)
        : (course.final_date ?? course.finalDate);
    if (!date) return null;

    const event = {
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
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.db_id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized: No database user found" }, { status: 401 });
    }

    const token = await getIntegrationToken(userId.toString(), "google_calendar");

    if (!token) {
        return NextResponse.json({ error: "Unauthorized: missing integration token" }, { status: 401 });
    }

    const { courses } = await req.json();
    if (!Array.isArray(courses)) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const results: any[] = [];
    const updatedCourses: any[] = [];

    for (const course of courses) {
        const updatedCourse = { ...course };
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
        successCount: results.filter(r => r.success).length,
        totalCount: results.length
    });
}
