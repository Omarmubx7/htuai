import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { saveIntegrationToken, initDB } from "@/lib/database";
import { getBaseUrl, requireEnv } from "@/lib/env";

// GET /api/connect/google/callback?code=...
// Google redirects here after the user authorizes
export async function GET(req: NextRequest) {
    console.log("[OAuth] ===== CALLBACK START =====");
    console.log("[OAuth] Request URL:", req.url);
    console.log("[OAuth] Request headers:", Object.fromEntries(req.headers.entries()));
    
    const session = await getServerSession(authOptions);
    console.log("[OAuth] Session status:", session ? "authenticated" : "no session");
    
    if (!session?.user) {
        console.error("[OAuth] No session or user");
        return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }

    const userId = session.user.db_id;
    if (!userId) {
        console.error("[OAuth] Could not determine userId from session", session.user);
        return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }
    const studentId = userId.toString();
    console.log("[OAuth] Using userId for integration:", studentId);

    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    const errorDescription = req.nextUrl.searchParams.get("error_description");
    const state = req.nextUrl.searchParams.get("state") || "/planner/settings";

    console.log("[OAuth] Params:", { code: code ? "present" : "MISSING", error, errorDescription, state });

    if (error || !code) {
        console.error("[OAuth] Google returned error or no code", { error, errorDescription, hasCode: !!code });
        const errUrl = new URL(state, req.url);
        errUrl.searchParams.set("error", "google_denied");
        return NextResponse.redirect(errUrl);
    }

    try {
        await initDB();
        console.log("[OAuth] Database initialized");

        // Exchange code for tokens
        const redirectUri = `${getBaseUrl(req)}/api/connect/google/callback`;
        const clientId = requireEnv("GOOGLE_CLIENT_ID");
        const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
        
        console.log("[OAuth] Exchange params:", {
            redirectUri,
            clientId: clientId ? clientId.substring(0, 10) + "..." : "MISSING",
            clientSecret: clientSecret ? "set" : "MISSING",
            hasCode: !!code
        });

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        console.log("[OAuth] Token exchange status:", tokenRes.status);

        if (!tokenRes.ok) {
            const errBody = await tokenRes.text();
            console.error("[OAuth] Token exchange failed:", { status: tokenRes.status, body: errBody });
            const errUrl = new URL(state, req.url);
            errUrl.searchParams.set("error", "google_token_failed");
            errUrl.searchParams.set("details", `Status ${tokenRes.status}`);
            return NextResponse.redirect(errUrl);
        }

        const tokens = await tokenRes.json();
        console.log("[OAuth] Tokens received:", { 
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            expiresIn: tokens.expires_in
        });

        // Fetch user profile to get the Google Account email
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        console.log("[OAuth] Profile fetch status:", profileRes.status);

        let googleEmail: string | undefined = undefined;
        let googleId: string | undefined = undefined;
        let googleName: string | undefined = undefined;
        if (profileRes.ok) {
            const profile = await profileRes.json();
            googleEmail = profile.email;
            googleId = profile.id;
            googleName = profile.name;
            console.log("[OAuth] Profile received:", { email: googleEmail, id: googleId, name: googleName });
        } else {
            console.warn("[OAuth] Could not fetch Google user profile:", profileRes.status);
        }

        console.log("[OAuth] Saving integration token...");
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
        console.log("[OAuth] Token saved successfully");

        const redirectUrl = new URL(state, req.url);
        redirectUrl.searchParams.set("connected", "google");
        console.log("[OAuth] ===== CALLBACK SUCCESS, redirecting to:", redirectUrl.toString());
        return NextResponse.redirect(redirectUrl);
    } catch (e: unknown) {
        console.error("[OAuth] ===== CALLBACK ERROR =====", e);
        console.error("[OAuth] Error stack:", e instanceof Error ? e.stack : "no stack");
        
        const errUrl = new URL(state, req.url);
        errUrl.searchParams.set("error", "oauth_failed");
        errUrl.searchParams.set("details", e instanceof Error ? e.message : "unknown_error");
        console.log("[OAuth] Redirecting with error:", errUrl.toString());
        return NextResponse.redirect(errUrl);
    }
}
