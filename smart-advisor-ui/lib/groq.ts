import Groq from "groq-sdk";
import { requireEnv } from "@/lib/env";

type GroqUsage = {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    modelUsed: string;
};

type GroqResult = {
    content: string;
    usage: GroqUsage;
};

type ScheduleCourse = {
    code: string;
    name: string;
    credits: number;
    midterm_date?: string;
    final_date?: string;
};

function formatSemesterLabel(semesterType?: string, semesterName?: string) {
    if (!semesterType) {
        return "";
    }

    return semesterName
        ? `Semester type: ${semesterType} (${semesterName}).`
        : `Semester type: ${semesterType}.`;
}

function formatCourseSummary(courses: ScheduleCourse[]) {
    return courses.map((course) => {
        const parts = [course.code, `${course.credits}CH`];
        if (course.midterm_date) parts.push(`M:${course.midterm_date}`);
        if (course.final_date) parts.push(`F:${course.final_date}`);
        return parts.join("|");
    }).join("; ");
}

function getGroqClient() {
    const apiKey = process.env.GROQ_API_TOKEN || process.env.groqapi_token;
    if (!apiKey) {
        // Keep the error explicit so API routes can return a clear 500 reason.
        requireEnv("GROQ_API_TOKEN");
    }
    return new Groq({ apiKey });
}

export async function getSuggestedCourses(params: {
    major: string;
    completedCourses: string[];
    candidateCourses: Array<{ code: string; name: string; credits: number; prereq?: string }>;
}): Promise<GroqResult> {
    const { major, candidateCourses } = params;
    const client = getGroqClient();
    const modelUsed = "llama-3.1-8b-instant";

    const prompt = [
        `You are an advisor for an HTU ${major} student. Recommend 5 courses.`,
        "Output strict TOON format exactly like this:",
        "R:",
        "code1 | reason1",
        "code2 | reason2",
        "T:",
        "Registration tip 1",
        "Registration tip 2",
        "No extra text.",
        `Candidates: ${candidateCourses.map(c => c.code + ": " + c.name).join(" | ")}`
    ].join("\n");

    console.log("--- Groq Request (getSuggestedCourses) ---");
    console.log("Prompt:", prompt);

    const completion = await client.chat.completions.create({
        model: modelUsed,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
            { role: "system", content: "You output TOON format only. Be extremely concise." },
            { role: "user", content: prompt }
        ],
    });

    console.log("--- Groq Response ---");
    console.log("Usage:", completion.usage);
    const content = completion.choices[0]?.message?.content ?? "";
    console.log("Raw Content:", content);
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const recommendations = [];
    const tips = [];
    let mode = '';

    for (const line of lines) {
        if (line === 'R:') mode = 'R';
        else if (line === 'T:') mode = 'T';
        else if (mode === 'R') {
            const parts = line.split('|');
            if (parts.length >= 2) {
                const code = parts[0].trim();
                const course = candidateCourses.find(c => c.code === code);
                recommendations.push({ 
                    code, 
                    name: course ? course.name : code,
                    reason: parts.slice(1).join('|').trim() 
                });
            }
        } else if (mode === 'T') {
            tips.push(line);
        }
    }

    return {
        content: JSON.stringify({ recommendations, tips }),
        usage: {
            inputTokens: completion.usage?.prompt_tokens ?? 0,
            outputTokens: completion.usage?.completion_tokens ?? 0,
            totalTokens: completion.usage?.total_tokens ?? 0,
            modelUsed,
        },
    };
}

export async function getStudySchedule(params: {
    major: string;
    semesterType?: string;
    semesterName?: string;
    semesterStartDate?: string | null;
    semesterEndDate?: string | null;
    courses: ScheduleCourse[];
    weeklyHours: number;
}): Promise<GroqResult> {
    const { major, semesterType, semesterName, semesterStartDate, semesterEndDate, courses, weeklyHours } = params;
    const client = getGroqClient();
    const modelUsed = "llama-3.1-8b-instant";
    const semesterLabel = formatSemesterLabel(semesterType, semesterName);
    const courseSummary = formatCourseSummary(courses);

    const prompt = [
        `Create a weekly study schedule for an HTU ${major} student.`,
        semesterLabel,
        semesterStartDate || semesterEndDate ? `Semester window: ${semesterStartDate || "?"} to ${semesterEndDate || "?"}.` : "",
        `Target weekly hours: ${weeklyHours}.`,
        "IMPORTANT: Only use the courses provided below. Do NOT invent new courses, exams, or dates. Use the provided dates for exams if they exist.",
        "Output strict TOON format only:",
        "W:",
        "Sunday | 40201100 | 1.5 | Review arrays",
        "E:",
        "Midterm on Oct 12 - Focus on Ch 1-3",
        "No extra text.",
        `Courses: ${courseSummary}`
    ].join("\n");

    console.log("--- Groq Request (getStudySchedule) ---");
    console.log("Prompt:", prompt);

    const completion = await client.chat.completions.create({
        model: modelUsed,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
            { role: "system", content: "You output TOON format only. Be extremely concise." },
            { role: "user", content: prompt }
        ],
    });

    console.log("--- Groq Response ---");
    console.log("Usage:", completion.usage);
    const content = completion.choices[0]?.message?.content ?? "";
    console.log("Raw Content:", content);
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const weeklyPlanMap = new Map<string, Array<{course: string, hours: number, focus: string}>>();
    const examTips = [];
    let mode = '';

    for (const line of lines) {
        if (line === 'W:') mode = 'W';
        else if (line === 'E:') mode = 'E';
        else if (mode === 'W') {
            const parts = line.split('|');
            if (parts.length >= 4) {
                const [day, course, hoursStr, ...focusParts] = parts;
                const hours = Number.parseFloat(hoursStr) || 1;
                if (!weeklyPlanMap.has(day)) weeklyPlanMap.set(day, []);
                weeklyPlanMap.get(day)!.push({ course: course.trim(), hours, focus: focusParts.join('|').trim() });
            }
        } else if (mode === 'E') {
            examTips.push(line);
        }
    }

    const weeklyPlan = Array.from(weeklyPlanMap.entries()).map(([day, sessions]) => ({ day, sessions }));
    return {
        content: JSON.stringify({ weeklyPlan, examTips }),
        usage: {
            inputTokens: completion.usage?.prompt_tokens ?? 0,
            outputTokens: completion.usage?.completion_tokens ?? 0,
            totalTokens: completion.usage?.total_tokens ?? 0,
            modelUsed,
        },
    };
}
