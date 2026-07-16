"use client";

import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Circle, Lock, AlertCircle, Sparkles, ChevronDown } from "lucide-react";
import { Course } from "../../types";

interface CourseCardProps {
    course: Course;
    isCompleted: boolean;
    isInProgress?: boolean;
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

/** Framework accent colours — light mode */
const fw: Record<string, { badge: string; dot: string }> = {
    HTU: { badge: "text-[#c249a8] border-[#c249a8]/20 bg-[#c249a8]/5", dot: "bg-[#c249a8]" },
    HNC: { badge: "text-[#0da55a] border-[#0da55a]/20 bg-[#0da55a]/5", dot: "bg-[#0da55a]" },
    HND: { badge: "text-[#43aad7] border-[#43aad7]/20 bg-[#43aad7]/5", dot: "bg-[#43aad7]" },
};

function extractRequiredCH(prereq: string): number | null {
    const m = />=\s*(\d+)/.exec(prereq);
    return m ? Number.parseInt(m[1], 10) : null;
}

function StatusIcon({ isLocked, hasPrereqWarning, isCompleted, isInProgress }: Readonly<{ isLocked: boolean; hasPrereqWarning?: boolean; isCompleted: boolean; isInProgress?: boolean }>) {
    if (isCompleted) return <CheckCircle className="w-4 h-4" style={{ color: '#0da55a' }} />;
    if (isInProgress) return <Circle className="w-4 h-4" style={{ fill: 'rgba(243,156,20,0.2)', color: '#f39c14' }} />;
    if (isLocked) return <Lock className="w-4 h-4 text-[#dde3ec]" />;
    if (hasPrereqWarning) return <AlertCircle className="w-4 h-4" style={{ color: '#f39c14', opacity: 0.7 }} />;
    return <Circle className="w-4 h-4 text-[#dde3ec]" />;
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
        <div className="mt-4 pt-4 border-t border-[#dde3ec] relative z-10 transition-colors">
            {isMobile ? (
                <button
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="w-full flex items-center justify-between text-xs text-[#5a6472] hover:text-[#222d32] transition-colors uppercase font-black tracking-[0.2em] mb-2"
                >
                    <span>Prerequisites ({prereqCodes.length + (hasCHRule ? 1 : 0) + (hasOtherText ? 1 : 0)})</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                </button>
            ) : (
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-[#5a6472] uppercase tracking-[0.2em] font-black">Prerequisites</p>
                    {hasCHRule && <span className="text-xs font-bold text-[#92604c]">{completedCredits}/{requiredCH} CH</span>}
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
                                <span className="text-[11px] text-[#5a6472] font-bold tracking-widest uppercase">Credit Req</span>
                                <span className="text-[11px] font-bold text-[#222d32]">{completedCredits}/{requiredCH} CH</span>
                            </div>
                        )}

                        {hasCHRule && requiredCH !== null && (
                            <div className="h-1 bg-[#dde3ec] rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full transition-all duration-1000 ${completedCredits >= requiredCH ? "" : ""}`}
                                    style={{ background: completedCredits >= requiredCH ? '#0da55a' : '#dc4835' }}
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
                                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${isMobile ? "w-full" : ""}
                                            ${isMissing
                                                ? "bg-[#dc4835]/8 border-[#dc4835]/25 text-[#dc4835]/80 hover:bg-[#dc4835]/15 hover:border-[#dc4835]/40"
                                                : "bg-[#0da55a]/8 border-[#0da55a]/25 text-[#0da55a]/80 hover:bg-[#0da55a]/15 hover:border-[#0da55a]/40"
                                            }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const btn = e.currentTarget;
                                            btn.classList.add('ring-2', isMissing ? 'ring-[#dc4835]/30' : 'ring-[#0da55a]/30');
                                            setTimeout(() => {
                                                btn.classList.remove('ring-2', isMissing ? 'ring-[#dc4835]/30' : 'ring-[#0da55a]/30');
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
                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-[#f39c14]/8 border-[#f39c14]/25 text-[#f39c14]/80 ${isMobile ? "w-full" : ""}`}>
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
            className="absolute top-12 right-0 z-50 bg-white border border-[#dde3ec] rounded-xl p-4 shadow-[0_8px_30px_rgba(34,45,50,0.12)]"
            style={{ minWidth: '280px', maxWidth: '340px' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" style={{ color: '#dc4835' }} />
                    <h4 className="text-sm font-bold text-[#222d32]">Course Locked</h4>
                </div>
                <button
                    onClick={onClose}
                    className="shrink-0 w-5 h-5 rounded-md bg-[#edf1f6] hover:bg-[#dde3ec] flex items-center justify-center transition-colors"
                    aria-label="Close"
                >
                    <span className="text-sm text-[#5a6472]">✕</span>
                </button>
            </div>

            {lockReason && (
                <p className="text-xs text-[#5a6472] mb-3 leading-relaxed">
                    {lockReason}
                </p>
            )}

            {missingPrereqs.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#222d32] uppercase tracking-wider">Missing Prerequisites:</p>
                    <div className="flex flex-wrap gap-2">
                        {missingPrereqs.map((code) => {
                            const name = courseMap[code];
                            return (
                                <span
                                    key={code}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg"
                                    style={{ background: 'rgba(220,72,53,0.08)', border: '1px solid rgba(220,72,53,0.25)', color: '#dc4835' }}
                                    title={name}
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {name ?? code}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-3 pt-3 border-t border-[#dde3ec]">
                <p className="text-[11px] text-[#5a6472] italic">
                    Complete the missing prerequisites to unlock this course.
                </p>
            </div>
        </motion.div>
    );
}

function CourseCard({
    course,
    isCompleted,
    isInProgress,
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

    const accent = fw[course.framework] ?? { badge: "text-[#5a6472] border-[#dde3ec] bg-[#edf1f6]", dot: "bg-[#5a6472]" };

    let cardBg = "bg-white";
    let cardBorder = "border-[#dde3ec] hover:border-[#bec7d4] hover:shadow-[0_4px_12px_rgba(34,45,50,0.08)]";
    let cardOpacity = "";
    let cardShadow = "";
    if (isCompleted) {
        cardBorder = "border-[#0da55a]/50";
        cardBg = "bg-[#0da55a]/15";
        cardShadow = "shadow-[inset_0_0_0_1px_rgba(13,165,90,0.1)]";
    } else if (isInProgress) {
        cardBorder = "border-[#f39c14]/50 hover:border-[#f39c14]/70";
        cardBg = "bg-[#f39c14]/15";
        cardShadow = "shadow-[inset_0_0_0_1px_rgba(243,156,20,0.1)]";
    } else if (isLocked) {
        cardOpacity = "opacity-40";
        cardBorder = "border-[#dde3ec]";
    } else if (hasPrereqWarning) {
        cardBorder = "border-[#f39c14]/40 hover:border-[#f39c14]/60";
        cardBg = "bg-[#f39c14]/10";
        cardShadow = "shadow-[inset_0_0_0_1px_rgba(243,156,20,0.08)]";
    }

    return (
        <motion.div
            data-testid="course-card"
            whileHover={isLocked ? {} : { y: -4, scale: 1.015, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
            whileTap={isLocked ? {} : { scale: 0.98 }}
            className={`
                relative p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 select-none overflow-hidden group/card
                ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}
                ${cardBorder} ${cardBg} ${cardOpacity} ${cardShadow}
            `}
            onClick={() => {
                if (isLocked) return;
                onToggle();
            }}
            title={lockReason}
        >
            {/* Bold top-edge accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 transition-opacity duration-500 pointer-events-none rounded-t-xl`}
                style={{ background: isCompleted ? '#0da55a' : isInProgress ? '#f39c14' : '#dc4835', opacity: (isCompleted || isInProgress) ? 1 : 0 }}
            />

            {/* Top Row */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <span className={`inline-flex items-center gap-2 text-[11px] font-black px-2.5 py-1 rounded-full border tracking-[0.15em] uppercase transition-colors ${accent.badge}`}>
                    <span className={`w-1 h-1 rounded-full animate-pulse ${accent.dot}`} />
                    {course.framework}
                </span>
                <div className="relative">
                    <button
                        data-testid="status-icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isLocked || hasPrereqWarning) {
                                setShowLockInfo(!showLockInfo);
                            } else {
                                setIsExpanded(!isExpanded);
                            }
                        }}
                        title={isLocked ? "Course Requirements" : "Course Prerequisites & Status"}
                        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#edf1f6] border border-[#dde3ec] group-hover/card:bg-[#dde3ec] transition-colors cursor-help"
                    >
                        <StatusIcon isLocked={isLocked} hasPrereqWarning={hasPrereqWarning} isCompleted={isCompleted} isInProgress={isInProgress} />
                    </button>
                    <AnimatePresence>
                        {showLockInfo && (isLocked || hasPrereqWarning) && (
                            <LockInfoPopover
                                lockReason={lockReason}
                                missingPrereqs={missingPrereqs}
                                courseMap={courseMap}
                                onClose={() => setShowLockInfo(false)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Course Name */}
            <h3 data-testid="course-name" className={`font-bold text-sm sm:text-base leading-tight mb-1.5 sm:mb-2 tracking-tight relative z-10 transition-colors text-[#222d32] group-hover/card:text-[#0d1117]`}>
                {course.name}
            </h3>

            {/* Code + Credits + Notes */}
            <div className="flex flex-wrap items-center justify-between gap-y-3 mt-3 sm:mt-5 relative z-10">
                <div className="flex flex-wrap items-center gap-3">
                    <span data-testid="course-code" className="text-xs text-[#92604c] font-mono font-bold tracking-[0.2em] mt-0.5">{course.code}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenNotes?.(); }}
                        className="flex items-center gap-1.5 py-1 px-3 rounded-lg bg-[#edf1f6] border border-[#dde3ec] hover:border-[#dc4835] hover:bg-[#dc4835]/5 transition-all group/notes min-h-8"
                        title="Course Notes"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-[#5a6472] group-hover/notes:text-[#dc4835] transition-colors" />
                        <span className="text-xs font-bold text-[#5a6472] group-hover/notes:text-[#dc4835] transition-colors">Notes</span>
                    </button>
                </div>

                <span className={`text-xs font-black tracking-widest px-3 py-1.5 rounded-lg border-2 transition-all duration-300
                    ${isCompleted
                        ? "bg-[#0da55a]/20 border-[#0da55a]/40 text-[#0da55a]"
                        : isInProgress
                        ? "bg-[#f39c14]/15 border-[#f39c14]/35 text-[#d97706]"
                        : "bg-[#edf1f6] border-[#dde3ec] text-[#5a6472] group-hover/card:border-[#bec7d4]"
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
                <div className="mt-3 pt-3 border-t border-[#dde3ec] relative z-10 transition-colors">
                    <span className="text-xs text-[#92604c] italic">No prerequisites</span>
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
        prevProps.isInProgress === nextProps.isInProgress &&
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
