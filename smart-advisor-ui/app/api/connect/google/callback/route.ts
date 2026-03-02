import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { saveIntegrationToken, initDB } from "@/lib/database";
import { getBaseUrl } from "@/lib/env";
import fs from "node:fs";

// GET /api/integrations/google-calendar/callback?code=...
// Google redirects here after the user authorizes
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }

    const studentId = ((session.user as Record<string, unknown>).student_id as string) || session.user.email || session.user.name;
    if (!studentId) {
        console.error("OAuth Callback: Could not determine studentId from session", session.user);
        return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }
    
    console.log(`OAuth Callback: Starting exchange for studentId: ${studentId}`);

    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    const state = req.nextUrl.searchParams.get("state") || "/planner/settings";

    if (error || !code) {
        console.error("OAuth Callback: Google returned error or no code", { error, code });
        const errUrl = new URL(state, req.url);
        errUrl.searchParams.set("error", "google_denied");
        return NextResponse.redirect(errUrl);
    }

    try {
        await initDB();

        // Exchange code for tokens
        console.log("OAuth Callback: Exchanging code for tokens...");
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: `${getBaseUrl(req)}/api/connect/google/callback`,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenRes.ok) {
            const errBody = await tokenRes.text();
            console.error("Google token exchange failed:", errBody);
            const errUrl = new URL(state, req.url);
            errUrl.searchParams.set("error", "google_token_failed");
            return NextResponse.redirect(errUrl);
        }

        const tokens = await tokenRes.json();
        console.log("OAuth Callback: Token exchange successful. Fetching profile...");

        // Fetch user profile to get the Google Account email
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        let googleEmail: string | undefined = undefined;
        let googleId: string | undefined = undefined;
        let googleName: string | undefined = undefined;
        if (profileRes.ok) {
            const profile = await profileRes.json();
            googleEmail = profile.email;
            googleId = profile.id;
            googleName = profile.name;
            console.log(`OAuth Callback: Connected to Google account: ${googleEmail}`);
        } else {
            console.warn("OAuth Callback: Could not fetch Google user profile");
        }

        console.log("OAuth Callback: Saving token to database...");
        await saveIntegrationToken({
            studentId,
            provider: "google_calendar",
            accessToken: (tokens.access_token as string) || "",
            refreshToken: (tokens.refresh_token as string) || "",
            expiresAt: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : undefined,
            providerAccountId: googleId,
            accountEmail: googleEmail,
            studentName: googleName
        });

        console.log("OAuth Callback: Redirecting to success...");
        const redirectUrl = new URL(state, req.url);
        redirectUrl.searchParams.set("connected", "google");
        return NextResponse.redirect(redirectUrl);
    } catch (e: any) {
        console.error("Calendar OAuth error:", e);
        try { fs.appendFileSync("oauth_debug.txt", String.raw`\n[${new Date().toISOString()}] OAUTH ERROR: ${e?.message}\n${e?.stack}\n`); } catch(error_) {
            console.error("Failed to write to oauth_debug.txt", error_);
        }
        
        const errUrl = new URL(state, req.url);
        errUrl.searchParams.set("error", "oauth_failed");
        errUrl.searchParams.set("details", e?.message || "unknown_error");
        return NextResponse.redirect(errUrl);
    }
}
