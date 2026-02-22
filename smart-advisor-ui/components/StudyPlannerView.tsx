"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import PlannerSetup from "./PlannerSetup";
import PlannerDashboard from "./PlannerDashboard";
import { PlannerCourse, StudySession, SemesterData } from "@/types";

const STORAGE_KEY = "htu_semester_planner_v2";
const LEGACY_KEY = "htu_semester_planner_v1";

function generateId() {
    return Math.random().toString(36).substring(2, 11);
}

export default function StudyPlannerView() {
    const { data: session, status: authStatus } = useSession();
    const isAuthenticated = authStatus === "authenticated";
    const [data, setData] = useState<SemesterData | null>(null);
    const [allSemesters, setAllSemesters] = useState<SemesterData[]>([]);
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
                        }
                    }

                    // Fetch all history for KPIs
                    const historyRes = await fetch("/api/planner?all=true");
                    if (historyRes.ok) {
                        const history = await historyRes.json();
                        setAllSemesters(history);
                        if (!data && history.length > 0) {
                            const latest = history[0];
                            setData(latest);
                        }
                        setIsLoaded(true);
                        setSyncStatus("saved");
                        return;
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
                } catch { }
            } else {
                // Legacy migration
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
                    } catch { }
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
                try { await fetch("/api/planner", { method: "DELETE" }); } catch { }
            }
        }
    };

    if (!isLoaded || authStatus === "loading") {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-6 h-6 animate-spin text-white/20" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {isAuthenticated && data && (
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
                            {syncStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin text-violet-400" /><span className="text-violet-400 font-black">Saving…</span></>}
                            {syncStatus === "saved" && <><Cloud className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400 font-black">Synced</span></>}
                            {syncStatus === "error" && <><CloudOff className="w-3 h-3 text-red-400" /><span className="text-red-400 font-black">Offline</span></>}
                        </div>
                    )}
                </div>
                {data && (
                    <button
                        onClick={handleReset}
                        className="text-[10px] uppercase tracking-wider font-bold text-white/20 hover:text-red-400/60 transition-colors"
                    >
                        Reset Planner
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {!data ? (
                    <motion.div
                        key="setup"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
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
                            allSemesters={allSemesters}
                            onUpdateCourses={handleUpdateCourses}
                            onAddStudySession={handleAddStudySession}
                            onDeleteStudySession={handleDeleteStudySession}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
