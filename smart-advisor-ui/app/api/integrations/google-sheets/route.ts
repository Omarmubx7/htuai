import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getIntegrationToken, saveIntegrationToken } from "@/lib/database";

/**
 * Refresh a Google access token using the stored refresh token.
 * Returns the new access token, or null if refresh failed.
 */
async function refreshAccessToken(
    studentId: string,
    token: { accessToken: string; refreshToken: string | null; expiresAt: number | null; metadata: Record<string, any> }
): Promise<string | null> {
    if (!token.refreshToken) return null;

    try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                refresh_token: token.refreshToken,
                grant_type: "refresh_token",
            }),
        });

        if (!res.ok) return null;

        const data = await res.json();
        const newAccessToken: string = data.access_token;
        const newExpiry = data.expires_in
            ? Math.floor(Date.now() / 1000) + data.expires_in
            : undefined;

        await saveIntegrationToken(
            studentId,
            "google_sheets",
            newAccessToken,
            token.refreshToken ?? undefined,
            newExpiry,
            token.metadata
        );

        return newAccessToken;
    } catch {
        return null;
    }
}

/**
 * Resolve a valid access token — use existing one if not expired, otherwise refresh.
 */
async function resolveAccessToken(
    studentId: string,
    token: { accessToken: string; refreshToken: string | null; expiresAt: number | null; metadata: Record<string, any> }
): Promise<string | null> {
    const now = Math.floor(Date.now() / 1000);
    if (token.expiresAt && token.expiresAt < now + 60) {
        return refreshAccessToken(studentId, token);
    }
    return token.accessToken;
}

// POST /api/integrations/google-sheets — Sync courses and logs to Google Sheets
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as any).student_id || session.user.name;
    const token = await getIntegrationToken(studentId, "google_sheets");

    if (!token) {
        return NextResponse.json({ error: "Google Sheets not connected" }, { status: 401 });
    }

    const accessToken = await resolveAccessToken(studentId, token);
    if (!accessToken) {
        return NextResponse.json({ error: "Token expired. Please reconnect Google Sheets." }, { status: 401 });
    }

    const { courses, studySessions } = await req.json();
    let spreadsheetId = token.metadata?.spreadsheetId;

    const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    };

    // 1. Auto-provision spreadsheet if none exists for this user
    if (!spreadsheetId) {
        try {
            const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    properties: { title: `HTU Study Plan — ${studentId}` },
                    sheets: [
                        { properties: { title: "Courses" } },
                        { properties: { title: "Study Logs" } },
                    ],
                }),
            });
            if (!createRes.ok) throw new Error(await createRes.text());
            const data = await createRes.json();
            spreadsheetId = data.spreadsheetId;

            // Persist the spreadsheet ID so future syncs reuse the same sheet
            await saveIntegrationToken(
                studentId,
                "google_sheets",
                accessToken,
                token.refreshToken ?? undefined,
                token.expiresAt ?? undefined,
                { ...token.metadata, spreadsheetId }
            );
        } catch (e: any) {
            return NextResponse.json({ error: "Failed to create spreadsheet: " + e.message }, { status: 500 });
        }
    }

    // 2. Build Courses rows
    const courseRows = [
        ["Course Name", "Code", "Credits", "Grade", "Status", "Midterm", "Final", "Professor", "Location"],
        ...(courses || []).map((c: any) => [
            c.name ?? "", c.id ?? "", c.credits ?? 0, c.grade || "—", c.status ?? "",
            c.midtermDate || "", c.finalDate || "", c.professor || "", c.location || "",
        ]),
    ];

    // 3. Build Study Logs rows
    const logRows = [
        ["Date", "Course", "Hours", "Notes"],
        ...(studySessions || []).map((s: any) => {
            const course = (courses || []).find((c: any) => c.id === s.courseId);
            return [s.date, course?.name || s.courseId, s.hours, s.notes || ""];
        }),
    ];

    try {
        // Use batchUpdate to clear then write both sheets atomically
        // Step A: Clear old data from both sheets
        await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({ ranges: ["Courses!A:Z", "Study Logs!A:Z"] }),
            }
        );

        // Step B: Write fresh data to both sheets in one batch call
        const batchRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    valueInputOption: "RAW",
                    data: [
                        { range: "Courses!A1", values: courseRows },
                        { range: "Study Logs!A1", values: logRows },
                    ],
                }),
            }
        );

        if (!batchRes.ok) {
            const err = await batchRes.text();
            return NextResponse.json({ error: "Batch update failed: " + err }, { status: 500 });
        }

        return NextResponse.json({ success: true, spreadsheetId });
    } catch (e: any) {
        return NextResponse.json({ error: "Sync failed: " + e.message }, { status: 500 });
    }
}
