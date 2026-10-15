/**
 * Server-side access to the admin-editable site settings (`site_settings` table).
 *
 * Reads are defensive: any failure (missing row, DB hiccup, malformed JSON) falls
 * back to DEFAULT_SETTINGS so the app keeps working. Writes are additive: we
 * upsert the single `site` row and never touch any other data.
 */

import { prisma } from "@/lib/prisma";
import {
    DEFAULT_SETTINGS,
    SETTINGS_KEY,
    mergeSettings,
    type SiteSettings,
    type DeepPartial,
} from "@/lib/site-settings";
import type { Prisma } from "@prisma/client";

/** Small in-process cache so hot paths (presign/list) don't re-query constantly. */
let cache: { value: SiteSettings; at: number } | null = null;
const CACHE_TTL_MS = 15_000;

export async function getSiteSettings(): Promise<SiteSettings> {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
        return cache.value;
    }

    try {
        const row = await prisma.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
        const merged = mergeSettings(
            DEFAULT_SETTINGS,
            (row?.value as DeepPartial<SiteSettings> | undefined) ?? null
        );
        cache = { value: merged, at: Date.now() };
        return merged;
    } catch (error) {
        console.error("[settings] Failed to read site settings; using defaults:", error);
        return DEFAULT_SETTINGS;
    }
}

export async function updateSiteSettings(
    patch: DeepPartial<SiteSettings>
): Promise<SiteSettings> {
    const current = await getSiteSettings();
    const merged = mergeSettings(current, patch);

    await prisma.siteSetting.upsert({
        where: { key: SETTINGS_KEY },
        create: { key: SETTINGS_KEY, value: merged as unknown as Prisma.InputJsonValue },
        update: { value: merged as unknown as Prisma.InputJsonValue },
    });

    cache = { value: merged, at: Date.now() };
    return merged;
}

/** Clear the in-process cache (used by tests / after external writes). */
export function invalidateSettingsCache() {
    cache = null;
}
