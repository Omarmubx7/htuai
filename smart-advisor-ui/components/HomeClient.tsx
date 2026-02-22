"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MAJORS, MajorKey } from "@/lib/useMajor";
import StudentLogin from "@/components/StudentLogin";
import LandingPage from "@/components/LandingPage";
import MajorSelector from "@/components/MajorSelector";
import TranscriptView from "@/components/TranscriptView";
import InsightsView from "@/components/InsightsView"; // Added InsightsView import
import { CourseData } from "@/types";
import { LogOut, Settings2, Sparkles, Share2, Menu, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

type AppState = "checking" | "landing" | "login" | "major-select" | "transcript";

export default function HomeClient() {
    const { data: session, status } = useSession();
    const [appState, setAppState] = useState<AppState>("checking");
    const [activeTab, setActiveTab] = useState<"Overview" | "Insights">("Overview");
    const [studentId, setStudentId] = useState<string | null>(null);
    const [major, setMajorState] = useState<MajorKey | null>(null);
    const [courseData, setCourseData] = useState<CourseData | null>(null);
    const [rules, setRules] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Progress State (Lifted for Insights)
    const [completedCourses, setCompletedCourses] = useState<Map<string, number>>(new Map());
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | null>(null);
    const [courseNameMap, setCourseNameMap] = useState<Map<string, string>>(new Map()); // Added courseNameMap state

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            setAppState("landing");
        } else if (status === "authenticated" && session?.user) {
            const sid = (session.user as any).student_id || session.user.name;
            if (sid) {
                loadProfile(sid);
            } else {
                // Social user without linked ID yet
                setAppState("major-select");
            }
        }
    }, [status, session]);

    // Effect to build courseNameMap when courseData changes
    useEffect(() => {
        if (courseData) {
            const newMap = new Map<string, string>();
            const categories = [
                courseData.university_requirements,
                courseData.college_requirements,
                courseData.university_electives,
                courseData.department_requirements,
                courseData.electives,
                courseData.work_market_requirements,
            ];

            categories.forEach(category => {
                if (Array.isArray(category)) {
                    category.forEach(item => {
                        if (item.code && item.name) {
                            newMap.set(item.code, item.name);
                        } else if ((item as any).courses) {
                            (item as any).courses.forEach((course: any) => {
                                if (course.code && course.name) {
                                    newMap.set(course.code, course.name);
                                }
                            });
                        }
                    });
                }
            });
            setCourseNameMap(newMap);
        }
    }, [courseData]);

    /** After login: fetch the student's saved major from the DB */
    async function loadProfile(id: string) {
        console.log(`[Advisor] Loading profile for: ${id}`);
        setStudentId(id);
        try {
            const res = await fetch(`/api/profile/${encodeURIComponent(id)}`);
            if (!res.ok) {
                console.error(`[Advisor] Profile fetch failed: ${res.status} ${res.statusText}`);
                setAppState("major-select");
                return;
            }
            const { major: savedMajor } = await res.json();
            console.log(`[Advisor] Profile loaded. Major: ${savedMajor}`);

            if (savedMajor) {
                setMajorState(savedMajor as MajorKey);
                setAppState("transcript");
                loadCourses(savedMajor as MajorKey);
                // Load progress too
                loadProgress(id, savedMajor as MajorKey);
            } else {
                setAppState("major-select");
            }
        } catch (e) {
            console.error("[Advisor] Profile fetch error:", e);
            setAppState("major-select");
        }
    }

    async function loadProgress(id: string, majorKey: string) {
        try {
            const r = await fetch(`/api/progress/${encodeURIComponent(id)}?major=${majorKey}`);
            const { completed } = await r.json();

            const gradeMap = new Map<string, number>();
            completed.forEach((c: any) => {
                const code = typeof c === 'string' ? c : c.code;
                const grade = typeof c === 'object' && c.grade !== undefined ? c.grade : 80;
                gradeMap.set(code, grade);
            });
            setCompletedCourses(gradeMap);
        } catch (e) {
            setCompletedCourses(new Map());
        }
    }

    const toggleCourse = async (code: string) => {
        if (!studentId || !major) return;

        const next = new Map(completedCourses);
        if (next.has(code)) {
            next.delete(code);
        } else {
            next.set(code, 80); // Default to 80% (3.0/4.0 approx)
        }

        setCompletedCourses(next);
        saveProgressRemote(next);
    };

    const updateCourseGrade = (code: string, grade: number) => {
        if (!studentId || !major) return;
        const next = new Map(completedCourses);
        next.set(code, grade);
        setCompletedCourses(next);
        saveProgressRemote(next);
    };

    const saveProgressRemote = async (currentProgress: Map<string, number>) => {
        setSaveStatus("saving");
        try {
            const completedObjects = Array.from(currentProgress.entries()).map(([c, g]) => ({
                code: c,
                name: courseNameMap.get(c) || "",
                grade: g
            }));

            await fetch(`/api/progress/${encodeURIComponent(studentId!)}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ major, completed: completedObjects }),
            });
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus(null), 1500);
        } catch (e) {
            setSaveStatus(null);
        }
    };

    const handleLogout = () => {
        signOut();
    };

    const handleMajorChange = () => {
        setAppState("major-select");
    };

    /** Save major to DB + move to transcript — called only for new students */
    const handleMajorSelect = async (key: MajorKey) => {
        setMajorState(key);
        const sid = studentId || (session?.user as any).student_id || session?.user?.name;
        if (sid) {
            await fetch(`/api/profile/${encodeURIComponent(sid)}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ major: key }),
            });
        }
        loadCourses(key);
        setAppState("transcript");
    };


    /** Fetch + merge shared + major-specific data from curriculum.json + rules */
    async function loadCourses(key: MajorKey) {
        setLoading(true);
        try {
            const rulesPath = "/data/curriculum_rules.json";
            const curriculumPath = "/data/curriculum.json";

            console.log(`[Advisor] Fetching rules: ${rulesPath}`);
            console.log(`[Advisor] Fetching curriculum: ${curriculumPath}`);

            const [rulesRes, curriculumRes] = await Promise.all([
                fetch(rulesPath),
                fetch(curriculumPath),
            ]);

            if (!rulesRes.ok) throw new Error(`Rules fetch failed: ${rulesRes.status}`);
            if (!curriculumRes.ok) throw new Error(`Curriculum fetch failed: ${curriculumRes.status}`);

            const [rulesJson, curriculum] = await Promise.all([
                rulesRes.json(),
                curriculumRes.json(),
            ]);

            setRules(rulesJson);

            const shared = curriculum.shared;
            const majorData = curriculum.majors[key];

            if (!majorData) throw new Error(`Major data not found for ${key}`);

            setCourseData({
                university_requirements: majorData.university_requirements ?? shared.university_requirements ?? [],
                college_requirements: majorData.college_requirements ?? shared.college_requirements ?? [],
                university_electives: majorData.university_electives ?? shared.university_electives ?? [],
                department_requirements: majorData.department_requirements ?? [],
                electives: majorData.electives ?? [],
                work_market_requirements: majorData.work_market_requirements ?? [],
            });
        } catch (e) {
            console.error("[Advisor] Data Load Error:", e);
            // Alert or show error UI? For now just log.
        } finally {
            setLoading(false);
        }
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    // ─── Render ──────────────────────────────────────────────────────────────

    const majorInfo = major ? MAJORS.find(m => m.key === major) : null;

    return (
        <AnimatePresence mode="wait">
            {appState === "checking" && (
                <motion.div
                    key="checking"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <Spinner />
                </motion.div>
            )}

            {appState === "landing" && (
                <motion.div
                    key="landing"
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    <LandingPage onGetStarted={() => setAppState("login")} />
                </motion.div>
            )}

            {appState === "login" && (
                <motion.div
                    key="login"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    <StudentLogin />
                </motion.div>
            )}

            {appState === "major-select" && (
                <motion.div
                    key="major-select"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    <MajorSelector onSelect={handleMajorSelect} />
                </motion.div>
            )}

            {appState === "transcript" && courseData && rules && (
                <motion.div
                    key="transcript"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="min-h-screen flex flex-col pt-20"
                >
                    {/* Header: fixed at top with high z-index */}
                    <motion.header
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="fixed top-0 left-0 right-0 z-[60] h-20 bg-black/40 backdrop-blur-2xl border-b border-white/5"
                    >
                        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
                            {/* Brand section */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-violet-600/10 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.1)] overflow-hidden">
                                    <img src="/mubxlogo.svg" alt="Mubx Logo" className="w-5 h-5 object-contain" />
                                </div>
                                <span className="text-xs sm:text-sm font-black tracking-tight text-white uppercase italic whitespace-nowrap overflow-hidden">HTU Advisor</span>
                            </div>

                            <nav className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
                                {(["Overview", "Planning", "Insights"] as const).map((tab) => {
                                    // Hide Planning for non-admin users
                                    const isAdmin = session?.user &&
                                        ((session.user as any).student_id === '123456' ||
                                            session.user.email === 'omarmubaidincs@gmail.com');

                                    if ((tab === "Planning" || tab === "Insights") && !isAdmin) return null;

                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => tab !== "Planning" && setActiveTab(tab as any)}
                                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab
                                                ? "bg-white/10 text-white shadow-sm"
                                                : "text-white/40 hover:text-white"
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    );
                                })}
                            </nav>

                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">{studentId}</span>
                                    {majorInfo && (
                                        <div className="hidden sm:flex items-center gap-2">
                                            <button
                                                onClick={handleMajorChange}
                                                className="group flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                                            >
                                                <Settings2 className="w-3 h-3 text-white/40 group-hover:text-white transition-colors" />
                                                <span className="text-[11px] font-bold text-white/80 group-hover:text-white">{majorInfo.label}</span>
                                                <span className="text-xs">{majorInfo.icon}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                                    {studentId?.substring(0, 2).toUpperCase()}
                                </div>

                                <button
                                    onClick={() => signOut()}
                                    className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-red-400 hover:bg-red-400/5 transition-all"
                                    title="Sign out"
                                >
                                    <LogOut className="w-4.5 h-4.5" />
                                </button>
                            </div>
                        </div>
                    </motion.header>

                    <main className="flex-1">
                        <AnimatePresence mode="wait">
                            {activeTab === "Overview" ? (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <TranscriptView
                                        data={courseData}
                                        studentId={studentId!}
                                        majorKey={major!}
                                        rules={rules}
                                        completedCourses={completedCourses}
                                        toggleCourse={toggleCourse}
                                        updateCourseGrade={updateCourseGrade}
                                        saveStatus={saveStatus}
                                        resetProgress={() => {
                                            setCompletedCourses(new Map());
                                            fetch(`/api/progress/${encodeURIComponent(studentId!)}/save`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ major, completed: [] }),
                                            });
                                        }}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="insights"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="max-w-7xl mx-auto px-6 py-8"
                                >
                                    <InsightsView
                                        data={courseData}
                                        completedCourses={completedCourses}
                                        majorKey={major!}
                                        rules={rules}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Spinner() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="w-6 h-6 border border-white/10 border-t-violet-500 rounded-full animate-spin" />
        </div>
    );
}
