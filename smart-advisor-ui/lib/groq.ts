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

function getGroqClient() {
    const apiKey = process.env.GROQ_API_TOKEN || process.env.groqapi_token;
    if (!apiKey) {
        throw new Error("Missing required environment variable: GROQ_API_TOKEN");
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

    // Limit candidates sent to AI to reduce tokens
    const topCandidates = candidateCourses.slice(0, 15);
    const candidatesStr = topCandidates.map(c => `${c.code}:${c.name}`).join("|");

    const prompt = `HTU ${major}. Recommend 5 from: ${candidatesStr}
R:|code|reason
code|reason  
T:|tip
tip`;

    if (process.env.NODE_ENV === 'development') {
        console.log("--- Groq Request (getSuggestedCourses) ---");
        console.log("Prompt:", prompt);
    }

    const completion = await client.chat.completions.create({
        model: modelUsed,
        temperature: 0.1,
        max_tokens: 300,
        messages: [
            { role: "system", content: "TOON format. Concise." },
            { role: "user", content: prompt }
        ],
    });

    if (process.env.NODE_ENV === 'development') {
        console.log("--- Groq Response ---");
        console.log("Usage:", completion.usage);
    }
    const content = completion.choices[0]?.message?.content ?? "";
    if (process.env.NODE_ENV === 'development') {
        console.log("Raw Content:", content);
    }
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const recommendations = [];
    const tips = [];
    let mode = '';

    for (const line of lines) {
        if (line === 'R:' || line.startsWith('R:|')) mode = 'R';
        else if (line === 'T:' || line.startsWith('T:|')) mode = 'T';
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
    
    const semesterLabel = semesterType 
        ? `${semesterType}${semesterName ? `(${semesterName})` : ''}`
        : '';
    const coursesStr = courses.map(c => `${c.code}(${c.credits}CH)`).join("|");

    const prompt = `HTU ${major} study plan. ${semesterLabel} ${weeklyHours}h/week
Courses: ${coursesStr}
W:|day|code|hours|focus
Sun|CS101|2|arrays
E:|exam_tip
Oct 12 midterm`;

    if (process.env.NODE_ENV === 'development') {
        console.log("--- Groq Request (getStudySchedule) ---");
        console.log("Prompt:", prompt);
    }

    const completion = await client.chat.completions.create({
        model: modelUsed,
        temperature: 0.1,
        max_tokens: 400,
        messages: [
            { role: "system", content: "TOON format. Only use given courses/dates." },
            { role: "user", content: prompt }
        ],
    });

    if (process.env.NODE_ENV === 'development') {
        console.log("--- Groq Response ---");
        console.log("Usage:", completion.usage);
    }
    const content = completion.choices[0]?.message?.content ?? "";
    if (process.env.NODE_ENV === 'development') {
        console.log("Raw Content:", content);
    }
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const weeklyPlanMap = new Map<string, Array<{course: string, hours: number, focus: string}>>();
    const examTips = [];
    let mode = '';

    for (const line of lines) {
        if (line === 'W:' || line.startsWith('W:|')) mode = 'W';
        else if (line === 'E:' || line.startsWith('E:|')) mode = 'E';
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
