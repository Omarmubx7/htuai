"use client";

import { useSitePolicy } from "@/lib/use-site-policy";

/**
 * Site-wide maintenance notice.
 *
 * Renders the admin-configured message above the header on every page of the
 * site. It is display-only: it does not block navigation or hide content, so
 * nothing is at risk if the flag is toggled on by mistake.
 *
 * Mounted once in the root layout. The shared `useSitePolicy` cache means the
 * settings are fetched a single time per page load and reused across client-side
 * navigations, so this costs no extra requests.
 */
export default function MaintenanceBanner() {
    const policy = useSitePolicy();

    if (!policy.maintenance.enabled) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="bg-[#dc4835] text-white text-xs sm:text-sm font-semibold px-4 py-2 text-center"
        >
            {policy.maintenance.message}
        </div>
    );
}
