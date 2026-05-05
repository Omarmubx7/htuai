"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, X, HelpCircle } from "lucide-react";

import { safeStorage } from "@/lib/safe-storage";

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

export interface WalkthroughStep {
    targetId: string;
    title: string;
    description: string;
    icon?: React.ReactNode;
    /** Position of the tooltip relative to the target */
    position?: "top" | "bottom" | "left" | "right" | "auto";
    /** Only show on mobile */
    mobileOnly?: boolean;
}

interface WalkthroughOverlayProps {
    steps: WalkthroughStep[];
    isOpen: boolean;
    onClose: () => void;
}

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "mubxai-walkthrough-done";
const PADDING = 10;
const TOOLTIP_GAP = 16;

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function WalkthroughOverlay({ steps, isOpen, onClose }: Readonly<WalkthroughOverlayProps>) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipPos, setTooltipPos] = useState<"top" | "bottom">("bottom");
    const tooltipRef = useRef<HTMLDivElement>(null);

    const activeSteps = steps.filter((s) => {
        if (s.mobileOnly && typeof globalThis.window !== "undefined" && globalThis.innerWidth >= 640) return false;
        return true;
    });

    const step = activeSteps[currentStep];

    // ── Measure target element ─────────────────────────────────────────
    const measureTarget = useCallback(() => {
        if (!step) return;
        const el = document.getElementById(step.targetId);
        if (!el) {
            setTargetRect(null);
            return;
        }
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Wait for scroll to settle
        setTimeout(() => {
            const rect = el.getBoundingClientRect();
            setTargetRect(rect);

            // Decide tooltip position
            const spaceBelow = globalThis.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            let resolvedPos: "top" | "bottom" = "bottom";
            if (step.position && step.position !== "auto") {
                resolvedPos = (step.position === "top" || step.position === "bottom") ? step.position : "bottom";
            } else if (spaceBelow <= 220 && spaceAbove > 220) {
                resolvedPos = "top";
            }
            setTooltipPos(resolvedPos);
        }, 350);
    }, [step]);

    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            measureTarget();
        }, 100);

        const handleResize = () => measureTarget();
        globalThis.addEventListener("resize", handleResize);
        return () => {
            clearTimeout(timer);
            globalThis.removeEventListener("resize", handleResize);
        };
    }, [isOpen, measureTarget]);

    // ── Navigation handlers ──────────────────────────────────────────
    const handleSkip = useCallback(() => {
        setCurrentStep(0);
        safeStorage.set(STORAGE_KEY, "true");
        onClose();
    }, [onClose]);

    const handleNext = useCallback(() => {
        setCurrentStep((s) => {
            if (s < activeSteps.length - 1) {
                return s + 1;
            } else {
                // Final step - save and close
                safeStorage.set(STORAGE_KEY, "true");
                onClose();
                return s;
            }
        });
    }, [activeSteps.length, onClose]);

    const handlePrev = useCallback(() => {
        setCurrentStep((s) => Math.max(0, s - 1));
    }, []);

    // ── Keyboard navigation ──────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "Escape") handleSkip();
        };
        globalThis.addEventListener("keydown", handler);
        return () => globalThis.removeEventListener("keydown", handler);
    }, [isOpen, handleNext, handlePrev, handleSkip]);

    if (!isOpen || !step) return null;

    // ── Spotlight clip path ──────────────────────────────────────────
    const spotlight = targetRect
        ? {
            left: targetRect.left - PADDING,
            top: targetRect.top - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
        }
        : null;

    // ── Tooltip position ─────────────────────────────────────────────
    const getTooltipStyle = (): React.CSSProperties => {
        if (!targetRect) {
            return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
        }

        const maxWidth = Math.min(380, globalThis.innerWidth - 32);

        if (tooltipPos === "top") {
            return {
                bottom: globalThis.innerHeight - targetRect.top + TOOLTIP_GAP + PADDING,
                left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - maxWidth / 2, globalThis.innerWidth - maxWidth - 16)),
                maxWidth,
            };
        }

        // bottom
        return {
            top: targetRect.bottom + TOOLTIP_GAP + PADDING,
            left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - maxWidth / 2, globalThis.innerWidth - maxWidth - 16)),
            maxWidth,
        };
    };

    return (
        <AnimatePresence>
            <motion.div
                key="walkthrough-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200]"
                style={{ pointerEvents: "auto" }}
            >
                {/* Dark backdrop with spotlight cutout */}
                <div
                    role="button"
                    tabIndex={0}
                    className="absolute inset-0"
                    onClick={handleNext}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleNext(); }}
                    style={{
                        background: spotlight
                            ? undefined
                            : "rgba(0,0,0,0.85)",
                    }}
                >
                    {spotlight && (
                        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
                            <defs>
                                <mask id="wt-mask">
                                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                    <rect
                                        x={spotlight.left}
                                        y={spotlight.top}
                                        width={spotlight.width}
                                        height={spotlight.height}
                                        rx="16"
                                        fill="black"
                                    />
                                </mask>
                            </defs>
                            <rect
                                x="0" y="0"
                                width="100%" height="100%"
                                fill="rgba(0,0,0,0.82)"
                                mask="url(#wt-mask)"
                                style={{ pointerEvents: "auto" }}
                            />
                        </svg>
                    )}

                    {/* Spotlight glow ring */}
                    {spotlight && (
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute rounded-2xl pointer-events-none"
                            style={{
                                left: spotlight.left - 2,
                                top: spotlight.top - 2,
                                width: spotlight.width + 4,
                                height: spotlight.height + 4,
                                border: "2px solid rgba(139, 92, 246, 0.5)",
                                boxShadow: "0 0 30px rgba(139, 92, 246, 0.25), inset 0 0 30px rgba(139, 92, 246, 0.1)",
                            }}
                        />
                    )}
                </div>

                {/* Tooltip */}
                <motion.div
                    role="dialog"
                    aria-labelledby="walkthrough-title"
                    aria-describedby="walkthrough-description"
                    ref={tooltipRef}
                    key={currentStep}
                    initial={{ opacity: 0, y: tooltipPos === "top" ? 10 : -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed z-[201]"
                    style={getTooltipStyle()}
                >
                    <div className="bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_0_60px_rgba(139,92,246,0.15)] w-full">
                        {/* Step counter */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {activeSteps.map((s, i) => {
                                    let dotClass = "w-2 bg-white/10";
                                    if (i === currentStep) dotClass = "w-6 bg-violet-500";
                                    else if (i < currentStep) dotClass = "w-2 bg-violet-500/40";
                                    return (
                                        <div
                                            key={s.targetId}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${dotClass}`}
                                        />
                                    );
                                })}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all"
                                title="Close walkthrough"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="mb-6">
                            <h3 id="walkthrough-title" className="text-lg font-black text-white tracking-tight mb-2">
                                {step.title}
                            </h3>
                            <p id="walkthrough-description" className="text-sm text-white/50 leading-relaxed font-medium">
                                {step.description}
                            </p>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {currentStep > 0 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                        className="flex items-center gap-1.5 px-5 py-3 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/60 hover:text-white text-sm sm:text-xs font-bold transition-all"
                                    >
                                        <ArrowLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                        Back
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                                    className="px-5 py-3 sm:px-4 sm:py-2.5 rounded-xl text-white/30 hover:text-white/60 active:text-white/80 text-sm sm:text-xs font-bold transition-all"
                                >
                                    Skip Tour
                                </button>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                className="flex items-center gap-2 px-7 py-3 sm:px-6 sm:py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-400 text-white text-sm sm:text-xs font-bold transition-all shadow-lg shadow-violet-500/25 active:scale-95"
                            >
                                {currentStep === activeSteps.length - 1 ? "Finish" : "Next"}
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <p className="text-[10px] text-white/20 font-medium mt-3 text-center">
                            Step {currentStep + 1} of {activeSteps.length} · Press → to advance
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Help Button (to re-trigger walkthrough)
   ═══════════════════════════════════════════════════════════════════ */

export function WalkthroughHelpButton({ onClick }: Readonly<{ onClick: () => void }>) {
    return (
        <button
            onClick={onClick}
            className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-violet-400 hover:bg-violet-400/5 transition-all"
            title="App Walkthrough"
        >
            <HelpCircle className="w-4.5 h-4.5" />
        </button>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Hook: useWalkthrough
   ═══════════════════════════════════════════════════════════════════ */

export function useWalkthrough() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobileDevice, setIsMobileDevice] = useState(false);

    useEffect(() => {
        // Detect mobile device
        const checkMobile = () => setIsMobileDevice(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        // Auto-show ONLY for first-time users after a short delay
        const done = safeStorage.get(STORAGE_KEY);
        if (!done) {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1500);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', checkMobile);
            };
        }
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => {
        setIsOpen(false);
        safeStorage.set(STORAGE_KEY, "true");
    }, []);

    return { isOpen, open, close, isMobileDevice };
}

/* ═══════════════════════════════════════════════════════════════════
   Default Steps for Course Tracker - DESKTOP VERSION
   ═══════════════════════════════════════════════════════════════════ */

export const TRACKER_WALKTHROUGH_STEPS_DESKTOP: WalkthroughStep[] = [
    {
        targetId: "wt-header-brand",
        title: "Welcome to MUBXAI 👋",
        description: "Your personal academic tracking companion. This walkthrough will guide you through every feature. Let's go!",
        position: "bottom",
    },
    {
        targetId: "wt-profile",
        title: "Your Profile",
        description: "Your student ID and current major are displayed here. Click the major button to switch to a different degree program.",
        position: "bottom",
    },
    {
        targetId: "wt-progress-card",
        title: "Degree Progress",
        description: "Track your completed credit hours against the total required for graduation. This updates in real-time as you mark courses complete.",
        position: "bottom",
    },
    {
        targetId: "wt-student-status",
        title: "Academic Status",
        description: "Your academic rank — from 'Academic Aspirant' to 'Legendary Scholar' — based on your degree completion percentage.",
        position: "bottom",
    },
    {
        targetId: "wt-planner-btn",
        title: "Semester Planner",
        description: "Jump to the Semester Planner to organize upcoming semesters, predict your CGPA, and log study sessions to earn XP!",
        position: "top",
    },
    {
        targetId: "wt-stat-cards",
        title: "Quick Stats",
        description: "A dashboard of key metrics: Credits Done, True CGPA, Progress %, Remaining CH, Courses Completed, and your Status tier.",
        position: "bottom",
    },
    {
        targetId: "wt-cgpa-card",
        title: "CGPA & Academic History",
        description: "Your true cumulative GPA. Hover and click the ⚙ gear icon to enter your GPA from previous semesters (before using the tracker) for an accurate CGPA.",
        position: "bottom",
    },
    {
        targetId: "wt-roadmap",
        title: "Critical Roadmap",
        description: "See exactly how many credit hours remain in each category — University, College, Department, and Electives. Track what's left to graduate!",
        position: "top",
    },
    {
        targetId: "wt-view-toggle",
        title: "Switch Views",
        description: "Toggle between 'Roadmap' (courses by year level) and 'Categories' (by requirement type) to browse your curriculum differently.",
        position: "top",
    },
    {
        targetId: "wt-first-course",
        title: "Course Cards",
        description: "Tap a course card to mark it as complete. You can set your grade and add personal notes. Locked courses need prerequisites first!",
        position: "top",
    },
    {
        targetId: "wt-reset-btn",
        title: "Reset Progress",
        description: "Need a fresh start? This button clears all your completed courses and grades. Don't worry — it asks for confirmation first!",
        position: "bottom",
    },
];

/* ═══════════════════════════════════════════════════════════════════
   Default Steps for Course Tracker - MOBILE VERSION (Optimized)
   ═══════════════════════════════════════════════════════════════════ */

export const TRACKER_WALKTHROUGH_STEPS_MOBILE: WalkthroughStep[] = [
    {
        targetId: "wt-header-brand",
        title: "Welcome 👋",
        description: "Your academic tracker. Let's learn the essentials in 5 quick steps!",
        position: "bottom",
    },
    {
        targetId: "wt-progress-card",
        title: "Track Progress",
        description: "Monitor your completed credits vs. total required. See your degree completion in real-time.",
        position: "bottom",
    },
    {
        targetId: "wt-first-course",
        title: "Mark Courses",
        description: "Tap any course card to mark complete, set your grade, or add notes. Easy!",
        position: "bottom",
    },
    {
        targetId: "wt-view-toggle",
        title: "Switch Views",
        description: "View courses by year or by category — whatever works best for you.",
        position: "top",
    },
    {
        targetId: "wt-planner-btn",
        title: "Semester Planner",
        description: "Plan semesters, predict GPA, and earn XP for study sessions. Tap to explore!",
        position: "top",
    },
];

/* ═══════════════════════════════════════════════════════════════════
   Helper to get correct walkthrough steps based on device type
   ═══════════════════════════════════════════════════════════════════ */

export function getWalkthroughSteps(isMobileDevice: boolean): WalkthroughStep[] {
    return isMobileDevice ? TRACKER_WALKTHROUGH_STEPS_MOBILE : TRACKER_WALKTHROUGH_STEPS_DESKTOP;
}

/** Backwards compatibility export */
export const TRACKER_WALKTHROUGH_STEPS: WalkthroughStep[] = TRACKER_WALKTHROUGH_STEPS_DESKTOP;
