"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MAJORS, MajorKey } from "@/lib/useMajor";
import StudentLogin from "@/components/StudentLogin";
import LandingPage from "@/components/LandingPage";
import MajorSelector from "@/components/MajorSelector";
import TranscriptView from "@/components/TranscriptView";
import { CourseData } from "@/types";
import { LogOut, Settings2, Sparkles, Share2, Menu, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

type AppState = "checking" | "landing" | "login" | "major-select" | "transcript";

export default function HomeClient() {
    const { data: session, status } = useSession();
    const [appState, setAppState] = useState<AppState>("checking");
    const [studentId, setStudentId] = useState<string | null>(null);
    const [major, setMajorState] = useState<MajorKey | null>(null);
    const [courseData, setCourseData] = useState<CourseData | null>(null);
    const [rules, setRules] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            } else {
                setAppState("major-select");
            }
        } catch (e) {
            console.error("[Advisor] Profile fetch error:", e);
            setAppState("major-select");
        }
    }

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

                            <nav className="hidden lg:flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
                                {(["Overview", "Planning", "Insights"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        className="px-4 py-1.5 rounded-xl text-xs font-bold text-white/40 hover:text-white transition-all"
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </nav>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-3 pr-6 border-r border-white/5">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">{studentId}</span>
                                        {majorInfo && (
                                            <div className="hidden sm:flex items-center gap-1.5 leading-none">
                                                <span className="text-[11px] font-bold text-white/80">{majorInfo.label}</span>
                                                <span className="text-xs">{majorInfo.icon}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                                        {studentId?.substring(0, 2).toUpperCase()}
                                    </div>
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
                        <TranscriptView
                            data={courseData}
                            studentId={studentId!}
                            majorKey={major!}
                            rules={rules}
                        />
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
