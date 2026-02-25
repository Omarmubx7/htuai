
import { NextRequest } from "next/server";

export function getBaseUrl(req?: Request | NextRequest) {
    if (req) {
        try {
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
