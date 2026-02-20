"use client";

import { motion } from "framer-motion";
import { CheckCircle, Circle, Lock, AlertCircle } from "lucide-react";
import { Course } from "../../types";

interface CourseCardProps {
    course: Course;
    isCompleted: boolean;
    isLocked: boolean;
    hasPrereqWarning?: boolean;
    lockReason?: string;
    missingPrereqs?: string[];
    courseMap?: Record<string, string>;
    completedCredits?: number;
    onToggle: () => void;
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
    isLocked,
    hasPrereqWarning,
    lockReason,
    missingPrereqs = [],
    courseMap = {},
    completedCredits = 0,
    onToggle,
}: CourseCardProps) {
    const prereqCodes = course.prereq ? parsePrereqCodes(course.prereq) : [];
    const requiredCH = course.prereq ? extractRequiredCH(course.prereq) : null;
    const hasCHRule = requiredCH !== null;
    const hasOtherText = !!course.prereq && prereqCodes.length === 0 && !hasCHRule;

    const handleClick = () => { if (!isLocked) onToggle(); };

    const accent = fw[course.framework] ?? { badge: "text-white/40 border-white/10 bg-white/3", dot: "bg-white/40" };

    return (
        <motion.div
            whileHover={isLocked ? {} : { y: -4, scale: 1.01 }}
            whileTap={isLocked ? {} : { scale: 0.985 }}
            className={`
                relative p-4 rounded-2xl border transition-all duration-200 select-none overflow-hidden
                ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}
                ${isCompleted
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : isLocked
                        ? "border-white/5 bg-white/[0.02] opacity-50"
                        : hasPrereqWarning
                            ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30"
                            : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                }
            `}
            style={{ backdropFilter: "blur(12px)" }}
            onClick={handleClick}
            title={lockReason}
        >
            {/* Completed glow */}
            {isCompleted && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.08), transparent)" }} />
            )}

            {/* Top Row */}
            <div className="flex justify-between items-start mb-3">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border tracking-widest uppercase ${accent.badge}`}>
                    <span className={`w-1 h-1 rounded-full ${accent.dot}`} />
                    {course.framework}
                </span>
                {isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-white/20 shrink-0" />
                ) : hasPrereqWarning ? (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500/60 shrink-0" />
                ) : isCompleted ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                    <Circle className="w-3.5 h-3.5 text-white/20 shrink-0" />
                )}
            </div>

            {/* Course Name */}
            <h3 className={`font-semibold text-sm leading-snug mb-1 tracking-tight ${isCompleted ? "text-emerald-100" : "text-white/90"}`}>
                {course.name}
            </h3>

            {/* Code + Credits */}
            <div className="flex justify-between items-center mt-2.5">
                <span className="text-[10px] text-white/20 font-mono tracking-wider">{course.code}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border
                    ${isCompleted
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-white/5 border-white/8 text-white/40"
                    }`}>
                    {course.ch} CH
                </span>
            </div>

            {/* Prerequisites */}
            {(prereqCodes.length > 0 || hasCHRule || hasOtherText) && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    <p className="text-[9px] text-white/25 uppercase tracking-widest font-semibold">Prerequisites</p>

                    {/* CH progress bar */}
                    {hasCHRule && requiredCH !== null && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <span className={`text-[10px] ${completedCredits >= requiredCH ? "text-emerald-400" : "text-white/40"}`}>
                                    {completedCredits} / {requiredCH} CH
                                </span>
                                {completedCredits < requiredCH && (
                                    <span className="text-[10px] text-white/25">{requiredCH - completedCredits} left</span>
                                )}
                            </div>
                            <div className="h-0.5 bg-white/8 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${completedCredits >= requiredCH ? "bg-emerald-500" : "bg-violet-500"}`}
                                    style={{ width: `${Math.min(100, (completedCredits / requiredCH) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Course-code prereqs */}
                    {prereqCodes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {prereqCodes.map((code) => {
                                const name = courseMap[code];
                                const isMissing = missingPrereqs.includes(code);
                                return (
                                    <span key={code} title={name ?? code}
                                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border
                                            ${isMissing
                                                ? "bg-red-500/8 border-red-500/20 text-red-400/70"
                                                : "bg-emerald-500/8 border-emerald-500/20 text-emerald-400/70"
                                            }`}>
                                        {isMissing
                                            ? <AlertCircle className="w-2.5 h-2.5" />
                                            : <CheckCircle className="w-2.5 h-2.5" />}
                                        <span className="truncate max-w-[130px]">{name ?? code}</span>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Other textual prereqs (dept approval etc.) */}
                    {hasOtherText && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/8 border-amber-500/20 text-amber-400/70">
                            <AlertCircle className="w-2.5 h-2.5" />
                            {course.prereq}
                        </span>
                    )}
                </div>
            )}

            {/* No prerequisites */}
            {!course.prereq && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <span className="text-[10px] text-white/20 italic">No prerequisites</span>
                </div>
            )}
        </motion.div>
    );
}
