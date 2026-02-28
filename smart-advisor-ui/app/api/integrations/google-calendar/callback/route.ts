import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { saveIntegrationToken, initDB } from "@/lib/database";
import { getBaseUrl } from "@/lib/env";

// GET /api/integrations/google-calendar/callback?code=...
// Google redirects here after the user authorizes
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }

    const studentId = ((session.user as Record<string, unknown>).student_id as string) || session.user.email || session.user.name;
    if (!studentId) {
        return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }
    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    const state = req.nextUrl.searchParams.get("state") || "/planner/settings";

    if (error || !code) {
        return NextResponse.redirect(new URL("/?error=google_denied", req.url));
    }

    try {
        await initDB();

        // Exchange code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: `${getBaseUrl(req)}/api/integrations/google-calendar/callback`,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenRes.ok) {
            console.error("Google token exchange failed:", await tokenRes.text());
            return NextResponse.redirect(new URL("/?error=google_token_failed", req.url));
        }

        const tokens = await tokenRes.json();

        // Fetch user profile to get the Google Account email
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        let googleEmail: string | undefined = undefined;
        let googleId: string | undefined = undefined;
        if (profileRes.ok) {
            const profile = await profileRes.json();
            googleEmail = profile.email;
            googleId = profile.id;
        }

        await saveIntegrationToken(
            studentId,
            "google_calendar",
            (tokens.access_token as string) || "",
            (tokens.refresh_token as string) || "",
            tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : undefined,
            googleId,
            googleEmail
        );

        const redirectUrl = new URL(state, req.url);
        redirectUrl.searchParams.set("connected", "google");
        return NextResponse.redirect(redirectUrl);
    } catch (e: unknown) {
        console.error("Google Calendar callback error:", e instanceof Error ? e.message : String(e));
        return NextResponse.redirect(new URL("/?error=google_callback_error", req.url));
    }
}
