import { prisma } from "./prisma";
import { createAdminLog } from "./database";

// The core engine for dynamic gamification evaluation
// Run this after any major action (e.g., logging a study session)
export async function evaluateAchievements(userId: number, newMinutes: number = 0) {
    // 1. Fetch current profile, stats, and badges
    const profile = await prisma.gamificationProfile.findUnique({
        where: { user_id: userId }
    });

    if (!profile) return;

    const userBadges = await prisma.userBadge.findMany({
        where: { user_id: userId },
        include: { badge: true }
    });

    const existingBadgeCodes = new Set(userBadges.map(ub => ub.badge.code));

    // Total logged sessions
    const sessionCount = await prisma.studySession.count({
        where: { user_id: userId }
    });

    // Total logged minutes - Optimized with aggregate
    const aggregate = await prisma.studySession.aggregate({
        where: { user_id: userId },
        _sum: { duration_minutes: true }
    });
    const totalMinutes = aggregate._sum.duration_minutes || 0;

    const newBadgesUnlocked: string[] = [];

    // Rule 1: First Blood (Any session logged)
    if (sessionCount >= 1 && !existingBadgeCodes.has("first_blood")) {
        await awardBadge(userId, "first_blood", "First Blood", "Log your first study session", "Trophy");
        newBadgesUnlocked.push("First Blood");
    }

    // Rule 2: Scholar (5 hours total)
    if (totalMinutes >= 300 && !existingBadgeCodes.has("scholar")) {
        await awardBadge(userId, "scholar", "Scholar", "Log a total of 5 hours of study time", "BookOpen");
        newBadgesUnlocked.push("Scholar");
    }

    // Rule 3: Streak Master (7 days)
    if (profile.current_streak_days && profile.current_streak_days >= 7 && !existingBadgeCodes.has("streak_master")) {
        await awardBadge(userId, "streak_master", "Streak Master", "Hit a 7-day study streak", "Flame");
        newBadgesUnlocked.push("Streak Master");
    }

    // Handle Quests (Active Quests)
    await processActiveQuests(userId, newMinutes);

    // Check level ups based on XP (Spec: level = floor(xp / 500) + 1)
    const currentLevel = profile.level || 1;
    const calculatedLevel = Math.floor((profile.xp || 0) / 500) + 1;

    if (calculatedLevel !== currentLevel) {
        await prisma.gamificationProfile.update({
            where: { user_id: userId },
            data: { level: calculatedLevel }
        });

        createAdminLog({
            type: 'level_up',
            message: `User ${userId} leveled up to level ${calculatedLevel}`,
            details: { user_id: userId, new_level: calculatedLevel, xp: profile.xp },
            event_kind: 'level_up',
            target_id: String(userId),
        }).catch(() => {});
    }

    return { newBadgesUnlocked };
}

async function awardBadge(userId: number, code: string, name: string, description: string, icon: string) {
    // Upsert the badge dictionary definition first
    const badge = await prisma.badge.upsert({
        where: { code },
        update: {},
        create: { code, name, description, icon }
    });

    // Award to user
    await prisma.userBadge.create({
        data: {
            user_id: userId,
            badge_id: badge.id
        }
    });

    createAdminLog({
        type: 'badge_unlocked',
        message: `User ${userId} unlocked badge: ${name}`,
        details: { user_id: userId, badge_code: code, badge_name: name, description },
        event_kind: 'badge_unlock',
        target_id: String(userId),
    }).catch(() => {});
}

async function processActiveQuests(userId: number, newMinutes: number) {
    if (newMinutes <= 0) return;

    const activeQuests = await prisma.quest.findMany({
        where: { user_id: userId, status: "active" }
    });

    for (const quest of activeQuests) {
        if (quest.type === "study_time") {
            const currentValue = quest.current_value ?? 0;
            const newProgress = Math.min(currentValue + newMinutes, quest.target_value);

            if (newProgress >= quest.target_value) {
                // Completed Quest!
                await prisma.quest.update({
                    where: { id: quest.id },
                    data: { current_value: quest.target_value, status: "completed" }
                });

                // Grant reward XP
                await prisma.gamificationProfile.update({
                    where: { user_id: userId },
                    data: { xp: { increment: 50 } } // standard quest finish
                });

                createAdminLog({
                    type: 'quest_completed',
                    message: `User ${userId} completed quest: ${quest.type} (${quest.target_value}min)`,
                    details: { user_id: userId, quest_id: quest.id, quest_type: quest.type, target_value: quest.target_value },
                    event_kind: 'quest_complete',
                    target_id: String(userId),
                }).catch(() => {});
            } else {
                await prisma.quest.update({
                    where: { id: quest.id },
                    data: { current_value: newProgress }
                });
            }
        }
    }
}
