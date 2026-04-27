import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getStudySchedule } from "@/lib/groq";

type ScheduleCourse = {
    code: string;
    name: string;
    credits: number;
};

type ScheduleSession = {
    course: string;
    hours: number;
    focus: string;
};

type ScheduleDay = {
    day: string;
    sessions: ScheduleSession[];
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FOCUS_TEMPLATES = [
    "Review lecture notes and summarize key ideas",
    "Work through practice problems",
    "Revise quizzes, labs, and past assignments",
    "Memorize formulas and definitions",
    "Prepare exam questions and flashcards",
    "Do a short active-recall session",
];

function buildFallbackStudySchedule(courses: ScheduleCourse[], weeklyHours: number) {
    if (courses.length === 0) {
        return { weeklyPlan: [], examTips: ["Add at least one course to generate a study plan."] };
    }

    const weightedCourses = courses.flatMap((course) =>
        Array.from({ length: Math.max(1, course.credits) }, () => course)
    );
    const hoursPerDay = Math.max(0.5, Number((weeklyHours / 7).toFixed(1)));

    const weeklyPlan: ScheduleDay[] = DAY_NAMES.map((day, index) => {
        const course = weightedCourses[index % weightedCourses.length] ?? courses[index % courses.length];
        const focus = FOCUS_TEMPLATES[index % FOCUS_TEMPLATES.length];

        return {
            day,
            sessions: [
                {
                    course: course.code,
                    hours: hoursPerDay,
                    focus,
                },
            ],
        };
    });

    return {
        weeklyPlan,
        examTips: [
            "Start with the course that has the highest credit load.",
            "Keep one day light for revision and catch-up.",
            `Focus extra review on ${courses[0].name} before exams.`,
        ],
    };
}

function parseScheduleResponse(raw: string) {
    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return { weeklyPlan: [], examTips: [], raw };
    }
}

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

        let parsed: unknown;
        try {
            const raw = await getStudySchedule({ major, courses, weeklyHours });
            parsed = parseScheduleResponse(raw);
        } catch (error) {
            console.error("generate-schedule provider error", error);
            parsed = buildFallbackStudySchedule(courses, weeklyHours);
        }

        return NextResponse.json({ result: parsed });
    } catch (error: any) {
        console.error("generate-schedule error", error);
        return NextResponse.json({ 
            error: "Failed to generate schedule",
            details: error?.message || String(error)
        }, { status: 500 });
    }
}
