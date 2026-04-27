import Groq from "groq-sdk";
import { requireEnv } from "@/lib/env";

type ScheduleCourse = {
    code: string;
    name: string;
    credits: number;
};

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
}) {
    const { major, completedCourses, candidateCourses } = params;
    const client = getGroqClient();

    const prompt = [
        `You are an HTU academic advisor. Major: ${major}.`,
        "Recommend exactly 5 courses for the next semester from the provided UNLOCKED candidates.",
        "Output strict TOON format exactly like this:",
        "R:",
        "code1|reason1",
        "code2|reason2",
        "T:",
        "tip1",
        "tip2",
        "No extra text.",
        `Candidates: ${candidateCourses.map(c => `${c.code}:${c.name}`).join(" ")}`,
    ].join("\n");

    const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        messages: [
            {
                role: "system",
                content: "You output TOON format only.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const recommendations = [];
    const tips = [];
    let mode = '';

    for (const line of lines) {
        if (line === 'R:') mode = 'R';
        else if (line === 'T:') mode = 'T';
        else if (mode === 'R') {
            const parts = line.split('|');
            if (parts.length >= 2) recommendations.push({ code: parts[0].trim(), reason: parts.slice(1).join('|').trim() });
        } else if (mode === 'T') {
            tips.push(line);
        }
    }

    return JSON.stringify({ recommendations, tips });
}

export async function getStudySchedule(params: {
    major: string;
    courses: ScheduleCourse[];
    weeklyHours: number;
}) {
    const { major, courses, weeklyHours } = params;
    const client = getGroqClient();

    const prompt = [
        `Create a practical weekly study schedule for an HTU ${major} student.`,
        "Output strict TOON format exactly like this:",
        "W:",
        "Sunday|40201100|1.5|Review arrays",
        "Sunday|10203180|2|Lab practice",
        "Monday|...|...|...",
        "E:",
        "tip1",
        "tip2",
        "Use 7 days, distribute workload by credits.",
        "No extra text.",
        `Target hrs: ${weeklyHours}`,
        `Courses: ${courses.map(c => c.code).join(", ")}`,
    ].join("\n");

    const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        messages: [
            {
                role: "system",
                content: "You output TOON format only.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
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
                const hours = parseFloat(hoursStr) || 1;
                if (!weeklyPlanMap.has(day)) weeklyPlanMap.set(day, []);
                weeklyPlanMap.get(day)!.push({ course: course.trim(), hours, focus: focusParts.join('|').trim() });
            }
        } else if (mode === 'E') {
            examTips.push(line);
        }
    }

    const weeklyPlan = Array.from(weeklyPlanMap.entries()).map(([day, sessions]) => ({ day, sessions }));
    return JSON.stringify({ weeklyPlan, examTips });
}
