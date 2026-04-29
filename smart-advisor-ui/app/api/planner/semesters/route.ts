import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.db_id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized: No database user found' }, { status: 401 });

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });


        const semesters = await prisma.semester.findMany({
            where: { user_id: user.id },
            include: {
                courses: true
            },
            orderBy: [
                { year: 'desc' },
                { id: 'desc' }
            ]
        });

        return NextResponse.json({ semesters });
    } catch (error) {
        console.error("GET Semesters Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.db_id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized: No database user found' }, { status: 401 });

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });


        const body = await req.json();
        const { type, year, name, start_date, end_date } = body;

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

        return NextResponse.json({ semester: newSemester });
    } catch (error) {
        console.error("POST Semester Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
