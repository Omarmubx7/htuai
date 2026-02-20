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
    allCourseCodes: Set<string> = new Set(),
    logicRules?: any
): PrereqResult {
    const rules = logicRules || {
        code_regex: "\\b\\d{6,10}\\b",
        separators: { and: ["AND", "&"], or: ["OR"] }
    };

    const extract = (s: string) => extractCode(s, rules);
    if (!course.prereq || course.prereq.trim() === '') {
        return { isLocked: false, missing: [] };
    }

    const prereqStr = course.prereq.toUpperCase().trim();

    // ── Department Approval ──────────────────────────────────────────────────
    if (prereqStr.includes('APPROVAL')) {
        return { isLocked: true, missing: [], lockReason: 'Requires Department Approval' };
    }

    // ── Credit-hour rules: ">= 85", "90 CH", or "100 hrs completed" ──────────
    // We only treat it as an hour rule if it has a comparison operator OR a units suffix (CH, HRS, etc.)
    const hoursMatch = prereqStr.match(/(?:>=\s*)(\d+)|(\d+)\s*(?:HRS|HOURS?|CH|CREDITS?)/);
    if (hoursMatch) {
        // hoursMatch[1] is for >= rule, hoursMatch[2] is for suffix rule
        const required = parseInt(hoursMatch[1] || hoursMatch[2], 10);
        if (completedCredits < required) {
            return {
                isLocked: true,
                missing: [],
                lockReason: `Requires ${required} CH completed (you have ${completedCredits} CH)`,
            };
        }
    }

    // ── Course-code prerequisites ────────────────────────────────────────────
    // Strip only valid credit hour rules (requiring >= or units) to leave only course codes.
    const codeOnlyStr = prereqStr.replace(/(?:>=\s*\d+)|(?:\d+\s*(?:HRS|HOURS?|CH|CREDITS?))|(?:\d+\s*INCLUDING[^)]*)/gi, '').trim();

    // If nothing left after stripping the hours part, we're done
    const codeRegex = new RegExp(rules.code_regex);
    const hasCodePrereqs = codeRegex.test(codeOnlyStr);
    if (!hasCodePrereqs) {
        return { isLocked: false, missing: [] };
    }

    let missing: string[] = [];

    if (codeOnlyStr.includes(' OR ')) {
        const orRegex = new RegExp(`\\s*(?:${rules.separators.or.join('|')})\\s*`, 'i');
        const options = codeOnlyStr.split(orRegex).map(s => s.trim());
        const codes = options
            .map(extract)
            .filter((c): c is string => c !== null)
            .filter(c => allCourseCodes.size === 0 || allCourseCodes.has(c));

        if (codes.length === 0) return { isLocked: false, missing: [] };

        const hasOne = codes.some(code => completedCourses.has(code));
        if (!hasOne) missing = codes;
    } else {
        const andRegex = new RegExp(`\\s*(?:${rules.separators.and.join('|')})\\s*`, 'i');
        const parts = codeOnlyStr.split(andRegex);
        const codes = parts
            .map(s => s.trim())
            .map(extract)
            .filter((c): c is string => c !== null)
            .filter(c => allCourseCodes.size === 0 || allCourseCodes.has(c));

        for (const code of codes) {
            if (!completedCourses.has(code)) missing.push(code);
        }
    }

    return { isLocked: missing.length > 0, missing };
}

function extractCode(str: string, rules: any): string | null {
    const regexStr = rules.code_regex;
    const match = str.match(new RegExp(regexStr));
    if (match) {
        let code = match[0];
        const { leading_zeros_if_length, target_length } = rules.stripping || {};

        if (leading_zeros_if_length && code.length === leading_zeros_if_length && code.startsWith('00')) {
            const stripped = code.substring(2);
            return stripped;
        }
        return code;
    }
    return null;
}
