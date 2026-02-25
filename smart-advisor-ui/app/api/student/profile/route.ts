import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as any).student_id || session.user.name;
    const email = session.user.email;

    try {
        const body = await req.json();
        const { previous_gpa, previous_credits } = body;

        let user = await prisma.user.findFirst({
            where: { OR: [{ email: email || undefined }, { student_id: studentId || undefined }] },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const updatedProfile = await prisma.studentProfile.upsert({
            where: { student_id: studentId },
            update: {
                previous_gpa: previous_gpa === null ? null : parseFloat(previous_gpa),
                previous_credits: previous_credits === null ? null : parseFloat(previous_credits),
                updated_at: BigInt(Date.now()),
            },
            create: {
                student_id: studentId,
                major: "computing_bsc", // Default fallback
                previous_gpa: previous_gpa === null ? null : parseFloat(previous_gpa),
                previous_credits: previous_credits === null ? null : parseFloat(previous_credits),
                updated_at: BigInt(Date.now()),
            }
        });

        return NextResponse.json(
            { success: true, profile: { ...updatedProfile, updated_at: Number(updatedProfile.updated_at) } },
            { status: 200 }
        );

    } catch (e: any) {
        console.error("Failed to update student profile", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
