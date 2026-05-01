import { Course, PrerequisiteLogicRules } from '@/types';

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
    // Matches patterns like "90 credit hours", "30 CH", "60 credits completed", ">= 45"
    // Using match with global flag to find all occurrences, then take the first valid match
    const regex = /(?:>=\s*(\d+))|(\d+)\s*(?:HRS|HOURS?|CH|CREDITS?)/ig;
    let match;
    let required = 0;
    // Find the first match with a captured number
    while ((match = regex.exec(prereqStr)) !== null) {
        const numStr = match[1] || match[2];
        if (numStr) {
            required = Number.parseInt(numStr, 10);
            break;
        }
    }
    if (required > 0 && completedCredits < required) {
        return {
            isLocked: true,
            missing: [],
            lockReason: `Requires ${required} CH completed (you have ${completedCredits} CH)`,
        };
    }
    return null;
}

function checkPlacement(prereqStr: string, completed: Map<string, string> | Set<string>): PrereqResult | null {
    // If it contains PLACEMENT but NOT as a standalone logic code handled by evaluateLogic
    // (Actually, better to let evaluateLogic handle it if it matches code_regex)
    // But we keep this for backwards compatibility with complex strings.
    if ((prereqStr.includes('PLACEMENT') || prereqStr.includes('PASSED TEST')) && !prereqStr.includes(' OR ') && !prereqStr.includes(' AND ')) {
        if (completed.has('HTU_PLACEMENT') || completed.has('PLACEMENT')) {
            return { isLocked: false, missing: [] };
        }
        return { isLocked: true, missing: ['HTU_PLACEMENT'], lockReason: 'Requires HTU Placement Test' };
    }
    return null;
}

/**
 * Improved prerequisite parser that handles basic logical groups.
 */
function evaluateLogic(
    str: string,
    completed: Set<string> | Map<string, string>,
    rules: PrerequisiteLogicRules,
    allCodes: Set<string>
): { isLocked: boolean; missing: string[] } {
    const s = str.trim();
    if (!s) return { isLocked: false, missing: [] };

    // 0. Handle NOT
    if (s.startsWith('NOT ')) {
        const sub = s.substring(4).trim();
        const res = evaluateLogic(sub, completed, rules, allCodes);
        // If the sub-expression is UNLOCKED (satisfied), NOT makes it LOCKED.
        return { isLocked: !res.isLocked, missing: [] };
    }

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
    if (code) {
        // If it's a real course code (in our curriculum) OR a special code like HTU_PLACEMENT
        if (allCodes.size === 0 || allCodes.has(code) || code === 'HTU_PLACEMENT') {
            if (completed.has(code)) return { isLocked: false, missing: [] };
            return { isLocked: true, missing: [code] };
        }
        return { isLocked: true, missing: [code] };
    }

    return { isLocked: false, missing: [] };
}

export function checkPrerequisites(
    course: Course,
    completedCourses: Map<string, string> | Set<string>,
    completedCredits: number = 0,
    allCourseCodes: Set<string> = new Set(),
    logicRules?: PrerequisiteLogicRules
): PrereqResult {
    const rules: PrerequisiteLogicRules = logicRules || {
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

    const placementResult = checkPlacement(prereqStr, completedCourses);
    if (placementResult && placementResult.isLocked) return placementResult;

    // Clean credit hour rules from string to focus on course codes
    const hourPattern = /(?:>=\s*\d+)|(?:\d+\s*(?:HRS|HOURS?|CH|CREDITS?))/gi;
    const includePattern = /(?:\d+\s*INCLUDING[^)]*)/gi;
    const logicOnlyStr = prereqStr.replaceAll(hourPattern, '').replaceAll(includePattern, '').trim();

    const codeRegex = new RegExp(rules.code_regex);
    if (!codeRegex.exec(logicOnlyStr)) {
        // No codes found in logic string, but logicOnlyStr might still have text like "DEPT APPROVAL"
        // which was already handled by checkDepartmentApproval.
        // If we reach here and there are no codes, it might be a malformed string or a non-course rule.
        return { isLocked: false, missing: [] };
    }

    // CRITICAL: Ensure allCourseCodes is not empty if we want strict checking
    if (allCourseCodes.size === 0) {
        console.warn("[Advisor] allCourseCodes is empty, prerequisite check may be unreliable.");
    }

    const result = evaluateLogic(logicOnlyStr, completedCourses, rules, allCourseCodes);
    return { isLocked: result.isLocked, missing: result.missing };
}

function extractCode(str: string, rules: PrerequisiteLogicRules): string | null {
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
