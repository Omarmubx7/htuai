import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = session.user.email;
    const studentId = session.user.student_id || session.user.name;

    try {
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: email || undefined }, { student_id: studentId || undefined }] }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Prisma transaction to wipe planner-specific data securely
        await prisma.$transaction([
            prisma.studySession.deleteMany({ where: { user_id: user.id } }),
            prisma.semester.deleteMany({ where: { user_id: user.id } })
            // Cascade delete will automatically handle Course, CourseNote, and Quests tied to semesters
        ]);

        return NextResponse.json({ success: true, message: "Planner reset successfully." });
    } catch (error) {
        console.error("DELETE Planner Reset Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
