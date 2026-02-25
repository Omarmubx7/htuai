"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookOpen, Clock, TrendingUp, Calendar as CalendarIcon, PlayCircle, Settings } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

export default function PlannerStudyLogClient() {
    const { status } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        } else if (status === "authenticated") {
            fetchStudyLogInfo();
        }
    }, [status, router]);

    const fetchStudyLogInfo = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/planner/summary");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" />
            </div>
        );
    }

    const { study_sessions, neglected_course } = stats?.studyLogStats || { study_sessions: [], neglected_course: null };

    return (
        <div className="min-h-screen pb-24 bg-black text-white selection:bg-violet-500/30 overflow-hidden">
            <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <Link href="/planner" className="text-[10px] text-white/40 uppercase tracking-widest font-bold hover:text-white transition-colors mb-1 flex items-center gap-1">
                        ← Dashboard
                    </Link>
                    <h1 className="font-bold text-lg flex items-center gap-2">
                        <PlayCircle className="w-5 h-5 text-emerald-400" /> Study Log
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Link href="/planner/settings" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-colors">
                        <Settings className="w-4 h-4" />
                    </Link>
                    <Link href="/" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold sm:text-sm text-white/70 transition-colors">
                        Course Tracker
                    </Link>
                </div>
            </header>

            <main className="max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-4 md:px-6 pt-8 space-y-6">
                <div>
                    <h2 className="text-2xl font-black font-display tracking-tight">Focus & Tracking</h2>
                    <p className="text-white/40 text-sm mt-1">Review your recent study sessions and identify areas needing attention.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-white/5">
                    {/* Time Logged Card */}
                    <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="font-bold text-lg">Total Time Streamed</h3>
                        </div>
                        <div className="text-4xl font-black tabular-nums">
                            {Math.floor((stats?.studyLogStats?.total_study_minutes || 0) / 60)}<span className="text-lg text-white/40 font-bold ml-1">hrs</span>
                            {' '}
                            {(stats?.studyLogStats?.total_study_minutes || 0) % 60}<span className="text-lg text-white/40 font-bold ml-1">mins</span>
                        </div>
                    </div>

                    {/* Neglected Course Insight */}
                    <div className="premium-card p-6 flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-rose-400" />
                            </div>
                            <h3 className="font-bold text-lg">Most Neglected</h3>
                        </div>
                        {neglected_course ? (
                            <div className="mt-2">
                                <p className="text-sm text-white/60 mb-1">Needs attention soon:</p>
                                <p className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-rose-400 to-orange-400">
                                    {neglected_course.course.name}
                                </p>
                                <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mt-2">
                                    Last studied: {neglected_course.last_studied ? new Date(neglected_course.last_studied).toLocaleDateString() : 'Never'}
                                </p>
                            </div>
                        ) : (
                            <p className="text-white/40 text-sm italic mt-4">All tracked courses have recent activity.</p>
                        )}
                    </div>
                </div>

                {/* Session History */}
                <div>
                    <h3 className="text-lg font-bold font-display tracking-tight border-b border-white/5 pb-2 mb-4 flex items-center gap-2 mt-8">
                        <CalendarIcon className="w-5 h-5 text-violet-400" /> Session History
                    </h3>

                    <div className="space-y-3">
                        {study_sessions.length > 0 ? (
                            study_sessions.map((session: any, index: number) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={session.id}
                                    className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.04] hover:border-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex flex-col items-center justify-center text-white/40 font-bold">
                                            <span className="text-[10px] uppercase leading-none">{new Date(session.created_at).toLocaleDateString('en-US', { month: 'short' })}</span>
                                            <span className="text-sm leading-none mt-0.5">{new Date(session.created_at).getDate()}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white/90 group-hover:text-white transition-colors">
                                                {session.course.name}
                                            </p>
                                            <p className="text-[11px] text-white/40 uppercase tracking-wider font-bold mt-1">
                                                {session.notes || "No notes attached"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-400">+{session.duration_minutes}m</p>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-12 text-center rounded-3xl border border-dashed border-white/5">
                                <BookOpen className="w-8 h-8 text-white/20 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-white/50">No study sessions recorded yet.</p>
                                <p className="text-xs text-white/30 mt-1">Visit a course page to log your first session.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
