import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveAuthenticatedUser } from "@/lib/resolve-user";

const ALLOWED_TYPES = ["pdf", "video", "link", "image", "folder", "other"];

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get("course_code") || searchParams.get("courseCode");

    try {
        const resources = await prisma.resource.findMany({
            where: courseCode ? { course_code: courseCode } : undefined,
            orderBy: { created_at: "desc" },
            select: {
                id: true,
                course_code: true,
                title: true,
                type: true,
                url: true,
                file_path: true,
                description: true,
                uploaded_by: true,
                semester: true,
                report_count: true,
                created_at: true,
            },
        });

        return NextResponse.json({ resources });
    } catch (error) {
        console.error("[directory] Failed to fetch resources:", error);
        return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveAuthenticatedUser(session);

    const rateLimit = checkRateLimit(req, { maxRequests: 10, windowMs: 60_000 });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const body = await req.json();
        const { course_code, title, type, url, file_path, description, semester } = body;

        if (!course_code || !title || !type || !semester || (!url && !file_path)) {
            return NextResponse.json(
                { error: "course_code, title, type, semester, and url or file_path are required" },
                { status: 400 }
            );
        }

        if (!ALLOWED_TYPES.includes(type)) {
            return NextResponse.json(
                { error: `Invalid type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
                { status: 400 }
            );
        }

        if (title.length > 200) {
            return NextResponse.json({ error: "Title must be 200 characters or fewer" }, { status: 400 });
        }

        const resource = await prisma.resource.create({
            data: {
                course_code,
                title: title.trim(),
                type,
                url: url || "",
                file_path: file_path || null,
                description: description?.trim() || null,
                uploaded_by: session.user.name || session.user.email || null,
                semester: semester || null,
                user_id: user?.id ?? null,
            },
            select: {
                id: true,
                course_code: true,
                title: true,
                type: true,
                url: true,
                file_path: true,
                description: true,
                uploaded_by: true,
                semester: true,
                report_count: true,
                created_at: true,
            },
        });

        return NextResponse.json(resource, { status: 201 });
    } catch (error) {
        console.error("[directory] Failed to create resource:", error);
        return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
    }
}
