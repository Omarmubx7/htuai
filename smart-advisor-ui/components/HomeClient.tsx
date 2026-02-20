"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MAJORS, MajorKey } from "@/lib/useMajor";
import StudentLogin from "@/components/StudentLogin";
import MajorSelector from "@/components/MajorSelector";
import TranscriptView from "@/components/TranscriptView";
import { CourseData } from "@/types";
import { LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

type AppState = "checking" | "login" | "major-select" | "transcript";

export default function HomeClient() {
    const { data: session, status } = useSession();
    const [appState, setAppState] = useState<AppState>("checking");
    const [studentId, setStudentId] = useState<string | null>(null);
    const [major, setMajorState] = useState<MajorKey | null>(null);
    const [courseData, setCourseData] = useState<CourseData | null>(null);
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
        setStudentId(id);
        try {
            const res = await fetch(`/api/profile/${encodeURIComponent(id)}`);
            const { major: savedMajor } = await res.json();
            if (savedMajor) {
                setMajorState(savedMajor as MajorKey);
                setAppState("transcript");
                loadCourses(savedMajor as MajorKey);
            } else {
                setAppState("major-select");
            }
        } catch {
            setAppState("major-select");
        }
    }

    const handleLogout = () => {
        signOut();
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


    /** Fetch + merge shared + major-specific JSON */
    async function loadCourses(key: MajorKey) {
        setLoading(true);
        const fileMap: Record<MajorKey, string> = {
            data_science: "data_science.json",
            computer_science: "computer_science.json",
            cybersecurity: "cybersecurity.json",
        };
        try {
            const [shared, majorJson] = await Promise.all([
                fetch("/data/shared.json").then(r => r.json()),
                fetch(`/data/${fileMap[key]}`).then(r => r.json()),
            ]);
            const rootKey = Object.keys(majorJson)[0];
            const majorData = majorJson[rootKey];
            setCourseData({
                university_requirements: shared.university_requirements ?? [],
                college_requirements: shared.college_requirements ?? [],
                university_electives: shared.university_electives ?? [],
                department_requirements: majorData.department_requirements ?? [],
                electives: majorData.electives ?? [],
            });
        } catch (e) {
            console.error(e);
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

                        {/* Right: log out */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                        >
                            <LogOut className="w-3 h-3" />
                            Log out
                        </button>
                    </div>
                </header>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center min-h-[60vh]"><Spinner /></div>
                ) : courseData && major ? (
                    <TranscriptView data={courseData} studentId={studentId!} majorKey={major} />
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
