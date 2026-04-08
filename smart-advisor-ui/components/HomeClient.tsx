"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MAJORS, MajorKey } from "@/lib/useMajor";
import LandingPage from "@/components/LandingPage";
import { Course, CourseData, CurriculumRules } from "@/types";
import { Settings2, LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";
import dynamic from "next/dynamic";
import { safeStorage } from "@/lib/safe-storage";
import { fetchWithRetry, fetchJSON } from "@/lib/fetch-retry";

const StudentLogin = dynamic(() => import("@/components/StudentLogin"), { ssr: false });
const MajorSelector = dynamic(() => import("@/components/MajorSelector"), { ssr: false });
const CourseTrackerView = dynamic(() => import("@/components/CourseTrackerView"));

type AppState = "checking" | "landing" | "login" | "major-select" | "course-tracker" | "changing-major";

export default function HomeClient() {
    const { data: session, status } = useSession();
    const [appState, setAppState] = useState<AppState>("checking");
    const [studentId, setStudentId] = useState<string | null>(null);
    const [major, setMajor] = useState<MajorKey | null>(null);
    const [courseData, setCourseData] = useState<CourseData | null>(null);
    const [rules, setRules] = useState<CurriculumRules | null>(null);
    
    // Progress State (Lifted for Insights)
    const [completedCourses, setCompletedCourses] = useState<Map<string, string>>(new Map());
    const [previousGpaHistory, setPreviousGpaHistory] = useState<{ gpa: number | null, credits: number | null }>({ gpa: null, credits: null });
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | null>(null);
    const [courseNameMap, setCourseNameMap] = useState<Map<string, string>>(new Map());
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    // ─── 1. Core Logic & Data Fetching (Defined first to avoid ReferenceErrors) ────────────────

    const saveProgressRemote = useCallback(async (currentProgress: Map<string, string>) => {
        if (!studentId) return;
        try {
            const completedObjects = Array.from(currentProgress.entries()).map(([c, g]) => ({
                code: c,
                name: courseNameMap.get(c) || "",
                grade: g
            }));
            await fetchWithRetry(`/api/progress/${encodeURIComponent(studentId)}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ major, completed: completedObjects }),
                retries: 2
            });
            setSaveStatus("saved");
        } catch (error) {
            console.error("Failed to save progress", error);
            setSaveStatus(null);
        }
    }, [studentId, major, courseNameMap, router]);

    const debouncedSave = useCallback((nextState: Map<string, string>) => {
        setSaveStatus("saving");
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        saveProgressRemote(nextState);
    }, [saveProgressRemote]);

    const loadCourses = useCallback(async (key: MajorKey): Promise<boolean> => {
        try {
            const rulesPath = "/data/curriculum_rules.json";
            const curriculumPath = "/data/curriculum.json";
            const [rulesRes, currRes] = await Promise.all([
                fetchWithRetry(rulesPath, { retries: 2 }), 
                fetchWithRetry(curriculumPath, { retries: 2 })
            ]);

            if (!rulesRes.ok || !currRes.ok) {
                throw new Error("Failed to load curriculum resources");
            }

            const rulesData = await rulesRes.json();
            const currData = await currRes.json();
            setRules(rulesData);

            if (!currData.majors?.[key]) {
                return false;
            }

            const majorData = currData.majors[key];
            const shared = currData.shared;
            const seenGlobal = new Set<string>();

            const isCourseApplicableToMajor = (course: Course): boolean => {
                if (!course.major_keys || course.major_keys.length === 0) return true;
                return course.major_keys.includes(key);
            };
            
            const mergeAndDeduplicateGlobal = (sharedArr: Course[] = [], majorArr: Course[] = []): Course[] => {
                const scopedShared = sharedArr.filter(isCourseApplicableToMajor);
                const combined = [...scopedShared, ...majorArr];
                return combined.filter((item) => {
                    if (!item.code) return true;
                    if (seenGlobal.has(item.code)) return false;
                    seenGlobal.add(item.code);
                    return true;
                });
            };

            setCourseData({
                university_requirements: mergeAndDeduplicateGlobal(shared.university_requirements, majorData.university_requirements),
                college_requirements: mergeAndDeduplicateGlobal(shared.college_requirements, majorData.college_requirements),
                university_electives: mergeAndDeduplicateGlobal(shared.university_electives, majorData.university_electives),
                department_requirements: mergeAndDeduplicateGlobal(shared.department_requirements, majorData.department_requirements),
                electives: mergeAndDeduplicateGlobal(shared.electives, majorData.electives),
                work_market_requirements: mergeAndDeduplicateGlobal(shared.work_market_requirements, majorData.work_market_requirements),
            });

            return true;
        } catch (error) {
            console.error("Failed to load courses", error);
            setRules(null);
            setCourseData(null);
            return false;
        }
    }, []);

    const loadProgress = useCallback(async (id: string, majorKey: string) => {
        try {
            const data = await fetchJSON<{ completed: Array<string | { code: string; grade?: string | number }> }>(
                `/api/progress/${encodeURIComponent(id)}?major=${majorKey}`,
                { retries: 2 }
            );
            const gradeMap = new Map<string, string>();
            data.completed.forEach((c) => {
                const code = typeof c === 'string' ? c : c.code;
                let grade = typeof c === 'object' && c.grade !== undefined ? String(c.grade) : "M";
                if (!Number.isNaN(Number(grade)) && grade !== "WF") {
                    const n = Number(grade);
                    if (n >= 90) grade = "D"; else if (n >= 80) grade = "M"; else if (n >= 70) grade = "P"; else grade = "U";
                }
                gradeMap.set(code, grade);
            });
            setCompletedCourses(gradeMap);
        } catch (error) {
            console.error("Failed to load progress", error);
            setCompletedCourses(new Map());
        }
    }, []);

    const loadProfile = useCallback(async (id: string) => {
        setStudentId(id);
        try {
            const res = await fetchWithRetry(`/api/profile/${encodeURIComponent(id)}`, { retries: 2 });
            if (!res.ok) { 
                setAppState("major-select"); 
                return; 
            }
            const { major: savedMajor, previous_gpa, previous_credits } = await res.json();
            if (savedMajor) {
                setMajor(savedMajor as MajorKey);
                setPreviousGpaHistory({ gpa: previous_gpa ?? null, credits: previous_credits ?? null });
                const loaded = await loadCourses(savedMajor as MajorKey);
                await loadProgress(id, savedMajor as MajorKey);
                setAppState(loaded ? "course-tracker" : "major-select");
            } else { setAppState("major-select"); }
        } catch (error) {
            console.error("Failed to load profile", error);
            setAppState("major-select");
        }
    }, [loadCourses, loadProgress]);

    // ─── 2. Mutation Handlers (Referencing core logic) ───────────────────────

    const toggleCourse = useCallback(async (code: string) => {
        if (!studentId || !major) return;
        
        setCompletedCourses(prev => {
            const next = new Map(prev);
            if (next.has(code)) next.delete(code);
            else next.set(code, "M");
            debouncedSave(next);
            return next;
        });
    }, [studentId, major, debouncedSave]);

    const updateCourseGrade = useCallback((code: string, grade: string) => {
        if (!studentId || !major) return;
        
        setCompletedCourses(prev => {
            const next = new Map(prev);
            next.set(code, grade);
            debouncedSave(next);
            return next;
        });
    }, [studentId, major, debouncedSave]);

    const handleMajorSelect = async (key: MajorKey) => {
        setAppState("changing-major");
        setMajor(key);
        safeStorage.set("htuai-major", key);
        const sid = studentId || session?.user?.student_id || session?.user?.name;
        if (sid) {
            try {
                await fetchWithRetry(`/api/profile/${encodeURIComponent(sid)}/save`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ major: key }),
                    retries: 2
                });
            } catch (error) {
                console.error("Failed to save major choice", error);
            }
        }
        const loaded = await loadCourses(key);
        setAppState(loaded ? "course-tracker" : "major-select");
    };

    // ─── 3. Life Cycle Effects ──────────────────────────────────────────────

    // Load initial major
    useEffect(() => {
        const storedMajor = safeStorage.get("htuai-major");
        if (storedMajor) setMajor(storedMajor as MajorKey);
    }, []);

    // Build course name map
    useEffect(() => {
        if (!courseData) return;
        const newMap = new Map<string, string>();
        const processCategory = (category?: Course[]) => {
            if (!Array.isArray(category)) return;
            for (const item of category) {
                if (item.code && item.name) newMap.set(item.code, item.name);
            }
        };
        [
            courseData.university_requirements,
            courseData.college_requirements,
            courseData.university_electives,
            courseData.department_requirements,
            courseData.electives,
            courseData.work_market_requirements,
        ].forEach(processCategory);
        setCourseNameMap(newMap);
    }, [courseData]);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") {
            setAppState("landing");
        } else if (status === "authenticated" && session?.user) {
            const sid = session.user.student_id || session.user.name;
            if (sid) {
                void loadProfile(sid);
            } else {
                setAppState("major-select");
            }
        }
    }, [status, session, loadProfile]);

    const majorInfo = major ? MAJORS.find(m => m.key === major) : null;

    return (
        <AnimatePresence mode="wait">
            {(appState === "checking" || appState === "changing-major") && (
                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Spinner message={appState === "changing-major" ? "Updating Curriculum" : "Initializing Workspace"} />
                </motion.div>
            )}

            {appState === "landing" && (
                <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <LandingPage onGetStarted={() => setAppState("login")} />
                </motion.div>
            )}

            {appState === "login" && (
                <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <StudentLogin />
                </motion.div>
            )}

            {appState === "major-select" && (
                <motion.div key="major-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <MajorSelector onSelect={handleMajorSelect} />
                </motion.div>
            )}

            {appState === "course-tracker" && courseData && rules && (
                <motion.div
                    key="tracker"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="min-h-screen flex flex-col pt-20"
                >
                    <header className="fixed top-0 left-0 right-0 z-60 h-20 bg-white/2 backdrop-blur-2xl border-b border-white/6">
                        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
                            <div id="wt-header-brand" className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-violet-600/10 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.1)] overflow-hidden">
                                    <Image src="/htuai-dark-logo.svg" alt="HTUAI" width={20} height={20} className="dark-logo" />
                                    <Image src="/htuai-light-logo.svg" alt="HTUAI" width={20} height={20} className="light-logo" />
                                </div>
                                <span className="text-xs sm:text-sm font-black tracking-tight text-white uppercase italic">HTUAI</span>
                            </div>

                            <div id="wt-profile" className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{studentId}</span>
                                    {majorInfo && (
                                        <button onClick={() => setAppState("major-select")} className="group flex items-center gap-2 px-2 py-1 rounded-xl bg-white/5 border border-white/5">
                                            <Settings2 className="w-3 h-3 text-white/40" />
                                            <span className="text-[10px] font-bold text-white/80">{majorInfo.label}</span>
                                            <span>{majorInfo.icon}</span>
                                        </button>
                                    )}
                                </div>
                                <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                                    {studentId?.substring(0, 2).toUpperCase()}
                                </div>
                                <button onClick={() => signOut()} className="p-2 rounded-2xl bg-white/5 text-white/40 hover:text-red-400 transition-all"><LogOut className="w-4.5 h-4.5" /></button>
                                <ThemeToggle />
                            </div>
                        </div>
                    </header>

                    <main className="flex-1">
                        <CourseTrackerView
                            data={courseData}
                            studentId={studentId!}
                            majorKey={major!}
                            rules={rules}
                            completedCourses={completedCourses}
                            toggleCourse={toggleCourse}
                            updateCourseGrade={updateCourseGrade}
                            saveStatus={saveStatus}
                            previousGpaHistory={previousGpaHistory}
                            setPreviousGpaHistory={setPreviousGpaHistory}
                            resetProgress={() => {
                                setCompletedCourses(new Map());
                                debouncedSave(new Map());
                            }}
                        />
                    </main>
                </motion.div>
            )}

            {appState === "course-tracker" && (!courseData || !rules) && (
                <motion.div key="tracker-fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Spinner message="Loading your curriculum..." />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Spinner({ message = "Syncing data..." }: Readonly<{ message?: string }>) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black">
            <div className="absolute inset-0 opacity-20 pointer-events-none mesh-gradient" />
            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden animate-pulse">
                    <Image src="/htuai-dark-logo.svg" alt="HTUAI" width={32} height={32} className="dark-logo" />
                    <Image src="/htuai-light-logo.svg" alt="HTUAI" width={32} height={32} className="light-logo" />
                </div>
                <div className="text-center">
                    <h2 className="text-white font-bold text-lg">HTU Smart Advisor</h2>
                    <div className="flex items-center justify-center gap-2 text-white/40 text-sm mt-1">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                        <span>{message}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
