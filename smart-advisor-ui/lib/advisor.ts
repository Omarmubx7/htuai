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

/**
 * Improved prerequisite parser that handles basic logical groups.
 */
function evaluateLogic(str: string, completed: Set<string> | Map<string, any>, rules: any, allCodes: Set<string>): { isLocked: boolean; missing: string[] } {
    const s = str.trim();
    if (!s) return { isLocked: false, missing: [] };

    // 1. Handle "OR" first (lowest precedence)
    if (s.includes(' OR ')) {
        const parts = s.split(/\s+OR\s+/i);
        const results = parts.map(p => evaluateLogic(p, completed, rules, allCodes));
        
        // If any branch is unlocked, the OR is unlocked
        if (results.some(r => !r.isLocked)) {
            return { isLocked: false, missing: [] };
        }
        // If all locked, collect all possible missing codes (student can pick any)
        return { isLocked: true, missing: results.flatMap(r => r.missing) };
    }

    // 2. Handle "AND" (higher precedence)
    if (s.includes(' AND ') || s.includes(' & ')) {
        const parts = s.split(/\s+(?:AND|&)\s+/i);
        const results = parts.map(p => evaluateLogic(p, completed, rules, allCodes));
        
        const missing = results.filter(r => r.isLocked).flatMap(r => r.missing);
        return { isLocked: missing.length > 0, missing };
    }

    // 3. Leaf node: extract code
    const code = extractCode(s, rules);
    if (code && (allCodes.size === 0 || allCodes.has(code))) {
        if (completed.has(code)) return { isLocked: false, missing: [] };
        return { isLocked: true, missing: [code] };
    }

    return { isLocked: false, missing: [] };
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

    // Clean credit hour rules from string to focus on course codes
    const hourPattern = /(?:>=\s*\d+)|(?:\d+\s*(?:HRS|HOURS?|CH|CREDITS?))/gi;
    const includePattern = /(?:\d+\s*INCLUDING[^)]*)/gi;
    const logicOnlyStr = prereqStr.replaceAll(hourPattern, '').replaceAll(includePattern, '').trim();

    const codeRegex = new RegExp(rules.code_regex);
    if (!codeRegex.exec(logicOnlyStr)) {
        return { isLocked: false, missing: [] };
    }

    const result = evaluateLogic(logicOnlyStr, completedCourses, rules, allCourseCodes);
    return { isLocked: result.isLocked, missing: result.missing };
}

function extractCode(str: string, rules: any): string | null {
    const regexStr = rules.code_regex;
    const match = new RegExp(regexStr).exec(str);
    if (match) {
        const code = match[0];
        const { leading_zeros_if_length } = rules.stripping || {};

        if (leading_zeros_if_length && code.length === leading_zeros_if_length && code.startsWith('00')) {
            const stripped = code.substring(2);
            return stripped;
        }
        return code;
    }
    return null;
}
