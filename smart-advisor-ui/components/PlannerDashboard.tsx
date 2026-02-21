"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen, Clock, Trophy, Plus,
    Trash2, GraduationCap, CheckCircle2,
    AlertTriangle, Lightbulb, Info,
    BarChart3, Calendar, Settings, ExternalLink, Loader2, Globe, Sparkles
} from "lucide-react";
import { PlannerCourse, StudySession, SemesterData } from "@/app/planner/page";
import {
    calculateGPA, getClassification, GRADE_MAP,
    SCORED_GRADES, generateInsights, type Insight, type HTUGrade
} from "@/lib/grading";
import WeeklySummary from "./WeeklySummary";

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
    onDeleteStudySession: (id: string) => void;
}

export default function PlannerDashboard({
    courses, studySessions, allSemesters = [], onUpdateCourses, onAddStudySession, onDeleteStudySession
}: PlannerDashboardProps) {

    // ── Onboarding state ───────────────────────────────────────────────
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem("htuai_planner_onboarding");
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
        }
    }, []);

    const dismissOnboarding = () => {
        localStorage.setItem("htuai_planner_onboarding", "true");
        setShowOnboarding(false);
    };

    // ── Study-log form state ────────────────────────────────────────────
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
        if (!allSemesters || allSemesters.length === 0) return null;

        const semesterGrades = allSemesters.map(sem => {
            const graded = sem.courses.filter(c => c.grade && SCORED_GRADES.includes(c.grade as HTUGrade));
            const gpa = calculateGPA(graded.map(c => ({ credits: c.credits, grade: c.grade! })));
            return {
                name: sem.name || "Unknown Semester",
                gpa,
                courseCount: sem.courses.length,
                indicator: gpa >= 2.8 ? "Good" : gpa >= 2.4 ? "Average" : gpa > 0 ? "At Risk" : "N/A"
            };
        });

        const totalGraded = allSemesters.flatMap(s => s.courses.filter(c => c.grade && SCORED_GRADES.includes(c.grade as HTUGrade)));
        const cumulativeGPA = calculateGPA(totalGraded.map(c => ({ credits: c.credits, grade: c.grade! })));

        return { semesterGrades, cumulativeGPA };
    }, [allSemesters]);

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

            {/* ════ Stats Overview ════ */}
            {/* ════ Stats Overview ════ */}
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
                {/* Credits */}
                <StatCard
                    icon={<BookOpen className="w-5 h-5 text-blue-400" />}
                    bg="bg-blue-500/10" border="border-blue-500/20"
                    value={String(totalCredits)}
                    label="Credits"
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
                {/* Cumulative GPA (KPI) */}
                {historicalStats && historicalStats.cumulativeGPA > 0 && (
                    <StatCard
                        icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
                        bg="bg-emerald-500/10" border="border-emerald-500/20"
                        value={historicalStats.cumulativeGPA.toFixed(2)}
                        label="Total GPA"
                    />
                )}
            </div>

            {/* ════ Course Table ════ */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5" /> Semester Courses
                    </h3>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">{courses.length} courses tracked</span>
                </div>

                <div className="glass-card-premium rounded-[2.5rem] border border-white/[0.05] overflow-hidden overflow-x-auto shadow-2xl bg-black/20">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                                <Th className="pl-8">Course Details</Th>
                                <Th className="w-20 text-center">Credits</Th>
                                <Th className="w-44 text-center">Grade / Score</Th>
                                <Th className="w-40 text-center">Midterm</Th>
                                <Th className="w-40 text-center">Final Exam</Th>
                                <Th className="w-44 text-center">Instructor</Th>
                                <Th className="w-44 text-center">Location</Th>
                                <Th className="w-24 text-center">Study Hrs</Th>
                                <Th className="w-32 pr-8 text-right">Status</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {courses.map(course => {
                                const gradeInfo = course.grade ? GRADE_MAP[course.grade] : null;
                                const gColor = gradeInfo ? gc(gradeInfo.colorKey) : null;
                                return (
                                    <tr key={course.id} className="group hover:bg-white/[0.02] transition-colors">
                                        {/* Name */}
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${gColor ? gColor.bg : "bg-violet-500/40"} shadow-[0_0_10px_rgba(139,92,246,0.2)]`} />
                                                    <span className="text-sm font-bold text-white tracking-tight">{course.name}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-white/20 ml-5 uppercase tracking-widest">{course.id}</span>
                                            </div>
                                        </td>
                                        {/* Credits */}
                                        <td className="py-5 px-4 text-center">
                                            <span className="text-xs font-black text-white/40">{course.credits}</span>
                                        </td>
                                        {/* Grade */}
                                        <td className="py-5 px-4">
                                            <select
                                                value={course.grade || ""}
                                                onChange={e => updateGrade(course.id, e.target.value)}
                                                className="bg-white/5 border border-white/5 group-hover:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full cursor-pointer appearance-none text-center"
                                                style={{ colorScheme: "dark" }}
                                            >
                                                <option value="" className="bg-[#0a0a0a]">N/A</option>
                                                <option value="D" className="bg-[#0a0a0a]">Distinction (D)</option>
                                                <option value="M" className="bg-[#0a0a0a]">Merit (M)</option>
                                                <option value="P" className="bg-[#0a0a0a]">Pass (P)</option>
                                                <option value="U" className="bg-[#0a0a0a]">Unclassified (U)</option>
                                            </select>
                                        </td>
                                        {/* Midterm Date */}
                                        <td className="py-5 px-4">
                                            <input
                                                type="date"
                                                value={course.midtermDate || ""}
                                                onChange={e => updateField(course.id, "midtermDate", e.target.value || undefined)}
                                                className="bg-white/5 border border-white/5 group-hover:border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-white/60 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center"
                                                style={{ colorScheme: "dark" }}
                                            />
                                        </td>
                                        {/* Final Date */}
                                        <td className="py-5 px-4">
                                            <input
                                                type="date"
                                                value={course.finalDate || ""}
                                                onChange={e => updateField(course.id, "finalDate", e.target.value || undefined)}
                                                className="bg-white/5 border border-white/5 group-hover:border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-white/60 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center"
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
                                                className="bg-white/5 border border-white/5 group-hover:border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white/60 placeholder:text-white/10 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center"
                                            />
                                        </td>
                                        {/* Location */}
                                        <td className="py-5 px-4">
                                            <input
                                                type="text"
                                                placeholder="Room/Lab"
                                                value={course.location || ""}
                                                onChange={e => updateField(course.id, "location", e.target.value)}
                                                className="bg-white/5 border border-white/5 group-hover:border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white/60 placeholder:text-white/10 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all w-full text-center"
                                            />
                                        </td>
                                        {/* Study Hours */}
                                        <td className="py-5 px-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-black text-white">{(courseHours[course.id] || 0).toFixed(1)}</span>
                                                <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Hours</span>
                                            </div>
                                        </td>
                                        {/* Status */}
                                        <td className="py-5 px-8 text-right">
                                            <button
                                                onClick={() => toggleStatus(course.id)}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${course.status === "Completed"
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                    : course.status === "At Risk"
                                                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                                                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                                    } hover:scale-105 active:scale-95`}
                                            >
                                                {course.status}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ════ Academic Performance Track (KPIs) ════ */}
            {historicalStats && historicalStats.semesterGrades.length >= 1 && (
                <section className="space-y-4">
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
            )}

            {/* ════ Study Log + Insights ════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Study Log ── */}
                <section>
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
                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-violet-500/40"
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
                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-violet-500/40"
                            />
                            <button
                                onClick={addSession}
                                className="bg-violet-600 hover:bg-violet-500 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" /> Log
                            </button>
                        </div>

                        {/* Recent sessions */}
                        {recentSessions.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {recentSessions.map(s => {
                                    const course = courses.find(c => c.id === s.courseId);
                                    return (
                                        <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/5 group">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium">{course?.name || "Unknown"}</span>
                                                <span className="text-[10px] text-white/30">
                                                    {s.date} &middot; {s.hours}h{s.notes ? ` · ${s.notes}` : ""}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => onDeleteStudySession(s.id)}
                                                className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-1"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-white/20 text-center py-4">No study sessions yet. Log your first one above.</p>
                        )}
                    </div>
                </section>

                {/* ── Smart Insights ── */}
                <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                        <Lightbulb className="w-3.5 h-3.5" /> Smart Insights
                    </h3>
                    <div className="space-y-3">
                        {insights.length > 0 ? insights.map((insight, i) => (
                            <div key={i} className={`p-4 rounded-2xl border ${insightBorder(insight.type)} flex items-start gap-3`}>
                                <div className="mt-0.5 shrink-0">{insightIcon(insight.type)}</div>
                                <div>
                                    <div className="text-sm font-semibold">{insight.title}</div>
                                    <div className="text-xs text-white/40 mt-0.5">{insight.description}</div>
                                </div>
                            </div>
                        )) : (
                            <div className="glass-card-premium rounded-2xl border border-white/5 p-6 text-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500/30 mx-auto mb-2" />
                                <p className="text-xs text-white/30">Everything looks good! Add grades and study hours for insights.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* ════ This Week Summary ════ */}
            <WeeklySummary courses={courses} studySessions={studySessions} />

            {/* ════ Integrations ════ */}
            <IntegrationPanel courses={courses} />

            {/* ════ HTU Grading Scale Reference ════ */}
            <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">HTU Grading Scale</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(["D", "M", "P", "U"] as const).map(g => {
                        const info = GRADE_MAP[g];
                        const color = gc(info.colorKey);
                        return (
                            <div key={g} className="glass-card-premium p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${color.bg} ${color.border} border flex items-center justify-center text-xs font-bold ${color.text}`}>
                                    {g}
                                </div>
                                <div>
                                    <div className="text-xs font-semibold">{info.label}</div>
                                    <div className="text-[10px] text-white/50">{info.points.toFixed(1)} pts</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
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

import { useSession } from "next-auth/react";

function IntegrationPanel({ courses }: { courses: PlannerCourse[] }) {
    const { data: session } = useSession();
    const [gcalLoading, setGcalLoading] = useState(false);
    const [notionLoading, setNotionLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(true);
    const [notionConnected, setNotionConnected] = useState(false);
    const [gcalConnected, setGcalConnected] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
    const autoSyncedRef = useRef(false);

    const isGoogleAuth = (session?.user as any)?.provider === "google";

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/integrations/status");
            if (res.ok) {
                const data = await res.json();
                setNotionConnected(data.notion);
                setGcalConnected(data.google_calendar);
            }
        } catch (e) {
            console.error("Failed to fetch integration status:", e);
        } finally {
            setStatusLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();

        if (autoSyncedRef.current) return;
        const params = new URLSearchParams(window.location.search);
        const connected = params.get("connected");
        const error = params.get("error");
        if (!connected && !error) return;

        const url = new URL(window.location.href);
        url.searchParams.delete("connected");
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.pathname + url.search);

        if (error === "notion_no_pages") {
            setMessage({ text: "Notion requires you to share at least one page. When the Notion popup appears, select a page (any page works) — the Study Plan will be created inside it.", ok: false });
            return;
        }
        if (error) {
            setMessage({ text: `Integration error: ${error.replace(/_/g, " ")}`, ok: false });
            return;
        }
        if (connected === "google") {
            setMessage({ text: "Google Calendar connected! Click Sync to push exam dates.", ok: true });
            setGcalConnected(true);
        }
        if (connected === "notion" && courses.length > 0) {
            setNotionConnected(true);
            autoSyncedRef.current = true;
            (async () => {
                setNotionLoading(true);
                setMessage({ text: "Auto-syncing courses to Notion…", ok: true });
                try {
                    const res = await fetch("/api/integrations/notion", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ courses }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setMessage({ text: `Connected & synced ${data.successCount} courses to Notion`, ok: true });
                    } else {
                        setMessage({ text: data.error || "Connected but sync failed", ok: false });
                    }
                } catch {
                    setMessage({ text: "Connected but auto-sync failed", ok: false });
                }
                setNotionLoading(false);
            })();
        }
    }, [courses, fetchStatus]);

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

    const syncGoogleCalendar = async () => {
        if (!gcalConnected) {
            setMessage({ text: "Follow the correct order: \n1. Click 'Connect' to authorize Google \n2. Click 'Sync' to push your dates.", ok: false });
            return;
        }
        setGcalLoading(true);
        setMessage(null);
        try {
            const res = await fetch("/api/integrations/google-calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courses }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: `Synced ${data.successCount}/${data.totalCount} events to Google Calendar`, ok: true });
            } else {
                const errorMsg = res.status === 401
                    ? "Connection lost. Please follow the correct order: 1. Reconnect Google, then 2. Try Sync again."
                    : (data.error || "Failed to sync");
                setMessage({ text: errorMsg, ok: false });
            }
        } catch {
            setMessage({ text: "Sync failed. Follow the correct order: 1. Connect, 2. Sync.", ok: false });
        }
        setGcalLoading(false);
    };

    const connectNotion = () => {
        const clientId = process.env.NEXT_PUBLIC_NOTION_CLIENT_ID;
        if (!clientId) {
            setMessage({ text: "Notion not configured yet.", ok: false });
            return;
        }
        const redirect = `${window.location.origin}/api/integrations/notion/callback`;
        const url = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&owner=user`;
        window.location.href = url;
    };

    const syncNotion = async () => {
        if (!notionConnected) {
            setMessage({ text: "Follow the correct order: \n1. Click 'Connect' to authorize Notion \n2. Click 'Sync' to export courses.", ok: false });
            return;
        }
        setNotionLoading(true);
        setMessage(null);
        try {
            const res = await fetch("/api/integrations/notion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courses }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: `Synced ${data.successCount} courses to Notion`, ok: true });
            } else {
                const errorMsg = res.status === 401
                    ? "Connection lost. Follow the correct order: 1. Reconnect Notion, then 2. Try Sync again."
                    : (data.error || "Failed to sync");
                setMessage({ text: errorMsg, ok: false });
            }
        } catch {
            setMessage({ text: "Sync failed. Follow the correct order: 1. Connect, 2. Sync.", ok: false });
        }
        setNotionLoading(false);
    };

    const initNotionPage = async () => {
        if (!notionConnected) {
            setMessage({ text: "Follow the correct order: \n1. Click 'Connect' to authorize Notion \n2. Click 'New Page' to create the hub.", ok: false });
            return;
        }
        setNotionLoading(true);
        setMessage(null);
        try {
            const res = await fetch("/api/integrations/notion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courses, createNewPage: true }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: `Created new Study Plan page with ${data.successCount} courses`, ok: true });
            } else {
                const errorMsg = res.status === 401
                    ? "Connection lost. Follow the correct order: 1. Reconnect Notion, then 2. Create New Page."
                    : (data.error || "Failed to create page");
                setMessage({ text: errorMsg, ok: false });
            }
        } catch {
            setMessage({ text: "Network error. Follow the correct order: 1. Connect, 2. New Page.", ok: false });
        }
        setNotionLoading(false);
    };

    const steps = [
        {
            id: 1,
            title: "Auth Connection",
            desc: isGoogleAuth ? "Signed in with Google" : "Connect your Google Account",
            isDone: isGoogleAuth,
            actionLabel: isGoogleAuth ? "Linked" : "Link Google",
            onClick: isGoogleAuth ? undefined : connectGoogleCalendar,
            icon: <Globe className="w-4 h-4" />
        },
        {
            id: 2,
            title: "Calendar Access",
            desc: "Add exam dates to your calendar",
            isDone: gcalConnected,
            actionLabel: gcalConnected ? "Connected" : "Connect",
            onClick: connectGoogleCalendar,
            icon: <Calendar className="w-4 h-4" />,
            disabled: !isGoogleAuth && !gcalConnected // Must at least be logged in or connecting
        },
        {
            id: 3,
            title: "Notion Workspace",
            desc: "Build a structured study hub",
            isDone: notionConnected,
            actionLabel: notionConnected ? "Connected" : "Connect",
            onClick: connectNotion,
            icon: <BookOpen className="w-4 h-4" />,
            disabled: !gcalConnected && !notionConnected // Encourage calendar first but not strictly required by API
        }
    ];

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5" /> Integration Journey
                </h3>
                <div className="flex items-center gap-1">
                    <div className="h-1 w-12 rounded-full bg-white/5 overflow-hidden">
                        <div
                            className="h-full bg-violet-500 transition-all duration-500"
                            style={{ width: `${(steps.filter(s => s.isDone).length / steps.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-white/20 ml-2">
                        {steps.filter(s => s.isDone).length}/{steps.length}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className={`glass-card-premium p-5 rounded-3xl border transition-all relative overflow-hidden group ${step.isDone ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-white/5 hover:border-white/10"
                            } ${step.disabled ? "opacity-40 grayscale" : "opacity-100"}`}
                    >
                        {step.isDone && (
                            <div className="absolute top-3 right-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>
                        )}

                        <div className="flex flex-col gap-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors ${step.isDone ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/5 text-white/40 group-hover:text-white group-hover:bg-white/10"
                                }`}>
                                {step.icon}
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-white tracking-tight">{step.title}</h4>
                                <p className="text-xs text-white/40 mt-1 leading-relaxed">{step.desc}</p>
                            </div>

                            <button
                                onClick={step.onClick}
                                disabled={step.disabled || (step.isDone && step.id === 1)}
                                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${step.isDone
                                    ? "bg-transparent border border-emerald-500/20 text-emerald-400"
                                    : "bg-white text-black hover:bg-white/90"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {step.isDone ? <CheckCircle2 className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                                {step.actionLabel}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions (only visible when steps are mostly done) */}
            <AnimatePresence>
                {(gcalConnected || notionConnected) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        {gcalConnected && (
                            <div className="glass-card-premium p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold">Push Exam Reminders</span>
                                </div>
                                <button
                                    onClick={syncGoogleCalendar}
                                    disabled={gcalLoading}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                                >
                                    {gcalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sync Calendar"}
                                </button>
                            </div>
                        )}
                        {notionConnected && (
                            <div className="glass-card-premium p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold">Notion Hub</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => initNotionPage()}
                                        disabled={notionLoading}
                                        className="px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 text-[10px] font-bold transition-colors disabled:opacity-50"
                                    >
                                        {notionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "New Page"}
                                    </button>
                                    <button
                                        onClick={syncNotion}
                                        disabled={notionLoading}
                                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-bold transition-colors disabled:opacity-50"
                                    >
                                        {notionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sync Data"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {message && (
                <div className={`mt-3 px-4 py-3 rounded-2xl text-xs font-medium border flex items-start gap-3 ${message.ok
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}>
                    {message.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <div className="whitespace-pre-line">{message.text}</div>
                </div>
            )}
        </section>
    );
}

// ── Onboarding Modal ───────────────────────────────────────────────────

function GetStartedModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-xl glass-card-premium rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl"
                    >
                        {/* Decorative background Elements */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-600/20 rounded-full blur-[100px]" />
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]" />

                        <div className="relative p-10 md:p-12 space-y-10">
                            <div className="space-y-4 text-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest mb-2">
                                    <Sparkles className="w-3 h-3" /> Welcome to HTU AI
                                </div>
                                <h2 className="text-4xl font-black text-white tracking-tight leading-none text-gradient">
                                    Your Academic Command Center
                                </h2>
                                <p className="text-sm text-white/40 font-medium max-w-sm mx-auto">
                                    Let&apos;s get you settled into your new smart planner. Here&apos;s what you can do:
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <OnboardingFeature
                                    icon={<BarChart3 className="w-5 h-5 text-violet-400" />}
                                    title="Real-time GPA Tracking"
                                    desc="Input your estimated grades to see your semester performance and academic standing instantly."
                                />
                                <OnboardingFeature
                                    icon={<Calendar className="w-5 h-5 text-blue-400" />}
                                    title="Exam Schedule Sync"
                                    desc="Connect your Google Calendar to automatically push midterm and final exam reminders."
                                />
                                <OnboardingFeature
                                    icon={<BookOpen className="w-5 h-5 text-emerald-400" />}
                                    title="Notion Study Hub"
                                    desc="Export your entire semester plan to a structured Notion workspace with just one click."
                                />
                            </div>

                            <div className="space-y-4 pt-4">
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/5"
                                >
                                    Get Started
                                </button>
                                <p className="text-[10px] text-white/20 text-center font-bold uppercase tracking-widest">
                                    Press anywhere to dismiss
                                </p>
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
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 transition-colors group-hover:border-white/10 group-hover:bg-white/10">
                {icon}
            </div>
            <div className="space-y-1">
                <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
                <p className="text-xs text-white/30 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
