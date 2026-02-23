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
    const [isGcalConnected, setIsGcalConnected] = useState(false);
    const [gcalLoading, setGcalLoading] = useState(false);
    const [isAutoSyncing, setIsAutoSyncing] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchIntegrationStatus = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const res = await fetch("/api/integrations/status");
            if (res.ok) {
                const data = await res.json();
                setIsGcalConnected(data.google_calendar);
            }
        } catch (e) {
            console.error("Failed to fetch integration status:", e);
        }
    }, [isAuthenticated]);

    // ── Load data (DB if authenticated, localStorage fallback) ──
    useEffect(() => {
        if (authStatus === "loading") return;
        fetchIntegrationStatus();

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
    }, [authStatus, isAuthenticated, fetchIntegrationStatus]);

    // ── Google Calendar Sync (Debounced Auto-Sync) ──
    const syncGoogleCalendar = useCallback(async (coursesToSync: PlannerCourse[]) => {
        if (!isGcalConnected || !isAuthenticated) return;
        setIsAutoSyncing(true);
        try {
            const res = await fetch("/api/integrations/google-calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courses: coursesToSync }),
            });
            if (res.ok) {
                const result = await res.json();
                if (result.updatedCourses && data) {
                    // Update courses with new event IDs without triggering another sync
                    const mergedCourses = data.courses.map(c => {
                        const updated = result.updatedCourses.find((uc: any) => uc.id === c.id);
                        return updated ? { ...c, ...updated } : c;
                    });

                    // Direct set to avoid loop
                    setData(prev => prev ? { ...prev, courses: mergedCourses } : null);
                    // Still persist to DB to save the event IDs
                    saveToDb({ ...data, courses: mergedCourses });
                }
            }
        } catch (e) {
            console.error("Auto-sync failed:", e);
        } finally {
            setIsAutoSyncing(false);
        }
    }, [isGcalConnected, isAuthenticated, data]);

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

        // Timer for DB Save
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveToDb(updated), 1500);

        // Timer for Google Calendar Auto-Sync (10 seconds)
        if (isGcalConnected) {
            if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
            autoSyncTimerRef.current = setTimeout(() => syncGoogleCalendar(updated.courses), 10000);
        }
    }, [saveToDb, syncGoogleCalendar, isGcalConnected]);

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

    const handleUpdateStudySession = (session: StudySession) => {
        if (!data) return;
        persist({
            ...data,
            studySessions: data.studySessions.map(s => s.id === session.id ? session : s)
        });
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
                            onUpdateStudySession={handleUpdateStudySession}
                            onDeleteStudySession={handleDeleteStudySession}
                            isGcalConnected={isGcalConnected}
                            isGcalLoading={gcalLoading}
                            isAutoSyncing={isAutoSyncing}
                            onManualSync={() => syncGoogleCalendar(data.courses)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
