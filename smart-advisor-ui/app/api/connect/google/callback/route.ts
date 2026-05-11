import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { saveIntegrationToken, initDB } from "@/lib/database";
import { getBaseUrl, requireEnv } from "@/lib/env";

// GET /api/connect/google/callback?code=...
// Google redirects here after the user authorizes
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }

    const userId = session.user.db_id;
    if (!userId) {
        return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }
    const studentId = userId.toString();

    const code = req.nextUrl.searchParams.get("code");
    const error = req.nextUrl.searchParams.get("error");
    const _errorDescription = req.nextUrl.searchParams.get("error_description");
    const stateParam = req.nextUrl.searchParams.get("state") || "";

    if (error || !code) {
        const errUrl = new URL("/planner/settings", req.url);
        errUrl.searchParams.set("error", "google_denied");
        return NextResponse.redirect(errUrl);
    }

    // Verify state parameter to prevent CSRF
    const storedState = req.cookies.get("oauth_state")?.value;
    const [receivedState, returnToEncoded] = stateParam.split(".");

    if (!storedState || storedState !== receivedState) {
        return NextResponse.redirect(new URL("/?error=invalid_state", req.url));
    }

    // Decode returnTo URL
    let returnTo = "/planner/settings";
    if (returnToEncoded) {
        try {
            returnTo = Buffer.from(returnToEncoded, "base64url").toString();
        } catch {
            returnTo = "/planner/settings";
        }
    }

    // Clear state cookie
    const response = NextResponse.redirect(new URL(returnTo, req.url));
    response.cookies.delete("oauth_state");

    try {
        await initDB();

        // Exchange code for tokens
        const redirectUri = `${getBaseUrl(req)}/api/connect/google/callback`;
        const clientId = requireEnv("GOOGLE_CLIENT_ID");
        const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

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

        if (!tokenRes.ok) {
            const errUrl = new URL(returnTo, req.url);
            errUrl.searchParams.set("error", "google_token_failed");
            return NextResponse.redirect(errUrl);
        }

        const tokens = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number };

        // Fetch user profile to get the Google Account email
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        let googleEmail: string | undefined = undefined;
        let googleId: string | undefined = undefined;
        let googleName: string | undefined = undefined;
        if (profileRes.ok) {
            const profile = await profileRes.json() as { email?: string; id?: string; name?: string };
            googleEmail = profile.email;
            googleId = profile.id;
            googleName = profile.name;
        }

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

        const redirectUrl = new URL(returnTo, req.url);
        redirectUrl.searchParams.set("connected", "google");
        return NextResponse.redirect(redirectUrl);
    } catch (_e: unknown) {
        const errUrl = new URL(returnTo, req.url);
        errUrl.searchParams.set("error", "oauth_failed");
        return NextResponse.redirect(errUrl);
    }
}
