import Groq from "groq-sdk";

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

type SuggestedCourse = { code: string; name: string; credits: number; prereq?: string };

function buildSuggestedCoursesPrompt(major: string, candidateCourses: SuggestedCourse[], completedCourses: string[]) {
    const candidatesStr = candidateCourses.map((course) => `${course.code}:${course.name}`).join("|");
    const completedStr = completedCourses.slice(0, 20).join("|") || "none";

    return `HTU ${major}. Recommend 5 from: ${candidatesStr}
Completed: ${completedStr}
Prioritize Pearson (HNC/HND) subjects and foundational/unlocked courses.
Return exact course codes from the list only.
Format:
R:|code|reason
code|reason
T:|tip
tip`;
}

function parseSuggestedRecommendationLine(line: string, candidateMap: Map<string, SuggestedCourse>, major: string) {
    const cleaned = line.replace(/^[\d.\s•*-]+/, "");
    const firstToken = cleaned.split("|")[0]?.trim() || cleaned.trim();
    const directMatch = candidateMap.get(firstToken);

    const codePattern = /\b([A-Z]{2,}[A-Z0-9_-]*\s?\d{2,}[A-Z0-9_-]*)\b/;
    const codeMatch = codePattern.exec(cleaned);
    const matchedCode = codeMatch?.[1]?.trim();
    let resolvedCode: string | null = null;

    if (directMatch) {
        resolvedCode = firstToken;
    } else if (matchedCode && candidateMap.has(matchedCode)) {
        resolvedCode = matchedCode;
    }

    if (!resolvedCode) {
        return null;
    }

    const course = candidateMap.get(resolvedCode);
    const reason = line.split("|").slice(1).map((part) => part.trim()).filter(Boolean).join("|") || `Recommended next step for ${major}`;

    return {
        code: resolvedCode,
        name: course ? course.name : resolvedCode,
        reason,
    };
}

function isSuggestedSectionMarker(line: string) {
    return {
        recommendation: /^R(?::|\b)/i.test(line) || /recommend/i.test(line),
        tip: /^T(?::|\b)/i.test(line) || /tip/i.test(line),
    };
}

function isScheduleSectionMarker(line: string) {
    return {
        weekly: /^W(?::|\b)/i.test(line) || /week/i.test(line),
        exam: /^E(?::|\b)/i.test(line) || /exam/i.test(line),
    };
}

function parseWeeklyScheduleLine(line: string) {
    const parts = line.split("|");
    if (parts.length < 4) return null;

    const [day, course, hoursStr, ...focusParts] = parts;
    const hours = Number.parseFloat(hoursStr) || 1;
    return {
        day,
        session: {
            course: course.trim(),
            hours,
            focus: focusParts.join("|").trim(),
        },
    };
}

function collectWeeklyPlan(lines: string[]) {
    const weeklyPlanMap = new Map<string, Array<{ course: string; hours: number; focus: string }>>();
    let mode: "" | "W" = "";

    for (const line of lines) {
        const markers = isScheduleSectionMarker(line);
        if (markers.weekly) {
            mode = "W";
            continue;
        }

        if (markers.exam) {
            mode = "";
            continue;
        }

        if (mode !== "W") continue;

        const parsed = parseWeeklyScheduleLine(line);
        if (!parsed) continue;

        if (!weeklyPlanMap.has(parsed.day)) weeklyPlanMap.set(parsed.day, []);
        weeklyPlanMap.get(parsed.day)!.push(parsed.session);
    }

    return Array.from(weeklyPlanMap.entries()).map(([day, sessions]) => ({ day, sessions }));
}

function collectExamTips(lines: string[]) {
    const examTips: string[] = [];
    let mode: "" | "E" = "";

    for (const line of lines) {
        const markers = isScheduleSectionMarker(line);
        if (markers.exam) {
            mode = "E";
            continue;
        }

        if (markers.weekly) {
            mode = "";
            continue;
        }

        if (mode === "E") {
            examTips.push(line);
        }
    }

    return examTips;
}

function parseSuggestedCoursesContent(content: string, candidateCourses: SuggestedCourse[], major: string) {
    const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
    const recommendations: Array<{ code: string; name: string; reason: string }> = [];
    const tips: string[] = [];
    const candidateMap = new Map(candidateCourses.map((course) => [course.code, course] as const));
    let mode: "" | "R" | "T" = "";

    for (const line of lines) {
        const markers = isSuggestedSectionMarker(line);

        if (markers.recommendation) {
            mode = "R";
            continue;
        }

        if (markers.tip) {
            mode = "T";
            continue;
        }

        if (mode === "R") {
            const recommendation = parseSuggestedRecommendationLine(line, candidateMap, major);
            if (recommendation) recommendations.push(recommendation);
            continue;
        }

        if (mode === "T") {
            tips.push(line);
        }
    }

    if (recommendations.length === 0) {
        for (const course of candidateCourses.slice(0, 5)) {
            recommendations.push({
                code: course.code,
                name: course.name,
                reason: "Suggested fallback based on your remaining HTU curriculum requirements.",
            });
        }
    }

    return { recommendations, tips };
}

function buildStudySchedulePrompt(params: {
    major: string;
    semesterType?: string;
    semesterName?: string;
    semesterStartDate?: string | null;
    semesterEndDate?: string | null;
    courses: ScheduleCourse[];
    weeklyHours: number;
}) {
    const { major, semesterType, semesterName, courses, weeklyHours } = params;

    // TOON: name-only list — codes excluded so model never outputs them
    const coursesStr = courses.map((c) => `${c.name}(${c.credits}CH)`).join("|");
    const semLabel = semesterName || `${semesterType ?? "Fall"} 2026`;
    // Use real course names in schema example so model mimics names, not codes
    const ex1 = courses[0]?.name ?? "Course A";
    const ex2 = courses[1]?.name ?? courses[0]?.name ?? "Course B";

    // TOON compact prompt: ~120 tokens vs ~271 previously
    return `HTU academic planner. JSON output only.
PARAMS: major=${major}|sem=${semLabel}|hours/week=${weeklyHours}|courses=${coursesStr}
RULES: "course" field=full name ONLY(no codes)|cover all ${courses.length} courses|"focus"=1 short sentence|7 days
SCHEMA(follow exactly):
{"weeklyPlan":[{"day":"Sunday","sessions":[{"course":"${ex1}","hours":2,"focus":"one sentence"}]},{"day":"Monday","sessions":[{"course":"${ex2}","hours":2,"focus":"one sentence"}]}],"examTips":["tip1","tip2"]}
Output complete valid JSON. Stop after closing brace.`;
}

function parseStudyScheduleContent(content: string) {
    try {
        // Try direct JSON parsing first
        const parsed = JSON.parse(content.trim());
        if (parsed.weeklyPlan && parsed.examTips) {
            return {
                weeklyPlan: Array.isArray(parsed.weeklyPlan) ? parsed.weeklyPlan : [],
                examTips: Array.isArray(parsed.examTips) ? parsed.examTips : [],
            };
        }
    } catch (e) {
        console.warn("[AI] Failed to parse JSON response, falling back to text parsing:", e);
    }
    
    // Fallback to text parsing for backward compatibility
    const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
    return {
        weeklyPlan: collectWeeklyPlan(lines),
        examTips: collectExamTips(lines),
    };
}

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
    candidateCourses: SuggestedCourse[];
}): Promise<GroqResult> {
    const { major, completedCourses, candidateCourses } = params;
    const client = getGroqClient();
    const modelUsed = "llama-3.1-8b-instant";
    const topCandidates = candidateCourses.slice(0, 15);
    const prompt = buildSuggestedCoursesPrompt(major, topCandidates, completedCourses);

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
    const { recommendations, tips } = parseSuggestedCoursesContent(content, topCandidates, major);

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
    const client = getGroqClient();
    const modelUsed = "llama-3.1-8b-instant";
    const prompt = buildStudySchedulePrompt(params);

    if (process.env.NODE_ENV === 'development') {
        console.log("--- Groq Request (getStudySchedule) ---");
        console.log("Prompt:", prompt.substring(0, 500) + "...");
    }

    const completion = await client.chat.completions.create({
        model: modelUsed,
        temperature: 0.1,
        max_tokens: 1400,   // 800 was too low — a 7-day JSON schedule needs ~1000–1200 tokens
        messages: [
            { role: "system", content: "You are an academic planning assistant. Respond with valid JSON only. Never use course codes — always use full course names." },
            { role: "user", content: prompt }
        ],
    });

    if (process.env.NODE_ENV === 'development') {
        console.log("--- Groq Response ---");
        console.log("Usage:", completion.usage);
    }
    const content = completion.choices[0]?.message?.content ?? "";
    if (process.env.NODE_ENV === 'development') {
        console.log("Raw Content:", content.substring(0, 500));
    }
    
    const parsed = parseStudyScheduleContent(content);
    
    if (process.env.NODE_ENV === 'development') {
        console.log("Parsed weeklyPlan:", parsed.weeklyPlan?.length, "days");
        console.log("Parsed examTips:", parsed.examTips?.length, "tips");
    }
    
    return {
        content: JSON.stringify(parsed),
        usage: {
            inputTokens: completion.usage?.prompt_tokens ?? 0,
            outputTokens: completion.usage?.completion_tokens ?? 0,
            totalTokens: completion.usage?.total_tokens ?? 0,
            modelUsed,
        },
    };
}
