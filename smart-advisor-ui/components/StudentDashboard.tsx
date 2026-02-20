"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Course, CourseData } from "@/types";
import {
    GraduationCap, Target, BookOpen, TrendingUp,
    Zap, Award, Star, Crown, Trophy, Rocket, Lock,
    ChevronRight, Sparkles
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   Types & Props
   ═══════════════════════════════════════════════════════════════════ */

interface StudentDashboardProps {
    completedCourses: Set<string>;
    completedCredits: number;
    totalCredits: number;
    data: CourseData;
    allCourses: Course[];
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
    completedCourses: Set<string>;
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
        check: (ctx) => ctx.completedCredits >= (ctx.allCourses.some(c => c.code === "201120") ? 36 : 68),
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
            const total = ctx.allCourses.some(c => c.code === "201120") ? 72 : 135;
            return ctx.completedCredits >= (total - 15);
        },
    },
    {
        id: "graduate",
        icon: <Crown className="w-4 h-4" />,
        label: "Graduate",
        description: "Complete all requirements",
        color: "#fbbf24",
        glow: "rgba(251,191,36,0.4)",
        check: (ctx) => {
            const total = ctx.allCourses.some(c => c.code === "201120") ? 72 : 135;
            return ctx.completedCredits >= total;
        },
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
}: StudentDashboardProps) {
    const completedCount = completedCourses.size;
    const progress = Math.min(completedCredits / totalCredits, 1);
    const progressPct = Math.round(progress * 100);

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

        const isTechnical = totalCredits === 72;
        const maxUniElec = isTechnical ? 0 : 3;
        const maxDeptElec = isTechnical ? 1 : 3;

        const catData = [
            { label: "University Requirements", courses: data.university_requirements, color: "#a78bfa", icon: <GraduationCap className="w-3.5 h-3.5" /> },
            { label: "College Requirements", courses: data.college_requirements, color: "#60a5fa", icon: <BookOpen className="w-3.5 h-3.5" /> },
            { label: "University Electives", courses: data.university_electives ?? [], color: "#34d399", icon: <Sparkles className="w-3.5 h-3.5" />, cap: maxUniElec },
            { label: "Department Requirements", courses: data.department_requirements, color: "#f59e0b", icon: <Target className="w-3.5 h-3.5" /> },
            { label: "Major Electives", courses: data.electives, color: "#f472b6", icon: <Star className="w-3.5 h-3.5" />, cap: maxDeptElec },
            { label: "Work Market", courses: data.work_market_requirements ?? [], color: "#10b981", icon: <Rocket className="w-3.5 h-3.5" /> },
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
    const badgeCtx: BadgeContext = { completedCredits, completedCount, allCourses, completedCourses };
    const earnedCount = BADGES.filter(b => b.check(badgeCtx)).length;
    const totalRemaining = categories.reduce((s, c) => s + c.remaining, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10 space-y-4"
        >
            {/* ── Stats Row ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    icon={<Zap className="w-4 h-4" />}
                    label="Credit Hours"
                    value={`${completedCredits}`}
                    sub={`/ ${totalCredits} CH`}
                    color="#8b5cf6"
                    delay={0}
                />
                <StatCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Degree Progress"
                    value={`${progressPct}%`}
                    sub="complete"
                    color="#3b82f6"
                    delay={0.05}
                    progress={progress}
                />
                <StatCard
                    icon={<GraduationCap className="w-4 h-4" />}
                    label="Est. Graduation"
                    value={graduationEstimate}
                    sub={completedCredits > 0 ? `${totalCredits - completedCredits} CH left` : ""}
                    color="#10b981"
                    delay={0.1}
                    isText
                />
                <StatCard
                    icon={<Award className="w-4 h-4" />}
                    label="Badges Earned"
                    value={`${earnedCount}`}
                    sub={`/ ${BADGES.length}`}
                    color="#f59e0b"
                    delay={0.15}
                />
            </div>

            {/* ── Badges + What's Next ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Badges */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="rounded-2xl p-5"
                    style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy className="w-4 h-4 text-amber-400/60" />
                        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Achievements</h3>
                        <div className="flex-1" />
                        <span className="text-[10px] text-white/20 font-mono tabular-nums">{earnedCount}/{BADGES.length}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {BADGES.map((badge, i) => {
                            const earned = badge.check(badgeCtx);
                            return (
                                <motion.div
                                    key={badge.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
                                    title={`${badge.label}: ${badge.description}`}
                                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl cursor-default transition-all duration-300
                                        ${earned
                                            ? "hover:scale-105"
                                            : "opacity-30 grayscale"
                                        }`}
                                    style={{
                                        background: earned ? `${badge.color}10` : "rgba(255,255,255,0.02)",
                                        border: `1px solid ${earned ? `${badge.color}25` : "rgba(255,255,255,0.04)"}`,
                                        boxShadow: earned ? `0 0 20px ${badge.glow}` : "none",
                                    }}
                                >
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{
                                            color: earned ? badge.color : "rgba(255,255,255,0.2)",
                                            background: earned ? `${badge.color}15` : "transparent",
                                        }}
                                    >
                                        {earned ? badge.icon : <Lock className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className="text-[9px] font-semibold text-center leading-tight"
                                        style={{ color: earned ? `${badge.color}cc` : "rgba(255,255,255,0.2)" }}>
                                        {badge.label}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* What's Next */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4 }}
                    className="rounded-2xl p-5"
                    style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    <div className="flex items-center gap-2 mb-4">
                        <ChevronRight className="w-4 h-4 text-violet-400/60" />
                        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">What&apos;s Next</h3>
                        <div className="flex-1" />
                        <span className="text-[10px] text-white/20 font-mono tabular-nums">{totalRemaining} CH left</span>
                    </div>
                    <div className="space-y-3">
                        {categories.map((cat, i) => {
                            const pct = cat.totalCH > 0 ? Math.round((cat.doneCH / cat.totalCH) * 100) : 0;
                            const isDone = cat.remaining === 0 && cat.totalCH > 0;
                            return (
                                <motion.div
                                    key={cat.label}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.35 + i * 0.06 }}
                                    className={`group ${isDone ? "opacity-50" : ""}`}
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span style={{ color: cat.color }}>{cat.icon}</span>
                                        <span className="text-[11px] text-white/50 font-medium flex-1 truncate">{cat.label}</span>
                                        <span className="text-[10px] font-mono tabular-nums text-white/30">
                                            {cat.doneCH}<span className="text-white/15">/{cat.totalCH}</span>
                                        </span>
                                        {isDone && <span className="text-[9px] text-emerald-400/70 font-semibold">✓</span>}
                                    </div>
                                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, delay: 0.4 + i * 0.08, ease: "easeOut" }}
                                            style={{
                                                background: `linear-gradient(90deg, ${cat.color}80, ${cat.color})`,
                                                boxShadow: `0 0 8px ${cat.color}30`,
                                            }}
                                        />
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

function StatCard({ icon, label, value, sub, color, delay, progress, isText }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    color: string;
    delay: number;
    progress?: number;
    isText?: boolean;
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
                <div className="flex items-baseline gap-1.5">
                    <span className={`font-bold text-white ${isText ? "text-sm" : "text-xl"} tabular-nums tracking-tight`}>
                        {value}
                    </span>
                    {sub && <span className="text-[10px] text-white/20 font-medium">{sub}</span>}
                </div>

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
