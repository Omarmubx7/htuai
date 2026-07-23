import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const ALLOWED_REASONS = ["broken_link", "wrong_course", "inappropriate"];

export async function POST(req: Request) {
    const rateLimit = checkRateLimit(req, { maxRequests: 5, windowMs: 60_000 });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const body = await req.json();
        const { resource_id, reason, detail, created_by } = body;

        if (!resource_id || !reason) {
            return NextResponse.json(
                { error: "resource_id and reason are required" },
                { status: 400 }
            );
        }

        if (!ALLOWED_REASONS.includes(reason)) {
            return NextResponse.json(
                { error: `Invalid reason. Allowed: ${ALLOWED_REASONS.join(", ")}` },
                { status: 400 }
            );
        }

        const existingResource = await prisma.resource.findUnique({
            where: { id: resource_id },
        });

        if (!existingResource) {
            return NextResponse.json({ error: "Resource not found" }, { status: 404 });
        }

        const report = await prisma.report.create({
            data: {
                resource_id,
                reason,
                detail: detail?.trim() || null,
                created_by: created_by?.trim() || null,
            },
            select: {
                id: true,
                resource_id: true,
                reason: true,
                detail: true,
                created_by: true,
                created_at: true,
            },
        });

        await prisma.resource.update({
            where: { id: resource_id },
            data: { report_count: { increment: 1 } },
        });

        return NextResponse.json(report, { status: 201 });
    } catch (error) {
        console.error("[directory] Failed to create report:", error);
        return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
    }
}
