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
        `You are an academic advisor for Al Hussein Technical University students in major: ${major}.`,
        "Recommend exactly 5 courses for the next semester.",
        "Prioritize courses with no prerequisites or prerequisites likely already met.",
        "Avoid suggesting already-completed courses.",
        "Output strict JSON with this shape:",
        '{"recommendations":[{"code":"...","reason":"..."}],"tips":["..."]}',
        "No markdown, no extra text.",
        `Completed course codes: ${completedCourses.join(", ") || "none"}`,
        `Candidate courses: ${JSON.stringify(candidateCourses)}`,
    ].join("\n");

    const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: "You output valid JSON only.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
    });

    return completion.choices[0]?.message?.content ?? "{}";
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
        "Output strict JSON with shape:",
        '{"weeklyPlan":[{"day":"Sunday","sessions":[{"course":"...","hours":1.5,"focus":"..."}]}],"examTips":["..."]}',
        "Use all 7 days and distribute workload by credits.",
        "Keep total weekly hours close to target.",
        "No markdown, no extra text.",
        `Target weekly hours: ${weeklyHours}`,
        `Courses: ${JSON.stringify(courses)}`,
    ].join("\n");

    const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: "You output valid JSON only.",
            },
            {
                role: "user",
                content: prompt,
            },
        ],
    });

    return completion.choices[0]?.message?.content ?? "{}";
}
