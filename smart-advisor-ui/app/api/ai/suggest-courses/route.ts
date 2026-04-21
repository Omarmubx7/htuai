import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getSuggestedCourses } from "@/lib/groq";

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

    try {
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
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const raw = await getSuggestedCourses({ major, completedCourses, candidateCourses });
        let parsed: unknown = {};
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = { recommendations: [], tips: [], raw };
        }

        return NextResponse.json({ result: parsed });
    } catch (error) {
        console.error("suggest-courses error", error);
        return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
    }
}
