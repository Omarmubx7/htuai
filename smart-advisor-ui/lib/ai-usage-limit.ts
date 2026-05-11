import { prisma } from "./prisma";

export interface DailyAiUsageLimit {
    allowed: boolean;
    usedToday: number;
    remaining: number;
    limit: number;
    resetAt: Date;
}

// Dev email gets unlimited AI access - change this to your email
const DEV_EMAIL = "omarmubaidincs@gmail.com";

// Reset AI limits at the start of each day.
function getResetTime(date = new Date()): Date {
    const reset = new Date(date);
    reset.setHours(0, 0, 0, 0);
    return reset;
}

// Legacy: Reset at start of day (kept for backward compatibility)
export function getStartOfToday(date = new Date()): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
}

export async function getDailyAiUsageCount(userId: number, resetAt = getResetTime(), endpoint?: string): Promise<number> {
    const where: import("@prisma/client").Prisma.AIUsageLogWhereInput = {
        user_id: userId,
        created_at: { gte: resetAt },
    };

    if (endpoint) where.endpoint = endpoint;

    try {
        return await prisma.aIUsageLog.count({ where });
    } catch (error) {
        console.error('[AI Usage Limit] Failed to check usage count. Defaulting to 0.', error);
        return 0; // Graceful fallback if table is missing or DB fails
    }
}

/**
 * Check daily AI usage for a given user and optional endpoint (per-button limit).
 * If `endpoint` is provided only logs for that endpoint are counted.
 * @param userEmail Optional email to check if dev (unlimited access)
 */
export async function checkDailyAiUsageLimit(
    userId: number,
    endpoint?: string | number,
    limit = 2,
    userEmail?: string
): Promise<DailyAiUsageLimit> {
    // Dev mode: unlimited access for dev email
    if (userEmail === DEV_EMAIL) {
        return {
            allowed: true,
            usedToday: 0,
            remaining: 999,
            limit: 999,
            resetAt: new Date(),
        };
    }

    // Support calling signature (userId, limit) for backward compatibility
    let _endpoint: string | undefined = undefined;
    let _limit = limit;

    if (typeof endpoint === 'string') {
        _endpoint = endpoint;
    } else if (typeof endpoint === 'number') {
        _limit = endpoint;
    }

    const resetAt = getResetTime();
    const usedToday = await getDailyAiUsageCount(userId, resetAt, _endpoint);

    return {
        allowed: usedToday < _limit,
        usedToday,
        remaining: Math.max(_limit - usedToday, 0),
        limit: _limit,
        resetAt,
    };
}