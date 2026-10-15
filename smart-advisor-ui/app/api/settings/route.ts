import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/settings-server";

export const dynamic = "force-dynamic";

/**
 * Public, read-only subset of the site settings that client components need
 * (upload limits, feature flags, rules copy). Never exposes admin-only data
 * such as hidden resource ids or the AI limit.
 */
export async function GET() {
    const s = await getSiteSettings();

    return NextResponse.json({
        upload: {
            maxFileSizeMb: s.upload.maxFileSizeMb,
            maxFilesPerBatch: s.upload.maxFilesPerBatch,
            maxUploadsPerDay: s.upload.maxUploadsPerDay,
            allowedExtensions: s.upload.allowedExtensions,
        },
        resources: {
            enabled: s.resources.enabled,
            uploadsEnabled: s.resources.uploadsEnabled,
            reportHideThreshold: s.resources.reportHideThreshold,
        },
        content: s.content,
        maintenance: s.maintenance,
    });
}
