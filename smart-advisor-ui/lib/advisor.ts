import { Course } from '@/types';

interface PrereqResult {
    isLocked: boolean;
    missing: string[];
    lockReason?: string;
}

/**
 * Check prerequisites for a course.
 * @param course            The course to check
 * @param completedCourses  Set of course codes the student has ticked
 * @param completedCredits  Total CH completed (for hour-based rules)
 * @param allCourseCodes    Set of all codes in the curriculum — anything NOT in here is treated as already satisfied
 */
export function checkPrerequisites(
    course: Course,
    completedCourses: Set<string>,
    completedCredits: number = 0,
    allCourseCodes: Set<string> = new Set()
): PrereqResult {
    if (!course.prereq || course.prereq.trim() === '') {
        return { isLocked: false, missing: [] };
    }

    const prereqStr = course.prereq.toUpperCase().trim();

    // ── Department Approval ──────────────────────────────────────────────────
    if (prereqStr.includes('APPROVAL')) {
        return { isLocked: true, missing: [], lockReason: 'Requires Department Approval' };
    }

    // ── Credit-hour rules: ">= 85" or ">= 90" ───────────────────────────────
    const hoursMatch = prereqStr.match(/>=\s*(\d+)\s*(HRS|HOURS?|CH|CREDITS?)?/);
    if (hoursMatch) {
        const required = parseInt(hoursMatch[1], 10);
        if (completedCredits < required) {
            return {
                isLocked: true,
                missing: [],
                lockReason: `Requires ${required} CH completed (you have ${completedCredits} CH)`,
            };
        }
        // Hours rule satisfied — fall through to also check any course-code prereqs
    }

    // ── Course-code prerequisites ────────────────────────────────────────────
    // Strip the hours clause if any, then check codes
    const codeOnlyStr = prereqStr.replace(/>=\s*\d+\s*(HRS|HOURS?|CH|CREDITS?)?\s*(INCLUDING[^)]*)?/gi, '');

    // If nothing left after stripping the hours part, we're done (hours already passed above)
    const hasCodePrereqs = /\d{8,10}/.test(codeOnlyStr);
    if (!hasCodePrereqs) {
        return { isLocked: false, missing: [] };
    }

    let missing: string[] = [];

    if (codeOnlyStr.includes(' OR ')) {
        const options = codeOnlyStr.split(' OR ').map(s => s.trim());
        const codes = options
            .map(extractCode)
            .filter((c): c is string => c !== null)
            // Only check codes that actually exist in our curriculum
            .filter(c => allCourseCodes.size === 0 || allCourseCodes.has(c));

        // If all options are external, treat as satisfied
        if (codes.length === 0) return { isLocked: false, missing: [] };

        const hasOne = codes.some(code => completedCourses.has(code));
        if (!hasOne) missing = codes;
    } else {
        const parts = codeOnlyStr.split(' AND ');
        const codes = parts
            .map(s => extractCode(s))
            .filter((c): c is string => c !== null)
            // Skip codes not in curriculum (pre-foundation / external)
            .filter(c => allCourseCodes.size === 0 || allCourseCodes.has(c));

        for (const code of codes) {
            if (!completedCourses.has(code)) missing.push(code);
        }
    }

    return { isLocked: missing.length > 0, missing };
}

function extractCode(str: string): string | null {
    const match = str.match(/\b\d{8,10}\b/);
    if (match) {
        let code = match[0];
        if (code.startsWith('00') && code.length === 10) code = code.substring(2);
        return code;
    }
    return null;
}
