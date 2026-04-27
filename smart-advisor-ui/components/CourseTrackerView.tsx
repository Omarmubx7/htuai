"use client";

import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Course, CourseData, CurriculumRules } from '@/types';
import CourseCard from './ui/CourseCard';
import { checkPrerequisites } from '@/lib/advisor';
import { calculateGPA } from '@/lib/grading';
import { CheckCircle2, Trophy, RotateCcw, Loader2, GraduationCap, BookOpen, Target, Star, Sparkles, CalendarDays } from 'lucide-react';
import StudentDashboard from './StudentDashboard';
import ConfirmDialog from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';
import dynamic from 'next/dynamic';

const CourseNotesModal = dynamic(() => import('./CourseNotesModal'), {
    ssr: false,
});

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

    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [isMobile, setIsMobile] = useState(false);
    const [aiLoading, setAiLoading] = useState<"suggestions" | "schedule" | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiRecommendations, setAiRecommendations] = useState<Array<{ code: string; reason: string }>>([]);
    const [aiTips, setAiTips] = useState<string[]>([]);
    const [weeklyPlan, setWeeklyPlan] = useState<Array<{ day: string; sessions: Array<{ course: string; hours: number; focus: string }> }>>([]);
    const [examTips, setExamTips] = useState<string[]>([]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const allCourses = [
        ...data.university_requirements,
        ...data.college_requirements,
        ...(data.university_electives ?? []),
        ...data.department_requirements,
        ...data.electives,
        ...(data.work_market_requirements ?? [])
    ];
    const completedCodes = new Set(completedCourses.keys());
    const candidateCourses = allCourses
        .filter((course) => !completedCodes.has(course.code))
        .map((course) => ({
            code: course.code,
            name: course.name,
            credits: course.ch,
            prereq: course.prereq
        }));

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
                "Fifth Year (Level 5)": allCourses.filter(c => (c.level || 5) >= 5),
            };
        }
    };

    const groups = getGroups();

    const generateAiSuggestions = async () => {
        setAiLoading("suggestions");
        setAiError(null);

        try {
            const response = await fetch("/api/ai/suggest-courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    major: majorKey,
                    completedCourses: Array.from(completedCourses.keys()),
                    candidateCourses: allCourses.filter(course => {
                        if (completedCodes.has(course.code)) return false;
                        let isElectiveLocked = false;
                        if (uniElectiveCodes.has(course.code)) isElectiveLocked = tickedUniElecCount >= MAX_UNI_ELECTIVES;
                        else if (deptElectiveCodes.has(course.code)) isElectiveLocked = deptElecCapReached;
                        if (isElectiveLocked) return false;
                        
                        const isUniversitySubject = uniReqCodes.has(course.code) || uniElectiveCodes.has(course.code);
                        const { isLocked: prereqLocked } = checkPrerequisites(course, completedCourses, completedCredits, allCourseCodes, rules.logic_rules?.prerequisites);
                        return isUniversitySubject ? false : !prereqLocked;
                    }).map(c => ({ code: c.code, name: c.name, credits: c.ch })),
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                try {
                    const errJson = JSON.parse(errText);
                    throw new Error(errJson.details || errJson.error || 'Failed to generate suggestions');
                } catch {
                    throw new Error('Failed to generate suggestions: ' + response.statusText);
                }
            }

            const payload = await response.json() as {
                result?: {
                    recommendations?: Array<{ code?: string; reason?: string }>;
                    tips?: string[];
                }
            };

            const recommendations = Array.isArray(payload.result?.recommendations)
                ? payload.result.recommendations
                    .filter((item): item is { code: string; reason: string } => !!item?.code && !!item?.reason)
                    .slice(0, 5)
                : [];

            const tips = Array.isArray(payload.result?.tips)
                ? payload.result.tips.filter((tip): tip is string => typeof tip === "string").slice(0, 3)
                : [];

            setAiRecommendations(recommendations);
            setAiTips(tips);
            if (recommendations.length === 0) {
                setAiError("No recommendations found yet. Try again after marking more courses.");
            }
        } catch (error: any) {
            console.error("AI recommendations error", error);
            setAiError(error?.message || "Could not generate recommendations right now.");
        } finally {
            setAiLoading(null);
        }
    };

    const generateWeeklySchedule = async () => {
        setAiLoading("schedule");
        setAiError(null);

        try {
            const targetCourses = candidateCourses.slice(0, 5).map((course) => ({
                code: course.code,
                name: course.name,
                credits: course.credits,
            }));

            if (targetCourses.length === 0) {
                setAiError("You completed all available courses. No schedule needed.");
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

            if (!response.ok) {
                throw new Error("Failed to fetch AI schedule");
            }

            const payload = await response.json() as {
                result?: {
                    weeklyPlan?: Array<{ day?: string; sessions?: Array<{ course?: string; hours?: number; focus?: string }> }>;
                    examTips?: string[];
                }
            };

            const normalizedPlan = Array.isArray(payload.result?.weeklyPlan)
                ? payload.result.weeklyPlan
                    .filter((entry): entry is { day: string; sessions: Array<{ course: string; hours: number; focus: string }> } => {
                        if (!entry || typeof entry.day !== "string" || !Array.isArray(entry.sessions)) return false;
                        return true;
                    })
                    .map((entry) => ({
                        day: entry.day,
                        sessions: entry.sessions
                            .filter((session): session is { course: string; hours: number; focus: string } =>
                                typeof session?.course === "string" &&
                                typeof session?.hours === "number" &&
                                typeof session?.focus === "string")
                            .slice(0, 3)
                    }))
                    .filter((entry) => entry.sessions.length > 0)
                    .slice(0, 7)
                : [];

            const normalizedExamTips = Array.isArray(payload.result?.examTips)
                ? payload.result.examTips.filter((tip): tip is string => typeof tip === "string").slice(0, 3)
                : [];

            setWeeklyPlan(normalizedPlan);
            setExamTips(normalizedExamTips);

            if (normalizedPlan.length === 0) {
                setAiError("No schedule generated yet. Please retry.");
            }
        } catch (error: any) {
            console.error("AI schedule error", error);
            setAiError(error?.message || "Could not generate a schedule right now.");
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
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-24 sm:pb-36 space-y-6 sm:space-y-12">
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
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-6 bg-violet-600 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Degree Progress</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none text-gradient">
                            Course Tracker
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="min-w-25 h-6 flex items-center">
                            <AnimatePresence mode="wait">
                                {saveStatus === 'saving' && (
                                    <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="flex items-center gap-2 text-xs font-bold text-white/30">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Syncing…
                                    </motion.span>
                                )}
                                {saveStatus === 'saved' && (
                                    <motion.span key="saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                        className="flex items-center gap-2 text-xs font-bold text-emerald-400/70">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Cloud Synced
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-4 w-px bg-white/10" />

                        <motion.button
                            id="wt-reset-btn"
                            whileHover={{ scale: 1.05, x: 2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowResetConfirm(true)}
                            className="flex items-center gap-2 text-sm sm:text-xs font-bold text-white/40 hover:text-red-400/70 transition-all p-2 sm:p-0 -ml-2 sm:ml-0"
                        >
                            <RotateCcw className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                            Reset All
                        </motion.button>
                    </div>
                </div>

                <div id="wt-progress-card" className="glass-card-premium p-6 rounded-[2.5rem] w-full lg:w-100 shrink-0 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <Trophy className="w-24 h-24 text-white" />
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Overall Progress</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white">{completedCredits}</span>
                                    <span className="text-sm font-bold text-white/40">/ {totalCredits} CH</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="h-1.5 bg-white/3 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress * 100}%` }}
                                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                    className="h-full rounded-full relative"
                                    style={{ background: "linear-gradient(90deg, #8B5CF6, #EC4899)" }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                </motion.div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                                        {Math.round(progress * 100)}% Complete
                                    </p>
                                </div>
                                <p className="text-[10px] font-bold text-white/60 tracking-tight">
                                    <span className="text-white font-black">{completedCourses.size}</span>
                                    <span className="mx-1">/</span>
                                    <span>{allCourses.length} Courses</span>
                                </p>
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
                        const id = `section-${category.replace(/\s+/g, '-')}`;
                        const el = document.getElementById(id);
                        if (el) {
                            const y = el.getBoundingClientRect().top + window.scrollY - 100;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                    }, 150);
                }}
            />

            <section className="rounded-4xl border border-cyan-400/20 bg-cyan-500/4 p-5 sm:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-cyan-100 tracking-tight">mubxbot AI Advisor</h2>
                        <p className="text-xs sm:text-sm text-cyan-100/60">Free AI-powered next-semester recommendations and study planning.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => void generateAiSuggestions()}
                            disabled={aiLoading !== null}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider disabled:opacity-60"
                        >
                            {aiLoading === "suggestions" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Suggest Courses
                        </button>
                        <button
                            onClick={() => void generateWeeklySchedule()}
                            disabled={aiLoading !== null}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-300/40 text-cyan-100 text-xs font-black uppercase tracking-wider disabled:opacity-60"
                        >
                            {aiLoading === "schedule" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                            Build Schedule
                        </button>
                    </div>
                </div>

                {aiError && (
                    <p className="text-xs text-rose-300 font-semibold">{aiError}</p>
                )}

                {aiRecommendations.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-white/80">Recommended Next Courses</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {aiRecommendations.map((item) => (
                                <div key={item.code} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                    <div className="text-xs font-black text-cyan-200">{courseMap[item.code] || item.code}</div>
                                    <p className="text-[10px] text-cyan-200/50 mt-0.5 font-mono">{item.code}</p>
                                    <p className="text-xs text-white/70 mt-1">{item.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {aiTips.length > 0 && (
                    <div className="space-y-1">
                        <h3 className="text-xs font-black uppercase tracking-wider text-white/80">Registration Tips</h3>
                        {aiTips.map((tip) => (
                            <p key={tip} className="text-xs text-white/70">- {tip}</p>
                        ))}
                    </div>
                )}

                {weeklyPlan.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-white/80">Weekly Study Schedule</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                            {weeklyPlan.map((dayPlan) => (
                                <div key={dayPlan.day} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <div className="text-xs font-black text-cyan-200 mb-2">{dayPlan.day}</div>
                                    {dayPlan.sessions.map((session) => (
                                        <p key={`${dayPlan.day}-${session.course}-${session.focus}`} className="text-xs text-white/70 leading-relaxed">
                                            <span className="font-bold text-cyan-100">{courseMap[session.course] || session.course}</span>: {session.hours}h - {session.focus}
                                        </p>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {examTips.length > 0 && (
                    <div className="space-y-1">
                        <h3 className="text-xs font-black uppercase tracking-wider text-white/80">Exam Tips</h3>
                        {examTips.map((tip) => (
                            <p key={tip} className="text-xs text-white/70">- {tip}</p>
                        ))}
                    </div>
                )}
            </section>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center text-white/40">
                        {viewMode === 'level' ? <Trophy className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Curriculum View</h3>
                        <p className="text-xs text-white/50 font-medium">Browse by {viewMode === 'level' ? 'academic year' : 'requirement type'}</p>
                    </div>
                </div>

                <div id="wt-view-toggle" className="flex p-1 bg-white/3 border border-white/5 rounded-xl sm:rounded-[1.25rem] shadow-inner backdrop-blur-xl w-full sm:w-auto">
                    {(["level", "category"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-300 relative group
                                ${viewMode === mode
                                    ? "text-black bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    : "text-white/40 bg-white/3 hover:text-white hover:bg-white/8"
                                }`}
                        >
                            {mode === "level" ? "Roadmap" : "Categories"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-12">
                {Object.entries(groups).map(([title, courses]) => {
                    const catStyle: Record<string, { icon: React.ReactNode; color: string }> = {
                        "University Requirements": { icon: <GraduationCap className="w-4 h-4" />, color: "#a78bfa" },
                        "University Elective": { icon: <Star className="w-4 h-4" />, color: "#34d399" },
                        "College Requirements": { icon: <BookOpen className="w-4 h-4" />, color: "#60a5fa" },
                        "Department Requirements": { icon: <Target className="w-4 h-4" />, color: "#f59e0b" },
                        "Department Elective": { icon: <Star className="w-4 h-4" />, color: "#f472b6" },
                    };
                    const style = catStyle[title];

                    const gpaCourses = courses
                        .filter((c) => completedCourses.has(c.code))
                        .map((c) => ({ credits: c.ch, grade: completedCourses.get(c.code) ?? "M" }));
                    const groupGpa = calculateGPA(gpaCourses);

                    const isExpanded = expandedCategories[title];
                    const visibleCourses = (isMobile && !isExpanded) ? courses.slice(0, 8) : courses;
                    const hiddenCount = courses.length - visibleCourses.length;

                    if (courses.length === 0) return null;

                    const displayTitle = title === "University Requirements" && isMobile ? "Uni. Requirements" : title;

                    return (
                        <section id={`section-${title.replace(/\s+/g, '-')}`} key={title} className="bg-white/2 border border-white/5 p-4 sm:p-0 sm:bg-transparent sm:border-transparent rounded-3xl sm:rounded-none">
                            <div className="flex items-center gap-3 mb-5 sm:mb-6">
                                {viewMode === 'level'
                                    ? <Trophy className="w-4 h-4 text-violet-400/60 shrink-0" />
                                    : style && <span className="shrink-0" style={{ color: style.color, opacity: 0.7 }}>{style.icon}</span>
                                }
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-semibold text-white/65 uppercase tracking-widest whitespace-nowrap">
                                        {displayTitle}
                                    </h2>
                                    {groupGpa > 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-white/80 uppercase tracking-widest">
                                            GPA: {groupGpa.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 h-px bg-white/5" />
                                <span className="text-[11px] text-white/20 shrink-0">{courses.length} courses</span>
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
                                    className="w-full mt-4 py-3 rounded-2xl border border-white/10 bg-white/2 hover:bg-white/5 active:scale-[0.98] transition-all text-xs font-bold text-white/60 tracking-widest uppercase flex flex-col items-center gap-1"
                                >
                                    <span>Load All {courses.length} Courses</span>
                                    <span className="text-[9px] text-white/30 normal-case tracking-normal">+{hiddenCount} hidden</span>
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
                studentId={studentId}
            />
        </div>
    );
}

const CourseTrackerViewMemoized = memo(CourseTrackerView);
export default CourseTrackerViewMemoized;
