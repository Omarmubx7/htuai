"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Course, CourseData } from '@/types';
import CourseCard from './ui/CourseCard';
import { checkPrerequisites } from '@/lib/advisor';
import { CheckCircle2, Trophy, RotateCcw, Loader2, GraduationCap, BookOpen, Target, Star } from 'lucide-react';
import StudentDashboard from './StudentDashboard';
import ConfirmDialog from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';
import CourseNotesModal from './CourseNotesModal';

interface CourseTrackerViewProps {
    data: CourseData;
    studentId: string;
    majorKey: string;
    rules: any;
    completedCourses: Map<string, string>;
    toggleCourse: (code: string) => void;
    updateCourseGrade: (code: string, grade: string) => void;
    saveStatus: "saved" | "saving" | null;
    resetProgress: () => void;
}

export default function CourseTrackerView({
    data,
    studentId,
    majorKey,
    rules,
    completedCourses,
    toggleCourse,
    updateCourseGrade,
    saveStatus,
    resetProgress
}: CourseTrackerViewProps) {
    const [viewMode, setViewMode] = useState<"level" | "category">("level");
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [selectedCourseForNotes, setSelectedCourseForNotes] = useState<{ id: string; title: string } | null>(null);
    const { toast } = useToast();

    const allCourses = [
        ...data.university_requirements,
        ...data.college_requirements,
        ...(data.university_electives ?? []),
        ...data.department_requirements,
        ...data.electives,
        ...(data.work_market_requirements ?? [])
    ];

    const courseMap = Object.fromEntries(allCourses.map((c) => [c.code, c.name]));
    const allCourseCodes = new Set(allCourses.map(c => c.code));

    // Determine rule set from majorKey
    const ruleSet = Object.values(rules.degree_types).find((rs: any) =>
        rs.major_keys.includes(majorKey)
    ) as any || rules.degree_types.computing_bsc;

    const totalCredits = ruleSet.total_credits;
    const MAX_DEPT_ELECTIVES = ruleSet.max_dept_electives || 3;
    const MAX_UNI_ELECTIVES = ruleSet.max_uni_electives || 3;
    const TOTAL_CAP = totalCredits;

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

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-24 space-y-8 sm:space-y-12">
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

                <div className="glass-card-premium p-6 rounded-[2.5rem] w-full lg:w-100 shrink-0 relative overflow-hidden group">
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
            />

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

                <div className="flex p-1 bg-white/3 border border-white/5 rounded-xl sm:rounded-[1.25rem] shadow-inner backdrop-blur-xl w-full sm:w-auto">
                    {(["level", "category"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-300 relative group
                                ${viewMode === mode
                                    ? "text-black bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    : "text-white/40 hover:text-white"
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
                                        grade={completedCourses.get(course.code)}
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
                            })}
                        </div>
                    </section>
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
