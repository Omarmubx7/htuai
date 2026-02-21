"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
    BookOpen, Clock, Trophy, Plus,
    Trash2, GraduationCap, CheckCircle2,
    AlertTriangle, Lightbulb, Info,
    BarChart3, Calendar, Settings, ExternalLink, Loader2
} from "lucide-react";
import { PlannerCourse, StudySession } from "@/app/planner/page";
import {
    calculateGPA, getClassification, GRADE_MAP,
    SCORED_GRADES, generateInsights, type Insight, type HTUGrade
} from "@/lib/grading";
import WeeklySummary from "./WeeklySummary";

// ── Color mapping (Tailwind needs static class strings) ─────────────────

const COLORS: Record<string, { bg: string; border: string; text: string }> = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
    blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400" },
    violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-400" },
    amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400" },
    red:     { bg: "bg-red-500/10",     border: "border-red-500/20",     text: "text-red-400" },
    gray:    { bg: "bg-gray-500/10",    border: "border-gray-500/20",    text: "text-gray-400" },
};
const gc = (key: string) => COLORS[key] || COLORS.gray;

// ── Props ───────────────────────────────────────────────────────────────

interface PlannerDashboardProps {
    courses: PlannerCourse[];
    studySessions: StudySession[];
    onUpdateCourses: (courses: PlannerCourse[]) => void;
    onAddStudySession: (session: StudySession) => void;
    onDeleteStudySession: (id: string) => void;
}

export default function PlannerDashboard({
    courses, studySessions, onUpdateCourses, onAddStudySession, onDeleteStudySession
}: PlannerDashboardProps) {

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

    const updateDate = (id: string, field: "midtermDate" | "finalDate", value: string) => {
        onUpdateCourses(courses.map(c => c.id === id ? { ...c, [field]: value || undefined } : c));
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
            case "info":    return <Info className="w-4 h-4 text-blue-400" />;
            case "success": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case "tip":     return <Lightbulb className="w-4 h-4 text-amber-400" />;
        }
    };
    const insightBorder = (type: Insight["type"]) => {
        switch (type) {
            case "warning": return "border-red-500/20 bg-red-500/5";
            case "info":    return "border-blue-500/20 bg-blue-500/5";
            case "success": return "border-emerald-500/20 bg-emerald-500/5";
            case "tip":     return "border-amber-500/20 bg-amber-500/5";
        }
    };

    const clsColor = gc(classification.colorKey);

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <div className="space-y-8">

            {/* ════ Stats Overview ════ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
            </div>

            {/* ════ Course Table ════ */}
            <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Courses</h3>
                <div className="glass-card-premium rounded-3xl border border-white/5 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[720px]">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <Th>Course</Th>
                                <Th className="w-14">CH</Th>
                                <Th className="w-36">Grade</Th>
                                <Th className="w-36">Midterm</Th>
                                <Th className="w-36">Final</Th>
                                <Th className="w-16">Hours</Th>
                                <Th className="w-28">Status</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.map(course => {
                                const gradeInfo = course.grade ? GRADE_MAP[course.grade] : null;
                                const gColor = gradeInfo ? gc(gradeInfo.colorKey) : null;
                                return (
                                    <tr key={course.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        {/* Name */}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${gColor ? gColor.bg : "bg-violet-500/50"}`} />
                                                <span className="text-sm font-medium">{course.name}</span>
                                            </div>
                                        </td>
                                        {/* Credits */}
                                        <td className="py-3 px-4 text-xs font-mono text-white/40">{course.credits}</td>
                                        {/* Grade */}
                                        <td className="py-3 px-4">
                                            <select
                                                value={course.grade || ""}
                                                onChange={e => updateGrade(course.id, e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-medium text-white outline-none focus:border-violet-500/40 transition-colors w-full cursor-pointer"
                                                style={{ colorScheme: "dark" }}
                                            >
                                                <option value="" className="bg-[#111]">Not set</option>
                                                <option value="D" className="bg-[#111]">D — Distinction</option>
                                                <option value="M" className="bg-[#111]">M — Merit</option>
                                                <option value="P" className="bg-[#111]">P — Pass</option>
                                                <option value="U" className="bg-[#111]">U — Unclassified</option>
                                            </select>
                                        </td>
                                        {/* Midterm Date */}
                                        <td className="py-3 px-4">
                                            <input
                                                type="date"
                                                value={course.midtermDate || ""}
                                                onChange={e => updateDate(course.id, "midtermDate", e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500/40 transition-colors w-full"
                                                style={{ colorScheme: "dark" }}
                                            />
                                        </td>
                                        {/* Final Date */}
                                        <td className="py-3 px-4">
                                            <input
                                                type="date"
                                                value={course.finalDate || ""}
                                                onChange={e => updateDate(course.id, "finalDate", e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500/40 transition-colors w-full"
                                                style={{ colorScheme: "dark" }}
                                            />
                                        </td>
                                        {/* Study Hours */}
                                        <td className="py-3 px-4 text-xs font-mono text-white/40 text-center">
                                            {(courseHours[course.id] || 0).toFixed(1)}
                                        </td>
                                        {/* Status */}
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => toggleStatus(course.id)}
                                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                                    course.status === "Completed"
                                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                        : course.status === "At Risk"
                                                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                                                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                                }`}
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

            {/* ════ Study Log + Insights ════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Study Log ── */}
                <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
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
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
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
                                    <div className="text-[10px] text-white/30">{info.points.toFixed(1)} pts</div>
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

function IntegrationPanel({ courses }: { courses: PlannerCourse[] }) {
    const [gcalLoading, setGcalLoading] = useState(false);
    const [notionLoading, setNotionLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
    const autoSyncedRef = useRef(false);

    // Handle URL params after OAuth returns
    useEffect(() => {
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
        }
        if (connected === "notion" && courses.length > 0) {
            autoSyncedRef.current = true;
            (async () => {
                setNotionLoading(true);
                setMessage({ text: "Auto-syncing courses to Notion…", ok: true });
                try {
                    const res = await fetch("/api/integrations/notion", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ courses }),
                        // semesterName will be derived from the saved metadata on the server
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
    }, [courses]);

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
                setMessage({ text: data.error || "Failed to sync", ok: false });
            }
        } catch {
            setMessage({ text: "Network error", ok: false });
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
                setMessage({ text: data.error || "Failed to sync", ok: false });
            }
        } catch {
            setMessage({ text: "Network error", ok: false });
        }
        setNotionLoading(false);
    };

    const initNotionPage = async () => {
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
                setMessage({ text: data.error || "Failed to create page. Make sure Notion is connected first.", ok: false });
            }
        } catch {
            setMessage({ text: "Network error", ok: false });
        }
        setNotionLoading(false);
    };

    return (
        <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" /> Integrations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Google Calendar */}
                <div className="glass-card-premium p-5 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold">Google Calendar</span>
                    </div>
                    <p className="text-xs text-white/30">Push midterm & final dates directly as calendar events with reminders.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={connectGoogleCalendar}
                            className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-1.5"
                        >
                            <ExternalLink className="w-3 h-3" /> Connect
                        </button>
                        <button
                            onClick={syncGoogleCalendar}
                            disabled={gcalLoading}
                            className="flex-1 px-3 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            {gcalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />} Sync
                        </button>
                    </div>
                </div>

                {/* Notion */}
                <div className="glass-card-premium p-5 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-white" />
                        <span className="text-sm font-semibold">Notion</span>
                    </div>
                    <p className="text-xs text-white/30">Creates a Study Plan page with all your courses. Select any page to share when Notion asks.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={connectNotion}
                            className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
                        >
                            <ExternalLink className="w-3 h-3" /> Connect
                        </button>
                        <button
                            onClick={() => initNotionPage()}
                            disabled={notionLoading}
                            className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/5 text-violet-400 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            {notionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} New Page
                        </button>
                        <button
                            onClick={syncNotion}
                            disabled={notionLoading}
                            className="flex-1 px-3 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            {notionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />} Sync
                        </button>
                    </div>
                </div>
            </div>
            {message && (
                <div className={`mt-3 px-4 py-2.5 rounded-xl text-xs font-medium border ${
                    message.ok
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}>
                    {message.text}
                </div>
            )}
        </section>
    );
}
