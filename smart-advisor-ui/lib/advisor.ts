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
function checkDepartmentApproval(prereqStr: string): PrereqResult | null {
    if (prereqStr.includes('APPROVAL')) {
        return { isLocked: true, missing: [], lockReason: 'Requires Department Approval' };
    }
    return null;
}

function checkCreditHours(prereqStr: string, completedCredits: number): PrereqResult | null {
    const hoursMatch = /(?:>=\s*)(\d+)|(\d+)\s*(?:HRS|HOURS?|CH|CREDITS?)/i.exec(prereqStr);
    if (hoursMatch) {
        const required = Number.parseInt(hoursMatch[1] || hoursMatch[2], 10);
        if (completedCredits < required) {
            return {
                isLocked: true,
                missing: [],
                lockReason: `Requires ${required} CH completed (you have ${completedCredits} CH)`,
            };
        }
    }
    return null;
}

export function checkPrerequisites(
    course: Course,
    completedCourses: Map<string, any> | Set<string>,
    completedCredits: number = 0,
    allCourseCodes: Set<string> = new Set(),
    logicRules?: any
): PrereqResult {
    const rules = logicRules || {
        code_regex: String.raw`\b\d{6,10}\b`,
        separators: { and: ["AND", "&"], or: ["OR"] }
    };

    if (!course.prereq || course.prereq.trim() === '') {
        return { isLocked: false, missing: [] };
    }

    const prereqStr = course.prereq.toUpperCase().trim();

    const approvalResult = checkDepartmentApproval(prereqStr);
    if (approvalResult) return approvalResult;

    const hoursResult = checkCreditHours(prereqStr, completedCredits);
    if (hoursResult) return hoursResult;

    const hourPattern = /(?:>=\s*\d+)|(?:\d+\s*(?:HRS|HOURS?|CH|CREDITS?))/gi;
    const includePattern = /(?:\d+\s*INCLUDING[^)]*)/gi;
    const codeOnlyStr = prereqStr.replaceAll(hourPattern, '').replaceAll(includePattern, '').trim();

    const codeRegex = new RegExp(rules.code_regex);
    if (!codeRegex.exec(codeOnlyStr)) {
        return { isLocked: false, missing: [] };
    }

    let missing: string[] = [];
    const extract = (s: string) => extractCode(s, rules);

    if (codeOnlyStr.includes(' OR ')) {
        const orRegex = new RegExp(String.raw`\s*(?:${rules.separators.or.join('|')})\s*`, 'i');
        const codes = codeOnlyStr.split(orRegex)
            .map(s => extract(s.trim()))
            .filter((c): c is string => c !== null)
            .filter(c => allCourseCodes.size === 0 || allCourseCodes.has(c));

        if (codes.length === 0) return { isLocked: false, missing: [] };
        if (!codes.some(code => completedCourses.has(code))) missing = codes;
    } else {
        const andRegex = new RegExp(String.raw`\s*(?:${rules.separators.and.join('|')})\s*`, 'i');
        const codes = codeOnlyStr.split(andRegex)
            .map(s => extract(s.trim()))
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
    const match = new RegExp(regexStr).exec(str);
    if (match) {
        let code = match[0];
        const { leading_zeros_if_length } = rules.stripping || {};

        if (leading_zeros_if_length && code.length === leading_zeros_if_length && code.startsWith('00')) {
            const stripped = code.substring(2);
            return stripped;
        }
        return code;
    }
    return null;
}
