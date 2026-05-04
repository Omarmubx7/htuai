import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAdminLog } from "@/lib/database";
import { resolveAuthenticatedUser } from "@/lib/resolve-user";
import { semesterSchema } from "@/lib/schemas/api";
import { validationErrorResponse } from "@/lib/validation";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const user = await resolveAuthenticatedUser(session);

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const semesters = await prisma.semester.findMany({
            where: { user_id: user.id },
            include: { courses: true },
            orderBy: [{ year: 'desc' }, { type: 'desc' }]
        });

        return NextResponse.json({ semesters });
    } catch (error) {
        console.error("GET Semesters Error:", error);
        return NextResponse.json({ error: "Server Error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const user = await resolveAuthenticatedUser(session);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const body = await req.json();
        const validation = semesterSchema.safeParse(body);
        if (!validation.success) {
            return validationErrorResponse(validation.error.issues);
        }
        const { type, name, start_date, end_date, year } = validation.data;

        if (!type || !year || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newSemester = await prisma.semester.create({
            data: {
                user_id: user.id,
                type,
                year: Number(year),
                name,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            },
            include: { courses: true }
        });

        createAdminLog({
            type: 'semester_create',
            message: `Student ${user.student_id || user.email} created semester "${name}" (${type} ${year})`,
            details: { student_id: user.student_id, email: user.email, semester_name: name, type, year },
            event_kind: 'semester_create',
            target_id: String(newSemester.id),
        }).catch(() => {});

        return NextResponse.json({ semester: newSemester });
    } catch (error) {
        console.error("POST Semester Error:", error);
        return NextResponse.json({ error: "Server Error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
