"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Settings2, Calendar, RefreshCcw, Bell, User, Mail, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useToast } from "./ui/Toast";
import ConfirmDialog from "./ui/ConfirmDialog";
import ThemeToggle from "@/components/ThemeToggle";

export default function PlannerSettings() {
    const { status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [calendarConnected, setCalendarConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [preferences, setPreferences] = useState<{ sync_daily: boolean; exam_reminders: boolean; exam_reminders_days?: number }>({
        sync_daily: false,
        exam_reminders: true
    });
    const { toast } = useToast();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        } else if (status === "authenticated") {
            checkIntegrationStatus();
            fetchUserProfile();
        }
    }, [status, router]);

    useEffect(() => {
        if (searchParams.get("connected") === "google") {
            toast("Google Calendar connected successfully!", "success");
            router.replace(globalThis.location.pathname, { scroll: false });
            // Refresh integration status and profile to reflect connection immediately
            checkIntegrationStatus();
            fetchUserProfile();
        } else if (searchParams.get("error")) {
            const errCode = searchParams.get("error");
            if (errCode === "google_denied") {
                toast("Google Calendar connection was cancelled or denied.", "error");
            } else if (errCode === "google_token_failed") {
                toast("Failed to connect to Google Calendar. Please try again.", "error");
            } else {
                toast("An error occurred while connecting to Google Calendar.", "error");
            }
            router.replace(globalThis.location.pathname, { scroll: false });
        }
    }, [searchParams, router, toast]);

    const checkIntegrationStatus = async () => {
        try {
            const res = await fetch("/api/connect/status");
            if (res.ok) {
                const data = await res.json();
                setCalendarConnected(data.google_calendar);
            }
        } catch (e) {
            console.error("Failed to check integration status", e);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const res = await fetch("/api/planner/summary");
            if (res.ok) {
                const data = await res.json();
                setUserProfile(data.user);
                if (data.google_preferences) {
                    setPreferences({
                        sync_daily: data.google_preferences.sync_daily ?? false,
                        exam_reminders: data.google_preferences.exam_reminders ?? true
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch user profile", e);
        }
    };

    const handleGoogleConnect = () => {
        // Redirect to external Google OAuth flow specific to the calendar
        globalThis.location.href = `/api/connect/google?returnTo=${encodeURIComponent(globalThis.location.pathname)}`;
    };

    const handleSyncNow = async () => {
        if (!calendarConnected) return;
        setSyncing(true);
        try {
            const res = await fetch("/api/connect/google/sync", { method: "POST" });
            if (res.ok) {
                toast("Your schedule has been pushed to Google Calendar.", "success");
            } else {
                throw new Error("Failed");
            }
        } catch (e) {
            console.error(e);
            toast("Could not synchronize with Calendar at this time.", "error");
        } finally {
            setSyncing(false);
        }
    };

    const updatePreference = async (key: string, val: any) => {
        const newPrefs = { ...preferences, [key]: val };
        setPreferences(newPrefs);

        try {
            await fetch("/api/connect/google/preferences", {
                method: "POST",
                body: JSON.stringify({ preferences: newPrefs })
            });
            toast("Preferences updated.", "success");
        } catch (e) {
            console.error(e);
            toast("Failed to save preference.", "error");
        }
    };

    const handleResetPlanner = async () => {
        setResetting(true);
        try {
            const res = await fetch("/api/planner/reset", { method: "DELETE" });
            if (res.ok) {
                toast("Planner has been successfully reset. Redirecting...", "success");
                router.push("/planner");
            } else {
                toast("Failed to reset planner.", "error");
            }
        } catch (e) {
            console.error(e);
            toast("Error connecting to server.", "error");
        } finally {
            setResetting(false);
            setShowResetConfirm(false);
        }
    };

    const currentExamReminderDays = preferences.exam_reminders_days ?? (preferences.exam_reminders ? 7 : 0);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 font-sans pb-24">
            <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/planner" className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition-all group">
                            <ArrowLeft className="w-5 h-5 text-white/60 group-hover:text-white" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                                <Link href="/planner" className="hover:text-white/80 transition-colors">Planner</Link>
                                <span>/</span>
                                <span className="text-violet-400">Settings</span>
                            </div>
                            <h1 className="font-bold text-lg flex items-center gap-2 leading-none">
                                <Settings2 className="w-5 h-5 text-zinc-400" />
                                Profile & Preferences
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

                {/* Profile Card */}
                {userProfile && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold font-display tracking-tight border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-violet-400" /> My Profile
                        </h3>

                        <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] flex flex-col md:flex-row gap-6">
                            <div className="w-20 h-20 rounded-full bg-linear-to-br from-violet-600 to-blue-600 p-1 shrink-0 self-center md:self-start">
                                {userProfile.image ? (
                                    <img src={userProfile.image} alt="Profile" width={80} height={80} className="w-full h-full rounded-full object-cover border-2 border-black" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-2xl font-black">
                                        {userProfile.name?.[0]?.toUpperCase() || 'H'}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest flex items-center gap-1.5"><User className="w-3 h-3" /> Full Name</p>
                                        <p className="text-sm font-bold text-white/90">{userProfile.name || "HTU Student"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email Address</p>
                                        <p className="text-sm font-bold text-white/90">{userProfile.email || 'Not connected'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest flex items-center gap-1.5"><GraduationCap className="w-3 h-3" /> Student ID / Major</p>
                                        <p className="text-sm font-bold text-white/90">
                                            {userProfile.student_id} • <span className="text-violet-400 capitalize">{userProfile.major.replaceAll('_', ' ')}</span>
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Account Role</p>
                                        <p className="text-sm font-bold text-emerald-400 capitalize">{userProfile.role}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Integration Card */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold font-display tracking-tight border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-400" /> External Integrations
                    </h3>

                    <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-white/[0.02]">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <h4 className="font-bold text-base flex items-center gap-2">Google Calendar <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${calendarConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{calendarConnected ? 'Connected' : 'Disconnected'}</span></h4>
                                <p className="text-sm text-white/50 mt-1 max-w-sm">
                                    Automatically push your course schedules and exam dates securely to your external Google Calendar agenda.
                                </p>
                            </div>

                            {calendarConnected ? (
                                <button
                                    onClick={handleSyncNow} disabled={syncing}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center sm:justify-start gap-2 shrink-0 w-full sm:w-auto"
                                >
                                    <RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                    {syncing ? 'Syncing...' : 'Force Sync Now'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleGoogleConnect}
                                    className="px-6 py-3 bg-white text-black font-bold rounded-xl text-sm transition-all hover:bg-white/90 shrink-0 w-full sm:w-auto"
                                >
                                    Connect Account
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notification Preferences */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold font-display tracking-tight border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-400" /> Notifications & Sync Rules
                    </h3>

                    <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] space-y-4 text-sm text-white/80">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <span>Sync daily classes dynamically</span>
                            <button
                                onClick={() => updatePreference('sync_daily', !preferences.sync_daily)}
                                disabled={!calendarConnected}
                                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${preferences.sync_daily ? 'bg-emerald-500' : 'bg-white/10'} ${calendarConnected ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${preferences.sync_daily ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <span>Reminder for Exams (Before Date)</span>
                            <select
                                value={currentExamReminderDays}
                                onChange={(e) => updatePreference('exam_reminders_days', Number.parseInt(e.target.value))}
                                disabled={!calendarConnected}
                                className={`bg-black border border-white/10 rounded-xl px-2 py-1 text-white text-xs focus:outline-hidden ${!calendarConnected && 'opacity-50'}`}
                            >
                                <option value={7}>7 Days</option>
                                <option value={3}>3 Days</option>
                                <option value={1}>1 Day</option>
                                <option value={0}>Disabled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="space-y-4 pt-8">
                    <h3 className="text-lg font-bold font-display tracking-tight border-b border-white/5 pb-2 mb-4 flex items-center gap-2 text-red-500">
                        Danger Zone
                    </h3>
                    <div className="glass-panel p-6 rounded-[2rem] border border-red-500/20 bg-red-500/[0.02]">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <h4 className="font-bold text-base text-red-400">Reset Semester Planner</h4>
                                <p className="text-sm text-white/50 mt-1 max-w-sm">
                                    Permanently wipe all planned semesters, grades, study sessions, and notes inside this application. (Course Tracker sync is unaffected).
                                </p>
                            </div>
                            <button
                                onClick={() => setShowResetConfirm(true)} disabled={resetting}
                                className="px-6 py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 disabled:opacity-50 text-red-400 font-bold rounded-xl text-sm transition-all shrink-0 w-full sm:w-auto"
                            >
                                {resetting ? 'Resetting...' : 'Reset Planner Now'}
                            </button>
                        </div>
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={showResetConfirm}
                    title="Reset Planner?"
                    description="Are you absolutely sure you want to reset your planner? This cannot be undone and deletes all your organized terms and notes."
                    confirmLabel="Yes, Reset Everything"
                    variant="danger"
                    onConfirm={handleResetPlanner}
                    onCancel={() => setShowResetConfirm(false)}
                />

            </main >
        </div >
    );
}
