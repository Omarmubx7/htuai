import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";

export function middleware(request: NextRequest) {
    const nonce = randomBytes(16).toString("base64");
    
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://cdn.vercel-insights.com https://va.vercel-scripts.com https://vercel.live;
        style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://vercel.live;
        font-src 'self' https://fonts.gstatic.com https://r2cdn.perplexity.ai https://vercel.live;
        img-src 'self' data: https: https://vercel.live;
        connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://vercel.live https://geoip.cactusglobal.io;
        frame-src 'self' https://vercel.live https://www.youtube.com;
        child-src 'self' https://vercel.live;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
    `.replace(/\s+/g, ' ');

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    response.headers.set("Content-Security-Policy", cspHeader);
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

    return response;
}

export const config = {
    matcher: [
        {
            source: "/((?!_next/static|_next/image|favicon.ico).*)",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
    ],
};
