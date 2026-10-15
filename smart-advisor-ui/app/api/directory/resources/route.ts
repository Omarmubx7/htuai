import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "node:path";
import fs from "node:fs/promises";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveAuthenticatedUser } from "@/lib/resolve-user";
import { MAX_UPLOADS_PER_DAY, MAX_TOTAL_RESOURCES, REPORT_HIDE_THRESHOLD, LIST_LIMIT } from "@/lib/resource-uploads";

const MAX_DESCRIPTION_LENGTH = 1000;

const LIST_SELECT = {
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
    user_id: true,
} as const;

const ALLOWED_TYPES = ["pdf", "video", "link", "image", "folder", "other"];

async function getCourseCodesForMajor(majorKey: string): Promise<string[] | null> {
    try {
        const content = await fs.readFile(
            path.join(process.cwd(), "public/data/curriculum.json"),
            "utf8"
        );
        const data = JSON.parse(content);
        const majorData = data.majors[majorKey];
        if (!majorData) return null;

        const codes = new Set<string>();

        const processList = (list: Array<{ code?: string }>) => {
            if (!list) return;
            list.forEach((c) => {
                if (c.code) {
                    let code = c.code.trim();
                    if (code.startsWith("00") && code.length === 10) code = code.substring(2);
                    codes.add(code);
                }
            });
        };

        // Shared courses
        processList(data.shared?.university_requirements);
        processList(data.shared?.college_requirements);
        processList(data.shared?.university_electives);

        // Major-specific courses
        processList(majorData.university_requirements);
        processList(majorData.college_requirements);
        processList(majorData.university_electives);
        processList(majorData.department_requirements);
        processList(majorData.electives);
        processList(majorData.work_market_requirements);

        return Array.from(codes);
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get("course_code") || searchParams.get("courseCode");
    const majorKey = searchParams.get("major");

    const session = await getServerSession(authOptions);
    const user = session?.user ? await resolveAuthenticatedUser(session) : null;

    try {
        let courseCodes: string[] | undefined;

        // If major is specified, resolve to course codes
        if (majorKey && majorKey !== "all") {
            const codes = await getCourseCodesForMajor(majorKey);
            if (codes && codes.length > 0) {
                courseCodes = codes;
            }
        }

        const where: Record<string, unknown> = {
            // Automatically hide resources that have been reported enough times.
            report_count: { lt: REPORT_HIDE_THRESHOLD },
        };

        if (courseCode) {
            // Specific course takes priority
            where.course_code = courseCode;
        } else if (courseCodes) {
            // Filter by all courses in this major
            where.course_code = { in: courseCodes };
        }
        // else: no filter, return all

        const resources = await prisma.resource.findMany({
            where,
            orderBy: { created_at: "desc" },
            take: LIST_LIMIT,
            select: LIST_SELECT,
        });

        // Mark ownership in response based on session
        const currentName = session?.user?.name || session?.user?.email || null;
        const resourcesWithOwnership = resources.map((r) => ({
            ...r,
            is_owner: Boolean((user?.id && r.user_id === user.id) || (currentName && r.uploaded_by === currentName)),
        }));

        return NextResponse.json({ resources: resourcesWithOwnership });
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

    const rateLimit = checkRateLimit(req, { maxRequests: 30, windowMs: 60_000 });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const body = await req.json();
        const { course_code, title, type, url, file_path, description, semester, anonymous } = body;

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

        if (description && description.length > MAX_DESCRIPTION_LENGTH) {
            return NextResponse.json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` }, { status: 400 });
        }

        // Links must be valid http(s) URLs; file URLs are generated by our presign flow.
        if (type === "link" && url) {
            try {
                const parsed = new URL(url);
                if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                    throw new Error("invalid protocol");
                }
            } catch {
                return NextResponse.json({ error: "Please provide a valid http(s) link." }, { status: 400 });
            }
        }

        // ── Per-user quotas ──────────────────────────────────────────────
        if (user?.id) {
            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);

            const [todayCount, totalCount] = await Promise.all([
                prisma.resource.count({
                    where: { user_id: user.id, created_at: { gte: startOfToday } },
                }),
                prisma.resource.count({ where: { user_id: user.id } }),
            ]);

            if (todayCount >= MAX_UPLOADS_PER_DAY) {
                return NextResponse.json(
                    { error: `Daily upload limit reached (${MAX_UPLOADS_PER_DAY}/day). Try again tomorrow.` },
                    { status: 429 }
                );
            }

            if (totalCount >= MAX_TOTAL_RESOURCES) {
                return NextResponse.json(
                    { error: `You've reached the limit of ${MAX_TOTAL_RESOURCES} resources. Delete some before uploading more.` },
                    { status: 429 }
                );
            }
        }

        // ── Duplicate detection ──────────────────────────────────────────
        const duplicate = await prisma.resource.findFirst({
            where: {
                course_code,
                title: title.trim(),
                ...(url ? { url } : {}),
            },
            select: { id: true },
        });
        if (duplicate) {
            return NextResponse.json(
                { error: "A resource with this title and link already exists for this course." },
                { status: 409 }
            );
        }

        const isAnonymous = Boolean(anonymous);
        const uploadedBy = isAnonymous ? null : (session.user.name || session.user.email || null);

        const resource = await prisma.resource.create({
            data: {
                course_code,
                title: title.trim(),
                type,
                url: url || "",
                file_path: file_path || null,
                description: description?.trim() || null,
                uploaded_by: uploadedBy,
                semester: semester || null,
                user_id: user?.id ?? null,
            },
            select: LIST_SELECT,
        });

        const currentName = session?.user?.name || session?.user?.email || null;
        const resourceWithOwnership = {
            ...resource,
            is_owner: Boolean((user?.id && resource.user_id === user.id) || (currentName && resource.uploaded_by === currentName)),
        };

        return NextResponse.json(resourceWithOwnership, { status: 201 });
    } catch (error) {
        console.error("[directory] Failed to create resource:", error);
        return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
    }
}
