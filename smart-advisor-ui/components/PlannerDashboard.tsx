"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen, Clock, Trophy, Plus,
    Trash2, GraduationCap, CheckCircle2,
    AlertTriangle, Lightbulb, Info,
    BarChart3, Calendar, Settings, Settings2, ExternalLink, Loader2, Globe, Sparkles, Search, HelpCircle, ChevronDown,
    ChevronRight, Download, Layout, PieChart, Star, Zap, Target
} from "lucide-react";
import { PlannerCourse, StudySession, SemesterData } from "@/types";
import {
    calculateGPA, calculateCumulativeGpaFromHistory, getClassification, GRADE_MAP,
    SCORED_GRADES, generateInsights, type Insight, type HTUGrade
} from "@/lib/grading";
import WeeklySummary from "./WeeklySummary";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useToast } from "./ui/Toast";

// ── Color mapping (Tailwind needs static class strings) ─────────────────

const COLORS: Record<string, { bg: string; border: string; text: string }> = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
    violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
    red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400" },
    gray: { bg: "bg-gray-500/10", border: "border-gray-500/20", text: "text-gray-400" },
};
const gc = (key: string) => COLORS[key] || COLORS.gray;

// ── Props ───────────────────────────────────────────────────────────────

interface PlannerDashboardProps {
    courses: PlannerCourse[];
    studySessions: StudySession[];
    allSemesters?: SemesterData[];
    onUpdateCourses: (courses: PlannerCourse[]) => void;
    onAddStudySession: (session: StudySession) => void;
    onUpdateStudySession: (session: StudySession) => void;
    onDeleteStudySession: (id: string) => void;
    currentSemesterId?: string;
    trackerCredits?: number;
    isGcalConnected?: boolean;
    isGcalLoading?: boolean;
    isAutoSyncing?: boolean;
    onManualSync?: () => void;
}

export default function PlannerDashboard({
    courses, studySessions, allSemesters = [], onUpdateCourses, onAddStudySession, onUpdateStudySession, onDeleteStudySession,
    currentSemesterId, trackerCredits = 0,
    isGcalConnected = false, isGcalLoading = false, isAutoSyncing = false, onManualSync
}: PlannerDashboardProps) {

    // ── Onboarding state ───────────────────────────────────────────────
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [confirmDeleteCourse, setConfirmDeleteCourse] = useState<PlannerCourse | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const hasSeenOnboarding = localStorage.getItem("htuai_planner_onboarding");
            if (!hasSeenOnboarding) {
                setShowOnboarding(true);
            }
        } catch (e) {
            console.warn("Storage access denied:", e);
        }
    }, []);

    const dismissOnboarding = () => {
        try {
            localStorage.setItem("htuai_planner_onboarding", "true");
        } catch { }
        setShowOnboarding(false);
    };

    // ── Study-log form state ────────────────────────────────────────────
    // For desktop/global log form
    const [logCourseId, setLogCourseId] = useState(courses[0]?.id || "");
    const [logHours, setLogHours] = useState("");
    const [logNotes, setLogNotes] = useState("");
    const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);

    // ── Computed ────────────────────────────────────────────────────────
    const gradedCourses = useMemo(
        () => courses.filter(c => c.grade && SCORED_GRADES.includes(c.grade as HTUGrade)),
        [courses]
    );

    const semesterGPA = useMemo(
        () => calculateGPA(gradedCourses.map(c => ({ credits: c.credits, grade: c.grade! }))),
        [gradedCourses]
    );

    const classification = useMemo(() => getClassification(semesterGPA), [semesterGPA]);
    const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
    const atRiskCount = courses.filter(c => c.grade === "U" || c.grade === "WF" || c.status === "At Risk").length;

    const insights = useMemo(() => generateInsights(courses, studySessions), [courses, studySessions]);

    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const weeklyHours = studySessions
        .filter(s => new Date(s.date) >= weekAgo)
        .reduce((s, sess) => s + sess.hours, 0);

    const courseHours = useMemo(() => {
        const map: Record<string, number> = {};
        studySessions.forEach(s => { map[s.courseId] = (map[s.courseId] || 0) + s.hours; });
        return map;
    }, [studySessions]);

    // ── Historical KPIs ────────────────────────────────────────────────
    const historicalStats = useMemo(() => {
        // 1. Semester GPAs
        const semesterGrades = allSemesters.map(sem => {
            const isCurrent = sem.id === currentSemesterId;
            const targetCourses = isCurrent ? courses : sem.courses;
            const graded = targetCourses.filter(c => c.grade && SCORED_GRADES.includes(c.grade as HTUGrade));
            const gpa = calculateGPA(graded.map(c => ({ credits: c.credits, grade: c.grade! })));
            return {
                name: sem.name || "Unknown Semester",
                gpa,
                courseCount: targetCourses.length,
                indicator: gpa >= 2.8 ? "Good" : gpa >= 2.4 ? "Average" : gpa > 0 ? "At Risk" : "N/A"
            };
        });

        // 2. Cumulative GPA (precisely calculated from all history)
        const totalGraded = allSemesters.flatMap(sem => {
            const isCurrent = sem.id === currentSemesterId;
            return (isCurrent ? courses : sem.courses).filter(c => c.grade && SCORED_GRADES.includes(c.grade as HTUGrade));
        });
        const cumulativeGPA = calculateCumulativeGpaFromHistory(totalGraded.map(c => ({ credits: c.credits, grade: c.grade! })));

        // 3. Baseline Credits (Tracker Completed + Current Semester Passed)
        const currentSemesterPassedCredits = courses
            .filter(c => c.status === "Completed")
            .reduce((sum, c) => sum + (c.credits || 0), 0);
        const totalEarnedCredits = trackerCredits + currentSemesterPassedCredits;

        return { semesterGrades, cumulativeGPA, totalEarnedCredits };
    }, [allSemesters, courses, currentSemesterId, trackerCredits]);

    // ── Handlers ────────────────────────────────────────────────────────
    const updateGrade = (id: string, grade: string) => {
        onUpdateCourses(courses.map(c => {
            if (c.id !== id) return c;
            const newGrade = grade || null;
            let status: PlannerCourse["status"] = c.status;
            if (newGrade === "U" || newGrade === "WF") status = "At Risk";
            else if (newGrade && SCORED_GRADES.includes(newGrade as HTUGrade) && newGrade !== "U") status = "Completed";
            else if (!newGrade) status = "In Progress";
            return { ...c, grade: newGrade, status };
        }));
    };

    const updateField = (id: string, field: keyof PlannerCourse, value: any) => {
        onUpdateCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const toggleStatus = (id: string) => {
        const order: Record<string, PlannerCourse["status"]> = {
            "In Progress": "Completed", "Completed": "At Risk", "At Risk": "In Progress"
        };
        onUpdateCourses(courses.map(c => c.id === id ? { ...c, status: order[c.status] } : c));
    };

    // ── Add Course state ────────────────────────────────────────────────
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [courseSearchQuery, setCourseSearchQuery] = useState("");
    const [allAvailableCourses, setAllAvailableCourses] = useState<{ name: string; code: string; ch: number }[]>([]);
    const [courseSuggestions, setCourseSuggestions] = useState<{ name: string; code: string; ch: number }[]>([]);
    const [courseSearchFocused, setCourseSearchFocused] = useState(false);

    // Fetch curriculum courses when the add-course panel opens
    useEffect(() => {
        if (showAddCourse && allAvailableCourses.length === 0) {
            fetch("/api/courses")
                .then(res => res.json())
                .then(data => { if (Array.isArray(data)) setAllAvailableCourses(data); })
                .catch(console.error);
        }
    }, [showAddCourse, allAvailableCourses.length]);

    // ── Mobile Navigation state ──────────────────────────────────────────
    const [mobileTab, setMobileTab] = useState<"overview" | "courses" | "log" | "roadmap">("overview");
    const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(new Set());
    const [showRoadmap, setShowRoadmap] = useState(true);
    const [showInsights, setShowInsights] = useState(true);

    useEffect(() => {
        try {
            const savedRoadmap = localStorage.getItem("htu_show_roadmap");
            if (savedRoadmap !== null) setShowRoadmap(savedRoadmap === "true");
            const savedInsights = localStorage.getItem("htu_show_insights");
            if (savedInsights !== null) setShowInsights(savedInsights === "true");
        } catch { }
    }, []);

    const toggleRoadmap = () => {
        const next = !showRoadmap;
        setShowRoadmap(next);
        try { localStorage.setItem("htu_show_roadmap", String(next)); } catch { }
    };

    const toggleInsights = () => {
        const next = !showInsights;
        setShowInsights(next);
        try { localStorage.setItem("htu_show_insights", String(next)); } catch { }
    };

    const toggleExpandCourse = (id: string) => {
        setExpandedCourseIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Filter suggestions as user types
    useEffect(() => {
        if (courseSearchQuery.length < 2) { setCourseSuggestions([]); return; }
        const q = courseSearchQuery.toLowerCase();
        const filtered = allAvailableCourses.filter(c =>
            c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
        );
        // Deduplicate by name
        const unique = new Map<string, { name: string; code: string; ch: number }>();
        filtered.forEach(c => {
            const key = c.name.toLowerCase();
            if (!unique.has(key) || c.code.length < unique.get(key)!.code.length) unique.set(key, c);
        });
        setCourseSuggestions(Array.from(unique.values()).slice(0, 8));
    }, [courseSearchQuery, allAvailableCourses]);

    const addCourseFromCurriculum = (course: { name: string; code: string; ch: number }) => {
        // Prevent duplicates
        if (courses.some(c => c.code === course.code || c.name.toLowerCase() === course.name.toLowerCase())) {
            toast("Course already added", "error");
            return;
        }
        onUpdateCourses([...courses, {
            id: Math.random().toString(36).substr(2, 9),
            name: course.name,
            code: course.code,
            credits: course.ch,
            hasMidterm: false,
            status: "In Progress",
        }]);
        toast(`${course.name} added`, "success");
        setCourseSearchQuery("");
        setCourseSuggestions([]);
        setShowAddCourse(false);
    };

    const deleteCourse = (id: string) => {
        onUpdateCourses(courses.filter(c => c.id !== id));
    };

    // ── Edit study session state ────────────────────────────────────────
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editSessionHours, setEditSessionHours] = useState("");
    const [editSessionNotes, setEditSessionNotes] = useState("");
    const [editSessionDate, setEditSessionDate] = useState("");

    const startEditSession = (s: StudySession) => {
        setEditingSessionId(s.id);
        setEditSessionHours(String(s.hours));
        setEditSessionNotes(s.notes || "");
        setEditSessionDate(s.date);
    };

    const saveEditSession = (s: StudySession) => {
        const hrs = parseFloat(editSessionHours);
        if (isNaN(hrs) || hrs <= 0) return;
        onUpdateStudySession({ ...s, hours: hrs, notes: editSessionNotes || undefined, date: editSessionDate });
        setEditingSessionId(null);
    };

    const addSession = () => {
        const hrs = parseFloat(logHours);
        if (!logCourseId || isNaN(hrs) || hrs <= 0) return;
        onAddStudySession({
            id: Math.random().toString(36).substr(2, 9),
            courseId: logCourseId,
            date: logDate,
            hours: hrs,
            notes: logNotes || undefined,
        });
        setLogHours("");
        setLogNotes("");
    };

    const recentSessions = [...studySessions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

    // ── Insight helpers ─────────────────────────────────────────────────
    const insightIcon = (type: Insight["type"]) => {
        switch (type) {
            case "warning": return <AlertTriangle className="w-4 h-4 text-red-400" />;
            case "info": return <Info className="w-4 h-4 text-blue-400" />;
            case "success": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case "tip": return <Lightbulb className="w-4 h-4 text-amber-400" />;
        }
    };
    const insightBorder = (type: Insight["type"]) => {
        switch (type) {
            case "warning": return "border-red-500/20 bg-red-500/5";
            case "info": return "border-blue-500/20 bg-blue-500/5";
            case "success": return "border-emerald-500/20 bg-emerald-500/5";
            case "tip": return "border-amber-500/20 bg-amber-500/5";
        }
    };

    const clsColor = gc(classification.colorKey);

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <div className="space-y-8">
            <GetStartedModal isOpen={showOnboarding} onClose={dismissOnboarding} />
            <ConfirmDialog
                isOpen={!!confirmDeleteCourse}
                title="Remove Course"
                description={`Remove "${confirmDeleteCourse?.name}" from your planner? This cannot be undone.`}
                confirmLabel="Remove"
                variant="danger"
                onConfirm={() => {
                    if (confirmDeleteCourse) {
                        deleteCourse(confirmDeleteCourse.id);
                        toast(`${confirmDeleteCourse.name} removed`, "success");
                    }
                }}
                onCancel={() => setConfirmDeleteCourse(null)}
            />

            {/* Header / Brand */}
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-violet-600 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Command Center</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <img src="/HTUAIlogo.svg" alt="HTUAI" className="w-8 h-8" />
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none text-gradient">
                            Semester Planner
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">Status</span>
                        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Live Sync</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-10 pb-32 sm:pb-0">
                {/* ════ Stats Overview ════ */}
                <section className={`${mobileTab === "overview" ? "block" : "hidden sm:block"} space-y-6`}>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {/* GPA */}
                        <StatCard
                            icon={<GraduationCap className="w-5 h-5 text-violet-400" />}
                            bg="bg-violet-500/10" border="border-violet-500/20"
                            value={gradedCourses.length > 0 ? semesterGPA.toFixed(2) : "—"}
                            label="GPA"
                        />
                        {/* Classification */}
                        <StatCard
                            icon={<Trophy className={`w-5 h-5 ${clsColor.text}`} />}
                            bg={clsColor.bg} border={clsColor.border}
                            value={gradedCourses.length > 0 ? classification.short : "—"}
                            label="Class"
                        />
                        {/* Unified Baseline Credits */}
                        <StatCard
                            icon={<BookOpen className="w-5 h-5 text-blue-400" />}
                            bg="bg-blue-500/10" border="border-blue-500/20"
                            value={String(historicalStats.totalEarnedCredits)}
                            label="Total Passed"
                        />
                        {/* At Risk */}
                        <StatCard
                            icon={<AlertTriangle className={`w-5 h-5 ${atRiskCount > 0 ? "text-red-400" : "text-emerald-400"}`} />}
                            bg={atRiskCount > 0 ? "bg-red-500/10" : "bg-emerald-500/10"}
                            border={atRiskCount > 0 ? "border-red-500/20" : "border-emerald-500/20"}
                            value={String(atRiskCount)}
                            label="At Risk"
                        />
                        {/* Weekly Hours */}
                        <StatCard
                            icon={<Clock className="w-5 h-5 text-amber-400" />}
                            bg="bg-amber-500/10" border="border-amber-500/20"
                            value={weeklyHours > 0 ? weeklyHours.toFixed(1) : "0"}
                            label="Hrs/Week"
                        />
                    </div>
                </section>

                {/* Graduation Roadmap Hidden per request */}

                {/* ════ Course Table ════ */}
                <section className={`${(mobileTab === "courses" || mobileTab === "overview") ? "block" : "hidden sm:block"} space-y-4`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5" /> Semester Courses
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">{courses.length} courses tracked</span>
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    try { localStorage.removeItem("htuai_planner_onboarding"); } catch { }
                                    setShowOnboarding(true);
                                }}
                                className="p-1.5 rounded-xl text-white/20 hover:text-violet-400 hover:bg-violet-400/5 transition-all"
                                title="Show help"
                            >
                                <HelpCircle className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowAddCourse(!showAddCourse)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                                <Plus className="w-3 h-3" /> Add Course
                            </motion.button>
                        </div>
                    </div>

                    {/* Add Course Search */}
                    <AnimatePresence>
                        {showAddCourse && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-visible"
                            >
                                <div className="glass-card-premium p-4 rounded-2xl border border-violet-500/20 relative z-30">
                                    <div className="relative">
                                        <div className="flex items-center gap-2">
                                            <Search className="w-4 h-4 text-white/30 shrink-0" />
                                            <input
                                                autoFocus
                                                value={courseSearchQuery}
                                                onChange={e => setCourseSearchQuery(e.target.value)}
                                                onFocus={() => setCourseSearchFocused(true)}
                                                onBlur={() => setTimeout(() => setCourseSearchFocused(false), 200)}
                                                placeholder="Search courses by name or code..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/40 outline-none focus:border-violet-500/40"
                                            />
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => { setShowAddCourse(false); setCourseSearchQuery(""); setCourseSuggestions([]); }}
                                                className="px-3 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white text-xs font-bold transition-colors"
                                            >
                                                Cancel
                                            </motion.button>
                                        </div>

                                        {/* Suggestions dropdown */}
                                        <AnimatePresence>
                                            {courseSearchFocused && courseSuggestions.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -6 }}
                                                    className="absolute top-full left-0 right-0 mt-2 z-100 bg-[#0A0A0A] rounded-2xl border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl max-h-80 overflow-y-auto"
                                                >
                                                    <div className="p-2 space-y-1">
                                                        {courseSuggestions.map((course, idx) => {
                                                            const alreadyAdded = courses.some(c => c.code === course.code || c.name.toLowerCase() === course.name.toLowerCase());
                                                            return (
                                                                <motion.button
                                                                    whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.05)" }}
                                                                    whileTap={{ scale: 0.99 }}
                                                                    key={`${course.code}-${idx}`}
                                                                    onClick={() => !alreadyAdded && addCourseFromCurriculum(course)}
                                                                    disabled={alreadyAdded}
                                                                    className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between gap-3 group/item ${alreadyAdded ? "opacity-40 cursor-not-allowed" : ""}`}
                                                                >
                                                                    <div className="flex flex-col items-start gap-1 min-w-0">
                                                                        <span className="text-sm font-semibold text-white group-hover/item:text-violet-400 transition-colors truncate">
                                                                            {course.name}
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                                                                                {course.code}
                                                                            </span>
                                                                            <div className="h-px w-4 bg-white/5" />
                                                                            <span className="text-[9px] text-violet-500/60 font-bold uppercase tracking-tighter">
                                                                                {course.ch} Credits
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {alreadyAdded ? (
                                                                        <span className="text-[9px] text-emerald-400/60 font-bold uppercase tracking-wider shrink-0">Added</span>
                                                                    ) : (
                                                                        <Plus className="w-4 h-4 text-white/10 group-hover/item:text-violet-400 transition-colors shrink-0" />
                                                                    )}
                                                                </motion.button>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {courseSearchQuery.length >= 2 && courseSuggestions.length === 0 && courseSearchFocused && (
                                            <div className="mt-2 text-center py-3 text-[10px] text-white/20 font-bold uppercase tracking-wider">
                                                No courses found for &ldquo;{courseSearchQuery}&rdquo;
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="glass-card-premium rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl bg-black/20">
                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-275">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/2">
                                        <Th className="pl-8">Course Details</Th>
                                        <Th className="w-20 text-center">Credits</Th>
                                        <Th className="w-44 text-center">Grade / Score</Th>
                                        <Th className="w-40 text-center">Midterm</Th>
                                        <Th className="w-40 text-center">Final Exam</Th>
                                        <Th className="w-44 text-center">Instructor</Th>
                                        <Th className="w-44 text-center">Location</Th>
                                        <Th className="w-24 text-center">Study Hrs</Th>
                                        <Th className="w-32 text-center">Status</Th>
                                        <Th className="w-16 pr-8 text-right">&nbsp;</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/3">
                                    {courses.map(course => {
                                        const gradeInfo = course.grade ? GRADE_MAP[course.grade] : null;
                                        const gColor = gradeInfo ? gc(gradeInfo.colorKey) : null;
                                        return (
                                            <tr key={course.id} className="group hover:bg-white/2 transition-colors">
                                                {/* Name */}
                                                <td className="py-5 px-8">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${gColor ? gColor.bg : "bg-violet-500/40"} shadow-[0_0_10px_rgba(139,92,246,0.2)]`} />
                                                            <span className="text-sm font-bold text-white tracking-tight">{course.name}</span>
                                                            <motion.a
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                href={`/courses/${course.code}/notes`}
                                                                className="ml-2 px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors shadow-lg shadow-violet-500/10"
                                                                title="Open notes for this course"
                                                                target="_blank"
                                                            >Notes</motion.a>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-white/30 ml-5 uppercase tracking-widest">{course.id}</span>
                                                    </div>
                                                </td>
                                                {/* Credits */}
                                                <td className="py-5 px-4 text-center">
                                                    <span className="text-xs font-black text-white/50">{course.credits}</span>
                                                </td>
                                                {/* Grade (editable dropdown) */}
                                                <td className="py-5 px-4 text-center">
                                                    <select
                                                        value={course.grade || ""}
                                                        onChange={e => updateGrade(course.id, e.target.value)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer appearance-none text-center ${gColor ? gColor.text : "text-violet-400"} bg-white/5 border-white/10 focus:ring-2 focus:ring-violet-500/20 w-full`}
                                                        style={{ colorScheme: "dark" }}
                                                    >
                                                        <option value="" className="bg-[#0a0a0a] text-white/30">Grade: N/A</option>
                                                        <option value="D" className="bg-[#0a0a0a] text-emerald-400">Distinction (D)</option>
                                                        <option value="M" className="bg-[#0a0a0a] text-blue-400">Merit (M)</option>
                                                        <option value="P" className="bg-[#0a0a0a] text-violet-400">Pass (P)</option>
                                                        <option value="U" className="bg-[#0a0a0a] text-red-400">Unclassified (U)</option>
                                                    </select>
                                                </td>
                                                {/* Midterm Date */}
                                                <td className="py-5 px-4">
                                                    <input
                                                        type="date"
                                                        value={course.midtermDate || ""}
                                                        onChange={e => updateField(course.id, "midtermDate", e.target.value || undefined)}
                                                        className="bg-white/5 border border-white/10 group-hover:border-white/20 rounded-xl px-3 py-2 text-[11px] font-bold text-white/60 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center"
                                                        style={{ colorScheme: "dark" }}
                                                    />
                                                </td>
                                                {/* Final Date */}
                                                <td className="py-5 px-4">
                                                    <input
                                                        type="date"
                                                        value={course.finalDate || ""}
                                                        onChange={e => updateField(course.id, "finalDate", e.target.value || undefined)}
                                                        className="bg-white/5 border border-white/10 group-hover:border-white/20 rounded-xl px-3 py-2 text-[11px] font-bold text-white/60 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center"
                                                        style={{ colorScheme: "dark" }}
                                                    />
                                                </td>
                                                {/* Instructor */}
                                                <td className="py-5 px-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Dr. Name"
                                                        value={course.professor || ""}
                                                        onChange={e => updateField(course.id, "professor", e.target.value)}
                                                        className="bg-white/5 border border-white/10 group-hover:border-white/20 rounded-xl px-3 py-2 text-[10px] font-bold text-white/60 placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center"
                                                    />
                                                </td>
                                                {/* Location */}
                                                <td className="py-5 px-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Room/Lab"
                                                        value={course.location || ""}
                                                        onChange={e => updateField(course.id, "location", e.target.value)}
                                                        className="bg-white/5 border border-white/10 group-hover:border-white/20 rounded-xl px-3 py-2 text-[10px] font-bold text-white/60 placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center"
                                                    />
                                                </td>
                                                {/* Study Hours */}
                                                <td className="py-5 px-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-black text-white">{(courseHours[course.id] || 0).toFixed(1)}</span>
                                                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Hours</span>
                                                    </div>
                                                </td>
                                                {/* Status */}
                                                <td className="py-5 px-4 text-center">
                                                    <select
                                                        value={course.status}
                                                        onChange={e => updateField(course.id, "status", e.target.value)}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer appearance-none text-center ${course.status === "Completed"
                                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                            : course.status === "At Risk"
                                                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                                                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                                            }`}
                                                        style={{ colorScheme: "dark" }}
                                                    >
                                                        <option value="In Progress" className="bg-[#0a0a0a] text-blue-400">In Progress</option>
                                                        <option value="Completed" className="bg-[#0a0a0a] text-emerald-400">Completed</option>
                                                        <option value="At Risk" className="bg-[#0a0a0a] text-red-400">At Risk</option>
                                                    </select>
                                                </td>
                                                {/* Delete */}
                                                <td className="py-5 pr-8 text-right">
                                                    <button
                                                        onClick={() => setConfirmDeleteCourse(course)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                        title="Remove course"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card Layout */}
                        <div className="lg:hidden divide-y divide-white/5">
                            {courses.map(course => {
                                const gradeInfo = course.grade ? GRADE_MAP[course.grade] : null;
                                const gColor = gradeInfo ? gc(gradeInfo.colorKey) : null;
                                const isExpanded = expandedCourseIds.has(course.id);

                                return (
                                    <div key={course.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${gColor ? gColor.bg : "bg-violet-500/40"}`} />
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-white truncate">{course.name}</div>
                                                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{course.id} &middot; {course.credits} CH</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <motion.a
                                                    whileTap={{ scale: 0.9 }}
                                                    href={`/courses/${course.code}/notes`}
                                                    className="p-2 rounded-xl text-white/30 hover:text-violet-400 hover:bg-violet-400/5 transition-all"
                                                    title="Open notes"
                                                    target="_blank"
                                                >
                                                    <BookOpen className="w-4 h-4" />
                                                </motion.a>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => setConfirmDeleteCourse(course)}
                                                    className="p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all shadow-sm"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </motion.button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={course.grade || ""}
                                                onChange={e => updateGrade(course.id, e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-violet-500/40 appearance-none text-center"
                                                style={{ colorScheme: "dark" }}
                                            >
                                                <option value="" className="bg-[#0a0a0a] text-white/30">Grade: N/A</option>
                                                <option value="D" className="bg-[#0a0a0a] text-emerald-400">Distinction (D)</option>
                                                <option value="M" className="bg-[#0a0a0a] text-blue-400">Merit (M)</option>
                                                <option value="P" className="bg-[#0a0a0a] text-violet-400">Pass (P)</option>
                                                <option value="U" className="bg-[#0a0a0a] text-red-400">Unclassified (U)</option>
                                            </select>
                                            <select
                                                value={course.status}
                                                onChange={e => updateField(course.id, "status", e.target.value)}
                                                className={`rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider border appearance-none text-center ${course.status === "Completed"
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                    : course.status === "At Risk"
                                                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                                                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                                    }`}
                                                style={{ colorScheme: "dark" }}
                                            >
                                                <option value="In Progress" className="bg-[#0a0a0a]">In Progress</option>
                                                <option value="Completed" className="bg-[#0a0a0a]">Completed</option>
                                                <option value="At Risk" className="bg-[#0a0a0a]">At Risk</option>
                                            </select>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden space-y-3 pt-1"
                                                >
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest ml-1">Midterm Date</label>
                                                            <input
                                                                type="date"
                                                                value={course.midtermDate || ""}
                                                                onChange={e => updateField(course.id, "midtermDate", e.target.value || undefined)}
                                                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-white/60 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center"
                                                                style={{ colorScheme: "dark" }}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest ml-1">Final Exam</label>
                                                            <input
                                                                type="date"
                                                                value={course.finalDate || ""}
                                                                onChange={e => updateField(course.id, "finalDate", e.target.value || undefined)}
                                                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-white/60 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center"
                                                                style={{ colorScheme: "dark" }}
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Instructor Name"
                                                            value={course.professor || ""}
                                                            onChange={e => updateField(course.id, "professor", e.target.value)}
                                                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white/60 placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center col-span-2"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Room / Lab"
                                                            value={course.location || ""}
                                                            onChange={e => updateField(course.id, "location", e.target.value)}
                                                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white/60 placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center col-span-2"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <button
                                            onClick={() => toggleExpandCourse(course.id)}
                                            className="w-full py-1.5 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors"
                                        >
                                            {isExpanded ? (
                                                <>Less Details <ChevronDown className="w-3 h-3 rotate-180" /></>
                                            ) : (
                                                <>More Details <ChevronDown className="w-3 h-3" /></>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ════ Academic Performance Track (KPIs) ════ */}
                <section className={`${mobileTab === "roadmap" ? "block" : "hidden sm:block"} space-y-4`}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5" /> Academic Performance Track
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {historicalStats.semesterGrades.map((sem, idx) => (
                            <div key={idx} className="glass-card-premium p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <GraduationCap className="w-12 h-12 text-white" />
                                </div>
                                <div className="space-y-3 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{sem.name}</span>
                                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${sem.indicator === "Good" ? "bg-emerald-500/10 text-emerald-400" :
                                            sem.indicator === "Average" ? "bg-blue-500/10 text-blue-400" :
                                                "bg-red-500/10 text-red-400"
                                            }`}>
                                            {sem.indicator === "Good" ? "Good Semester" : sem.indicator}
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-white">{sem.gpa.toFixed(2)}</span>
                                        <span className="text-[10px] font-bold text-white/20 uppercase">GPA</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${sem.gpa >= 3.2 ? "bg-emerald-500" : sem.gpa >= 2.4 ? "bg-violet-500" : "bg-red-500"}`}
                                            style={{ width: `${(sem.gpa / 4) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-tight">
                                        {sem.courseCount} Courses Completed
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ════ Study Log + Insights ════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* ── Study Log ── */}
                    <section className={`${mobileTab === "log" ? "block" : "hidden sm:block"}`}>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-3.5 h-3.5" /> Study Log
                        </h3>
                        <div className="glass-card-premium rounded-2xl border border-white/5 p-5 space-y-4">
                            {/* Add form */}
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={logCourseId}
                                    onChange={e => setLogCourseId(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-violet-500/40 col-span-2"
                                    style={{ colorScheme: "dark" }}
                                >
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id} className="bg-[#111]">{c.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min="0.25"
                                    step="0.25"
                                    placeholder="Hours"
                                    value={logHours}
                                    onChange={e => setLogHours(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/40 outline-none focus:border-violet-500/40"
                                />
                                <input
                                    type="date"
                                    value={logDate}
                                    onChange={e => setLogDate(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-violet-500/40"
                                    style={{ colorScheme: "dark" }}
                                />
                                <input
                                    placeholder="Notes (optional)"
                                    value={logNotes}
                                    onChange={e => setLogNotes(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/40 outline-none focus:border-violet-500/40"
                                />
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={addSession}
                                    className="bg-violet-600 hover:bg-violet-500 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Log
                                </motion.button>
                            </div>

                            {/* Recent sessions */}
                            {recentSessions.length > 0 ? (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {recentSessions.map(s => {
                                        const course = courses.find(c => c.id === s.courseId);
                                        const isEditing = editingSessionId === s.id;
                                        return (
                                            <div key={s.id} className="py-2 px-3 rounded-xl bg-white/2 border border-white/5 group">
                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-medium text-violet-400">{course?.name || "Unknown"}</div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <input
                                                                type="date"
                                                                value={editSessionDate}
                                                                onChange={e => setEditSessionDate(e.target.value)}
                                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-violet-500/40"
                                                                style={{ colorScheme: "dark" }}
                                                            />
                                                            <input
                                                                type="number"
                                                                min="0.25"
                                                                step="0.25"
                                                                value={editSessionHours}
                                                                onChange={e => setEditSessionHours(e.target.value)}
                                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-violet-500/40"
                                                                placeholder="Hours"
                                                            />
                                                            <input
                                                                value={editSessionNotes}
                                                                onChange={e => setEditSessionNotes(e.target.value)}
                                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white placeholder-white/20 outline-none focus:border-violet-500/40"
                                                                placeholder="Notes"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => setEditingSessionId(null)}
                                                                className="px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-white/40 hover:text-white transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => saveEditSession(s)}
                                                                className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-[10px] font-bold text-white transition-colors"
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${course ? (() => {
                                                                    const gi = course.grade ? GRADE_MAP[course.grade] : null;
                                                                    return gi ? gc(gi.colorKey).bg : "bg-violet-500/40";
                                                                })() : "bg-gray-500/40"
                                                                    }`} />
                                                                <span className="text-xs font-medium">{course?.name || "Unknown"}</span>
                                                            </div>
                                                            <span className="text-[10px] text-white/40 ml-4">
                                                                {s.date} &middot; {s.hours}h{s.notes ? ` · ${s.notes}` : ""}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => startEditSession(s)}
                                                                className="sm:opacity-0 sm:group-hover:opacity-100 text-white/30 hover:text-violet-400 transition-all p-1"
                                                                title="Edit session"
                                                            >
                                                                <Settings className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => onDeleteStudySession(s.id)}
                                                                className="sm:opacity-0 sm:group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all p-1"
                                                                title="Delete session"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-white/20" />
                                    </div>
                                    <p className="text-xs text-white/30 text-center font-medium">No study sessions yet</p>
                                    <p className="text-[10px] text-white/20 text-center">Use the form above to log your first study session.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Smart Insights Hidden per request */}
                </div>

                {/* Planner features hidden per request */}

                {/* Mobile View Bottom Tabs */}
                <div className="sm:hidden fixed bottom-4 left-4 right-4 z-[100]">
                    <div className="glass-card-premium rounded-2xl border border-white/20 flex items-center justify-between p-1.5 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl ring-1 ring-white/10">
                        {[
                            { id: "overview", label: "Overview", icon: Layout },
                            { id: "courses", label: "Courses", icon: BookOpen },
                            { id: "log", label: "Log", icon: Clock },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setMobileTab(tab.id as any);
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className={`flex flex-col items-center justify-center p-2 flex-1 gap-1 rounded-xl transition-all ${mobileTab === tab.id ? "bg-white/10 text-violet-400" : "text-white/40"
                                    }`}
                            >
                                <tab.icon className="w-5 h-5 shadow-sm" />
                                <span className="text-[9px] font-black uppercase tracking-tight">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Tiny sub-components ─────────────────────────────────────────────────

function StatCard({ icon, bg, border, value, label }: {
    icon: React.ReactNode; bg: string; border: string; value: string; label: string;
}) {
    return (
        <div className="glass-card-premium p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} ${border} border flex items-center justify-center`}>
                {icon}
            </div>
            <div>
                <div className="text-lg font-bold leading-none">{value}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-1">{label}</div>
            </div>
        </div>
    );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <th className={`py-3 px-4 text-[10px] uppercase tracking-widest font-bold text-white/30 ${className}`}>
            {children}
        </th>
    );
}

// ── Integration Panel ───────────────────────────────────────────────────

interface IntegrationPanelProps {
    courses: PlannerCourse[];
    isGcalConnected: boolean;
    isGcalLoading: boolean;
    isAutoSyncing: boolean;
    onManualSync?: () => void;
}

function IntegrationPanel({ courses, isGcalConnected, isGcalLoading, isAutoSyncing, onManualSync }: IntegrationPanelProps) {
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

    const connectGoogleCalendar = () => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) {
            setMessage({ text: "Google Calendar not configured yet.", ok: false });
            return;
        }
        const redirect = `${window.location.origin}/api/integrations/google-calendar/callback`;
        const scope = "https://www.googleapis.com/auth/calendar.events";
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
        window.location.href = url;
    };

    const handleSync = async () => {
        if (!isGcalConnected) {
            setMessage({ text: "Follow the correct order: \n1. Click 'Connect' to authorize Google \n2. Click 'Sync' to push your dates.", ok: false });
            return;
        }
        if (onManualSync) {
            onManualSync();
        }
    };

    return (
        <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" /> Integrations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card-premium p-5 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden">
                    {isGcalConnected && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <div className={`w-1 h-1 rounded-full ${isAutoSyncing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                            <span className={`text-[9px] font-bold uppercase tracking-tighter ${isAutoSyncing ? "text-amber-400" : "text-emerald-400"}`}>
                                {isAutoSyncing ? "Syncing..." : "Connected"}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold">Google Calendar</span>
                    </div>
                    <p className="text-xs text-white/30">Auto-syncs exam dates to your calendar with smart reminders.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={connectGoogleCalendar}
                            className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${isGcalConnected ? "border-white/5 text-white/40" : "border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 text-white"}`}
                        >
                            <ExternalLink className="w-3 h-3" /> {isGcalConnected ? "Reconnect" : "Connect"}
                        </button>
                        <button
                            onClick={handleSync}
                            disabled={isGcalLoading || !isGcalConnected || isAutoSyncing}
                            className="flex-1 px-3 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                            {(isGcalLoading || isAutoSyncing) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />} Sync
                        </button>
                    </div>
                </div>
                <div className="glass-card-premium p-5 rounded-2xl border border-white/5 flex items-center justify-center opacity-20 border-dashed">
                    <p className="text-[10px] font-bold uppercase tracking-widest">More coming soon</p>
                </div>
            </div>
            {message && (
                <div className={`mt-3 px-4 py-2.5 rounded-xl text-xs font-medium border ${message.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {message.text}
                </div>
            )}
        </section>
    );
}

function GetStartedModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl glass-card-premium rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-violet-500 to-transparent" />
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-600/20 rounded-full blur-[100px]" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]" />
                        <div className="relative p-10 md:p-12 space-y-10">
                            <div className="space-y-4 text-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest mb-2">
                                    <Sparkles className="w-3 h-3" /> Welcome to HTUAI
                                </div>
                                <h2 className="text-4xl font-black text-white tracking-tight leading-none text-gradient">Academic Command Center</h2>
                                <p className="text-sm text-white/40 font-medium max-w-sm mx-auto">Your data is now saved automatically to our secure database. No external integrations required.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                <OnboardingFeature icon={<BarChart3 className="w-5 h-5 text-violet-400" />} title="Dynamic GPA Insights" desc="Track your target grades and see how they impact your overall GPA in real-time." />
                                <OnboardingFeature icon={<Calendar className="w-5 h-5 text-blue-400" />} title="Automatic Persistence" desc="Every change you make is synced instantly to your account. Access your stats from any device." />
                                <OnboardingFeature icon={<BookOpen className="w-5 h-5 text-emerald-400" />} title="Rich Course Notes" desc="Take detailed notes for every course using our new integrated Pro editor." />
                            </div>
                            <div className="space-y-4 pt-4">
                                <button onClick={onClose} className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/5">Get Started</button>
                                <p className="text-[10px] text-white/20 text-center font-bold uppercase tracking-widest">Press anywhere to dismiss</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function OnboardingFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="flex gap-5 items-start group">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 transition-colors group-hover:border-white/10 group-hover:bg-white/10">{icon}</div>
            <div className="space-y-1">
                <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
                <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

import { MAJORS, MajorKey } from "@/lib/useMajor";

function GraduationCalculator({ earnedCredits }: { earnedCredits: number }) {
    const [annualPlan, setAnnualPlan] = useState({ sem1: 15, sem2: 15, summer: 6 });
    const [major, setMajor] = useState<MajorKey | null>(null);
    const [showMajorSelect, setShowMajorSelect] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    useEffect(() => {
        const savedMajor = localStorage.getItem("htu_selected_major") as MajorKey | null;
        if (savedMajor) setMajor(savedMajor);
        const savedPlan = localStorage.getItem("htu_annual_plan");
        if (savedPlan) {
            try { setAnnualPlan(JSON.parse(savedPlan)); } catch (e) { console.error("Failed to parse annual plan", e); }
        }
    }, []);
    const updateMajor = (key: MajorKey) => {
        setMajor(key);
        localStorage.setItem("htu_selected_major", key);
        setShowMajorSelect(false);
    };
    const updatePlan = (sem: keyof typeof annualPlan, val: number) => {
        const next = { ...annualPlan, [sem]: val };
        setAnnualPlan(next);
        localStorage.setItem("htu_annual_plan", JSON.stringify(next));
    };
    const targetCredits = useMemo(() => {
        if (!major) return 135;
        if (major === "game_design") return 72;
        if (major === "mechanical_engineering" || major === "electrical_engineering" || major === "energy_engineering" || major === "industrial_engineering") return 166;
        return 135;
    }, [major]);
    const activeMajorInfo = useMemo(() => MAJORS.find(m => m.key === major), [major]);
    const plannedThisYear = annualPlan.sem1 + annualPlan.sem2 + annualPlan.summer;
    const projectedCredits = earnedCredits + plannedThisYear;
    const progressAtYearEnd = Math.min(100, (projectedCredits / targetCredits) * 100);
    const progressNow = Math.min(100, (earnedCredits / targetCredits) * 100);
    const levelInfo = useMemo(() => {
        const p = progressAtYearEnd;
        let rank = "Novice", badge = "🌱", color = "text-white/40", effect = "", nextAt = 25;
        if (p < 25) { rank = "Novice"; badge = "🌱"; color = "text-white/40"; nextAt = 25; }
        else if (p < 50) { rank = "Scholar"; badge = "📚"; color = "text-emerald-400"; effect = "shadow-[0_0_20px_rgba(16,185,129,0.2)]"; nextAt = 50; }
        else if (p < 75) { rank = "Engineer"; badge = "⚙️"; color = "text-blue-400"; effect = "shadow-[0_0_20px_rgba(59,130,246,0.2)]"; nextAt = 75; }
        else if (p < 100) { rank = "Expert"; badge = "💎"; color = "text-violet-400"; effect = "shadow-[0_0_20px_rgba(139,92,246,0.2)]"; nextAt = 100; }
        else { rank = "Graduate"; badge = "🎓"; color = "text-amber-400"; effect = "shadow-[0_0_20px_rgba(251,191,36,0.3)]"; nextAt = 100; }
        const nextRankCredits = Math.ceil((nextAt / 100) * targetCredits);
        const creditsToNext = Math.max(0, nextRankCredits - projectedCredits);
        return { rank, badge, color, effect, nextAt, nextRankCredits, creditsToNext };
    }, [progressAtYearEnd, targetCredits, projectedCredits]);
    const workloadLabel = useMemo(() => {
        if (plannedThisYear === 0) return { text: "No classes?", color: "text-white/20", icon: "⏸️" };
        if (plannedThisYear <= 12) return { text: "Light Year", color: "text-emerald-400/60", icon: "🍃" };
        if (plannedThisYear <= 30) return { text: "Balanced", color: "text-emerald-400", icon: "⚖️" };
        if (plannedThisYear <= 40) return { text: "Beast Mode", color: "text-orange-400", icon: "⚡" };
        return { text: "Insane Load!", color: "text-red-400", icon: "🔥" };
    }, [plannedThisYear]);
    const accentColor = useMemo(() => {
        if (!activeMajorInfo) return "emerald-500";
        return activeMajorInfo.color.split(' ')[0].replace('from-', '');
    }, [activeMajorInfo]);

    return (
        <section
            onMouseMove={handleMouseMove}
            className="group/card relative glass-card-premium rounded-[2.5rem] border border-white/5 p-8 md:p-12 overflow-hidden transition-all duration-700 hover:border-white/10 hover:shadow-2xl hover:shadow-emerald-500/5"
        >
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-0 group-hover/card:opacity-100 transition-opacity bg-${accentColor}/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2`} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
                <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Year-End Status</span>
                            <motion.span animate={{ scale: [1, 1.05, 1], y: [0, -1, 0] }} transition={{ duration: 3, repeat: Infinity }} className={`text-[9px] font-bold uppercase flex items-center gap-1.5 ${workloadLabel.color}`}>
                                <span>{workloadLabel.icon}</span>{workloadLabel.text}
                            </motion.span>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className={`text-5xl font-black tracking-tighter text-${accentColor}`}>{projectedCredits}</span>
                            <span className="text-sm text-white/20 font-mono mb-2">Total CH</span>
                        </div>
                    </div>
                    <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden group/bar">
                        {[25, 50, 75].map(pos => (
                            <div key={pos} style={{ left: `${pos}%` }} className="absolute inset-y-0 w-px bg-white/10 z-20 group-hover/bar:bg-white/20 transition-colors" />
                        ))}
                        <motion.div className="absolute inset-y-0 left-0 bg-white/10 rounded-full z-10" initial={{ width: 0 }} animate={{ width: `${progressNow}%` }} transition={{ duration: 1 }} />
                        <motion.div className={`absolute inset-y-0 left-0 bg-${accentColor}/40 rounded-full ${levelInfo.effect}`} initial={{ width: 0 }} animate={{ width: `${progressAtYearEnd}%` }} transition={{ duration: 1.5, delay: 0.2 }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/2 rounded-2xl p-4 border border-white/5 relative overflow-hidden group/item cursor-help">
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-[9px] uppercase font-bold text-white/20 tracking-tighter">Baseline</div>
                                <CheckCircle2 className="w-3 h-3 text-white/10 group-hover/item:text-white/30 transition-colors" />
                            </div>
                            <div className="text-xl font-black font-mono flex items-baseline gap-1">{earnedCredits} <span className="text-[10px] text-white/30 font-bold uppercase">CH</span></div>
                        </div>
                        <div className="bg-white/2 rounded-2xl p-4 border border-white/5 relative overflow-hidden group/item cursor-help">
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-[9px] uppercase font-bold text-white/20 tracking-tighter">Planned</div>
                                <Zap className="w-3 h-3 text-emerald-400/30 group-hover/item:text-emerald-400/60 transition-colors" />
                            </div>
                            <div className="text-xl font-black font-mono text-emerald-400 flex items-baseline gap-1">+{plannedThisYear} <span className="text-[10px] text-emerald-500/30 font-bold uppercase">CH</span></div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
                    <PlannerSlider label="Winter Semester" val={annualPlan.sem1} min={12} max={18} onChange={(v) => updatePlan('sem1', v)} accent={accentColor} />
                    <PlannerSlider label="Spring Semester" val={annualPlan.sem2} min={12} max={18} onChange={(v) => updatePlan('sem2', v)} accent={accentColor} />
                    <PlannerSlider label="Summer Semester" val={annualPlan.summer} min={0} max={9} onChange={(v) => updatePlan('summer', v)} accent={accentColor} />
                </div>
            </div>
        </section>
    );
}

function PlannerSlider({ label, val, min, max, onChange, accent }: {
    label: string, val: number, min: number, max: number, onChange: (v: number) => void, accent: string
}) {
    return (
        <div className="bg-white/3 rounded-2xl p-4 border border-white/5 space-y-3 hover:bg-white/6 transition-all group/slider hover:border-white/10">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 group-hover/slider:text-white/60 transition-colors">{label}</span>
                <motion.span
                    key={val}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className={`text-xs font-mono font-bold ${val > 0 ? "text-emerald-400" : "text-white/10"}`}
                >
                    {val} CH
                </motion.span>
            </div>
            <input
                type="range" min={min} max={max} step="1"
                value={val} onChange={(e) => onChange(Number(e.target.value))}
                className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer transition-all ${val > 0 ? `accent-${accent}` : "accent-white/10"}`}
            />
        </div>
    );
}
