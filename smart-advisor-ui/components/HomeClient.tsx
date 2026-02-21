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
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="min-h-screen bg-black"
            >
                {/* Sticky top bar */}
                <header className="sticky top-0 z-50 border-b border-white/5"
                    style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(16px)" }}>
                    <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">

                        {/* Left: app name + student + major */}
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-white/50 tracking-tight hidden sm:block">
                                HTU Tracker
                            </span>

                            <div className="w-px h-4 bg-white/8 hidden sm:block" />

                            <Link
                                href="/planner"
                                className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-violet-400 transition-colors px-2 py-1 rounded-md hover:bg-violet-500/5 group"
                            >
                                <Sparkles className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                <span>Semester Planner</span>
                            </Link>

                            <div className="w-px h-4 bg-white/8 hidden sm:block" />

                            {/* Student ID */}
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/25 flex items-center justify-center">
                                    <span className="text-[9px] text-violet-300 font-bold">{studentId?.slice(-2)}</span>
                                </div>
                                <span className="text-xs font-mono text-white/50">{studentId}</span>
                            </div>

                            <div className="w-px h-4 bg-white/8" />

                            {/* Major */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm">{majorInfo.icon}</span>
                                <span className="text-xs font-medium text-white/60 hidden sm:block">{majorInfo.label}</span>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleMajorChange}
                                className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                            >
                                <Settings2 className="w-3 h-3" />
                                Change Major
                            </button>

                            <div className="w-px h-4 bg-white/8" />

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                            >
                                <LogOut className="w-3 h-3" />
                                Log out
                            </button>

                            <div className="w-px h-4 bg-white/8" />

                            <button
                                onClick={() => {
                                    const url = "https://htuai.vercel.app";
                                    const text = "Track your HTU courses and degree progress";
                                    if (navigator.share) {
                                        navigator.share({ title: "HTU Courses Tracker", text, url }).catch(() => { });
                                    } else {
                                        navigator.clipboard.writeText(url).then(() => {
                                            const btn = document.getElementById('share-btn');
                                            if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Share'; }, 1500); }
                                        });
                                    }
                                }}
                                className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-violet-400/70 transition-colors px-3 py-1.5 rounded-lg hover:bg-violet-500/5"
                            >
                                <Share2 className="w-3 h-3" />
                                <span id="share-btn">Share</span>
                            </button>

                            <div className="w-px h-4 bg-white/8" />

                            <a
                                href="https://mubx.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-white/20 hover:text-violet-400/70 transition-colors font-medium tracking-wide"
                            >
                                made by <span className="font-semibold">mubx</span>
                            </a>
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
