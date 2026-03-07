
import { NextRequest } from "next/server";

export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export function getBaseUrl(req?: Request | NextRequest) {
    if (req) {
        try {
            // First check for proxy headers which take precedence in production
            const forwardedHost = req.headers.get("x-forwarded-host");
            const forwardedProto = req.headers.get("x-forwarded-proto") || "https";

            if (forwardedHost) {
                return `${forwardedProto}://${forwardedHost}`;
            }

            // Fallback to regular url parsing
            const url = new URL(req.url);
            return url.origin;
        } catch (e) {
            // Fallback if URL is invalid
        }
    }

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    // Handle server-side
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')) {
        return process.env.NEXTAUTH_URL;
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}
