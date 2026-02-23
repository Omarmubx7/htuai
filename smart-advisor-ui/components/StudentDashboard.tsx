"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Course, CourseData } from "@/types";
import {
    GraduationCap, Target, BookOpen, TrendingUp as GpaIcon,
    Sparkles
} from "lucide-react";
import { calculateGPA, getClassification, GRADE_MAP } from "@/lib/grading";

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
}

/* ═══════════════════════════════════════════════════════════════════
   Badge Definitions
   ═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function StudentDashboard({
    completedCourses,
    completedCredits,
    totalCredits,
    data,
    allCourses,
    rules,
}: StudentDashboardProps) {
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

        const ruleSet = Object.values(rules.degree_types).find((rs: any) =>
            rs.major_keys.some((k: string) => rs.major_keys.includes(k)) // This is a bit redundant but safe
        ) as any || rules.degree_types.computing_bsc;

        // More accurate approach: find by totalCredits match or major keys
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10 space-y-6"
        >
            {/* ── Header: Student Status ────────────────── */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                <div className="flex-1 glass-card p-6 rounded-[32px] relative overflow-hidden group border-white/10 bg-white/[0.02] shadow-2xl">
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

                <div className="flex items-center gap-3 md:w-64 shrink-0">
                    <div className="flex-1 h-full py-5 px-7 glass-card rounded-[32px] border-white/10 bg-white/[0.02] flex flex-col justify-center relative overflow-hidden">
                        <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] mb-2">Graduation</span>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-xl font-black text-white tracking-tighter">{graduationEstimate}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── What's Next: Smart Progress ──────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="rounded-[40px] p-8 glass-card-premium group/next"
            >
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-violet-600/10 flex items-center justify-center border border-violet-500/20 group-hover/next:scale-110 transition-transform">
                        <Target className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em]">Critical Roadmap</h3>
                        <p className="text-[10px] text-white/20 font-bold">{totalRemaining} Credit Hours to go</p>
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
                                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
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
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Stat Card Sub-component
   ═══════════════════════════════════════════════════════════════════ */

function StatCard({ icon, label, value, sub, color, delay, progress, isText, isRating, ratingLabel, motivation }: {
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
}) {
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
