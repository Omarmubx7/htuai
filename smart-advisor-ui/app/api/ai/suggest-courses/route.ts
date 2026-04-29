import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getSuggestedCourses } from "@/lib/groq";
import { logAIUsage } from "@/lib/ai-logger";
import { prisma } from "@/lib/prisma";

type CandidateCourse = {
    code: string;
    name: string;
    credits: number;
    prereq?: string;
};

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    let userId: number | null = null;
    let status: 'success' | 'error' | 'timeout' = 'success';
    let errorMessage: string | undefined;

    try {
        // Get user ID for logging
        if (session.user?.email) {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
                select: { id: true },
            });
            userId = user?.id ?? null;
        }

        const body = await request.json();
        const major = typeof body.major === "string" ? body.major : "";
        const completedCourses = Array.isArray(body.completedCourses)
            ? body.completedCourses.filter((c: unknown): c is string => typeof c === "string")
            : [];
        const candidateCourses = Array.isArray(body.candidateCourses)
            ? body.candidateCourses.filter(
                (c: unknown): c is CandidateCourse =>
                    typeof c === "object" &&
                    c !== null &&
                    typeof (c as CandidateCourse).code === "string" &&
                    typeof (c as CandidateCourse).name === "string" &&
                    typeof (c as CandidateCourse).credits === "number"
            )
            : [];

        if (!major || candidateCourses.length === 0) {
            status = 'error';
            errorMessage = 'Invalid payload';
            await logAIUsage({
                userId,
                endpoint: 'suggest-courses',
                featureName: 'Course Suggestions',
                status,
                errorMessage,
                responseTimeMs: Date.now() - startTime,
            });
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        let parsed: unknown = {};
        try {
            const raw = await getSuggestedCourses({ major, completedCourses, candidateCourses });
            parsed = JSON.parse(raw);
        } catch {
            parsed = { recommendations: [], tips: [], raw: undefined };
        }

        // Log the usage
        await logAIUsage({
            userId,
            endpoint: 'suggest-courses',
            featureName: 'Course Suggestions',
            modelUsed: 'groq',
            status,
            errorMessage,
            responseTimeMs: Date.now() - startTime,
            metadata: {
                major,
                completedCoursesCount: completedCourses.length,
                candidateCoursesCount: candidateCourses.length,
            },
        });

        return NextResponse.json({ result: parsed });
    } catch (error: any) {
        status = 'error';
        errorMessage = error?.message || String(error);
        console.error("suggest-courses error", error);

        // Log the error
        await logAIUsage({
            userId,
            endpoint: 'suggest-courses',
            featureName: 'Course Suggestions',
            status,
            errorMessage,
            responseTimeMs: Date.now() - startTime,
        });

        return NextResponse.json({ 
            error: "Failed to generate suggestions", 
            details: errorMessage
        }, { status: 500 });
    }
}
