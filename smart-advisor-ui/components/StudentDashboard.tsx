"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Course, CourseData } from "@/types";
import {
    GraduationCap, Target, BookOpen, TrendingUp as GpaIcon,
    Zap, Award, Star, Crown, Trophy, Rocket, Lock,
    ChevronRight, Sparkles
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

interface Badge {
    id: string;
    icon: React.ReactNode;
    label: string;
    description: string;
    color: string;
    glow: string;
    check: (ctx: BadgeContext) => boolean;
}

interface BadgeContext {
    completedCredits: number;
    completedCount: number;
    allCourses: Course[];
    completedCourses: Map<string, any> | Set<string>;
    totalCredits: number;
}

const BADGES: Badge[] = [
    {
        id: "first-steps",
        icon: <Target className="w-4 h-4" />,
        label: "First Steps",
        description: "Complete your first course",
        color: "#a78bfa",
        glow: "rgba(167,139,250,0.3)",
        check: (ctx) => ctx.completedCount >= 1,
    },
    {
        id: "15ch-club",
        icon: <BookOpen className="w-4 h-4" />,
        label: "15 CH Club",
        description: "Earn 15 credit hours",
        color: "#60a5fa",
        glow: "rgba(96,165,250,0.3)",
        check: (ctx) => ctx.completedCredits >= 15,
    },
    {
        id: "year1-done",
        icon: <GraduationCap className="w-4 h-4" />,
        label: "Year 1 Done",
        description: "Complete all Level 1 courses",
        color: "#34d399",
        glow: "rgba(52,211,153,0.3)",
        check: (ctx) => {
            const level1 = ctx.allCourses.filter(c => c.level === 1);
            return level1.length > 0 && level1.every(c => ctx.completedCourses.has(c.code));
        },
    },
    {
        id: "halfway",
        icon: <Rocket className="w-4 h-4" />,
        label: "Halfway There",
        description: "Complete 50% of your degree",
        color: "#f59e0b",
        glow: "rgba(245,158,11,0.3)",
        check: (ctx) => ctx.completedCredits >= ctx.totalCredits / 2,
    },
    {
        id: "year2-done",
        icon: <Award className="w-4 h-4" />,
        label: "Year 2 Done",
        description: "Complete all Level 1 & 2 courses",
        color: "#06b6d4",
        glow: "rgba(6,182,212,0.3)",
        check: (ctx) => {
            const level12 = ctx.allCourses.filter(c => c.level === 1 || c.level === 2);
            return level12.length > 0 && level12.every(c => ctx.completedCourses.has(c.code));
        },
    },
    {
        id: "100ch",
        icon: <Star className="w-4 h-4" />,
        label: "Century",
        description: "Earn 100 credit hours",
        color: "#f472b6",
        glow: "rgba(244,114,182,0.3)",
        check: (ctx) => ctx.completedCredits >= 100,
    },
    {
        id: "almost-there",
        icon: <Trophy className="w-4 h-4" />,
        label: "Almost There",
        description: "Nearly finished",
        color: "#fb923c",
        glow: "rgba(251,146,60,0.3)",
        check: (ctx) => {
            return ctx.completedCredits >= ctx.totalCredits - 15 && ctx.completedCredits < ctx.totalCredits;
        },
    },
    {
        id: "graduate",
        icon: <Crown className="w-4 h-4" />,
        label: "Graduate",
        description: "Complete all requirements",
        color: "#fbbf24",
        glow: "rgba(251,191,36,0.4)",
        check: (ctx) => ctx.completedCredits >= ctx.totalCredits,
    },
];

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

    // ── Gamification Logic ──────────────────────────────────────────
    const level = Math.floor(completedCredits / 15) + 1;
    const xp = completedCredits * 100;
    const xpInLevel = xp % 1500;
    const xpToNext = 1500 - xpInLevel;
    const levelProgress = xpInLevel / 1500;

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
            { label: "Department Elective", courses: data.electives, color: "#f472b6", icon: <Star className="w-3.5 h-3.5" />, cap: maxDeptElec },
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
    }, [data, completedCourses, totalCredits]);

    // ── Badge context ────────────────────────────────────────────────
    const badgeCtx: BadgeContext = { completedCredits, completedCount, allCourses, completedCourses, totalCredits };
    const earnedCount = BADGES.filter(b => b.check(badgeCtx)).length;
    const totalRemaining = categories.reduce((s, c) => s + c.remaining, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10 space-y-6"
        >
            {/* ── Gamification Header: High-Tech Level Up ────────────────── */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                <div className="flex-1 glass-card p-6 rounded-[32px] relative overflow-hidden group border-white/10 bg-white/[0.02] shadow-2xl">
                    {/* Animated Mesh Glow for Level Block */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-blue-600/10 opacity-50" />
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/10 blur-[80px] rounded-full animate-float" />

                    <div className="relative flex items-center gap-6">
                        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                            {/* Level Ring with Depth */}
                            <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">
                                <circle cx="40" cy="40" r="36" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                                <motion.circle
                                    cx="40" cy="40" r="36" fill="transparent" stroke="url(#level-ring-grad)" strokeWidth="6"
                                    strokeDasharray="226.2"
                                    initial={{ strokeDashoffset: 226.2 }}
                                    animate={{ strokeDashoffset: 226.2 * (1 - levelProgress) }}
                                    transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient id="level-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#c084fc" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-white drop-shadow-md">{level}</span>
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Rank</span>
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <h2 className="text-xl font-black text-white tracking-tight leading-none group-hover:text-violet-300 transition-colors uppercase italic">{studentTitle}</h2>
                                <div className="px-2 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/30">
                                    <Sparkles className="w-3 h-3 text-violet-400" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] mb-2 font-bold">
                                <span className="text-violet-400/80 tracking-widest uppercase">{xpInLevel} <span className="opacity-40">/ 1500 XP</span></span>
                                <span className="text-white/20 uppercase tracking-tighter">{xpToNext} TO LVL {level + 1}</span>
                            </div>
                            <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full relative"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${levelProgress * 100}%` }}
                                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <div className="absolute inset-0 bg-white/10 animate-pulse" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:w-64 shrink-0">
                    <div className="flex-1 h-full py-5 px-7 glass-card rounded-[32px] border-white/10 bg-white/[0.02] flex flex-col justify-center relative overflow-hidden group/xp">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
                        <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] mb-2">Prestige XP</span>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-3xl font-black text-white tabular-nums tracking-tighter group-hover/xp:scale-110 transition-transform duration-500">{xp.toLocaleString()}</span>
                            <span className="text-sm text-violet-500/50 font-black italic">PTS</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Badges + What's Next: The Achievement Vault ──────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Achievements Vault */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="rounded-[40px] p-8 glass-card-premium group/vault"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover/vault:rotate-12 transition-transform">
                            <Trophy className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em]">Achievements</h3>
                            <p className="text-[10px] text-white/20 font-bold">{earnedCount} of {BADGES.length} unlocked</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        {BADGES.map((badge, i) => {
                            const earned = badge.check(badgeCtx);
                            return (
                                <motion.div
                                    key={badge.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-700 overflow-hidden
                                        ${earned
                                            ? "hover:scale-110 cursor-pointer animate-shimmer"
                                            : "opacity-40 grayscale-[0.8] scale-95"
                                        }`}
                                    style={{
                                        background: earned ? `${badge.color}15` : "rgba(255,255,255,0.01)",
                                        border: `1px solid ${earned ? `${badge.color}30` : "rgba(255,255,255,0.03)"}`,
                                        boxShadow: earned ? `0 10px 30px ${badge.glow}` : "none",
                                    }}
                                    title={`${badge.label}: ${badge.description}`}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-transform group-hover:scale-110"
                                        style={{
                                            color: earned ? badge.color : "rgba(255,255,255,0.1)",
                                            background: earned ? `${badge.color}20` : "transparent",
                                        }}
                                    >
                                        {earned ? badge.icon : <Lock className="w-4 h-4" />}
                                    </div>
                                    <span className="text-[9px] font-black text-center uppercase tracking-tighter leading-none"
                                        style={{ color: earned ? "white" : "rgba(255,255,255,0.1)" }}>
                                        {badge.label}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* What's Next: Smart Progress */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="rounded-[40px] p-8 glass-card-premium group/next"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-2xl bg-violet-600/10 flex items-center justify-center border border-violet-500/20 group-hover/next:scale-110 transition-transform">
                            <Rocket className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em]">Critical Roadmap</h3>
                            <p className="text-[10px] text-white/20 font-bold">{totalRemaining} Credit Hours to go</p>
                        </div>
                    </div>

                    <div className="space-y-4">
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
                                    <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
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
            </div>
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
