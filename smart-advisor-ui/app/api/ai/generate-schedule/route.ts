import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getStudySchedule } from "@/lib/groq";

type ScheduleCourse = {
    code: string;
    name: string;
    credits: number;
};

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const major = typeof body.major === "string" ? body.major : "";
        const weeklyHours =
            typeof body.weeklyHours === "number" && Number.isFinite(body.weeklyHours)
                ? Math.max(4, Math.min(35, body.weeklyHours))
                : 14;
        const courses = Array.isArray(body.courses)
            ? body.courses.filter(
                (c: unknown): c is ScheduleCourse =>
                    typeof c === "object" &&
                    c !== null &&
                    typeof (c as ScheduleCourse).code === "string" &&
                    typeof (c as ScheduleCourse).name === "string" &&
                    typeof (c as ScheduleCourse).credits === "number"
            )
            : [];

        if (!major || courses.length === 0) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const raw = await getStudySchedule({ major, courses, weeklyHours });
        let parsed: unknown = {};
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = { weeklyPlan: [], examTips: [], raw };
        }

        return NextResponse.json({ result: parsed });
    } catch (error) {
        console.error("generate-schedule error", error);
        return NextResponse.json({ error: "Failed to generate schedule" }, { status: 500 });
    }
}
