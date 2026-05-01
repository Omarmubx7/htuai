interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
    maxRequests: number;
    windowMs: number;
    keyGenerator?: (req: Request) => string;
}

export function checkRateLimit(
    req: Request,
    options: RateLimitOptions
): { allowed: boolean; remaining: number; resetTime: number } {
    const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : getClientIp(req) || "anonymous";

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        // First request or window expired
        const resetTime = now + options.windowMs;
        rateLimitStore.set(key, { count: 1, resetTime });
        return {
            allowed: true,
            remaining: options.maxRequests - 1,
            resetTime
        };
    }

    if (entry.count >= options.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime
        };
    }

    entry.count++;
    return {
        allowed: true,
        remaining: options.maxRequests - entry.count,
        resetTime: entry.resetTime
    };
}

function getClientIp(req: Request): string | null {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }
    return null;
}

// Pre-configured rate limiters
export const authRateLimit = (req: Request) =>
    checkRateLimit(req, { maxRequests: 5, windowMs: 60 * 1000 }); // 5 requests per minute

export const apiRateLimit = (req: Request) =>
    checkRateLimit(req, { maxRequests: 100, windowMs: 60 * 1000 }); // 100 requests per minute

export const aiRateLimit = (req: Request) =>
    checkRateLimit(req, { maxRequests: 10, windowMs: 60 * 1000 }); // 10 requests per minute
