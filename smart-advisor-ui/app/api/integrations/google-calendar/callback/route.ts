import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { saveIntegrationToken, initPlannerTables } from "@/lib/database";
import { getBaseUrl } from "@/lib/env";

// GET /api/integrations/google-calendar/callback?code=...
// Google redirects here after the user authorizes
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.redirect(new URL("/planner?error=unauthorized", req.url));
    }

    const studentId = (session.user as any).student_id || session.user.name;
    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");

    if (error || !code) {
        return NextResponse.redirect(new URL("/planner?error=google_denied", req.url));
    }

    try {
        await initPlannerTables();

        // Exchange code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: `${getBaseUrl()}/api/integrations/google-calendar/callback`,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenRes.ok) {
            console.error("Google token exchange failed:", await tokenRes.text());
            return NextResponse.redirect(new URL("/planner?error=google_token_failed", req.url));
        }

        const tokens = await tokenRes.json();
        await saveIntegrationToken(
            studentId,
            "google_calendar",
            tokens.access_token,
            tokens.refresh_token,
            tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : undefined
        );

        return NextResponse.redirect(new URL("/planner?connected=google", req.url));
    } catch (e: any) {
        console.error("Google Calendar callback error:", e);
        return NextResponse.redirect(new URL("/planner?error=google_callback_error", req.url));
    }
}
