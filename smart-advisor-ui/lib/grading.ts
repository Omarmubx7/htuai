// HTU Al Hussein Technical University — Grading System

export type HTUGrade = "D" | "M" | "P" | "U" | "WF" | "TC" | "X";

export interface GradeInfo {
    label: string;
    points: number;
    colorKey: string;
}

export const GRADE_MAP: Record<string, GradeInfo> = {
    D: { label: "Distinction", points: 4.0, colorKey: "emerald" },
    M: { label: "Merit", points: 3.2, colorKey: "blue" },
    P: { label: "Pass", points: 2.4, colorKey: "amber" },
    U: { label: "Unclassified", points: 1.6, colorKey: "red" },
    WF: { label: "Withdrawal with Failure", points: 0, colorKey: "red" },
    TC: { label: "Transfer Credits", points: 0, colorKey: "gray" },
    X: { label: "Course not Included in the Study Plan", points: 0, colorKey: "gray" },
};

export const SCORED_GRADES: HTUGrade[] = ["D", "M", "P", "U"];
export const MIN_PASS_POINTS = 2.4;

export const CUMULATIVE_CLASSIFICATIONS = [
    { min: 3.6, max: 4.0, label: "Excellent (EX)", short: "EX", colorKey: "emerald", motivation: "Elite status! You're crushing it." },
    { min: 3.2, max: 3.59, label: "Very Good (VG)", short: "VG", colorKey: "blue", motivation: "Outstanding! Keep pushing for Distinction." },
    { min: 2.8, max: 3.19, label: "Good", short: "Good", colorKey: "violet", motivation: "Solid performance. You're doing great!" },
    { min: 2.4, max: 2.79, label: "Satisfactory", short: "SAT", colorKey: "amber", motivation: "On the right track. Every credit counts!" },
    { min: 0, max: 2.39, label: "Below Minimum", short: "LOW", colorKey: "red", motivation: "Keep your head up. Focus on the next goal." },
];

// ── GPA Logic ──────────────────────────────────────────

export function gradeToPoints(grade: string): number {
    return GRADE_MAP[grade]?.points ?? 0;
}

/**
 * Semester GPA logic (as requested)
 */
export function calculateSemesterGpa(courses: { grade: string; credits: number }[]): number {
    let totalQualityPoints = 0;
    let totalCredits = 0;

    const scored = courses.filter(c => SCORED_GRADES.includes(c.grade as HTUGrade));

    for (const course of scored) {
        const points = gradeToPoints(course.grade);
        totalQualityPoints += points * course.credits;
        totalCredits += course.credits;
    }

    if (totalCredits === 0) return 0;
    const gpa = totalQualityPoints / totalCredits;
    return Math.round(gpa * 100) / 100; // Rounding to 2 decimal places
}

/**
 * Calculate CGPA from a list of courses with grades and credits.
 */
export function calculateCumulativeGpaFromHistory(allCourses: { grade: string; credits: number }[]): number {
    let totalQualityPoints = 0;
    let totalCredits = 0;

    const scored = allCourses.filter(c => SCORED_GRADES.includes(c.grade as HTUGrade));

    for (const course of scored) {
        const points = gradeToPoints(course.grade);
        totalQualityPoints += points * course.credits;
        totalCredits += course.credits;
    }

    if (totalCredits === 0) return 0;
    const gpa = totalQualityPoints / totalCredits;
    return Math.round(gpa * 100) / 100;
}

/**
 * Cumulative GPA logic (as requested)
 * Accumulates previous history with current semester results
 */
export function calculateCumulativeGpa(
    oldGpa: number,
    oldCredits: number,
    currentCourses: { grade: string; credits: number }[]
): number {
    // 1) Old total quality points
    const oldQualityPoints = oldGpa * oldCredits;

    // 2) New semester quality points and credits
    let newQualityPoints = 0;
    let newCredits = 0;

    const scored = currentCourses.filter(c => SCORED_GRADES.includes(c.grade as HTUGrade));

    for (const course of scored) {
        const points = gradeToPoints(course.grade);
        newQualityPoints += points * course.credits;
        newCredits += course.credits;
    }

    // 3) New totals
    const totalQualityPoints = oldQualityPoints + newQualityPoints;
    const totalCredits = oldCredits + newCredits;

    if (totalCredits === 0) return 0;

    // 4) New cumulative GPA
    const gpa = totalQualityPoints / totalCredits;
    return Math.round(gpa * 100) / 100;
}

/**
 * Compatibility wrapper for existing dashboard logic
 */
export function calculateGPA(courses: { credits: number; grade: string }[]): number {
    return calculateSemesterGpa(courses);
}

export function getClassification(gpa: number) {
    for (const c of CUMULATIVE_CLASSIFICATIONS) {
        if (gpa >= c.min && gpa <= c.max) return c;
    }
    return CUMULATIVE_CLASSIFICATIONS[CUMULATIVE_CLASSIFICATIONS.length - 1];
}

// ── Rule-based insights (free, no LLM needed) ──────────────────────────

export interface Insight {
    type: "warning" | "info" | "success" | "tip";
    title: string;
    description: string;
}

export function generateInsights(
    courses: {
        id: string; name: string; credits: number;
        grade?: string | null; hasMidterm: boolean;
        midtermDate?: string; finalDate?: string; status: string;
    }[],
    studySessions: { courseId: string; date: string; hours: number }[]
): Insight[] {
    const insights: Insight[] = [];
    const now = new Date();

    // 1. At-risk courses
    courses.filter(c => c.grade === "U" || c.grade === "WF").forEach(c => {
        insights.push({
            type: "warning",
            title: `${c.name} is at risk`,
            description: `Current grade is ${GRADE_MAP[c.grade!]?.label ?? c.grade}. Needs extra attention.`,
        });
    });

    // 2. Upcoming midterms (within 7 days)
    courses.filter(c => c.midtermDate).forEach(c => {
        const d = new Date(c.midtermDate!);
        const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
        if (days > 0 && days <= 7) {
            insights.push({
                type: "info",
                title: `Midterm in ${days} day${days !== 1 ? "s" : ""}`,
                description: `${c.name} midterm on ${d.toLocaleDateString()}.`,
            });
        }
    });

    // 3. Upcoming finals (within 14 days)
    courses.filter(c => c.finalDate).forEach(c => {
        const d = new Date(c.finalDate!);
        const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
        if (days > 0 && days <= 14) {
            insights.push({
                type: "info",
                title: `Final in ${days} day${days !== 1 ? "s" : ""}`,
                description: `${c.name} final on ${d.toLocaleDateString()}.`,
            });
        }
    });

    // 4. No study logged this week
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    courses.filter(c => c.status !== "Completed").forEach(c => {
        const recent = studySessions.filter(
            s => s.courseId === c.id && new Date(s.date) >= weekAgo
        );
        if (recent.length === 0) {
            insights.push({
                type: "tip",
                title: `No study for ${c.name}`,
                description: `No hours logged this week. Consider scheduling a session.`,
            });
        }
    });

    // 5. GPA projection — "if you get Merit in remaining courses"
    const graded = courses.filter(c => c.grade && SCORED_GRADES.includes(c.grade as HTUGrade));
    const ungraded = courses.filter(c => !c.grade || !SCORED_GRADES.includes(c.grade as HTUGrade));
    if (graded.length > 0 && ungraded.length > 0) {
        const projected = calculateGPA([
            ...graded.map(c => ({ credits: c.credits, grade: c.grade! })),
            ...ungraded.map(c => ({ credits: c.credits, grade: "M" })),
        ]);
        const cls = getClassification(projected);
        insights.push({
            type: "info",
            title: "GPA Projection",
            description: `Merit in remaining → ${projected.toFixed(2)} GPA (${cls.label}).`,
        });
    }

    // 6. All courses passed
    if (
        graded.length === courses.length &&
        courses.length > 0 &&
        graded.every(c => c.grade !== "U" && c.grade !== "WF")
    ) {
        const gpa = calculateGPA(graded.map(c => ({ credits: c.credits, grade: c.grade! })));
        if (gpa >= 3.6) {
            insights.push({ type: "success", title: "Excellent standing!", description: `Your GPA is ${gpa.toFixed(2)} — Excellent.` });
        } else if (gpa >= MIN_PASS_POINTS) {
            insights.push({ type: "success", title: "All courses passed!", description: `Semester GPA: ${gpa.toFixed(2)}.` });
        }
    }

    return insights;
}
