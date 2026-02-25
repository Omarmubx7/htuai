// HTU Al Hussein Technical University — Grading System

export type HTUGrade = "D" | "M" | "P" | "U" | "WF" | "TC" | "X";

export interface GradeInfo {
    label: string;
    points: number;
    colorKey: string;
}

export const GRADE_MAP: Record<string, GradeInfo> = {
    D: { label: "Distinction", points: 4, colorKey: "emerald" },
    M: { label: "Merit", points: 3.2, colorKey: "blue" },
    P: { label: "Pass", points: 2.4, colorKey: "amber" },
    U: { label: "Unclassified", points: 0, colorKey: "red" },
    WF: { label: "Withdrawal with Failure", points: 0, colorKey: "red" },
    TC: { label: "Transfer Credits", points: 0, colorKey: "gray" },
    X: { label: "Course not Included in the Study Plan", points: 0, colorKey: "gray" },
};

export const SCORED_GRADES: HTUGrade[] = ["D", "M", "P", "U"];
export const MIN_PASS_POINTS = 2.4;

export const CUMULATIVE_CLASSIFICATIONS = [
    { min: 3.6, max: 4, label: "Excellent (EX)", short: "EX", colorKey: "emerald", motivation: "Elite status! You're crushing it." },
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
 * Compatibility wrapper for existing dashboard logic
 */
export function calculateGPA(courses: { credits: number; grade: string }[]): number {
    return calculateSemesterGpa(courses);
}

export function getClassification(gpa: number) {
    for (const c of CUMULATIVE_CLASSIFICATIONS) {
        if (gpa >= c.min && gpa <= c.max) return c;
    }
    return CUMULATIVE_CLASSIFICATIONS.at(-1)!;
}
