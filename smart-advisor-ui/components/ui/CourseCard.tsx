"use client";

import { motion } from "framer-motion";
import { CheckCircle, Circle, Lock, AlertCircle, Sparkles } from "lucide-react";
import { Course } from "../../types";

interface CourseCardProps {
    course: Course;
    isCompleted: boolean;
    grade?: string;
    isLocked: boolean;
    hasPrereqWarning?: boolean;
    lockReason?: string;
    missingPrereqs?: string[];
    courseMap?: Record<string, string>;
    completedCredits?: number;
    onToggle: () => void;
    onOpenNotes?: () => void;
}

function parsePrereqCodes(prereq: string): string[] {
    const matches = prereq.matchAll(/\b\d{8,10}\b/g);
    return [...new Set([...matches].map((m) => {
        let code = m[0];
        if (code.startsWith("00") && code.length === 10) code = code.slice(2);
        return code;
    }))];
}

/** Framework accent colours in Framer style */
const fw: Record<string, { badge: string; dot: string }> = {
    HTU: { badge: "text-violet-300/70 border-violet-500/20 bg-violet-500/5", dot: "bg-violet-400" },
    HNC: { badge: "text-emerald-300/70 border-emerald-500/20 bg-emerald-500/5", dot: "bg-emerald-400" },
    HND: { badge: "text-blue-300/70 border-blue-500/20 bg-blue-500/5", dot: "bg-blue-400" },
};

function extractRequiredCH(prereq: string): number | null {
    const m = prereq.match(/>=\s*(\d+)/);
    return m ? parseInt(m[1], 10) : null;
}

export default function CourseCard({
    course,
    isCompleted,
    grade = "M",
    isLocked,
    hasPrereqWarning,
    lockReason,
    missingPrereqs = [],
    courseMap = {},
    completedCredits = 0,
    onToggle,
    onOpenNotes,
}: CourseCardProps) {
    const grades: string[] = ["D", "M", "P", "U"];
    const prereqCodes = course.prereq ? parsePrereqCodes(course.prereq) : [];
    const requiredCH = course.prereq ? extractRequiredCH(course.prereq) : null;
    const hasCHRule = requiredCH !== null;
    const hasOtherText = !!course.prereq && prereqCodes.length === 0 && !hasCHRule;

    const handleClick = () => { if (!isLocked) onToggle(); };

    const accent = fw[course.framework] ?? { badge: "text-white/40 border-white/10 bg-white/3", dot: "bg-white/40" };

    return (
        <motion.div
            whileHover={isLocked ? {} : { y: -6, scale: 1.02, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
            whileTap={isLocked ? {} : { scale: 0.98 }}
            className={`
                relative p-5 rounded-[28px] border transition-all duration-500 select-none overflow-hidden group/card animate-shimmer
                ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}
                ${isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/4 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.2)]"
                    : isLocked
                        ? "border-white/5 bg-white/1 opacity-40"
                        : hasPrereqWarning
                            ? "border-amber-500/20 bg-amber-500/3 hover:border-amber-500/40"
                            : "border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/4"
                }
            `}
            style={{ backdropFilter: "blur(24px)" }}
            onClick={handleClick}
            title={lockReason}
        >
            {/* Completed/Hover Glows */}
            <div className={`absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none
                ${isCompleted ? "bg-linear-to-b from-emerald-500/10 to-transparent" : "bg-linear-to-b from-white/5 to-transparent"}`}
            />

            {/* Top Row */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <span className={`inline-flex items-center gap-2 text-[9px] font-black px-2.5 py-1 rounded-full border tracking-[0.15em] uppercase transition-colors ${accent.badge}`}>
                    <span className={`w-1 h-1 rounded-full animate-pulse ${accent.dot}`} />
                    {course.framework}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); /* TODO: Open Notes */ }}
                        className="p-1 px-1.5 rounded-lg bg-white/3 border border-white/5 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all group/notes"
                        title="Course Notes"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-white/20 group-hover/notes:text-violet-400 transition-colors" />
                    </button>
                    <div className="p-1 px-1.5 rounded-lg bg-white/3 border border-white/5 group-hover/card:bg-white/10 transition-colors">
                        {isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-white/10 shrink-0" />
                        ) : hasPrereqWarning ? (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500/60 shrink-0" />
                        ) : isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                            <Circle className="w-3.5 h-3.5 text-white/10 shrink-0" />
                        )}
                    </div>
                </div>
            </div>

            {/* Course Name */}
            <h3 className={`font-bold text-base leading-tight mb-2 tracking-tight relative z-10 transition-colors ${isCompleted ? "text-white" : "text-white/80 group-hover/card:text-white"}`}>
                {course.name}
            </h3>

            {/* Code + Credits */}
            <div className="flex flex-wrap items-center justify-between gap-y-2 mt-5 relative z-10">
                <span className="text-[10px] text-white/20 font-mono font-bold tracking-[0.2em] group-hover/card:text-white/40 transition-colors">{course.code}</span>

                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-xl border transition-all duration-500
                        ${isCompleted
                            ? "bg-white/5 border-white/10 text-white/80"
                            : "bg-white/3 border-white/10 text-white/30 group-hover/card:border-white/20 group-hover/card:text-white/60"
                        }`}>
                        {course.ch} CH
                    </span>
                </div>
            </div>

            {/* Prerequisites Section */}
            {(prereqCodes.length > 0 || hasCHRule || hasOtherText) && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                        <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-black">Prerequisites</p>
                        {hasCHRule && <span className="text-[8px] font-bold text-white/40">{completedCredits}/{requiredCH} CH</span>}
                    </div>

                    {/* Progress Bar for CH Rule */}
                    {hasCHRule && requiredCH !== null && (
                        <div className="h-1 bg-white/3 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                className={`h-full rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all duration-1000 ${completedCredits >= requiredCH ? "bg-emerald-500" : "bg-violet-500"}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (completedCredits / requiredCH) * 100)}%` }}
                            />
                        </div>
                    )}

                    {/* Prereq Chips */}
                    <div className="flex flex-wrap gap-1.5">
                        {prereqCodes.map((code) => {
                            const name = courseMap[code];
                            const isMissing = missingPrereqs.includes(code);
                            return (
                                <span key={code} title={name ?? code}
                                    className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all
                                        ${isMissing
                                            ? "bg-red-500/10 border-red-500/20 text-red-400/60"
                                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400/60"
                                        }`}>
                                    {isMissing
                                        ? <AlertCircle className="w-2.5 h-2.5 opacity-50" />
                                        : <CheckCircle className="w-2.5 h-2.5 opacity-50" />}
                                    <span className="truncate max-w-35">{name ?? code}</span>
                                </span>
                            );
                        })}
                        {hasOtherText && (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-lg border bg-amber-500/10 border-amber-500/20 text-amber-400/60">
                                <AlertCircle className="w-2.5 h-2.5 opacity-50" />
                                {course.prereq}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* No prerequisites */}
            {!course.prereq && (
                <div className="mt-3 pt-3 border-t border-white/5 relative z-10 transition-colors">
                    <span className="text-[10px] text-white/20 italic group-hover/card:text-white/40">No prerequisites</span>
                </div>
            )}
        </motion.div>
    );
}
