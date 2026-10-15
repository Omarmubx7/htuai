/**
 * Site-wide, admin-editable configuration — shared shape + defaults.
 *
 * This module is CLIENT-SAFE (no Node/Prisma imports) so both the admin UI and
 * client components can import the types and defaults. Server-side reads/writes
 * live in `lib/settings-server.ts`.
 *
 * Defaults mirror the values that used to be hardcoded in `lib/resource-uploads.ts`
 * and the resources UI, so behaviour is unchanged until an admin edits something.
 */

import {
    MAX_FILE_SIZE,
    MAX_FILES_PER_BATCH,
    MAX_UPLOADS_PER_DAY,
    MAX_TOTAL_RESOURCES,
    REPORT_HIDE_THRESHOLD,
    LIST_LIMIT,
    MIME_BY_EXTENSION,
} from "./resource-uploads";

export interface UploadSettings {
    /** Max size of a single file, in megabytes. */
    maxFileSizeMb: number;
    /** Max files attachable in one upload batch. */
    maxFilesPerBatch: number;
    /** Max resources a signed-in user may create per calendar day. */
    maxUploadsPerDay: number;
    /** Max resources a signed-in user may own in total. */
    maxTotalResources: number;
    /** Allowed file extensions (lowercase, no dot). */
    allowedExtensions: string[];
    /** Whether signed-out visitors may upload (still requires auth to presign). */
    allowAnonymous: boolean;
}

export interface ResourceSettings {
    /** Master switch for the whole Resources feature. */
    enabled: boolean;
    /** Whether new uploads are accepted (browsing stays available when off). */
    uploadsEnabled: boolean;
    /** Publicly hidden once a resource collects this many reports. */
    reportHideThreshold: number;
    /** Safety cap on how many resources the public list endpoint returns. */
    listLimit: number;
    /**
     * Ids explicitly hidden/restored by an admin (Tier A: stored here instead of
     * a column on the `resources` table, so the existing table is never altered).
     */
    hiddenResourceIds: number[];
    /** Ids an admin has explicitly restored (overrides the report threshold). */
    restoredResourceIds: number[];
}

export interface ContentSettings {
    contactEmail: string;
    uploadRulesTitle: string;
    uploadRulesSubtitle: string;
    uploadRulesAllowed: string[];
    uploadRulesDisallowed: string[];
    uploadDisclaimer: string;
    termsLastUpdated: string;
}

export interface SiteSettings {
    upload: UploadSettings;
    resources: ResourceSettings;
    content: ContentSettings;
    ai: {
        /** Max AI requests per user per day. */
        dailyLimit: number;
    };
    maintenance: {
        enabled: boolean;
        message: string;
    };
}

export const SETTINGS_KEY = "site";

export const DEFAULT_SETTINGS: SiteSettings = {
    upload: {
        maxFileSizeMb: Math.round(MAX_FILE_SIZE / (1024 * 1024)),
        maxFilesPerBatch: MAX_FILES_PER_BATCH,
        maxUploadsPerDay: MAX_UPLOADS_PER_DAY,
        maxTotalResources: MAX_TOTAL_RESOURCES,
        allowedExtensions: Object.keys(MIME_BY_EXTENSION),
        allowAnonymous: true,
    },
    resources: {
        enabled: true,
        uploadsEnabled: true,
        reportHideThreshold: REPORT_HIDE_THRESHOLD,
        listLimit: LIST_LIMIT,
        hiddenResourceIds: [],
        restoredResourceIds: [],
    },
    content: {
        contactEmail: "omarmubaidincs@gmail.com",
        uploadRulesTitle: "Upload rules & disclaimer",
        uploadRulesSubtitle: "Share slides, briefs and templates — not your own work.",
        uploadRulesAllowed: [
            "Lecture slides & professor notes",
            "Assignment briefs and specs",
            "Past papers (where your instructor permits)",
            "Templates & blank formats",
            "Study guides, summaries & formula sheets",
            "Useful external links",
        ],
        uploadRulesDisallowed: [
            "Your own submitted or graded work",
            "Personal .docx / .pdf assignments — these can trigger a Turnitin similarity hit",
            "Copyrighted textbooks or paid course material",
            "Someone else's work without their permission",
            "Solutions to a currently active exam",
            "Anything with personal or sensitive data",
        ],
        uploadDisclaimer:
            "Uploading your own assignment can make Turnitin flag both you and whoever " +
            "downloads it. Keep it to shared course material. You are responsible for what " +
            "you upload, and content may be removed if it violates these rules.",
        termsLastUpdated: "October 15, 2026",
    },
    ai: {
        dailyLimit: 50,
    },
    maintenance: {
        enabled: false,
        message: "MubxAI is undergoing scheduled maintenance. Please check back shortly.",
    },
};

/** Deep-partial where arrays are replaced wholesale (not element-merged). */
export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends (infer U)[]
        ? U[]
        : T[K] extends object
          ? DeepPartial<T[K]>
          : T[K];
};

/** Deep-merge a stored (possibly partial/older) settings object over the defaults. */
export function mergeSettings(
    base: SiteSettings,
    stored: DeepPartial<SiteSettings> | null | undefined
): SiteSettings {
    if (!stored || typeof stored !== "object") return base;

    return {
        upload: { ...base.upload, ...(stored.upload ?? {}) },
        resources: {
            ...base.resources,
            ...(stored.resources ?? {}),
            hiddenResourceIds: stored.resources?.hiddenResourceIds ?? base.resources.hiddenResourceIds,
            restoredResourceIds:
                stored.resources?.restoredResourceIds ?? base.resources.restoredResourceIds,
        },
        content: { ...base.content, ...(stored.content ?? {}) },
        ai: { ...base.ai, ...(stored.ai ?? {}) },
        maintenance: { ...base.maintenance, ...(stored.maintenance ?? {}) },
    };
}

/** Max file size (bytes) from settings. */
export function maxFileSizeBytes(settings: SiteSettings): number {
    return Math.max(1, settings.upload.maxFileSizeMb) * 1024 * 1024;
}
