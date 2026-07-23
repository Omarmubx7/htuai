"use client";

import { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Course, CourseData, CurriculumRules } from '@/types';
import CourseCard from './ui/CourseCard';
import { checkPrerequisites } from '@/lib/advisor';
import { calculateGPA } from '@/lib/grading';
import { CheckCircle2, Trophy, RotateCcw, Loader2, GraduationCap, BookOpen, Target, Star, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import StudentDashboard from './StudentDashboard';
import ConfirmDialog from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';
import dynamic from 'next/dynamic';
import { safeStorage } from '@/lib/safe-storage';
import SemesterSetupWizard from './SemesterSetupWizard';

const CourseNotesModal = dynamic(() => import('./CourseNotesModal'), {
    ssr: false,
});

// Parse and format exam tips that may be pipe-separated strings
// Format: "day | course_code | hours | tip_text" or just plain text
function parseExamTip(tip: string): { day?: string; course?: string; hours?: string; text: string } {
    if (!tip || typeof tip !== 'string') {
        return { text: tip || '' };
    }
    
    const parts = tip.split('|').map(p => p.trim());
    if (parts.length === 4) {
        // Pipe-separated format
        const [day, course, hours, text] = parts;
        return { day, course, hours, text: text || tip };
    }
    // Plain text format
    return { text: tip };
}

type ExamTipItemProps = Readonly<{ tip: string }>;

function ExamTipItem({ tip }: ExamTipItemProps) {
    const parsed = parseExamTip(tip);
    
    if (parsed.day || parsed.course || parsed.hours) {
        // Structured format
        return (
            <div className="text-xs text-gray-700 space-y-0.5">
                <p className="font-semibold text-gray-900">
                    {parsed.day && `${parsed.day}`}
                    {parsed.day && parsed.course && ' • '}
                    {parsed.course && `${parsed.course}`}
                </p>
                {parsed.hours && <p className="text-gray-600">⏱️ {parsed.hours} hours</p>}
                <p className="text-gray-700">{parsed.text}</p>
            </div>
        );
    }
    
    // Plain text format
    return <p className="text-xs text-gray-700">✓ {parsed.text}</p>;
}

export interface CourseTrackerViewProps {
    data: CourseData;
    studentId: string;
    majorKey: string;
    rules: CurriculumRules;
    completedCourses: Map<string, string>;
    toggleCourse: (code: string) => void;
    updateCourseGrade: (code: string, grade: string) => void;
    saveStatus: "saved" | "saving" | null;
    previousGpaHistory?: { gpa: number | null, credits: number | null };
    setPreviousGpaHistory?: (val: { gpa: number | null, credits: number | null }) => void;
    resetProgress: () => void;
}

function CourseTrackerView({
    data,
    studentId,
    majorKey,
    rules,
    completedCourses,
    toggleCourse,
    updateCourseGrade,
    saveStatus,
    previousGpaHistory,
    setPreviousGpaHistory,
    resetProgress
}: Readonly<CourseTrackerViewProps>) {
    const [viewMode, setViewMode] = useState<"level" | "category">("level");
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [selectedCourseForNotes, setSelectedCourseForNotes] = useState<{ id: string; title: string } | null>(null);
    const { toast } = useToast();
    const [isMobile, setIsMobile] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [plannerCourseCodes, setPlannerCourseCodes] = useState<Set<string>>(new Set());
    const [activeSemester, setActiveSemester] = useState<{
        id: number;
        name: string;
        type?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        courses: Array<{ code: string; name: string; credits: number; midterm_date?: string | null; final_date?: string | null }>;
    } | null>(null);
    const [aiLoading, setAiLoading] = useState<"suggestions" | "schedule" | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [suggestRemaining, setSuggestRemaining] = useState<number | null>(null);
    const [scheduleRemaining, setScheduleRemaining] = useState<number | null>(null);
    const [suggestResetAt, setSuggestResetAt] = useState<string | null>(null);
    const [scheduleResetAt, setScheduleResetAt] = useState<string | null>(null);
    const [suggestCountdown, setSuggestCountdown] = useState<string | null>(null);
    const [scheduleCountdown, setScheduleCountdown] = useState<string | null>(null);
    const [aiRecommendations, setAiRecommendations] = useState<Array<{ code: string; reason: string; name: string }>>([]);
    const [aiTips, setAiTips] = useState<string[]>([]);
    const [weeklyPlan, setWeeklyPlan] = useState<Array<{ day: string; sessions: Array<{ course: string; hours: number; focus: string }> }>>([]);
    const [examTips, setExamTips] = useState<string[]>([]);

    const formatCountdown = (targetIso: string | null) => {
        if (!targetIso) return null;
        const target = new Date(targetIso).getTime();
        if (Number.isNaN(target)) return null;

        const remainingMs = Math.max(target - Date.now(), 0);
        const hours = Math.floor(remainingMs / 3_600_000);
        const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
        const seconds = Math.floor((remainingMs % 60_000) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const jumpToCourseList = () => {
        setViewMode('level');
        globalThis.window.setTimeout(() => {
            const anchor = globalThis.document.getElementById('wt-first-course')
                || globalThis.document.getElementById('wt-view-toggle');
            if (!anchor) return;
            const y = anchor.getBoundingClientRect().top + globalThis.window.scrollY - 100;
            globalThis.window.scrollTo({ top: y, behavior: 'smooth' });
        }, 140);
    };
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [loadingSemester, setLoadingSemester] = useState(true);

    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    useEffect(() => {
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [checkMobile]);

    // Fetch active semester from planner
    useEffect(() => {
        setLoadingSemester(true);
        fetch('/api/planner/semesters')
            .then(r => r.ok ? r.json() : null)
            .then((data: { semesters?: Array<{ id: number; name: string; start_date?: string | null; end_date?: string | null; courses?: Array<{ code: string; name: string; credits: number }> }> } | null) => {
                if (data?.semesters?.length) {
                    // Find most recent semester with courses
                    const sem = data.semesters.find(s => (s.courses?.length ?? 0) > 0) ?? data.semesters[0];
                    setActiveSemester({ id: sem.id, name: sem.name, courses: sem.courses ?? [] });
                    
                    const allCodes = new Set<string>();
                    data.semesters.forEach(s => {
                        s.courses?.forEach(c => allCodes.add(c.code));
                    });
                    setPlannerCourseCodes(allCodes);
                    
                    // Restore cached schedule for this semester
                    const cached = safeStorage.get(`schedule-sem-${sem.id}`);
                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached);
                            if (parsed.weeklyPlan) setWeeklyPlan(parsed.weeklyPlan);
                            if (parsed.examTips) setExamTips(parsed.examTips);
                        } catch { /* ignore parse errors */ }
                    }
                }
            })
            .catch(() => { /* non-fatal */ })
            .finally(() => setLoadingSemester(false));
    }, []);

    // Fetch AI usage counters for the current user so we can show remaining counts
    useEffect(() => {
        let mounted = true;
        interface AiUsageResponse {
            usage?: {
                suggestCourses?: { remaining?: number; resetAt?: string };
                generateSchedule?: { remaining?: number; resetAt?: string };
            };
        }
        fetch('/api/ai/usage')
            .then(r => r.ok ? r.json() : null)
            .then((data: AiUsageResponse | null) => {
                if (!mounted || !data?.usage) return;
                setSuggestRemaining(typeof data.usage.suggestCourses?.remaining === 'number' ? data.usage.suggestCourses.remaining : null);
                setScheduleRemaining(typeof data.usage.generateSchedule?.remaining === 'number' ? data.usage.generateSchedule.remaining : null);
                setSuggestResetAt(typeof data.usage.suggestCourses?.resetAt === 'string' ? data.usage.suggestCourses.resetAt : null);
                setScheduleResetAt(typeof data.usage.generateSchedule?.resetAt === 'string' ? data.usage.generateSchedule.resetAt : null);
            })
            .catch(() => {})
            .finally(() => {});
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        const updateCountdowns = () => {
            setSuggestCountdown(formatCountdown(suggestResetAt));
            setScheduleCountdown(formatCountdown(scheduleResetAt));
        };

        updateCountdowns();
        const interval = globalThis.setInterval(updateCountdowns, 1000);
        return () => globalThis.clearInterval(interval);
    }, [suggestResetAt, scheduleResetAt]);

    const allCourses = [
        ...data.university_requirements,
        ...data.college_requirements,
        ...(data.university_electives ?? []),
        ...data.department_requirements,
        ...data.electives,
        ...(data.work_market_requirements ?? [])
    ];
    const completedCodes = new Set(completedCourses.keys());

    const courseMap = Object.fromEntries(allCourses.map((c) => [c.code, c.name]));
    const allCourseCodes = new Set(allCourses.map(c => c.code));

    // Determine rule set from majorKey
    const degreeTypeValues = Object.values(rules.degree_types);
    const defaultRuleSet = rules.degree_types.computing_bsc ?? degreeTypeValues[0];
    if (!defaultRuleSet) {
        throw new Error("No degree rules configured");
    }
    const ruleSet = degreeTypeValues.find((rs) => rs.major_keys.includes(majorKey)) ?? defaultRuleSet;

    const totalCredits = ruleSet.total_credits;
    const MAX_DEPT_ELECTIVES = ruleSet.max_dept_electives || 3;
    const MAX_UNI_ELECTIVES = ruleSet.max_uni_electives || 3;
    const TOTAL_CAP = totalCredits;

    // ── University Requirements
    const uniReqCodes = new Set(data.university_requirements.map(r => r.code));

    // ── University Electives
    const uniElectiveCodes = new Set((data.university_electives ?? []).map((c: Course) => c.code));
    const tickedUniElecCount = Array.from(completedCourses.keys()).filter(c => uniElectiveCodes.has(c)).length;

    // ── Department Electives
    const deptElectiveCodes = new Set(data.electives.map((c: Course) => c.code));
    const tickedDeptElecCount = Array.from(completedCourses.keys()).filter(c => deptElectiveCodes.has(c)).length;
    const deptElecCapReached = tickedDeptElecCount >= MAX_DEPT_ELECTIVES;

    // ── Completed credits
    const completedCredits = (() => {
        let total = 0;
        let uniElecCounted = 0;
        let deptElecCounted = 0;
        for (const course of allCourses) {
            if (!completedCourses.has(course.code)) continue;
            if (uniElectiveCodes.has(course.code)) {
                if (uniElecCounted < MAX_UNI_ELECTIVES) { total += course.ch; uniElecCounted++; }
            } else if (deptElectiveCodes.has(course.code)) {
                if (deptElecCounted < MAX_DEPT_ELECTIVES) { total += course.ch; deptElecCounted++; }
            } else {
                total += course.ch;
            }
        }
        return Math.min(total, TOTAL_CAP);
    })();

    // ── Completed courses count (capped by electives)
    const countedCourses = (() => {
        let count = 0;
        let uniElecCounted = 0;
        let deptElecCounted = 0;
        for (const course of allCourses) {
            if (!completedCourses.has(course.code)) continue;
            if (uniElectiveCodes.has(course.code)) {
                if (uniElecCounted < MAX_UNI_ELECTIVES) { count++; uniElecCounted++; }
            } else if (deptElectiveCodes.has(course.code)) {
                if (deptElecCounted < MAX_DEPT_ELECTIVES) { count++; deptElecCounted++; }
            } else {
                count++;
            }
        }
        return count;
    })();

    const requiredCoursesCount = 
        data.university_requirements.length +
        data.college_requirements.length +
        data.department_requirements.length +
        (data.work_market_requirements?.length ?? 0) +
        MAX_UNI_ELECTIVES +
        MAX_DEPT_ELECTIVES;

    const progress = Math.min(completedCredits / totalCredits, 1);

    // Grouping Logic
    const getGroups = () => {
        if (viewMode === 'category') {
            return {
                "University Requirements": data.university_requirements,
                "University Elective": data.university_electives ?? [],
                "College Requirements": data.college_requirements,
                "Department Requirements": [
                    ...data.department_requirements,
                    ...(data.work_market_requirements ?? [])
                ],
                "Department Elective": data.electives,
            };
        } else {
            return {
                "First Year (Level 1)": allCourses.filter(c => c.level === 1),
                "Second Year (Level 2)": allCourses.filter(c => c.level === 2),
                "Third Year (Level 3)": allCourses.filter(c => c.level === 3),
                "Fourth Year (Level 4)": allCourses.filter(c => c.level === 4),
                "Fifth Year (Level 5)": allCourses.filter(c => c.level !== undefined && c.level >= 5),
            };
        }
    };

    const groups = getGroups();

    const generateAiSuggestions = async () => {
        setAiLoading("suggestions");
        setAiError(null);

        const enrolledCodes = new Set(activeSemester?.courses?.map(c => c.code) || []);
        const eligibleCourses = allCourses.filter(course => {
            if (completedCodes.has(course.code)) return false;
            if (enrolledCodes.has(course.code)) return false;
            let isElectiveLocked = false;
            if (uniElectiveCodes.has(course.code)) isElectiveLocked = tickedUniElecCount >= MAX_UNI_ELECTIVES;
            else if (deptElectiveCodes.has(course.code)) isElectiveLocked = deptElecCapReached;
            if (isElectiveLocked) return false;

            const isUniversitySubject = uniReqCodes.has(course.code) || uniElectiveCodes.has(course.code);
            const { isLocked: prereqLocked } = checkPrerequisites(course, completedCourses, completedCredits, allCourseCodes, rules.logic_rules?.prerequisites);
            return isUniversitySubject ? false : !prereqLocked;
        }).sort((a, b) => {
            const aIsPearson = a.framework === 'HNC' || a.framework === 'HND' || (a.name || '').toLowerCase().includes('hnc') || (a.name || '').toLowerCase().includes('hnd');
            const bIsPearson = b.framework === 'HNC' || b.framework === 'HND' || (b.name || '').toLowerCase().includes('hnc') || (b.name || '').toLowerCase().includes('hnd');
            
            if (aIsPearson && !bIsPearson) return -1;
            if (!aIsPearson && bIsPearson) return 1;

            const aLevel = typeof a.level === 'number' ? a.level : 99;
            const bLevel = typeof b.level === 'number' ? b.level : 99;
            
            if (aLevel !== bLevel) {
                return aLevel - bLevel;
            }
            
            return 0;
        });
        const eligibleCourseCodes = new Set(eligibleCourses.map(course => course.code));

        // If there are too few candidate courses, avoid calling AI and ask user to mark more
        if (eligibleCourses.length <= 1) {
            setAiError("Add more courses before asking for suggestions — mark at least 2 courses.");
            return;
        }

        // Check remaining quota client-side (best-effort) and show friendly message
        if (suggestRemaining === 0) {
            setAiError("You've reached your AI suggestions limit (2 per 24 hours). Try again after the timer resets.");
            return;
        }

        try {
            const response = await fetch("/api/ai/suggest-courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    major: majorKey,
                    completedCourses: Array.from(completedCourses.keys()),
                    candidateCourses: eligibleCourses.map(c => ({ code: c.code, name: c.name, credits: c.ch })),
                })
            });

            let payload;
            if (!response.ok) {
                const errText = await response.text();
                try {
                    const errJson = JSON.parse(errText);
                    if (response.status === 503 && errJson?.fallback) {
                        payload = { result: errJson.fallback };
                    } else if (errJson?.error === 'Daily AI limit reached') {
                        throw new Error(errJson.details || errJson.error);
                    } else {
                        throw new Error(errJson.details || errJson.error || 'Failed to generate suggestions');
                    }
                } catch (parseError) {
                    if (!payload) {
                        throw new Error('Failed: ' + (errText.substring(0, 150) || response.statusText));
                    }
                }
            } else {
                payload = await response.json();
            }

            const recommendations = Array.isArray(payload.result?.recommendations)
                ? (payload.result.recommendations as any[])
                    .filter((item: any): item is { code: string; reason: string; name?: string } => !!item?.code && !!item?.reason)
                    .filter(item => eligibleCourseCodes.has(item.code))
                    .map(item => ({
                        code: item.code,
                        reason: item.reason,
                        name: item.name || courseMap[item.code] || item.code
                    }))
                    .slice(0, 5)
                : [];

            const tips = Array.isArray(payload.result?.tips)
                ? (payload.result.tips as any[]).filter((tip: any): tip is string => typeof tip === "string").slice(0, 3)
                : [];

            setAiRecommendations(recommendations);
            setAiTips(tips);
            if (recommendations.length === 0) {
                setAiError("No recommendations found yet. Try again after marking more courses.");
            }
            // Update local remaining counters (best-effort) after successful call
            setSuggestRemaining(prev => (typeof prev === 'number' ? Math.max(prev - 1, 0) : prev));
        } catch (error: unknown) {
            console.error("AI recommendations error", error);
            setAiError(error instanceof Error ? error.message : "Could not generate recommendations right now.");
        } finally {
            setAiLoading(null);
        }
    };

    const generateWeeklySchedule = async () => {
        setAiLoading("schedule");
        setAiError(null);

        try {
            const semCourses = activeSemester?.courses ?? [];
            const targetCourses = semCourses.map(c => ({ code: c.code, name: c.name, credits: c.credits }));

            if (targetCourses.length === 0) {
                setAiError("Add courses to your planner semester first.");
                setAiLoading(null);
                return;
            }

            if (targetCourses.length === 1) {
                setAiError("Add at least one more course to build a useful schedule.");
                setAiLoading(null);
                return;
            }

            if (scheduleRemaining === 0) {
                setAiError("You've reached your AI schedule limit (2 per 24 hours). Try again after the timer resets.");
                setAiLoading(null);
                return;
            }

            const response = await fetch("/api/ai/generate-schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    major: majorKey,
                    weeklyHours: 14,
                    courses: targetCourses,
                })
            });

            let payload;
            if (!response.ok) {
                const errText = await response.text();
                try {
                    const errJson = JSON.parse(errText);
                    if (response.status === 503 && errJson?.fallback) {
                        payload = { result: errJson.fallback };
                    } else if (errJson?.error === 'Daily AI limit reached') {
                        throw new Error(errJson.details || errJson.error);
                    } else {
                        throw new Error(errJson.details || errJson.error || "Failed to fetch AI schedule");
                    }
                } catch (parseError) {
                    if (!payload) throw new Error("Failed to fetch AI schedule");
                }
            } else {
                payload = await response.json();
            }

            const normalizedPlan = Array.isArray(payload.result?.weeklyPlan)
                ? (payload.result.weeklyPlan as any[])
                    .filter((entry: any): entry is { day: string; sessions: Array<{ course: string; hours: number; focus: string }> } => {
                        if (!entry || typeof entry.day !== "string" || !Array.isArray(entry.sessions)) return false;
                        return true;
                    })
                    .map((entry) => ({
                        day: entry.day,
                        sessions: entry.sessions
                            .filter((session: any): session is { course: string; hours: number; focus: string } =>
                                typeof session?.course === "string" &&
                                typeof session?.hours === "number" &&
                                typeof session?.focus === "string")
                            .slice(0, 3)
                    }))
                    .filter((entry) => entry.sessions.length > 0)
                    .slice(0, 7)
                : [];

            const normalizedExamTips = Array.isArray(payload.result?.examTips)
                ? (payload.result.examTips as any[]).filter((tip: any): tip is string => typeof tip === "string").slice(0, 3)
                : [];

            setWeeklyPlan(normalizedPlan);
            setExamTips(normalizedExamTips);

            // Cache to safeStorage so PlannerHome can read it without re-fetching
            if (activeSemester && normalizedPlan.length > 0) {
                safeStorage.set(`schedule-sem-${activeSemester.id}`, JSON.stringify({ weeklyPlan: normalizedPlan, examTips: normalizedExamTips }));
            }

            if (normalizedPlan.length === 0) {
                setAiError("No schedule generated yet. Please retry.");
            }
            setScheduleRemaining(prev => (typeof prev === 'number' ? Math.max(prev - 1, 0) : prev));
        } catch (error: unknown) {
            console.error("AI schedule error", error);
            setAiError(error instanceof Error ? error.message : "Could not generate a schedule right now.");
        } finally {
            setAiLoading(null);
        }
    };

    const renderCourseCard = (course: Course) => {
        let isElectiveLocked = false;
        let capMax = 0;

        if (uniElectiveCodes.has(course.code)) {
            isElectiveLocked = tickedUniElecCount >= MAX_UNI_ELECTIVES && !completedCourses.has(course.code);
            capMax = MAX_UNI_ELECTIVES;
        } else if (deptElectiveCodes.has(course.code)) {
            isElectiveLocked = deptElecCapReached && !completedCourses.has(course.code);
            capMax = MAX_DEPT_ELECTIVES;
        }

        const { isLocked: prereqLocked, missing, lockReason: prereqReason } = checkPrerequisites(
            course,
            completedCourses,
            completedCredits,
            allCourseCodes,
            rules.logic_rules?.prerequisites
        );
        const isUniversitySubject = uniReqCodes.has(course.code) || uniElectiveCodes.has(course.code);
        const isLocked = isElectiveLocked || (!isUniversitySubject && prereqLocked);
        const hasPrereqWarning = isUniversitySubject && prereqLocked;

        let lockReason: string | undefined = undefined;
        if (isElectiveLocked) {
            lockReason = `Max ${capMax} electives reached — untick one to swap`;
        } else if (prereqLocked) {
            lockReason = prereqReason;
        }

        return (
            <CourseCard
                key={course.code}
                course={course}
                isCompleted={completedCourses.has(course.code)}
                isInProgress={plannerCourseCodes.has(course.code) && !completedCourses.has(course.code)}
                grade={completedCourses.get(course.code) || "M"}
                isLocked={isLocked}
                hasPrereqWarning={hasPrereqWarning}
                lockReason={lockReason}
                missingPrereqs={missing}
                courseMap={courseMap}
                completedCredits={completedCredits}
                onToggle={() => toggleCourse(course.code)}
                onOpenNotes={() => setSelectedCourseForNotes({ id: course.code, title: course.name })}
            />
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-24 sm:pb-36 space-y-6 sm:space-y-12 relative">
            {/* Ambient effects */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-350 h-200"
                    style={{ background: 'radial-gradient(ellipse 50% 35% at 50% 0%, rgba(220,72,53,0.08) 0%, transparent 70%)' }} />
                <div className="absolute -right-40 top-1/3 w-150 h-150"
                    style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)' }} />
                <div className="absolute -left-40 bottom-1/4 w-125 h-125"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.015]"
                    style={{ backgroundImage: 'linear-gradient(#222d32 1px, transparent 1px), linear-gradient(90deg, #222d32 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            <ConfirmDialog
                isOpen={showResetConfirm}
                title="Reset All Progress"
                description="This will clear all your completed courses and grades. You'll need to re-mark everything from scratch."
                confirmLabel="Reset All"
                variant="danger"
                onConfirm={() => {
                    resetProgress();
                    toast("Progress reset successfully", "success");
                    setShowResetConfirm(false);
                }}
                onCancel={() => setShowResetConfirm(false)}
            />

            <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <div className="htu-label mb-2">
                            Degree Progress
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#222d32] tracking-tight leading-none">
                            Course Tracker
                        </h1>
                    </div>

                        <div className="flex items-center gap-4">
                        <div className="min-w-25 h-6 flex items-center">
                            <AnimatePresence>
                                {saveStatus === 'saving' && (
                                    <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="flex items-center gap-2 text-xs font-bold text-[#5a6472]">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Syncing…
                                    </motion.span>
                                )}
                                {saveStatus === 'saved' && (
                                    <motion.span key="saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                        className="flex items-center gap-2 text-xs font-bold" style={{ color: '#0da55a' }}>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Cloud Synced
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-4 w-px bg-[#dde3ec]" />

                        <motion.button
                            id="wt-reset-btn"
                            whileHover={{ scale: 1.05, x: 2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowResetConfirm(true)}
                            className="flex items-center gap-2 text-sm sm:text-xs font-bold text-[#5a6472] hover:text-[#dc4835] transition-all p-2 sm:p-0 -ml-2 sm:ml-0"
                        >
                            <RotateCcw className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                            Reset All
                        </motion.button>
                    </div>
                </div>

                <div id="wt-progress-card" className="bg-white border border-[#dde3ec] p-6 rounded-xl w-full lg:w-100 shrink-0 relative overflow-hidden group" style={{ boxShadow: '0 2px 8px rgba(34,45,50,0.07)' }}>
                    <div className="absolute top-0 right-0 p-8 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
                        <Trophy className="w-24 h-24" style={{ color: '#dc4835' }} />
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-[#5a6472] uppercase tracking-[0.2em]">Overall Progress</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-[#222d32]">{completedCredits}</span>
                                    <span className="text-sm font-bold text-[#92604c]">/ {totalCredits} CH</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-[#edf1f6] border border-[#dde3ec] flex items-center justify-center" style={{ color: '#dc4835' }}>
                                <GraduationCap className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="h-1.5 bg-[#dde3ec] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress * 100}%` }}
                                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                    className="h-full rounded-full"
                                    style={{ background: '#dc4835' }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0da55a' }} />
                                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#dc4835' }}>
                                        {Math.round(progress * 100)}% Complete
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={jumpToCourseList}
                                    className="text-xs font-bold tracking-tight hover:text-[#dc4835] transition-colors text-[#5a6472]"
                                    title="Jump to course list"
                                >
                                    <span className="font-black text-[#222d32]">{countedCourses}</span>
                                    <span className="mx-1 text-[#92604c]">/</span>
                                    <span className="text-[#5a6472]">{requiredCoursesCount} Courses</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <StudentDashboard
                completedCourses={completedCourses}
                completedCredits={completedCredits}
                totalCredits={totalCredits}
                data={data}
                allCourses={allCourses}
                rules={rules}
                previousGpaHistory={previousGpaHistory}
                setPreviousGpaHistory={setPreviousGpaHistory}
                onCategoryClick={(category) => {
                    setViewMode('category');
                    setTimeout(() => {
                        const id = `section-${category.replaceAll(/\s+/g, '-')}`;
                        const el = document.getElementById(id);
                        if (el) {
                            const y = el.getBoundingClientRect().top + window.scrollY - 100;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                    }, 150);
                }}
            />

            <section className="rounded-xl border border-[#dde3ec] bg-white p-5 sm:p-6 space-y-4" style={{ boxShadow: '0 2px 8px rgba(34,45,50,0.07)' }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-[#222d32] tracking-tight">MUBX AI Advisor</h2>
                        <p className="text-xs sm:text-sm text-[#5a6472]">Free AI-powered next-semester recommendations and study planning.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => void generateAiSuggestions()}
                                disabled={aiLoading !== null}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[#43aad7] text-xs font-black uppercase tracking-wider disabled:opacity-60 hover:bg-[#43aad7]/10 transition-colors"
                            >
                                {aiLoading === "suggestions" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Suggest Courses
                                {typeof suggestRemaining === 'number' && (
                                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-black rounded bg-[#43aad7]/15 text-[#43aad7]">AI trials: {suggestRemaining}</span>
                                )}
                            </button>
                            {suggestCountdown && typeof suggestRemaining === 'number' && suggestRemaining > 0 && suggestRemaining <= 2 && (
                                <span className="text-xs font-black uppercase tracking-wider" style={{ color: '#dc4835' }}>
                                    Resets in {suggestCountdown}
                                </span>
                            )}
                        </div>
                        {loadingSemester && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#dde3ec] bg-[#edf1f6] opacity-50">
                                <div className="w-3 h-3 rounded-full bg-[#dde3ec] animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-wider text-[#5a6472]">Syncing...</span>
                            </div>
                        )}
                        {!loadingSemester && activeSemester && activeSemester.courses.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => void generateWeeklySchedule()}
                                    disabled={aiLoading !== null}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#43aad7] text-[#43aad7] text-xs font-black uppercase tracking-wider disabled:opacity-60 hover:bg-[#43aad7]/10 transition-colors"
                                >
                                    {aiLoading === "schedule" ? (
                                        <>
                                            <div className="w-3 h-3 rounded-full bg-[#43aad7] animate-ping mr-1" />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Build your schedule
                                            {typeof scheduleRemaining === 'number' && (
                                                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-black rounded" style={{ background: '#dc4835', color: '#fff' }}>AI trials: {scheduleRemaining}</span>
                                            )}
                                        </>
                                    )}
                                </button>
                                {scheduleCountdown && typeof scheduleRemaining === 'number' && scheduleRemaining > 0 && scheduleRemaining <= 2 && (
                                    <span className="text-xs font-black uppercase tracking-wider" style={{ color: '#dc4835' }}>
                                        Resets in {scheduleCountdown}
                                    </span>
                                )}
                            </div>
                        )}
                        {!loadingSemester && (!activeSemester || activeSemester.courses.length === 0) && (
                            <button
                                onClick={() => setShowSetupWizard(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#f39c14] text-[#f39c14] text-xs font-black uppercase tracking-wider hover:bg-[#f39c14]/10 transition-colors"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Set up your semester
                            </button>
                        )}
                    </div>
                </div>

                {aiError && (
                    <p className="text-xs font-semibold" style={{ color: '#dc4835' }}>{aiError}</p>
                )}

                {aiLoading === "suggestions" && aiRecommendations.length === 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#222d32]">Analyzing Degree Progress...</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {new Array(2).fill(null).map((_, i) => (
                                <div key={`sugg-skel-card-${i === 0 ? 'left' : 'right'}`} className="rounded-lg border border-[#dde3ec] bg-[#edf1f6] p-4 space-y-3 animate-pulse">
                                    <div className="h-3 w-24 bg-[#dde3ec] rounded" />
                                    <div className="h-2 w-full bg-[#dde3ec] rounded" />
                                    <div className="h-2 w-4/5 bg-[#dde3ec] rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {aiRecommendations.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#222d32]">Recommended Next Courses</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {aiRecommendations.map((item) => (
                                <Link key={item.code} href={`/courses/${item.code}`} className="rounded-lg border border-[#dde3ec] bg-white p-3 hover:border-[#dc4835] transition-colors">
                                    <div>
                                        <div className="text-xs font-black" style={{ color: '#43aad7' }}>{courseMap[item.code] || item.code}</div>
                                        <p className="text-xs mt-0.5 font-mono" style={{ color: '#92604c' }}>{item.code}</p>
                                        <p className="text-xs text-[#222d32] mt-1">{item.reason}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {aiTips.length > 0 && (
                    <div className="space-y-1">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#222d32]">Registration Tips</h3>
                        {Array.from(new Set(aiTips)).map((tip) => (
                            <p key={tip} className="text-xs text-[#5a6472]">- {tip}</p>
                        ))}
                    </div>
                )}

                {weeklyPlan.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#222d32]">Weekly Schedule</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                            {weeklyPlan.map((dayPlan) => {
                                const isoLike = /^\d{4}-\d{2}-\d{2}$/;
                                const dayLabel = isoLike.test(dayPlan.day) ? new Date(dayPlan.day).toLocaleDateString() : dayPlan.day;
                                return (
                                    <div key={dayPlan.day} className="rounded-lg border border-[#dde3ec] bg-[#edf1f6] p-3">
                                        <div className="text-xs font-black mb-2" style={{ color: '#43aad7' }}>{dayLabel}</div>
                                        {dayPlan.sessions.map((session, sessionIndex) => (
                                            <p key={`${dayPlan.day}-session-${sessionIndex}`} className="text-xs text-[#5a6472] leading-relaxed">
                                                <span className="font-bold text-[#222d32]">{courseMap[session.course] || session.course}</span>: {session.hours}h - {session.focus}
                                            </p>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {aiLoading === "schedule" && weeklyPlan.length === 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#222d32]">Generating Schedule...</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                            {[
                                'sched-skel-card-a',
                                'sched-skel-card-b',
                                'sched-skel-card-c',
                            ].map((skeletonKey) => (
                                <div key={skeletonKey} className="rounded-lg border border-[#dde3ec] bg-[#edf1f6] p-4 space-y-3 animate-pulse">
                                    <div className="h-3 w-16 bg-[#dde3ec] rounded" />
                                    <div className="space-y-2">
                                        <div className="h-2.5 w-full bg-[#dde3ec] rounded" />
                                        <div className="h-2.5 w-2/3 bg-[#dde3ec] rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {examTips.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#222d32]">Exam Tips</h3>
                        <div className="space-y-1.5">
                            {Array.from(new Set(examTips)).map((tip) => (
                                <ExamTipItem key={tip} tip={tip} />
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4 border-b border-[#dde3ec]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#dc4835]/10 border-2 border-[#dc4835]/25 flex items-center justify-center" style={{ color: '#dc4835' }}>
                        {viewMode === 'level' ? <Trophy className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-[#222d32]">Curriculum View</h3>
                        <p className="text-xs text-[#5a6472] font-bold">Browse by {viewMode === 'level' ? 'academic year' : 'requirement type'}</p>
                    </div>
                </div>

                <div id="wt-view-toggle" className="flex p-1 bg-white border-2 border-[#dc4835]/20 rounded-xl w-full sm:w-auto">
                    {(["level", "category"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-xs font-black transition-all duration-300
                                ${viewMode === mode
                                    ? "text-white bg-[#dc4835] shadow-md shadow-[#dc4835]/25"
                                    : "text-[#5a6472] hover:text-[#dc4835] hover:bg-[#dc4835]/5"
                                }`}
                        >
                            {mode === "level" ? "Roadmap" : "Categories"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-12">
                {Object.entries(groups).map(([title, courses]) => {
                    const catStyle: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; headerText: string; badge: string; divider: string }> = {
                        "University Requirements": { icon: <GraduationCap className="w-5 h-5" />, color: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.25)", headerText: "#7c3aed", badge: "rgba(124,58,237,0.15)", divider: "rgba(124,58,237,0.20)" },
                        "University Elective": { icon: <Star className="w-5 h-5" />, color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.25)", headerText: "#059669", badge: "rgba(5,150,105,0.15)", divider: "rgba(5,150,105,0.20)" },
                        "College Requirements": { icon: <BookOpen className="w-5 h-5" />, color: "#2563eb", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.25)", headerText: "#2563eb", badge: "rgba(37,99,235,0.15)", divider: "rgba(37,99,235,0.20)" },
                        "Department Requirements": { icon: <Target className="w-5 h-5" />, color: "#d97706", bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.25)", headerText: "#d97706", badge: "rgba(217,119,6,0.15)", divider: "rgba(217,119,6,0.20)" },
                        "Department Elective": { icon: <Star className="w-5 h-5" />, color: "#db2777", bg: "rgba(219,39,119,0.08)", border: "rgba(219,39,119,0.25)", headerText: "#db2777", badge: "rgba(219,39,119,0.15)", divider: "rgba(219,39,119,0.20)" },
                    };
                    const levelStyle: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; headerText: string; badge: string; divider: string }> = {
                        "First Year (Level 1)": { icon: <Trophy className="w-5 h-5" />, color: "#dc4835", bg: "rgba(220,72,53,0.06)", border: "rgba(220,72,53,0.22)", headerText: "#dc4835", badge: "rgba(220,72,53,0.12)", divider: "rgba(220,72,53,0.18)" },
                        "Second Year (Level 2)": { icon: <Trophy className="w-5 h-5" />, color: "#ea580c", bg: "rgba(234,88,12,0.06)", border: "rgba(234,88,12,0.22)", headerText: "#ea580c", badge: "rgba(234,88,12,0.12)", divider: "rgba(234,88,12,0.18)" },
                        "Third Year (Level 3)": { icon: <Trophy className="w-5 h-5" />, color: "#ca8a04", bg: "rgba(202,138,4,0.06)", border: "rgba(202,138,4,0.22)", headerText: "#ca8a04", badge: "rgba(202,138,4,0.12)", divider: "rgba(202,138,4,0.18)" },
                        "Fourth Year (Level 4)": { icon: <Trophy className="w-5 h-5" />, color: "#16a34a", bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.22)", headerText: "#16a34a", badge: "rgba(22,163,74,0.12)", divider: "rgba(22,163,74,0.18)" },
                        "Fifth Year (Level 5)": { icon: <Trophy className="w-5 h-5" />, color: "#7c3aed", bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.22)", headerText: "#7c3aed", badge: "rgba(124,58,237,0.12)", divider: "rgba(124,58,237,0.18)" },
                    };
                    const allStyles = { ...catStyle, ...levelStyle };
                    const style = allStyles[title];

                    const gpaCourses = courses
                        .filter((c: Course) => completedCourses.has(c.code))
                        .map((c: Course) => ({ credits: c.ch, grade: completedCourses.get(c.code) ?? "M" }));
                    const groupGpa = calculateGPA(gpaCourses);

                    const isExpanded = expandedCategories[title];
                    const visibleCourses = (isMobile && !isExpanded) ? courses.slice(0, 8) : courses;
                    const hiddenCount = courses.length - visibleCourses.length;

                    if (courses.length === 0) return null;

                    const displayTitle = title === "University Requirements" && isMobile ? "Uni. Requirements" : title;

                    const sectionBg = style?.bg ?? "rgba(220,72,53,0.06)";
                    const sectionBorder = style?.border ?? "rgba(220,72,53,0.22)";
                    const sectionHeaderColor = style?.headerText ?? "#dc4835";
                    const sectionDivider = style?.divider ?? "rgba(220,72,53,0.18)";
                    const sectionBadge = style?.badge ?? "rgba(220,72,53,0.12)";

                    return (
                        <section
                            id={`section-${title.replaceAll(/\s+/g, '-')}`}
                            key={title}
                            className="p-4 sm:p-6 rounded-xl border-2 transition-colors"
                            style={{ background: sectionBg, borderColor: sectionBorder }}
                        >
                            <div className="flex items-center gap-3 mb-5 sm:mb-6">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: sectionBadge, color: sectionHeaderColor }}>
                                    {style?.icon ?? <Trophy className="w-5 h-5" />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-black uppercase tracking-widest whitespace-nowrap" style={{ color: sectionHeaderColor }}>
                                        {displayTitle}
                                    </h2>
                                    {groupGpa > 0 && (
                                        <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-widest" style={{ background: sectionBadge, color: sectionHeaderColor, border: `1px solid ${sectionBorder}` }}>
                                            GPA: {groupGpa.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 h-px" style={{ background: sectionDivider }} />
                                <span className="text-[11px] font-bold shrink-0" style={{ color: sectionHeaderColor, opacity: 0.7 }}>{courses.length} courses</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {visibleCourses.map((course: Course, idx: number) => (
                                    <div key={course.code} {...(idx === 0 && title === Object.keys(groups)[0] ? { id: "wt-first-course" } : {})}>
                                        {renderCourseCard(course)}
                                    </div>
                                ))}
                            </div>

                            {/* Show More Button (Mobile only) */}
                            {hiddenCount > 0 && (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => setExpandedCategories(prev => ({ ...prev, [title]: true }))}
                                    className="w-full mt-4 py-3 rounded-lg border-2 active:scale-[0.98] transition-all text-xs font-bold tracking-widest uppercase flex flex-col items-center gap-1"
                                    style={{ borderColor: sectionBorder, background: sectionBadge, color: sectionHeaderColor }}
                                >
                                    <span>Load All {courses.length} Courses</span>
                                    <span className="text-[11px] normal-case tracking-normal opacity-70">+{hiddenCount} hidden</span>
                                </motion.button>
                            )}
                        </section>
                    );
                    /* ^^^ end of section */
                })}
            </div>

            <CourseNotesModal
                isOpen={!!selectedCourseForNotes}
                onClose={() => setSelectedCourseForNotes(null)}
                courseId={selectedCourseForNotes?.id || ""}
                courseTitle={selectedCourseForNotes?.title || ""}
            />

            {showSetupWizard && (
                <SemesterSetupWizard
                    onClose={() => setShowSetupWizard(false)}
                    onComplete={(sid) => {
                        setShowSetupWizard(false);
                        // Refresh active semester state after wizard completes
                        fetch('/api/planner/semesters')
                            .then(r => r.json())
                            .then((data: { semesters?: Array<{ id: number; name: string; courses?: Array<{ code: string; name: string; credits: number }> }> }) => {
                                const sem = data.semesters?.find(s => s.id === sid);
                                if (sem) setActiveSemester({ id: sem.id, name: sem.name, courses: sem.courses ?? [] });
                                
                                const allCodes = new Set<string>();
                                data.semesters?.forEach(s => {
                                    s.courses?.forEach(c => allCodes.add(c.code));
                                });
                                setPlannerCourseCodes(allCodes);
                            })
                            .catch(() => {});
                    }}
                />
            )}
        </div>
    );
}

const CourseTrackerViewMemoized = memo(CourseTrackerView);
export default CourseTrackerViewMemoized;
