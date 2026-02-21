"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Cloud, CloudOff, Loader2 } from "lucide-react";
import Link from "next/link";
import PlannerSetup from "../../components/PlannerSetup";
import PlannerDashboard from "../../components/PlannerDashboard";

// ── Types ────────────────────────────────────────────────────────────────

export interface PlannerCourse {
    id: string;
    name: string;
    code?: string;
    credits: number;
    hasMidterm: boolean;
    midtermDate?: string;
    finalDate?: string;
    professor?: string;
    status: "In Progress" | "Completed" | "At Risk";
    grade?: string | null;
}

export interface StudySession {
    id: string;
    courseId: string;
    date: string;
    hours: number;
    notes?: string;
}

export interface SemesterData {
    id: string;
    name?: string;
    courses: PlannerCourse[];
    studySessions: StudySession[];
}

// ── Storage ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "htu_semester_planner_v2";
const LEGACY_KEY = "htu_semester_planner_v1";

function generateId() {
    return Math.random().toString(36).substring(2, 11);
}

export default function PlannerPage() {
    const { data: session, status: authStatus } = useSession();
    const isAuthenticated = authStatus === "authenticated";
    const [data, setData] = useState<SemesterData | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Load data (DB if authenticated, localStorage fallback) ──
    useEffect(() => {
        if (authStatus === "loading") return;

        async function load() {
            if (isAuthenticated) {
                try {
                    const res = await fetch("/api/planner");
                    if (res.ok) {
                        const remote = await res.json();
                        if (remote && remote.courses && Array.isArray(remote.courses)) {
                            setData({
                                id: remote.id,
                                name: remote.name,
                                courses: remote.courses,
                                studySessions: remote.studySessions || [],
                            });
                            setIsLoaded(true);
                            setSyncStatus("saved");
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Failed to load from DB:", e);
                }
            }
            // Fallback: localStorage
            let saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (!parsed.id) parsed.id = generateId();
                    setData(parsed);
                } catch {}
            } else {
                saved = localStorage.getItem(LEGACY_KEY);
                if (saved) {
                    try {
                        const courses = JSON.parse(saved);
                        if (Array.isArray(courses)) {
                            const migrated: SemesterData = { id: generateId(), courses, studySessions: [] };
                            setData(migrated);
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
                            localStorage.removeItem(LEGACY_KEY);
                        }
                    } catch {}
                }
            }
            setIsLoaded(true);
        }
        load();
    }, [authStatus, isAuthenticated]);

    // ── Debounced save to DB ──
    const saveToDb = useCallback(async (semester: SemesterData) => {
        if (!isAuthenticated) return;
        setSyncStatus("saving");
        try {
            const res = await fetch("/api/planner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(semester),
            });
            setSyncStatus(res.ok ? "saved" : "error");
        } catch {
            setSyncStatus("error");
        }
    }, [isAuthenticated]);

    const persist = useCallback((updated: SemesterData) => {
        setData(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        // Debounced DB save
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveToDb(updated), 1200);
    }, [saveToDb]);

    const handleSetupComplete = (courses: PlannerCourse[]) => {
        persist({ id: generateId(), courses, studySessions: [] });
    };

    const handleUpdateCourses = (courses: PlannerCourse[]) => {
        if (!data) return;
        persist({ ...data, courses });
    };

    const handleAddStudySession = (session: StudySession) => {
        if (!data) return;
        persist({ ...data, studySessions: [...data.studySessions, session] });
    };

    const handleDeleteStudySession = (id: string) => {
        if (!data) return;
        persist({ ...data, studySessions: data.studySessions.filter(s => s.id !== id) });
    };

    const handleReset = async () => {
        if (confirm("Reset your planner? All data will be lost.")) {
            setData(null);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LEGACY_KEY);
            if (isAuthenticated) {
                try { await fetch("/api/planner", { method: "DELETE" }); } catch {}
            }
        }
    };

    if (!isLoaded || authStatus === "loading") return <div className="min-h-screen bg-black" />;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-violet-500/30">
            {/* Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            <h1 className="text-sm font-bold tracking-tight">Semester Planner</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isAuthenticated && data && (
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
                                {syncStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin text-violet-400" /><span className="text-violet-400">Saving…</span></>}
                                {syncStatus === "saved" && <><Cloud className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Synced</span></>}
                                {syncStatus === "error" && <><CloudOff className="w-3 h-3 text-red-400" /><span className="text-red-400">Offline</span></>}
                            </div>
                        )}
                        {data && (
                            <button
                                onClick={handleReset}
                                className="text-[10px] uppercase tracking-wider font-bold text-white/20 hover:text-red-400/60 transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-10 relative z-10">
                <AnimatePresence mode="wait">
                    {!data ? (
                        <motion.div
                            key="setup"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <PlannerSetup onComplete={handleSetupComplete} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <PlannerDashboard
                                courses={data.courses}
                                studySessions={data.studySessions}
                                onUpdateCourses={handleUpdateCourses}
                                onAddStudySession={handleAddStudySession}
                                onDeleteStudySession={handleDeleteStudySession}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
