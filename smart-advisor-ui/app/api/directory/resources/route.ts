import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "node:path";
import fs from "node:fs/promises";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveAuthenticatedUser } from "@/lib/resolve-user";

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

    try {
        let courseCodes: string[] | undefined;

        // If major is specified, resolve to course codes
        if (majorKey && majorKey !== "all") {
            const codes = await getCourseCodesForMajor(majorKey);
            if (codes && codes.length > 0) {
                courseCodes = codes;
            }
        }

        const where: Record<string, unknown> = {};

        if (courseCode) {
            // Specific course takes priority
            where.course_code = courseCode;
        } else if (courseCodes) {
            // Filter by all courses in this major
            where.course_code = { in: courseCodes };
        }
        // else: no filter, return all

        const resources = await prisma.resource.findMany({
            where: Object.keys(where).length > 0 ? where : undefined,
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

    const rateLimit = checkRateLimit(req, { maxRequests: 30, windowMs: 60_000 });
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
