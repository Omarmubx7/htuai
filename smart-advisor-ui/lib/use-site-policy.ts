"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type ContentSettings } from "@/lib/site-settings";

/** The public subset of settings returned by `GET /api/settings`. */
export interface SitePolicy {
    upload: {
        maxFileSizeMb: number;
        maxFilesPerBatch: number;
        maxUploadsPerDay: number;
        allowedExtensions: string[];
    };
    resources: {
        enabled: boolean;
        uploadsEnabled: boolean;
        reportHideThreshold: number;
    };
    content: ContentSettings;
    maintenance: { enabled: boolean; message: string };
}

const DEFAULT_POLICY: SitePolicy = {
    upload: {
        maxFileSizeMb: DEFAULT_SETTINGS.upload.maxFileSizeMb,
        maxFilesPerBatch: DEFAULT_SETTINGS.upload.maxFilesPerBatch,
        maxUploadsPerDay: DEFAULT_SETTINGS.upload.maxUploadsPerDay,
        allowedExtensions: DEFAULT_SETTINGS.upload.allowedExtensions,
    },
    resources: {
        enabled: DEFAULT_SETTINGS.resources.enabled,
        uploadsEnabled: DEFAULT_SETTINGS.resources.uploadsEnabled,
        reportHideThreshold: DEFAULT_SETTINGS.resources.reportHideThreshold,
    },
    content: DEFAULT_SETTINGS.content,
    maintenance: DEFAULT_SETTINGS.maintenance,
};

let cached: SitePolicy | null = null;
let inflight: Promise<SitePolicy | null> | null = null;

function fetchPolicy(): Promise<SitePolicy | null> {
    if (cached) return Promise.resolve(cached);
    if (!inflight) {
        inflight = fetch("/api/settings", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d && typeof d === "object") cached = { ...DEFAULT_POLICY, ...d };
                return cached;
            })
            .catch(() => null);
    }
    return inflight;
}

/**
 * Returns the current site policy, starting from safe defaults and upgrading to
 * the server values once loaded. A single in-flight request is shared by every
 * component on the page.
 */
export function useSitePolicy(): SitePolicy {
    const [policy, setPolicy] = useState<SitePolicy>(cached ?? DEFAULT_POLICY);

    useEffect(() => {
        let active = true;
        void fetchPolicy().then((p) => {
            if (active && p) setPolicy(p);
        });
        return () => {
            active = false;
        };
    }, []);

    return policy;
}
