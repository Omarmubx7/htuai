"use client";

import { useMemo, useState, memo } from "react";
import { motion } from "framer-motion";
import { Course, CourseData } from "@/types";
import {
    GraduationCap, Target, BookOpen, TrendingUp as GpaIcon,
    Sparkles, Calendar, Award, Star, Clock, CheckCircle, ArrowRight, Settings
} from "lucide-react";
import Link from "next/link";
import { getClassification, GRADE_MAP } from "@/lib/grading";

/* ═══════════════════════════════════════════════════════════════════
   Types & Props
   ═══════════════════════════════════════════════════════════════════ */

interface StudentDashboardProps {
    completedCourses: Map<string, any> | Set<string>;
    completedCredits: number;
    totalCredits: number;
    data: CourseData;
    allCourses: Course[];
    rules: any;
    previousGpaHistory?: { gpa: number | null, credits: number | null };
    setPreviousGpaHistory?: (val: { gpa: number | null, credits: number | null }) => void;
}

/* ═══════════════════════════════════════════════════════════════════
   Badge Definitions
   ═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

function StudentDashboard({
    completedCourses,
    completedCredits,
    totalCredits,
    data,
    allCourses,
    rules,
    previousGpaHistory,
    setPreviousGpaHistory,
}: Readonly<StudentDashboardProps>) {
    const [isEditingGpa, setIsEditingGpa] = useState(false);
    const [terms, setTerms] = useState<{ gpa: string, credits: string }[]>([
        { gpa: previousGpaHistory?.gpa?.toString() || "", credits: previousGpaHistory?.credits?.toString() || "" }
    ]);
    const [savingGpa, setSavingGpa] = useState(false);
    const completedCount = completedCourses.size;
    const progress = Math.min(completedCredits / totalCredits, 1);
    const progressPct = Math.round(progress * 100);

    const studentTitle = useMemo(() => {
        if (progressPct >= 100) return "Legendary Scholar";
        if (progressPct >= 75) return "Master of Arts";
        if (progressPct >= 50) return "Expert Analyst";
        if (progressPct >= 25) return "Rising Junior";
        return "Academic Aspirant";
    }, [progressPct]);

    // ── True CGPA Calculation ─────────────────────────────────────────────
    const trackedStats = useMemo(() => {
        let qualityPoints = 0;
        let credits = 0;
        for (const [code, grade] of completedCourses.entries()) {
            const course = allCourses.find(c => c.code === code);
            if (course && course.ch > 0 && GRADE_MAP[grade]?.points !== undefined) {
                qualityPoints += GRADE_MAP[grade].points * course.ch;
                credits += course.ch;
            }
        }
        return { qualityPoints, credits };
    }, [completedCourses, allCourses]);

    const trueCGPA = useMemo(() => {
        let totalQualityPoints = trackedStats.qualityPoints;
        let totalCredits = trackedStats.credits;

        if (previousGpaHistory?.gpa !== null && previousGpaHistory?.credits !== null && previousGpaHistory?.credits !== undefined && previousGpaHistory?.gpa !== undefined) {
            totalQualityPoints += (previousGpaHistory.gpa * previousGpaHistory.credits);
            totalCredits += previousGpaHistory.credits;
        }

        if (totalCredits === 0) return 0;
        return totalQualityPoints / totalCredits;
    }, [trackedStats, previousGpaHistory]);

    const classification = getClassification(trueCGPA);

    // Overriding the previous save handler to sum terms:
    const handleSavePreviousGpa = async () => {
        setSavingGpa(true);
        let totalQp = 0;
        let totalCr = 0;
        terms.forEach(t => {
            const g = Number.parseFloat(t.gpa);
            const c = Number.parseFloat(t.credits);
            if (!Number.isNaN(g) && !Number.isNaN(c)) {
                totalQp += (g * c);
                totalCr += c;
            }
        });
        const finalGpa = totalCr > 0 ? (totalQp / totalCr) : null;
        const finalCr = totalCr > 0 ? totalCr : null;

        try {
            const res = await fetch('/api/student/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    previous_gpa: finalGpa,
                    previous_credits: finalCr
                })
            });
            if (res.ok) {
                if (setPreviousGpaHistory) {
                    setPreviousGpaHistory({ gpa: finalGpa, credits: finalCr });
                }
                setIsEditingGpa(false);
            }
        } catch (e) {
            console.error("Failed to save previous GPA", e);
        } finally {
            setSavingGpa(false);
        }
    };
    // ── Graduation estimate ──────────────────────────────────────────
    const graduationEstimate = useMemo(() => {
        if (completedCredits >= totalCredits) return "Graduated! 🎉";
        if (completedCredits === 0) return "Start your journey!";

        const remaining = totalCredits - completedCredits;

        // HTU runs 2 main semesters/year, ~18 CH each = ~36 CH/year
        // Students typically take 15-18 CH per regular semester
        const CH_PER_SEMESTER = 17; // realistic average
        const semestersLeft = Math.ceil(remaining / CH_PER_SEMESTER);

        // Estimate which academic year they'll graduate in
        // 1 semester = 1 sem left, 2 semesters = 1 year left, etc.
        const yearsLeft = Math.ceil(semestersLeft / 2);

        if (semestersLeft <= 1) return "This semester! 🔥";
        if (semestersLeft === 2) return "~1 year left";
        return `~${yearsLeft} years (${semestersLeft} semesters)`;
    }, [completedCredits, totalCredits]);

    // ── Category CH breakdown for "What's Next" ──────────────────────
    const categories = useMemo(() => {
        const sumCH = (courses: Course[], cap?: number) => {
            if (!cap) return courses.reduce((s, c) => s + c.ch, 0);
            return cap * (courses[0]?.ch || 3); // assumes constant CH per elective slot
        };

        const countDoneCH = (courses: Course[], cap?: number) => {
            let doneCH = 0;
            let count = 0;
            for (const c of courses) {
                if (completedCourses.has(c.code)) {
                    if (cap !== undefined && count >= cap) continue;
                    doneCH += c.ch;
                    count++;
                }
            }
            return doneCH;
        };

        const actualRuleSet = Object.values(rules.degree_types).find((rs: any) => rs.total_credits === totalCredits) as any || rules.degree_types.computing_bsc;

        const maxUniElec = actualRuleSet.max_uni_electives;
        const maxDeptElec = actualRuleSet.max_dept_electives;

        const catData = [
            { label: "University Requirements", courses: data.university_requirements, color: "#a78bfa", icon: <GraduationCap className="w-3.5 h-3.5" /> },
            { label: "University Elective", courses: data.university_electives ?? [], color: "#34d399", icon: <Sparkles className="w-3.5 h-3.5" />, cap: maxUniElec },
            { label: "College Requirements", courses: data.college_requirements, color: "#60a5fa", icon: <BookOpen className="w-3.5 h-3.5" /> },
            { label: "Department Requirements", courses: [...data.department_requirements, ...(data.work_market_requirements ?? [])], color: "#f59e0b", icon: <Target className="w-3.5 h-3.5" /> },
            { label: "Department Elective", courses: data.electives, color: "#f472b6", icon: <Sparkles className="w-3.5 h-3.5" />, cap: maxDeptElec },
        ];

        return catData
            .filter(cat => cat.courses.length > 0 || (cat.cap && cat.cap > 0))
            .map(cat => {
                const totalCH = sumCH(cat.courses, cat.cap);
                const doneCH = countDoneCH(cat.courses, cat.cap);
                return {
                    label: cat.label,
                    totalCH,
                    doneCH: Math.min(doneCH, totalCH),
                    remaining: Math.max(0, totalCH - doneCH),
                    color: cat.color,
                    icon: cat.icon
                };
            });
    }, [data, completedCourses, totalCredits, rules]);

    const totalRemaining = categories.reduce((s, c) => s + c.remaining, 0);
    const overallTotalCH = categories.reduce((s, c) => s + c.totalCH, 0);
    const overallDoneCH = categories.reduce((s, c) => s + c.doneCH, 0);
    const overallRoadmapPct = overallTotalCH > 0 ? Math.round((overallDoneCH / overallTotalCH) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10 space-y-6"
        >
            {/* ── Header: Student Status ────────────────── */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                <div id="wt-student-status" className="flex-1 glass-card p-6 rounded-[32px] relative overflow-hidden group border-white/10 bg-white/[0.02] shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-blue-600/10 opacity-50" />

                    <div className="relative flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                            <GraduationCap className="w-8 h-8 text-violet-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase italic">{studentTitle}</h2>
                                <div className="px-2 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/30">
                                    <Sparkles className="w-3 h-3 text-violet-400" />
                                </div>
                            </div>
                            <p className="text-xs text-white/40 font-medium">
                                Academic status based on degree completion progress.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 md:w-64 shrink-0">
                    <div className="flex-1 py-5 px-7 glass-card rounded-[32px] border-white/10 bg-white/[0.02] flex flex-col justify-center relative overflow-hidden border">
                        <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] mb-2 flex items-center gap-2"><Calendar className="w-3 h-3" /> Graduation</span>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-xl font-black text-white tracking-tighter">{graduationEstimate}</span>
                        </div>
                    </div>
                    <Link id="wt-planner-btn" href="/planner" className="group flex items-center justify-between py-3 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm font-bold tracking-wide">Semester Planner</span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <ArrowRight className="w-3 h-3 text-white" />
                        </div>
                    </Link>
                </div>
            </div>

            {/* ── Additional Data Parity Stats (Desktop Grid / Mobile Stack) ──────────────── */}
            <div id="wt-stat-cards" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard
                    icon={<Target className="w-4 h-4" />}
                    label="Credits Done"
                    value={completedCredits.toString()}
                    sub={`/ ${totalCredits} CH`}
                    color="#8b5cf6"
                    delay={0.1}
                    progress={progress}
                />
                <div id="wt-cgpa-card" className="relative group/gpa">
                    <StatCard
                        icon={<GpaIcon className="w-4 h-4" />}
                        label="True CGPA"
                        value={trueCGPA > 0 ? trueCGPA.toFixed(2) : "-.--"}
                        sub="/ 4.00"
                        color={(() => {
                            if (classification.colorKey === 'emerald') return '#10b981';
                            if (classification.colorKey === 'violet') return '#8b5cf6';
                            if (classification.colorKey === 'amber') return '#f59e0b';
                            return '#3b82f6';
                        })()}
                        delay={0.15}
                        isRating
                        ratingLabel={classification.short}
                        motivation={classification.motivation}
                    />
                    <button
                        onClick={() => setIsEditingGpa(true)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 opacity-0 group-hover/gpa:opacity-100 transition-all text-white/40 hover:text-white/80"
                        title="Edit Previous Academic History"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                </div>
                <StatCard
                    icon={<Award className="w-4 h-4" />}
                    label="Progress %"
                    value={`${progressPct}%`}
                    sub="Completed"
                    color="#10b981"
                    delay={0.2}
                />
                <StatCard
                    icon={<Clock className="w-4 h-4" />}
                    label="CH Left"
                    value={totalRemaining.toString()}
                    sub="CH"
                    color="#f59e0b"
                    delay={0.25}
                />
                <StatCard
                    icon={<CheckCircle className="w-4 h-4" />}
                    label="Courses"
                    value={completedCount.toString()}
                    sub="Completed"
                    color="#3b82f6"
                    delay={0.3}
                />
                <StatCard
                    icon={<Star className="w-4 h-4" />}
                    label="Status"
                    value={studentTitle}
                    sub="Tier"
                    color="#ec4899"
                    delay={0.35}
                    isText
                />
            </div>

            {/* ── What's Next: Smart Progress ──────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                id="wt-roadmap"
                className="rounded-[40px] p-8 glass-card-premium group/next"
            >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 justify-between w-full relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-600/10 flex items-center justify-center border border-violet-500/20 shrink-0 group-hover/next:scale-110 transition-transform">
                            <Target className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em]">Critical Roadmap</h3>
                            <p className="text-[10px] text-white/20 font-bold">{totalRemaining} Credit Hours to go</p>
                        </div>
                    </div>
                    <div className="w-full sm:flex-1 sm:max-w-xs flex flex-col gap-1.5 transition-opacity mt-4 sm:mt-0">
                        <div className="flex justify-between items-center text-[10px] font-bold tracking-widest uppercase">
                            <span className="text-white/30">Overall</span>
                            <span className="text-violet-400">{overallRoadmapPct}%</span>
                        </div>
                        <div className="h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10 p-[1px]">
                            <motion.div
                                className="h-full rounded-full relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${overallRoadmapPct}%` }}
                                transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                style={{
                                    background: `linear-gradient(90deg, #8b5cf680, #c084fc)`,
                                    boxShadow: `0 0 15px #8b5cf630`,
                                }}
                            >
                                <div className="absolute inset-x-0 bottom-0 h-[20%] bg-white/20" />
                            </motion.div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((cat, i) => {
                        const pct = cat.totalCH > 0 ? Math.round((cat.doneCH / cat.totalCH) * 100) : 0;
                        const isDone = cat.remaining === 0 && cat.totalCH > 0;
                        return (
                            <motion.div
                                key={cat.label}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.08 }}
                                className={`group/cat ${isDone ? "opacity-30 grayscale" : "hover:scale-[1.01] transition-transform"}`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: `${cat.color}15`, color: cat.color }}>
                                        {cat.icon}
                                    </div>
                                    <span className="text-[11px] text-white/60 font-bold flex-1 truncate uppercase tracking-widest">{cat.label}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs font-black text-white">{cat.doneCH}</span>
                                        <span className="text-[10px] text-white/20">/ {cat.totalCH}</span>
                                    </div>
                                </div>
                                <div className="h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10 p-[1px]">
                                    <motion.div
                                        className="h-full rounded-full relative"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                        style={{
                                            background: `linear-gradient(90deg, ${cat.color}40, ${cat.color})`,
                                            boxShadow: `0 0 15px ${cat.color}30`,
                                        }}
                                    >
                                        <div className="absolute inset-x-0 bottom-0 h-[20%] bg-white/20" />
                                    </motion.div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* GPA Edit Modal Overlay */}
            {isEditingGpa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#111] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl"
                    >
                        <h3 className="text-lg font-bold text-white mb-2">Previous Academic History</h3>
                        <p className="text-xs text-white/50 mb-6">Enter your cumulative GPA and earned credits prior to what you have logged in the tracker. We will combine them for a true CGPA.</p>

                        <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-1">
                            {terms.map((term, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">{i === 0 ? "Cumulative GPA" : `Term ${i + 1} GPA`}</label>
                                        <input
                                            type="number" step="0.01" min="0" max="4.0"
                                            value={term.gpa} onChange={e => {
                                                const newTerms = [...terms];
                                                newTerms[i].gpa = e.target.value;
                                                setTerms(newTerms);
                                            }}
                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-hidden focus:border-violet-500 transition-colors"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">{i === 0 ? "Earned Credits" : `Term ${i + 1} Credits`}</label>
                                        <input
                                            type="number" step="1" min="0"
                                            value={term.credits} onChange={e => {
                                                const newTerms = [...terms];
                                                newTerms[i].credits = e.target.value;
                                                setTerms(newTerms);
                                            }}
                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-hidden focus:border-violet-500 transition-colors"
                                            placeholder="0"
                                        />
                                    </div>
                                    {terms.length > 1 && (
                                        <button onClick={() => setTerms(terms.filter((_, idx) => idx !== i))} className="mt-5 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-red-400 transition-colors">
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button onClick={() => setTerms([...terms, { gpa: "", credits: "" }])} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-bold uppercase tracking-widest text-white/60 transition-colors mt-2">
                                + Add Another Term
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsEditingGpa(false)}
                                className="flex-1 py-3 text-sm font-bold text-white/60 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePreviousGpa}
                                disabled={savingGpa}
                                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50"
                            >
                                {savingGpa ? "Saving..." : "Save History"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}

const StudentDashboardMemoized = memo(StudentDashboard);
export default StudentDashboardMemoized;

/* ═══════════════════════════════════════════════════════════════════
   Stat Card Sub-component
   ═══════════════════════════════════════════════════════════════════ */

function StatCard({ icon, label, value, sub, color, delay, progress, isText, isRating, ratingLabel, motivation }: Readonly<{
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    color: string;
    delay: number;
    progress?: number;
    isText?: boolean;
    isRating?: boolean;
    ratingLabel?: string;
    motivation?: string;
}>) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.35 }}
            className="relative rounded-2xl p-4 overflow-hidden group cursor-default hover:scale-[1.02] transition-transform duration-200"
            style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                border: "1px solid rgba(255,255,255,0.06)",
            }}
        >
            {/* Accent glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${color}15, transparent)` }} />

            <div className="relative">
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${color}15`, border: `1px solid ${color}20`, color }}>
                        {icon}
                    </div>
                    <span className="text-[9px] text-white/25 uppercase font-bold tracking-widest">{label}</span>
                </div>
                <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className={`font-bold text-white ${isText ? "text-[12px] sm:text-sm" : "text-xl"} tabular-nums tracking-tight truncate`}>
                        {value}
                    </span>
                    {sub && <span className="text-[10px] text-white/20 font-medium truncate">{sub}</span>}
                </div>

                {isRating && ratingLabel && (
                    <div className="mt-1 flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color }}>
                            {ratingLabel}
                        </span>
                        {motivation && (
                            <span className="text-[8px] font-medium text-white/40 italic leading-tight mt-0.5">
                                &ldquo;{motivation}&rdquo;
                            </span>
                        )}
                    </div>
                )}

                {/* Mini progress bar for Degree Progress card */}
                {progress !== undefined && (
                    <div className="mt-2.5 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(progress * 100)}%` }}
                            transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
                            style={{
                                background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                                boxShadow: `0 0 8px ${color}30`,
                            }}
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
}
