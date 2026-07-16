"use client";

import { useMemo, useState, memo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Course, CourseData, CurriculumRules } from "@/types";
import {
    GraduationCap, Target, BookOpen, TrendingUp as GpaIcon,
    Sparkles, Calendar, Award, Star, Clock, CheckCircle, ArrowRight, Settings, Calculator
} from "lucide-react";
import Link from "next/link";
import { getClassification, calculateCGPA } from "@/lib/grading";
import { fetchWithRetry } from "@/lib/fetch-retry";
import { safeStorage } from "@/lib/safe-storage";
import GpaCalculatorModal from "./GpaCalculatorModal";

/* ═══════════════════════════════════════════════════════════════════
   Types & Props
   ═══════════════════════════════════════════════════════════════════ */

interface StudentDashboardProps {
    completedCourses: Map<string, string> | Set<string>;
    completedCredits: number;
    totalCredits: number;
    data: CourseData;
    allCourses: Course[];
    rules: CurriculumRules;
    previousGpaHistory?: { gpa: number | null, credits: number | null };
    setPreviousGpaHistory?: (val: { gpa: number | null, credits: number | null }) => void;
    onCategoryClick?: (category: string) => void;
}

type GpaTerm = {
    id: string;
    gpa: string;
    credits: string;
};

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
    onCategoryClick,
}: Readonly<StudentDashboardProps>) {
    const [isEditingGpa, setIsEditingGpa] = useState(false);
    const [terms, setTerms] = useState<GpaTerm[]>([
        { id: Date.now().toString() + Math.random().toString(36).substring(7), gpa: previousGpaHistory?.gpa?.toString() || "", credits: previousGpaHistory?.credits?.toString() || "" }
    ]);
    
    useEffect(() => {
        setTerms([{
            id: Date.now().toString(),
            gpa: previousGpaHistory?.gpa?.toString() || "",
            credits: previousGpaHistory?.credits?.toString() || ""
        }]);
    }, [previousGpaHistory?.gpa, previousGpaHistory?.credits]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isEditingGpa) {
                setIsEditingGpa(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditingGpa]);
    const [savingGpa, setSavingGpa] = useState(false);
    const [isGpaCalculatorOpen, setIsGpaCalculatorOpen] = useState(false);
    const gpaDialogRef = useRef<HTMLDivElement | null>(null);
    const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
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
    const trueCGPA = useMemo(() => {
        return calculateCGPA(completedCourses, allCourses, previousGpaHistory);
    }, [completedCourses, allCourses, previousGpaHistory]);

    const classification = getClassification(trueCGPA);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Overriding the previous save handler to sum terms:
    const handleSavePreviousGpa = async () => {
        setErrorMsg(null);
        let hasInvalid = false;
        terms.forEach(t => {
            const g = Number.parseFloat(t.gpa);
            const c = Number.parseFloat(t.credits);
            if (t.gpa !== "" && (Number.isNaN(g) || g < 0 || g > 4)) hasInvalid = true;
            if (t.credits !== "" && (Number.isNaN(c) || c < 0)) hasInvalid = true;
        });

        if (hasInvalid) {
            setErrorMsg("Please enter valid GPA (0.0 - 4.0) and Credits (zero or greater).");
            return;
        }

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
            const res = await fetchWithRetry('/api/student/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    previous_gpa: finalGpa,
                    previous_credits: finalCr
                }),
                retries: 2
            });
            if (res.ok) {
                if (setPreviousGpaHistory) {
                    setPreviousGpaHistory({ gpa: finalGpa, credits: finalCr });
                }
                setIsEditingGpa(false);
            } else {
                const data = await res.json().catch(() => ({} as { error?: string }));
                setErrorMsg(data.error || 'Failed to save previous academic history.');
            }
        } catch (error) {
            console.error("Failed to save previous GPA", error);
            setErrorMsg(error instanceof Error ? error.message : 'Failed to save previous academic history.');
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

    useEffect(() => {
        if (!isEditingGpa) return;

        previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
        gpaDialogRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsEditingGpa(false);
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const dialog = gpaDialogRef.current;
            if (!dialog) return;

            const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )).filter((element) => !element.hasAttribute("disabled"));

            if (focusableElements.length === 0) return;

            const first = focusableElements[0];
            const last = focusableElements.at(-1);
            const active = document.activeElement as HTMLElement | null;

            if (event.shiftKey && active === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            previouslyFocusedElementRef.current?.focus();
        };
    }, [isEditingGpa]);

    // ── Auto-Prompt for True CGPA ─────────────────────────────────────────
    useEffect(() => {
        // Wait until previousGpaHistory is explicitly provided and is null
        if (previousGpaHistory && previousGpaHistory.gpa === null) {
            // Only prompt if they haven't been prompted yet in this browser
            const hasPrompted = safeStorage.get("mubxai-gpa-prompted");
            if (!hasPrompted) {
                // Ensure they have completed at least one course so it makes sense to ask
                if (completedCourses.size > 0) {
                    setIsEditingGpa(true);
                    safeStorage.set("mubxai-gpa-prompted", "true");
                }
            }
        }
    }, [previousGpaHistory, completedCourses.size]);

    // ── Category CH breakdown for "What's Next" ──────────────────────
    const categories = useMemo(() => {
        const calculateTotalCH = (courses: Course[], cap?: number) => {
            if (cap !== undefined) {
                // For electives, the total CH is the cap * average CH (usually 3)
                // But let's be more precise: use the CH of the first course in the list if available
                const defaultCH = courses.length > 0 ? courses[0].ch : 3;
                return cap * defaultCH;
            }
            return courses.reduce((s, c) => s + c.ch, 0);
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

        const degreeTypeValues = Object.values(rules.degree_types);
        const defaultRuleSet = rules.degree_types.computing_bsc ?? degreeTypeValues[0];
        if (!defaultRuleSet) {
            throw new Error("No degree rules configured");
        }
        const actualRuleSet = degreeTypeValues.find((rs) => rs.total_credits === totalCredits) ?? defaultRuleSet;

        const maxUniElec = actualRuleSet.max_uni_electives;
        const maxDeptElec = actualRuleSet.max_dept_electives;

        const pearsonCourses = [
            ...data.university_requirements,
            ...(data.university_electives ?? []),
            ...data.college_requirements,
            ...data.department_requirements,
            ...(data.work_market_requirements ?? []),
            ...data.electives
        ].filter((c, index, self) => 
            (c.framework === 'HNC' || c.framework === 'HND' || c.name.toLowerCase().includes('hnc') || c.name.toLowerCase().includes('hnd')) &&
            self.findIndex(x => x.code === c.code) === index
        );

        const catData = [
            { label: "University Requirements", courses: data.university_requirements, color: "#a78bfa", icon: <GraduationCap className="w-3.5 h-3.5" /> },
            { label: "University Elective", courses: data.university_electives ?? [], color: "#34d399", icon: <Sparkles className="w-3.5 h-3.5" />, cap: maxUniElec },
            { label: "College Requirements", courses: data.college_requirements, color: "#60a5fa", icon: <BookOpen className="w-3.5 h-3.5" /> },
            { label: "Department Requirements", courses: [...data.department_requirements, ...(data.work_market_requirements ?? [])], color: "#f59e0b", icon: <Target className="w-3.5 h-3.5" /> },
            { label: "Department Elective", courses: data.electives, color: "#f472b6", icon: <Sparkles className="w-3.5 h-3.5" />, cap: maxDeptElec },
            { label: "Pearson Progress", courses: pearsonCourses, color: "#ef4444", icon: <Award className="w-3.5 h-3.5" />, isCourseCount: true },
        ];

        return catData
            .filter(cat => cat.courses.length > 0 || (cat.cap && cat.cap > 0))
            .map(cat => {
                const totalCH = calculateTotalCH(cat.courses, cat.cap);
                const doneCH = countDoneCH(cat.courses, cat.cap);
                const isElectiveCategory = cat.label.includes("Elective");
                const totalCount = cat.cap ?? cat.courses.length;
                const doneCount = cat.courses.reduce((count, course) => {
                    if (!completedCourses.has(course.code)) {
                        return count;
                    }

                    if (cat.cap !== undefined && count >= cat.cap) {
                        return count;
                    }

                    return count + 1;
                }, 0);

                return {
                    label: cat.label,
                    totalCH,
                    doneCH: Math.min(doneCH, totalCH),
                    remaining: Math.max(0, totalCH - doneCH),
                    displayDone: ("isCourseCount" in cat && cat.isCourseCount) ? Math.min(doneCount, totalCount) : (isElectiveCategory ? Math.min(doneCount, totalCount) : Math.min(doneCH, totalCH)),
                    displayTotal: ("isCourseCount" in cat && cat.isCourseCount) ? totalCount : (isElectiveCategory ? totalCount : totalCH),
                    color: cat.color,
                    icon: cat.icon,
                    isCourseCount: "isCourseCount" in cat ? cat.isCourseCount : false
                };
            });
    }, [data, completedCourses, totalCredits, rules]);

    const totalRemaining = Math.max(0, totalCredits - completedCredits);
    const overallTotalCH = totalCredits;
    const overallDoneCH = completedCredits;
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
                <div id="wt-student-status" className="flex-1 bg-white border border-[#dde3ec] p-6 rounded-xl relative overflow-hidden group" style={{ boxShadow: '0 2px 8px rgba(34,45,50,0.07)' }}>
                    <div className="relative flex items-center gap-6">
                        <div className="w-16 h-16 rounded-lg bg-[#edf1f6] border border-[#dde3ec] flex items-center justify-center shrink-0">
                            <GraduationCap className="w-8 h-8" style={{ color: '#c249a8' }} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-black text-[#222d32] tracking-tight leading-none uppercase">{studentTitle}</h2>
                                <div className="px-2 py-0.5 rounded" style={{ background: '#edf1f6', border: '1px solid #dde3ec' }}>
                                    <Sparkles className="w-3 h-3" style={{ color: '#c249a8' }} />
                                </div>
                            </div>
                            <p className="text-xs text-[#5a6472] font-medium">
                                Academic status based on degree completion progress.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 md:w-64 shrink-0">
                    <div className="flex-1 py-5 px-7 bg-white border border-[#dde3ec] rounded-xl flex flex-col justify-center relative overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(34,45,50,0.07)' }}>
                        <span className="text-xs text-[#5a6472] font-black uppercase tracking-[0.3em] mb-2 flex items-center gap-2"><Calendar className="w-3 h-3" /> Graduation</span>
                        <div className="flex items-baseline gap-2 relative z-10">
                            <span className="text-xl font-black text-[#222d32] tracking-tighter">{graduationEstimate}</span>
                        </div>
                    </div>
                    <Link id="wt-planner-btn" href="/planner" className="group flex items-center justify-between py-3 px-6 rounded-lg hover:bg-[#fe1f11] text-white transition-all active:scale-[0.98]" style={{ background: '#dc4835' }}>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm font-bold tracking-wide">Semester Planner</span>
                        </div>
                        <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <ArrowRight className="w-3 h-3 text-white" />
                        </div>
                    </Link>
                    <button onClick={() => setIsGpaCalculatorOpen(true)} className="group flex items-center justify-between py-3 px-6 rounded-lg bg-white border border-[#dde3ec] hover:border-[#dc4835] text-[#222d32] transition-all active:scale-[0.98]">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4" style={{ color: '#dc4835' }} />
                            <span className="text-sm font-bold tracking-wide">GPA Calculator</span>
                        </div>
                    </button>
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
                            if (classification.colorKey === 'emerald') return '#0da55a';
                            if (classification.colorKey === 'violet') return '#dc4835';
                            if (classification.colorKey === 'amber') return '#f39c14';
                            return '#43aad7';
                        })()}
                        delay={0.15}
                        isRating
                        ratingLabel={classification.short}
                        motivation={classification.motivation}
                    />
                    <button
                        onClick={() => setIsEditingGpa(true)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#edf1f6] hover:bg-[#dde3ec] opacity-0 group-hover/gpa:opacity-100 transition-all text-[#5a6472] hover:text-[#222d32]"
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
                className="rounded-xl p-6 sm:p-8 bg-white border border-[#dde3ec] group/next" style={{ boxShadow: '0 2px 8px rgba(34,45,50,0.07)' }}
            >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 justify-between w-full relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#edf1f6] flex items-center justify-center border border-[#dde3ec] shrink-0 group-hover/next:scale-110 transition-transform">
                            <Target className="w-5 h-5" style={{ color: '#dc4835' }} />
                        </div>
                        <div>
                            <h3 className="htu-label">Critical Roadmap</h3>
                            <p className="text-xs text-[#5a6472] font-bold">{totalRemaining} Credit Hours to go</p>
                        </div>
                    </div>
                    <div className="w-full sm:flex-1 sm:max-w-xs flex flex-col gap-1.5 transition-opacity mt-4 sm:mt-0">
                        <div className="flex justify-between items-center text-xs font-bold tracking-widest uppercase">
                            <span className="text-[#5a6472]">Overall</span>
                            <span style={{ color: '#dc4835' }}>{overallRoadmapPct}%</span>
                        </div>
                        <div className="h-2.5 bg-[#dde3ec] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${overallRoadmapPct}%` }}
                                transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                style={{ background: '#dc4835' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((cat, i) => {
                        const pct = cat.displayTotal > 0 ? Math.round((cat.displayDone / cat.displayTotal) * 100) : 0;
                        const isDone = cat.isCourseCount ? (cat.displayDone === cat.displayTotal && cat.displayTotal > 0) : (cat.remaining === 0 && cat.totalCH > 0);
                        return (
                            <motion.button
                                key={cat.label}
                                onClick={() => onCategoryClick?.(cat.label)}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.08 }}
                                className={`text-left w-full group/cat rounded-xl border-2 p-4 transition-all duration-300 ${
                                    isDone
                                        ? "border-[#0da55a]/50 bg-[#0da55a]/10 hover:bg-[#0da55a]/15 hover:scale-[1.01]"
                                        : "border-[#dde3ec] bg-white hover:border-[#bec7d4] hover:scale-[1.01] hover:shadow-[0_4px_12px_rgba(34,45,50,0.08)]"
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                                        isDone ? "bg-[#0da55a]/20 text-[#0da55a]" : ""
                                    }`} style={isDone ? {} : { background: `${cat.color}15`, color: cat.color }}>
                                        {isDone ? <CheckCircle className="w-4 h-4" /> : cat.icon}
                                    </div>
                                    <span className={`text-[11px] font-bold flex-1 truncate uppercase tracking-widest ${isDone ? "text-[#0da55a]" : "text-[#5a6472]"}`}>{cat.label}</span>
                                    {isDone && (
                                        <span className="px-2 py-0.5 rounded-full bg-[#0da55a]/20 text-[#0da55a] text-[10px] font-black uppercase tracking-widest border border-[#0da55a]/30">
                                            Done
                                        </span>
                                    )}
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-sm font-black ${isDone ? "text-[#0da55a]" : "text-[#222d32]"}`}>{cat.displayDone}</span>
                                        <span className={`text-xs font-bold ${isDone ? "text-[#0da55a]/60" : "text-[#92604c]"}`}>/ {cat.displayTotal}</span>
                                    </div>
                                </div>
                                <div className={`h-2.5 rounded-full overflow-hidden ${isDone ? "bg-[#0da55a]/15" : "bg-[#dde3ec]"}`}>
                                    <motion.div
                                        className="h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                        style={{ background: isDone ? '#0da55a' : cat.color }}
                                    />
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </motion.div>

            {/* GPA Edit Modal Overlay */}
            {isEditingGpa && (
                <div className="fixed inset-0 z-50">
                    <button
                        type="button"
                        className="absolute inset-0 z-40 bg-[#222d32]/40 backdrop-blur-sm"
                        onClick={() => setIsEditingGpa(false)}
                        aria-label="Close previous academic history modal"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-50 flex h-full items-center justify-center p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="previous-academic-history-title"
                        tabIndex={-1}
                        ref={gpaDialogRef}
                    >
                        <div className="bg-white border border-[#dde3ec] p-6 rounded-xl w-full max-w-sm shadow-[0_8px_30px_rgba(34,45,50,0.15)] relative">
                        <button 
                            onClick={() => setIsEditingGpa(false)} 
                            className="absolute top-4 right-4 text-[#5a6472] hover:text-[#222d32] transition-colors p-1"
                            title="Close"
                            aria-label="Close previous academic history modal"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <h3 id="previous-academic-history-title" className="text-lg font-bold text-[#222d32] mb-2 pr-6">Previous Academic History</h3>
                        <p className="text-xs text-[#5a6472] mb-6">Enter your cumulative GPA and earned credits prior to what you have logged in the tracker. We will combine them for a true CGPA.</p>
                        
                        {errorMsg && (
                            <div className="mb-4 p-3 rounded-lg text-xs text-center" style={{ background: 'rgba(220,72,53,0.08)', border: '1px solid rgba(220,72,53,0.2)', color: '#dc4835' }}>
                                {errorMsg}
                            </div>
                        )}

                        <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-1">
                            {terms.map((term, i) => (
                                <div key={term.id} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label htmlFor={`gpa-${i}`} className="block text-xs font-bold uppercase tracking-widest text-[#5a6472] mb-1.5">{i === 0 ? "Cumulative GPA" : `Term ${i + 1} GPA`}</label>
                                        <input
                                            id={`gpa-${i}`}
                                            type="number" step="0.01" min="0" max="4.0"
                                            value={term.gpa} onChange={e => {
                                                const newTerms = [...terms];
                                                newTerms[i].gpa = e.target.value;
                                                setTerms(newTerms);
                                            }}
                                            className={`w-full bg-white border ${term.gpa && parseFloat(term.gpa) > 4.0 ? 'border-[#dc4835]' : 'border-[#dde3ec]'} rounded-lg px-4 py-3 text-[#222d32] text-sm focus:outline-hidden transition-colors`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor={`credits-${i}`} className="block text-xs font-bold uppercase tracking-widest text-[#5a6472] mb-1.5">{i === 0 ? "Earned Credits" : `Term ${i + 1} Credits`}</label>
                                        <input
                                            id={`credits-${i}`}
                                            type="number" step="1" min="0"
                                            value={term.credits} onChange={e => {
                                                const newTerms = [...terms];
                                                newTerms[i].credits = e.target.value;
                                                setTerms(newTerms);
                                            }}
                                            className="w-full bg-white border border-[#dde3ec] rounded-lg px-4 py-3 text-[#222d32] text-sm focus:outline-hidden transition-colors"
                                            placeholder="0"
                                        />
                                    </div>
                                    {terms.length > 1 && (
                                        <button onClick={() => setTerms(terms.filter((_, idx) => idx !== i))} className="mt-5 p-2 bg-[#edf1f6] hover:bg-[#dde3ec] rounded-lg text-[#5a6472] hover:text-[#dc4835] transition-colors">
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button onClick={() => setTerms([...terms, { id: Date.now().toString() + Math.random().toString(36).substring(7), gpa: "", credits: "" }])} className="w-full py-2 bg-[#edf1f6] hover:bg-[#dde3ec] rounded-lg text-[11px] font-bold uppercase tracking-widest text-[#5a6472] transition-colors mt-2">
                                + Add Term
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsEditingGpa(false)}
                                className="flex-1 py-3 text-sm font-bold text-[#5a6472] hover:text-[#222d32] transition-colors"
                                aria-label="Cancel previous academic history"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePreviousGpa}
                                disabled={savingGpa}
                                className="flex-1 py-3 rounded-lg text-white text-sm font-bold transition-all disabled:opacity-50"
                                style={{ background: '#dc4835' }}
                            >
                                {savingGpa ? "Saving..." : "Save History"}
                            </button>
                        </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* GPA Calculator Modal */}
            <GpaCalculatorModal
                isOpen={isGpaCalculatorOpen}
                onClose={() => setIsGpaCalculatorOpen(false)}
                initialPreviousGpa={trueCGPA > 0 ? trueCGPA : null}
                initialPreviousCredits={completedCredits}
            />
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
            className="relative rounded-xl p-4 overflow-hidden group cursor-default hover:scale-[1.02] transition-transform duration-200 bg-white border border-[#dde3ec]"
            style={{ boxShadow: '0 2px 8px rgba(34,45,50,0.07)' }}
        >
            <div className="relative">
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ background: `${color}15`, border: `1px solid ${color}20`, color }}>
                        {icon}
                    </div>
                    <span className="text-xs text-[#5a6472] uppercase font-bold tracking-widest">{label}</span>
                </div>
                <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className={`font-bold text-[#222d32] ${isText ? "text-[12px] sm:text-sm" : "text-xl"} tabular-nums tracking-tight truncate`}>
                        {value}
                    </span>
                    {sub && <span className="text-xs text-[#92604c] font-medium truncate">{sub}</span>}
                </div>

                {isRating && ratingLabel && (
                    <div className="mt-1 flex flex-col">
                        <span className="text-xs font-black uppercase tracking-tighter" style={{ color }}>
                            {ratingLabel}
                        </span>
                        {motivation && (
                            <span className="text-xs font-medium text-[#92604c] italic leading-tight mt-0.5">
                                &ldquo;{motivation}&rdquo;
                            </span>
                        )}
                    </div>
                )}

                {progress !== undefined && (
                    <div className="mt-2.5 h-1 bg-[#dde3ec] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(progress * 100)}%` }}
                            transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
                            style={{ background: color }}
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
}
