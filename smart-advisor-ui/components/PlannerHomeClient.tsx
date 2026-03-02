"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Trophy, Calendar, Sparkles, ChevronRight, LayoutDashboard, Target, ArrowRight, RefreshCcw, ExternalLink, Bell, AlertTriangle, TrendingUp, Settings, Loader2, Plus, Flame, Clock } from "lucide-react";
import Link from "next/link";
import PlannerOnboarding from "@/components/PlannerOnboarding";
import { useToast } from "./ui/Toast";
import ThemeToggle from "@/components/ThemeToggle";

export default function PlannerHomeClient() {
    const { status } = useSession();
    const router = useRouter();

    const [summary, setSummary] = useState<any>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        } else if (status === "authenticated") {
            fetchSummary();
        }
    }, [status, router]);

    const fetchSummary = async () => {
        try {
            const res = await fetch("/api/planner/summary");
            if (!res.ok) throw new Error("Failed to fetch summary");
            const data = await res.json();

            setSummary(data);

            // Fetch semesters to check if onboarding is needed
            const semRes = await fetch("/api/planner/semesters");
            if (semRes.ok) {
                const semData = await semRes.json();
                if (semData.semesters.length === 0) {
                    setShowOnboarding(true);
                }
            }
        } catch (e) {
            console.error("Error fetching planner data", e);
        }
    };

    // Background Auto-Sync for Google Calendar
    useEffect(() => {
        if (!summary?.google_calendar_connected) return;

        const intervalId = setInterval(async () => {
            try {
                const res = await fetch("/api/connect/google/sync", { method: "POST" });
                if (!res.ok) {
                    console.warn("Background auto-sync failed with status:", res.status);
                }
            } catch (e) {
                console.error("Background sync error:", e);
            }
        }, 120000); // 2 minutes

        return () => clearInterval(intervalId);
    }, [summary?.google_calendar_connected]);

    const handleSync = async () => {
        if (!summary?.google_calendar_connected) {
            router.push("/planner/settings");
            return;
        }

        setSyncing(true);
        try {
            const res = await fetch("/api/connect/google/sync", { method: "POST" });
            const data = await res.json();
            
            if (res.ok) {
                const successes = data.details?.filter((r: any) => r.success).length || 0;
                const failures = data.details?.filter((r: any) => !r.success);
                
                if (successes > 0 && (!failures || failures.length === 0)) {
                    toast(`Sync complete! ${successes} items added to your calendar.`, "success");
                } else if (successes > 0 && failures.length > 0) {
                    toast(`Partial sync: ${successes} items added. ${failures.length} items skipped (Check dates).`, "success");
                } else {
                    toast("Sync ran but 0 items were added. Ensure your exams and class times are set.", "error");
                }
            } else if (res.status === 401) {
                toast("Google Calendar disconnected. Please reconnect in settings.", "error");
                setSummary({ ...summary, google_calendar_connected: false });
            } else {
                throw new Error(data.error || "Sync failed");
            }
        } catch (e) {
            console.error("Sync error:", e);
            toast("Failed to sync with Google Calendar.", "error");
        } finally {
            setSyncing(false);
        }
    };

    if (status === "loading" || !summary) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[var(--background)]">
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mesh-gradient" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 flex flex-col items-center gap-6"
                >
                    <div className="relative">
                        <div className="absolute -inset-4 bg-violet-500/20 rounded-full blur-xl animate-pulse" />
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative z-10 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                            <Image src="/htuai-dark-logo.svg" alt="HTUAI" width={32} height={32} className="dark-logo animate-pulse" />
                            <Image src="/htuai-light-logo.svg" alt="HTUAI" width={32} height={32} className="light-logo animate-pulse" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <h2 className="text-[var(--foreground)] font-bold tracking-tight text-lg">Loading Planner Data</h2>
                        <div className="flex items-center gap-2 text-[var(--foreground)]/40 text-sm font-medium">
                            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                            <span>Crunching analytics...</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (showOnboarding) {
        return <PlannerOnboarding onComplete={() => {
            setShowOnboarding(false);
            fetchSummary();
        }} />;
    }

    return (
        <div className="min-h-screen pb-24 selection:bg-violet-500/30">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/[0.02] backdrop-blur-2xl border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-600/10 border border-white/[0.06] flex items-center justify-center">
                        <LayoutDashboard className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Semester Planner</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Image src="/htuai-dark-logo.svg" alt="HTUAI Logo" width={10} height={10} className="dark-logo" />
                            <Image src="/htuai-light-logo.svg" alt="HTUAI Logo" width={10} height={10} className="light-logo" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">HTUAI Hub</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors relative"
                        >
                            <Bell className="w-5 h-5 text-white/60" />
                            {summary?.upcomingEvents?.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-black" />
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <>
                                    <button
                                        type="button"
                                        className="fixed inset-0 z-40 bg-transparent border-none cursor-default"
                                        onClick={() => setShowNotifications(false)}
                                        aria-label="Close notifications"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-72 glass-panel border border-white/10 p-4 rounded-3xl z-50 shadow-2xl origin-top-right bg-zinc-900/90 backdrop-blur-xl"
                                    >
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                                            <Bell className="w-3 h-3" /> Academic Alerts
                                        </h3>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                            {summary?.upcomingEvents?.length > 0 ? (
                                                summary.upcomingEvents.map((ev: any, i: number) => (
                                                    <div key={`notification-${i}-${ev.title}`} className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center shrink-0">
                                                                <AlertTriangle className="w-4 h-4 text-violet-400" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-bold text-white/90 leading-tight">{ev.title}</p>
                                                                <p className="text-[10px] text-white/40 mt-1">
                                                                    {new Date(ev.start_datetime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-8 text-center">
                                                    <p className="text-xs text-white/20 italic">No urgent notifications</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block">
                            <Link href="/planner/settings" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-colors flex items-center justify-center">
                                <Settings className="w-4 h-4" />
                            </Link>
                        </div>
                        <Link href="/" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold sm:text-sm text-white/70 transition-colors">
                            Course Tracker
                        </Link>
                        <div className="hidden sm:block">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-36 space-y-6">

                {/* Gamification & User Stats Bar */}
                {summary?.gamification && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-violet-600/5 border border-violet-500/20 rounded-[2rem] p-6 backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-linear-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black font-display tracking-tight border-b-2 border-white/10 pb-1">Lvl {summary.gamification.level}</h2>
                                <p className="text-sm font-medium text-white/60 mt-1">{summary.gamification.xp} XP Earned</p>
                            </div>
                        </div>

                        <div className="flex gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="flex-1 sm:flex-none glass-panel rounded-2xl p-4 flex flex-col items-center justify-center min-w-24">
                                <span className="text-xl font-black text-orange-400">{summary.gamification.current_streak_days}🔥</span>
                                <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Streak</span>
                            </div>
                            <div className="flex-1 sm:flex-none glass-panel rounded-2xl p-4 flex flex-col items-center justify-center min-w-24">
                                <span className="text-xl font-black text-blue-400">{summary.classification === 'N/A' ? '-' : summary.classification}</span>
                                <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Status</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* GPA Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="premium-card p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Target className="w-5 h-5 text-emerald-400" /> CGPA Overview
                            </h2>
                        </div>
                        <div className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-white to-white/60">
                            {summary?.cgpa > 0 ? summary.cgpa.toFixed(2) : '-.--'}
                        </div>
                        <p className="text-sm text-white/40 mt-2 max-w-[200px]">
                            Calculated dynamically combining your imported academic history and HTU Planner tracked modules.
                        </p>
                    </motion.div>

                    {/* Active Semester Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="premium-card p-6 flex flex-col justify-between relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-6 pointer-events-none">
                            <Sparkles className="w-32 h-32 text-white/5" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-blue-400" /> Active Semester
                                </h2>
                            </div>
                            {summary?.currentSemester ? (
                                <>
                                    <h3 className="text-2xl font-black">{summary.currentSemester.name}</h3>
                                    <p className="text-white/50 text-sm mt-1">{summary.currentSemester.courses?.length || 0} Courses Tracked</p>
                                </>
                            ) : (
                                <div className="mt-2">
                                    <p className="text-white/40 text-sm mb-4">No active tracking semester found. Start logging your progress today.</p>
                                </div>
                            )}
                        </div>

                        {summary?.currentSemester ? (
                            <Link
                                href="/planner/semesters"
                                className="mt-6 flex items-center justify-between px-5 py-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group w-full relative z-10"
                            >
                                <span className="font-semibold text-sm">Manage Semesters</span>
                                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
                            </Link>
                        ) : (
                            <Link
                                href="/planner/semesters"
                                className="mt-4 flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all group w-full relative z-10"
                            >
                                <span className="font-black text-sm text-white">Start an Active Semester</span>
                                <Plus className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                            </Link>
                        )}
                    </motion.div>
                </div>

                {/* Quests & Challenges */}
                {summary?.gamification && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 }}
                        className="premium-card p-6 border-violet-500/20 bg-violet-900/10"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-400" /> Active Quests
                            </h2>
                            <Link href="/planner/gamification" className="px-2 py-1 bg-violet-600/20 text-violet-400 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-violet-600/30 transition-colors">
                                View All
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {summary.activeQuests && summary.activeQuests.length > 0 ? (
                                summary.activeQuests.map((quest: any) => {
                                    const progressPercent = Math.min((quest.current_value / quest.target_value) * 100, 100);
                                    const isStudy = quest.type === 'study_minutes' || quest.type === 'study_sessions';
                                    
                                    return (
                                        <div key={quest.id} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-start gap-4 hover:bg-white/[0.06] transition-colors group">
                                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${isStudy ? 'bg-blue-500/20 border-blue-500/30' : 'bg-orange-500/20 border-orange-500/30 relative overflow-hidden'}`}>
                                                {isStudy ? (
                                                    <BookOpen className="w-5 h-5 text-blue-400" />
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 bg-linear-to-t from-orange-500/20 to-transparent" />
                                                        <span className="text-xl leading-none relative z-10">🔥</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-sm text-white/90 group-hover:text-white transition-colors truncate capitalize">{quest.type.replace('_', ' ')}</h3>
                                                <p className="text-[11px] text-white/50 mt-1 line-clamp-1">{quest.target_value} {quest.type.includes('minutes') ? 'min' : 'sessions'} target</p>
                                                <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-widest">
                                                    <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${isStudy ? 'bg-blue-500' : 'bg-orange-500'}`}
                                                            style={{ width: `${progressPercent}%` }}
                                                        />
                                                    </div>
                                                    <span className={progressPercent >= 100 ? "text-emerald-400" : (isStudy ? "text-blue-400" : "text-orange-400")}>
                                                        {quest.current_value}/{quest.target_value}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full py-4 text-center border border-dashed border-white/10 rounded-2xl">
                                    <p className="text-xs text-white/40 font-medium">All quests completed! Check back later.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Neglected Course Alert */}
                {summary?.neglectedCourse && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-panel p-6 rounded-[2rem] border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row items-center gap-6"
                    >
                        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 flex items-center justify-center shrink-0 animate-pulse">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-lg font-bold text-amber-500 flex items-center justify-center sm:justify-start gap-2">
                                Examination Alert: {summary.neglectedCourse.name}
                            </h3>
                            <p className="text-sm text-white/60 mt-1">
                                You have an upcoming exam in less than 14 days, but only <span className="text-amber-400 font-bold">{summary.neglectedCourse.total_study_minutes} minutes</span> logged so far. Focus more time here!
                            </p>
                        </div>
                        <Link
                            href={`/planner/courses/${summary.neglectedCourse.id}`}
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all whitespace-nowrap"
                        >
                            Log Study Session
                        </Link>
                    </motion.div>
                )}

                {/* Smart Insights & Pro Study Tips */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* GPA Projection Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="premium-card p-6 flex flex-col justify-between border-emerald-500/20 bg-emerald-900/10"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                                    <TrendingUp className="w-4 h-4" /> GPA Projection
                                </h2>
                            </div>
                            <p className="text-xs text-white/50 mb-4">Estimate your future standing if you maintain current performance.</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                                    <span>Target Grade</span>
                                    <span>Projected CGPA</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-white/80">Distinction (D)</span>
                                    <span className="text-sm font-black text-emerald-400">
                                        {summary?.cgpa ? (summary.cgpa * 1.05).toFixed(2) : '---'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-white/80">Merit (M)</span>
                                    <span className="text-sm font-black text-blue-400">
                                        {summary?.cgpa ? (summary.cgpa * 1.02).toFixed(2) : '---'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="text-[9px] text-white/20 mt-4 italic">* Based on weighted remaining credit hours.</p>
                    </motion.div>

                    {/* Pro Study Tips Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="md:col-span-2 premium-card p-6 border-indigo-500/20 bg-indigo-900/10"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-bold flex items-center gap-2 text-indigo-400">
                                <Flame className="w-4 h-4" /> Smart Study Tips
                            </h2>
                            <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-tighter">Personalized</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                                    <Clock className="w-4 h-4 text-orange-400" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-white/90">Spaced Repetition</h4>
                                    <p className="text-[10px] text-white/40 mt-1 leading-relaxed">Review your notes for {summary?.neglectedCourse?.name || 'core modules'} today to improve long-term retention by 40%.</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <Target className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-white/90">Active Recall</h4>
                                    <p className="text-[10px] text-white/40 mt-1 leading-relaxed">Test yourself before looking at your notes. You have {summary?.upcomingEvents?.length || 0} deadlines approaching!</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Study Habit Trends */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="premium-card p-6"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-violet-400" /> Weekly Study Habits
                            </h2>
                            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Last 7 Days (Mins)</span>
                        </div>

                        <div className="flex items-end justify-between h-48 gap-2 px-2">
                            {summary?.studyTrends?.map((day: any, i: number) => {
                                const maxMins = Math.max(...summary.studyTrends.map((d: any) => d.minutes), 60);
                                const height = (day.minutes / maxMins) * 100;
                                return (
                                    <div key={`trend-${day.date}-${i}`} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="relative w-full flex justify-center items-end h-full">
                                            <div
                                                className={`w-full max-w-[40px] rounded-t-lg transition-all duration-700 ${day.minutes > 0 ? 'bg-linear-to-t from-violet-600 to-blue-500 shadow-[0_0_20px_rgba(124,58,237,0.3)]' : 'border-2 border-dashed border-white/10 bg-transparent'}`}
                                                style={{ height: `${Math.max(height, 10)}%` }}
                                            />
                                            {day.minutes > 0 && (
                                                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 border border-white/10 px-2 py-1 rounded text-[10px] font-bold z-10">
                                                    {day.minutes}m
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-bold text-white/20 uppercase">
                                            {new Date(day.date).toLocaleDateString([], { weekday: 'short' })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Upcoming Calendar Events */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="premium-card p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-400" /> Upcoming 7 Days
                            </h2>
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all
                                    ${summary?.google_calendar_connected
                                        ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
                            >
                                {(() => {
                                    if (syncing) return <><RefreshCcw className="w-4 h-4 animate-spin" /> Syncing...</>;
                                    if (summary?.google_calendar_connected) return <><RefreshCcw className="w-4 h-4" /> Sync Calendar</>;
                                    return <><ExternalLink className="w-4 h-4" /> Connect Calendar</>;
                                })()}
                            </button>
                        </div>

                        <div className="space-y-3 h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                            {summary?.upcomingEvents?.length > 0 ? (
                                summary.upcomingEvents.map((event: any) => (
                                    <div key={event.id} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/5 flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-[9px] uppercase text-white/40 font-bold">{new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                    <span className="text-base font-black leading-none">{new Date(event.start_datetime).getDate()}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm truncate">{event.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/40 tracking-wider">
                                                            {event.type.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                        <span className="text-[10px] text-white/20 tabular-nums">
                                                            {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                                    <Calendar className="w-8 h-8 text-white/20 mb-3" />
                                    <p className="text-white/40 text-xs font-medium">No deadlines this week.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

            </main>
        </div>
    );
}
