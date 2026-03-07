import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

// POST /api/webhooks/google-risc
// Handles Google Cross-Account Protection (RISC) security events
export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();

        // Decode the JWT to inspect the event (basic verification for now)
        // In full production, you'd verify the signature against Google's JWKS
        decodeJwt(bodyText);

        // Acknowledge receipt
        return new NextResponse("Accepted", { status: 202 });
    } catch (error) {
        console.error("Error processing RISC event:", error);
        return new NextResponse("Bad Request", { status: 400 });
    }
}
