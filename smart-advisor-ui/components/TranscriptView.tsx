"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Course, CourseData } from '@/types';
import CourseCard from './ui/CourseCard';
import { checkPrerequisites } from '@/lib/advisor';
import { CheckCircle2, Trophy, RotateCcw, Loader2, GraduationCap, BookOpen, Sparkles, Target, Star, Info } from 'lucide-react';
import StudentDashboard from './StudentDashboard';

interface TranscriptViewProps {
    data: CourseData;
    studentId: string;   // university ID → database key
    majorKey: string;
    rules: any;
}

export default function TranscriptView({ data, studentId, majorKey, rules }: TranscriptViewProps) {
    const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<"level" | "category">("level");
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | null>(null);

    const allCourses = [
        ...data.university_requirements,
        ...data.college_requirements,
        ...(data.university_electives ?? []),
        ...data.department_requirements,
        ...data.electives,
        ...(data.work_market_requirements ?? [])
    ];

    // Build code → name lookup
    const courseNameMap = Object.fromEntries(allCourses.map((c) => [c.code, c.name]));

    // Load progress from SERVER on mount or when student/major changes
    useEffect(() => {
        if (!studentId || !majorKey) return;
        fetch(`/api/progress/${encodeURIComponent(studentId)}?major=${majorKey}`)
            .then(r => r.json())
            .then(({ completed }: { completed: (string | { code: string })[] }) => {
                // Handle both legacy string[] and new {code, name}[] formats
                const codes = completed.map(c => (typeof c === 'string' ? c : c.code));
                setCompletedCourses(new Set(codes));
            })
            .catch(() => setCompletedCourses(new Set()));
    }, [studentId, majorKey]);

    const toggleCourse = useCallback((code: string) => {
        setCompletedCourses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(code)) newSet.delete(code);
            else newSet.add(code);

            // Save to server immediately
            setSaveStatus("saving");

            // Map codes to objects { code, name }
            const completedObjects = [...newSet].map(c => ({
                code: c,
                name: courseNameMap[c] || "Unknown Course"
            }));

            fetch(`/api/progress/${encodeURIComponent(studentId)}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ major: majorKey, completed: completedObjects }),
            })
                .then(() => { setSaveStatus("saved"); setTimeout(() => setSaveStatus(null), 1500); })
                .catch(() => setSaveStatus(null));

            return newSet;
        });
    }, [studentId, majorKey, courseNameMap]);

    const resetProgress = () => {
        setCompletedCourses(new Set());
        fetch(`/api/progress/${encodeURIComponent(studentId)}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ major: majorKey, completed: [] }),
        });
    };

    // Build code → name lookup for prerequisite resolution
    const courseMap = Object.fromEntries(allCourses.map((c) => [c.code, c.name]));
    // Set of all codes in the curriculum — prereqs outside this are auto-satisfied
    const allCourseCodes = new Set(allCourses.map(c => c.code));

    // Determine rule set from majorKey
    const ruleSet = Object.values(rules.degree_types).find((rs: any) =>
        rs.major_keys.includes(majorKey)
    ) as any || rules.degree_types.computing_bsc;

    const totalCredits = ruleSet.total_credits;
    const MAX_DEPT_ELECTIVES = ruleSet.max_dept_electives;
    const MAX_UNI_ELECTIVES = ruleSet.max_uni_electives;
    const TOTAL_CAP = totalCredits;

    // ── University Electives: 3 slots × 1 CH = 3 CH max ─────────────────────
    const uniElectiveCodes = new Set((data.university_electives ?? []).map((c: Course) => c.code));
    // UE slots (UE-I, UE-II, UE-III) are always tickable — there are exactly 3, each 1 CH
    const tickedUniElecCount = [...completedCourses].filter(c => uniElectiveCodes.has(c)).length;

    // ── Department Electives: 3 slots × 3 CH = 9 CH max ─────────────────────
    const deptElectiveCodes = new Set(data.electives.map((c: Course) => c.code));
    const tickedDeptElecCount = [...completedCourses].filter(c => deptElectiveCodes.has(c)).length;
    const deptElecCapReached = tickedDeptElecCount >= MAX_DEPT_ELECTIVES;

    // ── Completed credits — respect elective caps so total never exceeds 135 ──
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



    return (
        <div className="w-full max-w-7xl mx-auto px-6 pt-10 pb-24 space-y-12">

            {/* Data notice banner */}
            <div className="flex items-center gap-4 px-5 py-4 rounded-3xl border border-amber-500/10 bg-amber-500/[0.02] backdrop-blur-md">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Info className="w-4 h-4" />
                </div>
                <p className="text-xs text-amber-200/60 leading-relaxed max-w-2xl">
                    <span className="text-amber-400 font-bold">Data Notice:</span> Course data is currently being audited. If any courses are missing or incorrect, they will be updated in the next sync.
                </p>
            </div>

            {/* Page header + progress card */}
            <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-6 bg-violet-600 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Degree Progress</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none text-gradient">
                            My Transcript
                        </h1>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-4">
                        <div className="min-w-[100px] h-6 flex items-center">
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

                        <button
                            onClick={resetProgress}
                            className="flex items-center gap-2 text-xs font-bold text-white/40 hover:text-red-400/70 transition-all hover:scale-105"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset All
                        </button>
                    </div>
                </div>

                {/* Progress Card (Premium version) */}
                <div className="glass-card-premium p-6 rounded-[2.5rem] w-full lg:w-[400px] shrink-0 relative overflow-hidden group">
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
                            <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
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

            {/* Student Dashboard — Stats, Badges, What's Next */}
            <StudentDashboard
                completedCourses={completedCourses}
                completedCredits={completedCredits}
                totalCredits={totalCredits}
                data={data}
                allCourses={allCourses}
                rules={rules}
            />

            {/* View-mode toggle and Section Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/40">
                        {viewMode === 'level' ? <Trophy className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Curriculum View</h3>
                        <p className="text-xs text-white/50 font-medium">Browse by {viewMode === 'level' ? 'academic year' : 'requirement type'}</p>
                    </div>
                </div>

                <div className="flex p-1.5 bg-white/[0.03] border border-white/[0.05] rounded-[1.25rem] shadow-inner backdrop-blur-xl">
                    {(["level", "category"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 relative group
                                ${viewMode === mode
                                    ? "text-black bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    : "text-white/40 hover:text-white"
                                }`}
                        >
                            {mode === "level" ? "Yearly Roadmap" : "Requirement Categories"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Course Grid */}
            <div className="space-y-12">
                {Object.entries(groups).map(([title, courses]) => {
                    // Category-specific styling
                    const catStyle: Record<string, { icon: React.ReactNode; color: string }> = {
                        "University Requirements": { icon: <GraduationCap className="w-4 h-4" />, color: "#a78bfa" },
                        "University Elective": { icon: <Sparkles className="w-4 h-4" />, color: "#34d399" },
                        "College Requirements": { icon: <BookOpen className="w-4 h-4" />, color: "#60a5fa" },
                        "Department Requirements": { icon: <Target className="w-4 h-4" />, color: "#f59e0b" },
                        "Department Elective": { icon: <Star className="w-4 h-4" />, color: "#f472b6" },
                    };
                    const style = catStyle[title];

                    return courses.length > 0 && <section key={title}>
                        <div className="flex items-center gap-3 mb-6">
                            {viewMode === 'level'
                                ? <Trophy className="w-4 h-4 text-violet-400/60" />
                                : style && <span style={{ color: style.color, opacity: 0.7 }}>{style.icon}</span>
                            }
                            <h2 className="text-sm font-semibold text-white/65 uppercase tracking-widest">
                                {title}
                            </h2>
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[11px] text-white/20">{courses.length} courses</span>
                        </div>

                        {/* Elective cap warning banner */}
                        {(() => {
                            let isCapReached = false;
                            let count = 0;
                            let max = 0;
                            if (title === 'University Elective') {
                                isCapReached = tickedUniElecCount >= MAX_UNI_ELECTIVES;
                                count = tickedUniElecCount;
                                max = MAX_UNI_ELECTIVES;
                            } else if (title === 'Department Elective') {
                                isCapReached = deptElecCapReached;
                                count = tickedDeptElecCount;
                                max = MAX_DEPT_ELECTIVES;
                            }

                            if (!isCapReached) return null;

                            return (
                                <div className="mb-4 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                    <span className="text-amber-400 text-sm">⚠️</span>
                                    <p className="text-[12px] text-amber-300/80">
                                        You&apos;ve selected {count}/{max} electives — that&apos;s the maximum ({max * (title.includes('University') ? 1 : 3)} CH). Untick one to swap.
                                    </p>
                                </div>
                            );
                        })()}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {courses.map((course: Course) => {
                                let isElectiveLocked = false;
                                let capMax = 0;

                                if (uniElectiveCodes.has(course.code)) {
                                    isElectiveLocked = tickedUniElecCount >= MAX_UNI_ELECTIVES && !completedCourses.has(course.code);
                                    capMax = MAX_UNI_ELECTIVES;
                                } else if (deptElectiveCodes.has(course.code)) {
                                    isElectiveLocked = deptElecCapReached && !completedCourses.has(course.code);
                                    capMax = MAX_DEPT_ELECTIVES;
                                }

                                const { isLocked: prereqLocked, missing, lockReason: prereqReason } = checkPrerequisites(course, completedCourses, completedCredits, allCourseCodes, rules.logic_rules.prerequisites);

                                // Hard-lock everything EXCEPT University Requirements & Electives (which get a soft-lock warning)
                                const uniReqCodes = new Set(data.university_requirements.map(r => r.code));
                                const isUniversitySubject = uniReqCodes.has(course.code) || uniElectiveCodes.has(course.code);

                                const isLocked = isElectiveLocked || (!isUniversitySubject && prereqLocked);
                                const hasPrereqWarning = isUniversitySubject && prereqLocked;

                                const lockReason = isElectiveLocked
                                    ? `Max ${capMax} electives reached — untick one to swap`
                                    : (prereqLocked ? prereqReason : undefined);
                                return (
                                    <CourseCard
                                        key={course.code}
                                        course={course}
                                        isCompleted={completedCourses.has(course.code)}
                                        isLocked={isLocked}
                                        hasPrereqWarning={hasPrereqWarning}
                                        lockReason={lockReason}
                                        missingPrereqs={missing}
                                        courseMap={courseMap}
                                        completedCredits={completedCredits}
                                        onToggle={() => toggleCourse(course.code)}
                                    />
                                );
                            })}
                        </div>
                    </section>
                })}
            </div>
        </div>
    );
}
