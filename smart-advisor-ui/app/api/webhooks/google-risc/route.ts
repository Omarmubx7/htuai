import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

// Google's RISC/JWKS endpoint for verifying security event tokens
const GOOGLE_JWKS = createRemoteJWKSet(
    new URL("https://www.googleapis.com/oauth2/v3/certs")
);

// POST /api/webhooks/google-risc
// Handles Google Cross-Account Protection (RISC) security events
export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();

        // Verify JWT signature against Google's JWKS
        const { payload } = await jwtVerify(bodyText, GOOGLE_JWKS, {
            issuer: "https://accounts.google.com",
        });

        // Process the RISC event
        const eventType = payload["iss"] ? "security_event" : "unknown";
        console.info(`[RISC] Verified event: ${eventType}, sub: ${payload.sub}`);

        // Acknowledge receipt
        return new NextResponse("Accepted", { status: 202 });
    } catch (error) {
        console.error("RISC event verification failed:", error);
        return new NextResponse("Bad Request", { status: 400 });
    }
}
