"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Course, CourseData } from '@/types';
import CourseCard from './ui/CourseCard';
import { checkPrerequisites } from '@/lib/advisor';
import { CheckCircle2, Trophy, RotateCcw, Loader2 } from 'lucide-react';

interface TranscriptViewProps {
    data: CourseData;
    studentId: string;   // university ID → database key
    majorKey?: string;
}

export default function TranscriptView({ data, studentId, majorKey }: TranscriptViewProps) {
    const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<"level" | "category">("level");
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | null>(null);

    const allCourses = [
        ...data.university_requirements,
        ...data.college_requirements,
        ...(data.university_electives ?? []),
        ...data.department_requirements,
        ...data.electives
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

    // HTU degree is always 135 CH
    const totalCredits = 135;

    // ── University Electives: 3 slots × 1 CH = 3 CH max ─────────────────────
    const MAX_UNI_ELECTIVES = 3;
    const uniElectiveCodes = new Set((data.university_electives ?? []).map((c: Course) => c.code));
    // UE slots (UE-I, UE-II, UE-III) are always tickable — there are exactly 3, each 1 CH
    const tickedUniElecCount = [...completedCourses].filter(c => uniElectiveCodes.has(c)).length;

    // ── Department Electives: 3 slots × 3 CH = 9 CH max ─────────────────────
    const MAX_DEPT_ELECTIVES = 3;
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
        return Math.min(total, 135);
    })();

    const progress = Math.min(completedCredits / totalCredits, 1);


    // Grouping Logic
    const getGroups = () => {
        if (viewMode === 'category') {
            return {
                "University Requirements": data.university_requirements,
                "College Requirements": data.college_requirements,
                "University Electives": data.university_electives ?? [],
                "Department Requirements": data.department_requirements,
                "Major Electives": data.electives
            };
        } else {
            return {
                "First Year (Level 1)": allCourses.filter(c => c.level === 1),
                "Second Year (Level 2)": allCourses.filter(c => c.level === 2),
                "Third Year (Level 3)": allCourses.filter(c => c.level === 3),
                "Fourth Year (Level 4)": allCourses.filter(c => (c.level || 4) >= 4),
            };
        }
    };

    const groups = getGroups();



    return (
        <div className="w-full max-w-7xl mx-auto px-4 pt-10 pb-24">

            {/* Page header + progress card */}
            <div className="mb-12 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-1">My Transcript</h1>
                    <p className="text-white/35 text-sm">Track your progress, plan your journey.</p>

                    {/* Save status */}
                    <div className="flex items-center gap-3 mt-3">
                        <AnimatePresence mode="wait">
                            {saveStatus === 'saving' && (
                                <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex items-center gap-1.5 text-[11px] text-white/30">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Saving…
                                </motion.span>
                            )}
                            {saveStatus === 'saved' && (
                                <motion.span key="saved" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="flex items-center gap-1.5 text-[11px] text-emerald-400/70">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Saved
                                </motion.span>
                            )}
                        </AnimatePresence>
                        <button
                            onClick={resetProgress}
                            className="flex items-center gap-1 text-[11px] text-white/20 hover:text-red-400/70 transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </button>
                    </div>
                </div>

                {/* Progress card */}
                <div className="glass-card p-5 rounded-2xl w-full md:w-80 shrink-0">
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-xs text-white/35 font-medium uppercase tracking-widest">Progress</span>
                        <div className="text-right">
                            <span className="text-xl font-bold text-white">{completedCredits}</span>
                            <span className="text-white/30 text-sm"> / {totalCredits} CH</span>
                        </div>
                    </div>
                    <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress * 100}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg, #8b5cf6, #6366f1)" }}
                        />
                    </div>
                    <p className="text-[11px] text-white/20 mt-2">{Math.round(progress * 100)}% complete</p>
                </div>
            </div>

            {/* View-mode toggle */}
            <div className="flex gap-1 mb-10 p-1 glass-card rounded-xl w-fit">
                {(["level", "category"] as const).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                            ${viewMode === mode
                                ? "bg-white text-black shadow-sm"
                                : "text-white/35 hover:text-white/60"
                            }`}
                    >
                        {mode === "level" ? "Year Level" : "Category"}
                    </button>
                ))}
            </div>

            {/* Course Grid */}
            <div className="space-y-12">
                {Object.entries(groups).map(([title, courses]) => (
                    courses.length > 0 && <section key={title}>
                        <div className="flex items-center gap-3 mb-6">
                            {viewMode === 'level' && <Trophy className="w-4 h-4 text-violet-400/60" />}
                            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">
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
                            if (title.includes('University Elective')) {
                                isCapReached = tickedUniElecCount >= MAX_UNI_ELECTIVES;
                                count = tickedUniElecCount;
                                max = MAX_UNI_ELECTIVES;
                            } else if (title === 'Major Electives' || (title.includes('Elective') && !title.includes('University'))) {
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

                                const { isLocked: prereqLocked, missing, lockReason: prereqReason } = checkPrerequisites(course, completedCourses, completedCredits, allCourseCodes);
                                const isLocked = prereqLocked || isElectiveLocked;
                                const lockReason = isElectiveLocked ? `Max ${capMax} electives reached — untick one to swap` : prereqReason;
                                return (
                                    <CourseCard
                                        key={course.code}
                                        course={course}
                                        isCompleted={completedCourses.has(course.code)}
                                        isLocked={isLocked}
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
                ))}
            </div>
        </div>
    );
}
