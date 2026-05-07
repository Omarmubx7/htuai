"use client";

import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Circle, Lock, AlertCircle, Sparkles, ChevronDown } from "lucide-react";
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
    const matches = prereq.matchAll(/\b\d{6,10}\b/g);
    return [...new Set([...matches].map((m) => {
        let code = m[0];
        if (code.length === 10 && code.startsWith("00")) code = code.slice(2);
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
    const m = />=\s*(\d+)/.exec(prereq);
    return m ? Number.parseInt(m[1], 10) : null;
}

function StatusIcon({ isLocked, hasPrereqWarning, isCompleted }: Readonly<{ isLocked: boolean; hasPrereqWarning?: boolean; isCompleted: boolean }>) {
    if (isLocked) return <Lock className="w-4 h-4 text-white/10" />;
    if (hasPrereqWarning) return <AlertCircle className="w-4 h-4 text-amber-500/60" />;
    if (isCompleted) return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    return <Circle className="w-4 h-4 text-white/10" />;
}

function PrerequisiteSection({
    isMobile,
    isExpanded,
    setIsExpanded,
    shouldShowPrereqs,
    prereqCodes,
    hasCHRule,
    hasOtherText,
    completedCredits,
    requiredCH,
    courseMap,
    missingPrereqs,
    fullPrereq
}: Readonly<{
    isMobile: boolean;
    isExpanded: boolean;
    setIsExpanded: (v: boolean) => void;
    shouldShowPrereqs: boolean;
    prereqCodes: string[];
    hasCHRule: boolean;
    hasOtherText: boolean;
    completedCredits: number;
    requiredCH: number | null;
    courseMap: Record<string, string>;
    missingPrereqs: string[];
    fullPrereq?: string;
}>) {
    if (!prereqCodes.length && !hasCHRule && !hasOtherText) return null;

    return (
        <div className="mt-4 pt-4 border-t border-white/5 relative z-10 transition-colors">
            {isMobile ? (
                <button
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="w-full flex items-center justify-between text-[10px] text-white/40 hover:text-white/60 transition-colors uppercase font-black tracking-[0.2em] mb-2"
                >
                    <span>Prerequisites ({prereqCodes.length + (hasCHRule ? 1 : 0) + (hasOtherText ? 1 : 0)})</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                </button>
            ) : (
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-black">Prerequisites</p>
                    {hasCHRule && <span className="text-[8px] font-bold text-white/40">{completedCredits}/{requiredCH} CH</span>}
                </div>
            )}

            <AnimatePresence initial={false}>
                {shouldShowPrereqs && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-3 overflow-hidden"
                    >
                        {isMobile && hasCHRule && requiredCH !== null && (
                            <div className="flex items-center justify-between mb-1.5 mt-2">
                                <span className="text-[9px] text-white/40 font-bold tracking-widest uppercase">Credit Req</span>
                                <span className="text-[9px] font-bold text-white/60">{completedCredits}/{requiredCH} CH</span>
                            </div>
                        )}

                        {hasCHRule && requiredCH !== null && (
                            <div className="h-1 bg-white/3 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    className={`h-full rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all duration-1000 ${completedCredits >= requiredCH ? "bg-emerald-500" : "bg-violet-500"}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (completedCredits / requiredCH) * 100)}%` }}
                                />
                            </div>
                        )}

                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {prereqCodes.map((code) => {
                                const name = courseMap[code];
                                const isMissing = missingPrereqs.includes(code);
                                return (
                                    <button
                                        key={code}
                                        type="button"
                                        title={`${name ?? code} - Click for details`}
                                        className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer hover:shadow-[0_0_12px_rgba(${isMissing ? '239,68,68' : '16,185,129'},0.2)] ${isMobile ? "w-full" : ""}
                                            ${isMissing
                                                ? "bg-red-500/10 border-red-500/20 text-red-400/60 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
                                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400/60 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-400"
                                            }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Tooltip-style feedback on click
                                            const btn = e.currentTarget;
                                            const ringClass = isMissing ? 'ring-red-500/30' : 'ring-emerald-500/30';
                                            btn.classList.add('ring-2', ringClass);
                                            setTimeout(() => {
                                                btn.classList.remove('ring-2', ringClass);
                                            }, 300);
                                        }}
                                    >
                                        {isMissing
                                            ? <AlertCircle className="w-2.5 h-2.5 opacity-50 shrink-0" />
                                            : <CheckCircle className="w-2.5 h-2.5 opacity-50 shrink-0" />}
                                        <span className="truncate">{name ?? code}</span>
                                    </button>
                                );
                            })}
                            {hasOtherText && (
                                <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-lg border bg-amber-500/10 border-amber-500/20 text-amber-400/60 ${isMobile ? "w-full" : ""}`}>
                                    <AlertCircle className="w-2.5 h-2.5 opacity-50 shrink-0" />
                                    <span className="truncate">{fullPrereq}</span>
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function LockInfoPopover({ lockReason, missingPrereqs, courseMap, onClose }: Readonly<{ lockReason?: string; missingPrereqs: string[]; courseMap: Record<string, string>; onClose: () => void }>) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-12 right-0 z-50 bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
            style={{ minWidth: '280px', maxWidth: '340px' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-400" />
                    <h4 className="text-sm font-bold text-white">Course Locked</h4>
                </div>
                <button
                    onClick={onClose}
                    className="shrink-0 w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    aria-label="Close"
                >
                    <span className="text-sm text-white/60">✕</span>
                </button>
            </div>

            {lockReason && (
                <p className="text-xs text-white/70 mb-3 leading-relaxed">
                    {lockReason}
                </p>
            )}

            {missingPrereqs.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Missing Prerequisites:</p>
                    <div className="flex flex-wrap gap-2">
                        {missingPrereqs.map((code) => {
                            const name = courseMap[code];
                            return (
                                <span
                                    key={code}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400/80"
                                    title={name}
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {name || code}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-[11px] text-white/50 italic">
                    Complete the missing prerequisites to unlock this course.
                </p>
            </div>
        </motion.div>
    );
}

function CourseCard({
    course,
    isCompleted,
    isLocked,
    hasPrereqWarning,
    lockReason,
    missingPrereqs = [],
    courseMap = {},
    completedCredits = 0,
    onToggle,
    onOpenNotes,
}: Readonly<CourseCardProps>) {
    const prereqCodes = course.prereq ? parsePrereqCodes(course.prereq) : [];
    const requiredCH = course.prereq ? extractRequiredCH(course.prereq) : null;
    const hasCHRule = requiredCH !== null;
    const hasOtherText = !!course.prereq && prereqCodes.length === 0 && !hasCHRule;

    const [isExpanded, setIsExpanded] = useState(false);
    const [showLockInfo, setShowLockInfo] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Force expand on desktop to match the layout requirements
    const shouldShowPrereqs = !isMobile || isExpanded;

    const accent = fw[course.framework] ?? { badge: "text-white/40 border-white/10 bg-white/3", dot: "bg-white/40" };

    let cardBorder = "border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/4";
    if (isCompleted) {
        cardBorder = "border-emerald-500/30 bg-emerald-500/4 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.2)]";
    } else if (isLocked) {
        cardBorder = "border-white/5 bg-white/1 opacity-40";
    } else if (hasPrereqWarning) {
        cardBorder = "border-amber-500/20 bg-amber-500/3 hover:border-amber-500/40";
    }

    return (
        <motion.div
            data-testid="course-card"
            whileHover={isLocked ? {} : { y: -6, scale: 1.02, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
            whileTap={isLocked ? {} : { scale: 0.98 }}
            className={`
                relative p-4 sm:p-5 rounded-[20px] sm:rounded-[28px] border transition-all duration-500 select-none overflow-hidden group/card animate-shimmer
                ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}
                ${cardBorder}
            `}
            style={{ backdropFilter: "blur(12px)" }}
            onClick={() => {
                if (isLocked) return;
                if (!isCompleted && typeof globalThis.confirm === "function") {
                    const accepted = globalThis.confirm(`Mark ${course.code} as completed?`);
                    if (!accepted) return;
                }
                onToggle();
            }}
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
                <button
                    data-testid="status-icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isLocked) {
                            setShowLockInfo(!showLockInfo);
                        } else {
                            setIsExpanded(!isExpanded);
                        }
                    }}
                    title={isLocked ? "Course Requirements" : "Course Prerequisites & Status"}
                    className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/3 border border-white/5 group-hover/card:bg-white/10 transition-colors cursor-help"
                >
                    <StatusIcon isLocked={isLocked} hasPrereqWarning={hasPrereqWarning} isCompleted={isCompleted} />
                    <AnimatePresence>
                        {showLockInfo && isLocked && (
                            <LockInfoPopover
                                lockReason={lockReason}
                                missingPrereqs={missingPrereqs}
                                courseMap={courseMap}
                                onClose={() => setShowLockInfo(false)}
                            />
                        )}
                    </AnimatePresence>
                </button>
            </div>

            {/* Course Name */}
            <h3 data-testid="course-name" className={`font-bold text-sm sm:text-base leading-tight mb-1.5 sm:mb-2 tracking-tight relative z-10 transition-colors ${isCompleted ? "text-white" : "text-white/80 group-hover/card:text-white"}`}>
                {course.name}
            </h3>

            {/* Code + Credits + Notes */}
            <div className="flex flex-wrap items-center justify-between gap-y-3 mt-3 sm:mt-5 relative z-10">
                <div className="flex flex-wrap items-center gap-3">
                    <span data-testid="course-code" className="text-[10px] text-white/20 font-mono font-bold tracking-[0.2em] group-hover/card:text-white/40 transition-colors mt-0.5">{course.code}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenNotes?.(); }}
                        className="flex items-center gap-1.5 py-1 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all group/notes min-h-8"
                        title="Course Notes"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-white/40 group-hover/notes:text-violet-400 transition-colors" />
                        <span className="text-[10px] font-bold text-white/60 group-hover/notes:text-violet-300 transition-colors">Notes</span>
                    </button>
                </div>

                <span className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-xl border transition-all duration-500
                    ${isCompleted
                        ? "bg-white/5 border-white/10 text-white/80"
                        : "bg-white/3 border-white/10 text-white/30 group-hover/card:border-white/20 group-hover/card:text-white/60"
                    }`}>
                    {course.ch} CH
                </span>
            </div>

            <PrerequisiteSection
                isMobile={isMobile} isExpanded={isExpanded} setIsExpanded={setIsExpanded}
                shouldShowPrereqs={shouldShowPrereqs} prereqCodes={prereqCodes}
                hasCHRule={hasCHRule} hasOtherText={hasOtherText} completedCredits={completedCredits}
                requiredCH={requiredCH} courseMap={courseMap} missingPrereqs={missingPrereqs}
                fullPrereq={course.prereq}
            />

            {/* No prerequisites */}
            {!course.prereq && (
                <div className="mt-3 pt-3 border-t border-white/5 relative z-10 transition-colors">
                    <span className="text-[10px] text-white/20 italic group-hover/card:text-white/40">No prerequisites</span>
                </div>
            )}
        </motion.div>
    );
}

// Memoize to prevent unnecessary re-renders when parent component updates
// This is critical for performance when marking many courses
const CourseCardMemoized = memo(CourseCard, (prevProps, nextProps) => {
    // Custom comparison: only re-render if these props change
    return (
        prevProps.course.code === nextProps.course.code &&
        prevProps.isCompleted === nextProps.isCompleted &&
        prevProps.grade === nextProps.grade &&
        prevProps.isLocked === nextProps.isLocked &&
        prevProps.hasPrereqWarning === nextProps.hasPrereqWarning &&
        prevProps.lockReason === nextProps.lockReason &&
        JSON.stringify(prevProps.missingPrereqs) === JSON.stringify(nextProps.missingPrereqs) &&
        prevProps.completedCredits === nextProps.completedCredits &&
        prevProps.onToggle === nextProps.onToggle
    );
});

export default CourseCardMemoized;
