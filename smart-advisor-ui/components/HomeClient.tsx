"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MAJORS, MajorKey } from "@/lib/useMajor";
import StudentLogin from "@/components/StudentLogin";
import MajorSelector from "@/components/MajorSelector";
import TranscriptView from "@/components/TranscriptView";
import { CourseData } from "@/types";
import { LogOut, Settings2, Sparkles, Share2 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

type AppState = "checking" | "login" | "major-select" | "transcript";

export default function HomeClient() {
    const { data: session, status } = useSession();
    const [appState, setAppState] = useState<AppState>("checking");
    const [studentId, setStudentId] = useState<string | null>(null);
    const [major, setMajorState] = useState<MajorKey | null>(null);
    const [courseData, setCourseData] = useState<CourseData | null>(null);
    const [rules, setRules] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            setAppState("login");
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

    if (appState === "checking") return <Spinner />;
    if (appState === "login") return <StudentLogin />;

    if (appState === "major-select") {
        return (
            <AnimatePresence mode="wait">
                <motion.div key="selector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <MajorSelector onSelect={handleMajorSelect} />
                </motion.div>
            </AnimatePresence>
        );
    }

    const majorInfo = MAJORS.find(m => m.key === major) ?? MAJORS[0];

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="transcript"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-screen bg-black mesh-gradient"
            >
                {/* Sticky top bar */}
                <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-black/40 backdrop-blur-2xl">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

                        {/* Left: Brand + Navigation */}
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2 group cursor-default">
                                <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-bold tracking-tight text-white">HTU Advisor</span>
                            </div>

                            <nav className="hidden md:flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
                                <Link
                                    href="/"
                                    className="px-4 py-1.5 text-xs font-bold text-white bg-white/10 rounded-xl transition-all shadow-sm"
                                >
                                    Course Tracker
                                </Link>
                                {/* RESTRICTED VISIBILITY: Only visible for test user '123456' and main admin during verification */}
                                {session?.user && ((session.user as any).student_id === '123456' || session.user.email === 'omarmubaidincs@gmail.com') && (
                                    <Link
                                        href="/planner"
                                        className="px-4 py-1.5 text-xs font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2"
                                    >
                                        <Sparkles className="w-3 h-3 text-violet-400" />
                                        Semester Planner
                                    </Link>
                                )}
                            </nav>
                        </div>

                        {/* Right: User + System */}
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 pr-6 border-r border-white/5">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{studentId}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-bold text-white/80">{majorInfo.label}</span>
                                        <span className="text-sm">{majorInfo.icon}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleMajorChange}
                                    className="p-2 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 text-white/40 hover:text-white transition-all"
                                    title="Edit Profile"
                                >
                                    <Settings2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-red-400 transition-all group"
                                >
                                    <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                                    Log out
                                </button>

                                <button
                                    className="h-9 w-9 rounded-xl bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    onClick={() => {
                                        const url = "https://htuai.mubx.dev";
                                        const text = "Track your HTU courses and degree progress";
                                        if (navigator.share) {
                                            navigator.share({ title: "HTU Advisor", text, url }).catch(() => { });
                                        } else {
                                            navigator.clipboard.writeText(url).then(() => {
                                                const btn = document.getElementById('share-btn');
                                                if (btn) btn.innerHTML = '<span class="text-[10px]">Copied!</span>';
                                            });
                                        }
                                    }}
                                >
                                    <Share2 className="w-4 h-4" id="share-btn" />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center min-h-[60vh]"><Spinner /></div>
                ) : courseData && major && rules ? (
                    <TranscriptView data={courseData} studentId={studentId!} majorKey={major} rules={rules} />
                ) : null}
            </motion.div>
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
