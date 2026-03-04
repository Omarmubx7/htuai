import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = session.user.email;
    const studentId = (session.user as any).student_id || session.user.name;

    try {
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: email || undefined }, { student_id: studentId || undefined }] }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const body = await req.json();
        const { semester_id, name, code, credits, instructor_name, location } = body;

        if (!semester_id || !name || !code || credits === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify semester belongs to user
        const semester = await prisma.semester.findFirst({
            where: { id: Number(semester_id), user_id: user.id }
        });

        if (!semester) return NextResponse.json({ error: 'Semester not found' }, { status: 404 });

        // Check for duplicate course in same semester
        const existingCourse = await prisma.course.findFirst({
            where: { 
                semester_id: Number(semester_id), 
                code: code.toUpperCase() 
            }
        });

        if (existingCourse) {
            return NextResponse.json({ 
                error: 'Course already exists in this semester. Please choose a different course or edit the existing one.' 
            }, { status: 400 });
        }

        const newCourse = await prisma.course.create({
            data: {
                semester_id: Number(semester_id),
                name,
                code: code.toUpperCase(),
                credits: Number(credits),
                instructor_name: instructor_name || null,
                location: location || null,
                status: 'planned'
            }
        });

        return NextResponse.json({ course: newCourse });
    } catch (error) {
        console.error("POST Course Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
