import { NextResponse, NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSiteSettings, updateSiteSettings } from "@/lib/settings-server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Loose validation: every field is optional, unknown keys are ignored. */
const settingsPatchSchema = z.object({
    upload: z
        .object({
            maxFileSizeMb: z.number().int().min(1).max(1024).optional(),
            maxFilesPerBatch: z.number().int().min(1).max(100).optional(),
            maxUploadsPerDay: z.number().int().min(1).max(1000).optional(),
            maxTotalResources: z.number().int().min(1).max(10000).optional(),
            allowedExtensions: z.array(z.string().min(1).max(20)).max(200).optional(),
            allowAnonymous: z.boolean().optional(),
        })
        .optional(),
    resources: z
        .object({
            enabled: z.boolean().optional(),
            uploadsEnabled: z.boolean().optional(),
            reportHideThreshold: z.number().int().min(1).max(1000).optional(),
            listLimit: z.number().int().min(1).max(5000).optional(),
            hiddenResourceIds: z.array(z.number().int()).max(10000).optional(),
            restoredResourceIds: z.array(z.number().int()).max(10000).optional(),
        })
        .optional(),
    content: z
        .object({
            contactEmail: z.string().email().optional(),
            uploadRulesTitle: z.string().max(200).optional(),
            uploadRulesSubtitle: z.string().max(400).optional(),
            uploadRulesAllowed: z.array(z.string().max(300)).max(50).optional(),
            uploadRulesDisallowed: z.array(z.string().max(300)).max(50).optional(),
            uploadDisclaimer: z.string().max(2000).optional(),
            termsLastUpdated: z.string().max(100).optional(),
        })
        .optional(),
    ai: z.object({ dailyLimit: z.number().int().min(1).max(10000).optional() }).optional(),
    maintenance: z
        .object({
            enabled: z.boolean().optional(),
            message: z.string().max(1000).optional(),
        })
        .optional(),
});

export async function GET(request: NextRequest) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    const settings = await getSiteSettings();
    return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = settingsPatchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid settings", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    try {
        const settings = await updateSiteSettings(parsed.data);
        return NextResponse.json({ ok: true, settings });
    } catch (error) {
        console.error("[admin/settings] Failed to update settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
