import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getStudySchedule } from "@/lib/groq";
import { logAIUsage } from "@/lib/ai-logger";
import { prisma } from "@/lib/prisma";

type ScheduleCourse = {
    code: string;
    name: string;
    credits: number;
    midterm_date?: string;
    final_date?: string;
};

type ScheduleRequest = {
    major?: string;
    semesterType?: string;
    semesterName?: string;
    semesterStartDate?: string | null;
    semesterEndDate?: string | null;
    weeklyHours?: number;
    courses?: ScheduleCourse[];
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

    const startTime = Date.now();
    let userId: number | null = null;
    let status: 'success' | 'error' | 'timeout' = 'success';
    let errorMessage: string | undefined;

    try {
        // Get user ID for logging
        if (session.user?.db_id) {
            userId = session.user.db_id;
        }

        const body = await request.json() as ScheduleRequest & { semesterId?: number };
        const semesterId = body.semesterId;
        const major = typeof body.major === "string" ? body.major : "";
        const semesterType = typeof body.semesterType === "string" ? body.semesterType : "";
        const semesterName = typeof body.semesterName === "string" ? body.semesterName : "";
        const semesterStartDate = typeof body.semesterStartDate === "string" ? body.semesterStartDate : null;
        const semesterEndDate = typeof body.semesterEndDate === "string" ? body.semesterEndDate : null;
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
            status = 'error';
            errorMessage = 'Invalid payload';
            await logAIUsage({
                userId,
                endpoint: 'generate-schedule',
                featureName: 'Study Schedule Generation',
                status,
                errorMessage,
                responseTimeMs: Date.now() - startTime,
            });
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        let parsed: any;
        try {
            const raw = await getStudySchedule({
                major,
                semesterType,
                semesterName,
                semesterStartDate,
                semesterEndDate,
                courses,
                weeklyHours,
            });
            parsed = parseScheduleResponse(raw);
        } catch (error) {
            console.error("generate-schedule provider error", error);
            status = 'error';
            errorMessage = error instanceof Error ? error.message : 'Unknown error';
            parsed = buildFallbackStudySchedule(courses, weeklyHours);
        }

        // PERSIST TO DATABASE if semesterId is provided
        if (semesterId && parsed && status === 'success') {
            try {
                await prisma.semester.update({
                    where: { id: semesterId, user_id: userId || -1 },
                    data: {
                        study_schedule: parsed.weeklyPlan || [],
                        ai_exam_tips: parsed.examTips || []
                    }
                });
                console.log(`[AI] Persisted schedule to semester ${semesterId}`);
            } catch (dbError) {
                console.error("[AI] Failed to persist schedule to DB", dbError);
            }
        }

        // Log the usage
        await logAIUsage({
            userId,
            endpoint: 'generate-schedule',
            featureName: 'Study Schedule Generation',
            modelUsed: 'groq',
            status,
            errorMessage,
            responseTimeMs: Date.now() - startTime,
            metadata: {
                major,
                coursesCount: courses.length,
                weeklyHours,
                semesterId
            },
        });

        return NextResponse.json({ result: parsed });
    } catch (error: any) {
        status = 'error';
        errorMessage = error?.message || String(error);
        console.error("generate-schedule error", error);

        // Log the error
        await logAIUsage({
            userId,
            endpoint: 'generate-schedule',
            featureName: 'Study Schedule Generation',
            status,
            errorMessage,
            responseTimeMs: Date.now() - startTime,
        });

        return NextResponse.json({ 
            error: "Failed to generate schedule",
            details: errorMessage
        }, { status: 500 });
    }
}
