import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAdminLog } from "@/lib/database";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = session.user.student_id || session.user.email;
    const email = session.user.email;

    try {
        const body = await req.json();
        const { previous_gpa, previous_credits } = body;

        const user = await prisma.user.findFirst({
            where: { OR: [{ email: email ?? undefined }, { student_id: studentId ?? undefined }] },
            include: { student_profile: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const resolvedStudentId = user.student_id || user.student_profile?.student_id || studentId;
        if (!resolvedStudentId) {
            return NextResponse.json({ error: "Student ID not set" }, { status: 400 });
        }

        const updatedProfile = await prisma.studentProfile.upsert({
            where: { student_id: resolvedStudentId },
            update: {
                previous_gpa: previous_gpa === null ? null : parseFloat(previous_gpa),
                previous_credits: previous_credits === null ? null : parseFloat(previous_credits),
                updated_at: BigInt(Date.now()),
            },
            create: {
                student_id: resolvedStudentId,
                major: "computing_bsc", // Default fallback
                previous_gpa: previous_gpa === null ? null : parseFloat(previous_gpa),
                previous_credits: previous_credits === null ? null : parseFloat(previous_credits),
                updated_at: BigInt(Date.now()),
                user: {
                    connect: { id: user.id }
                }
            }
        });

        createAdminLog({
            type: 'profile_update',
            message: `Student ${resolvedStudentId} updated academic profile (GPA: ${previous_gpa}, Credits: ${previous_credits})`,
            details: { student_id: studentId, email, previous_gpa, previous_credits },
            event_kind: 'profile_update',
            target_id: resolvedStudentId,
        }).catch(() => {});

        return NextResponse.json(
            { success: true, profile: { ...updatedProfile, updated_at: Number(updatedProfile.updated_at) } },
            { status: 200 }
        );

    } catch (e: unknown) {
        console.error("Failed to update student profile", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
