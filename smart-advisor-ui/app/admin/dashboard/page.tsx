'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminGate, { useAdminSecret } from '@/components/AdminGate';
import {
    Users, Activity, PieChart, TrendingUp,
    Monitor, Smartphone, Globe, BookOpen,
    Eye, Clock, Database,
    Search, ChevronUp, ChevronDown, RefreshCw,
    Flame, BarChart3, ArrowUp, ArrowDown, Filter,
    GraduationCap, Terminal, Zap
} from 'lucide-react';
import Image from 'next/image';
import ThemeToggle from "@/components/ThemeToggle";

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface TopCourse { code: string; name: string; count: number; ch?: number }
interface TrafficDay { date: string; count: number }
interface DeviceEntry { os: string; browser: string; count: number }
interface ActivityEntry {
    type: string;
    student_id: string;
    detail: string;
    time: string;
    ip?: string;
    userAgent?: string;
    vendor?: string;
    model?: string;
    os?: string;
    browser?: string;
}
interface StudentRow { student_id: string; major: string; count: number; ch?: number; goal?: number }
interface HeatmapCell { day: number; hour: number; count: number }
interface AIUsageLog {
    id: number;
    endpoint: string;
    featureName?: string;
    studentId?: string;
    email?: string;
    status: string;
    totalTokens?: number;
    responseTimeMs?: number;
    createdAt: string | Date;
}
interface AIUsageUserSummary {
    userId: number | null;
    studentId?: string | null;
    email?: string | null;
    usedToday: number;
    remainingToday: number;
    limit: number;
}
interface AIUsageStats {
    totalCalls: number;
    callsByEndpoint: { endpoint: string; count: number }[];
    callsByModel: { model: string; count: number }[];
    callsByStatus: { status: string | null; count: number }[];
    totalTokens: { input: number; output: number; total: number };
    avgResponseTimeMs: number;
    recentLogs: AIUsageLog[];
    userUsage: AIUsageUserSummary[];
}

interface Stats {
    totalStudents: number;
    totalVisitors: number;
    totalCompletedCourses: number;
    avgCoursesCompleted: number;
    avgCreditHours: number;
    thisWeekVisits: number;
    lastWeekVisits: number;
    majorCounts: Record<string, number>;
    progressDistribution: Record<string, number>;
    topCourses: TopCourse[];
    trafficByDay: TrafficDay[];
    deviceBreakdown: DeviceEntry[];
    recentActivity: ActivityEntry[];
    heatmap: HeatmapCell[];
    students: StudentRow[];
    adminLogs: { id: number; type: string; created_at: string | Date; message: string; event_kind?: string; course_id?: string; target_id?: string }[];
    avgWeightedProgress?: number;
    avgCgpa?: number;
    avgStudyHours?: number;
    aiUsage?: AIUsageStats;
}

type SortKey = 'student_id' | 'major' | 'count' | 'ch';
type SortDir = 'asc' | 'desc';
type TabKey = 'overview' | 'students' | 'visitors' | 'logs' | 'ai-usage';

/* ═══════════════════════════════════════════════════════════════════
   Design Tokens
   ═══════════════════════════════════════════════════════════════════ */

const MAJOR_COLORS: Record<string, string> = {
    computer_science: '#3b82f6',       // Blue
    cybersecurity: '#10b981',          // Emerald
    data_science: '#8b5cf6',           // Violet
    game_design: '#f43f5e',            // Rose
    electrical_engineering: '#f59e0b', // Amber
    energy_engineering: '#84cc16',     // Lime
    industrial_engineering: '#64748b', // Slate
    mechanical_engineering: '#f97316', // Orange
};
const MAJOR_GRADIENTS: Record<string, string> = {
    computer_science: 'linear-gradient(135deg, #2563eb, #60a5fa)',
    cybersecurity: 'linear-gradient(135deg, #059669, #34d399)',
    data_science: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    game_design: 'linear-gradient(135deg, #e11d48, #fb7185)',
    electrical_engineering: 'linear-gradient(135deg, #d97706, #fbbf24)',
    energy_engineering: 'linear-gradient(135deg, #65a30d, #a3e635)',
    industrial_engineering: 'linear-gradient(135deg, #475569, #94a3b8)',
    mechanical_engineering: 'linear-gradient(135deg, #ea580c, #fb923c)',
};
const MAJOR_ICONS: Record<string, string> = {
    computer_science: '💻',
    cybersecurity: '🔐',
    data_science: '🧠',
    game_design: '🎮',
    electrical_engineering: '⚡',
    energy_engineering: '🔋',
    industrial_engineering: '🏭',
    mechanical_engineering: '⚙️',
};
const fallbackColor = '#818cf8';
const fallbackGradient = 'linear-gradient(135deg, #6366f1, #818cf8)';
const PROGRESS_COLORS = [
    { bg: 'rgba(239,68,68,0.15)', bar: 'linear-gradient(180deg, #f87171, #ef4444)', text: '#fca5a5' },
    { bg: 'rgba(245,158,11,0.15)', bar: 'linear-gradient(180deg, #fbbf24, #f59e0b)', text: '#fde68a' },
    { bg: 'rgba(59,130,246,0.15)', bar: 'linear-gradient(180deg, #60a5fa, #3b82f6)', text: '#93c5fd' },
    { bg: 'rgba(16,185,129,0.15)', bar: 'linear-gradient(180deg, #34d399, #10b981)', text: '#6ee7b7' },
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const AUTO_REFRESH_INTERVAL = 10_000;

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function formatMajor(key: string) {
    return key
        .split('_')
        .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
        .join(' ');
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function pctChange(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

function getProgressBarColor(pct: number) {
    if (pct >= 75) return '#10b981';
    if (pct >= 50) return '#3b82f6';
    if (pct >= 25) return '#f59e0b';
    return '#ef4444';
}

function getStatusColor(status?: string) {
    if (status === 'success') return '#10b981';
    if (status === 'error') return '#ef4444';
    return '#f59e0b';
}

function getStatusBadgeClass(status?: string) {
    if (status === 'success') return 'text-emerald-400 bg-emerald-500/10';
    if (status === 'error') return 'text-rose-400 bg-rose-500/10';
    return 'text-amber-400 bg-amber-500/10';
}

function getLogTypeBadgeClass(type?: string) {
    if (type === 'error') return 'text-rose-400 bg-rose-500/10';
    if (type === 'warning') return 'text-amber-400 bg-amber-500/10';
    return 'text-cyan-400 bg-cyan-500/10';
}

function getProgressBucketIndex(pct: number) {
    if (pct <= 25) return 0;
    if (pct <= 50) return 1;
    if (pct <= 75) return 2;
    return 3;
}

function calculateMajorStats(major: string, students: StudentRow[]) {
    const ms = students.filter((student) => student.major === major);
    const totalCourses = ms.reduce((sum, student) => sum + student.count, 0);
    const totalCH = ms.reduce((sum, student) => sum + (student.ch ?? student.count * 3), 0);
    const chValues = ms.map((student) => student.ch ?? student.count * 3);
    const buckets: [number, number, number, number] = [0, 0, 0, 0];
    const majorGoal = ms[0]?.goal || 135;

    for (const ch of chValues) {
        const pct = Math.min((ch / majorGoal) * 100, 100);
        buckets[getProgressBucketIndex(pct)]++;
    }

    return {
        count: ms.length,
        avgCourses: ms.length > 0 ? Math.round(totalCourses / ms.length) : 0,
        avgCH: ms.length > 0 ? Math.round(totalCH / ms.length) : 0,
        avgProgress: ms.length > 0 ? Math.min(Math.round((totalCH / ms.length / majorGoal) * 100), 100) : 0,
        maxCH: chValues.length > 0 ? Math.max(...chValues) : 0,
        minCH: chValues.length > 0 ? Math.min(...chValues) : 0,
        progressBuckets: buckets,
    };
}

/* ═══════════════════════════════════════════════════════════════════
   Animated Counter
   ═══════════════════════════════════════════════════════════════════ */

function useCountUp(target: number, duration = 1400) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        const startTime = performance.now();
        let rafId = 0;
        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [target, duration]);
    return value;
}

/* ═══════════════════════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
    return <AdminGate><DashboardInner /></AdminGate>;
}

function DashboardInner() {
    const adminSecret = useAdminSecret();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>('overview');
    const [refreshing, setRefreshing] = useState(false);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('count');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [majorFilter, setMajorFilter] = useState<string>('all');
    const [resettingAiUsage, setResettingAiUsage] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!adminSecret) return;
        if (silent) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'x-admin-secret': adminSecret },
                cache: 'no-store',
            });
            const data = await res.json();
            setStats(data);
            setLastFetched(new Date());
        } catch { /* ignore */ }
        setLoading(false);
        setRefreshing(false);
    }, [adminSecret]);

    const resetAiUsage = useCallback(async () => {
        if (!adminSecret) return;
        if (!globalThis.confirm('Reset AI usage for all accounts? This clears the daily usage history for every user.')) return;

        setResettingAiUsage(true);
        try {
            const res = await fetch('/api/admin/ai-usage/reset', {
                method: 'POST',
                headers: { 'x-admin-secret': adminSecret },
                cache: 'no-store',
            });

            if (!res.ok) {
                throw new Error('Failed to reset AI usage');
            }

            await fetchData(true);
        } catch {
            // Intentionally silent; dashboard refresh will reflect the latest state if the request succeeded.
        } finally {
            setResettingAiUsage(false);
        }
    }, [adminSecret, fetchData]);

    useEffect(() => {
        const timer = setTimeout(() => fetchData(), 0);
        const interval = setInterval(() => fetchData(true), AUTO_REFRESH_INTERVAL);
        const refreshOnFocus = () => fetchData(true);
        const refreshOnVisible = () => {
            if (document.visibilityState === 'visible') fetchData(true);
        };

        window.addEventListener('focus', refreshOnFocus);
        document.addEventListener('visibilitychange', refreshOnVisible);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            window.removeEventListener('focus', refreshOnFocus);
            document.removeEventListener('visibilitychange', refreshOnVisible);
        };
    }, [fetchData]);

    const filteredStudents = useMemo(() => {
        if (!stats) return [];
        let list = [...stats.students];
        if (majorFilter !== 'all') list = list.filter(s => s.major === majorFilter);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(s => s.student_id.toLowerCase().includes(q) || s.major.toLowerCase().includes(q));
        }
        list.sort((a, b) => {
            const getVal = (s: StudentRow) => sortKey === 'ch' ? (s.ch ?? s.count * 3) : s[sortKey];
            const av = getVal(a), bv = getVal(b);
            const cmp = typeof av === 'string' && typeof bv === 'string'
                ? av.localeCompare(bv)
                : Number(av) - Number(bv);
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [stats, search, sortKey, sortDir, majorFilter]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    if (loading) return <SkeletonLoader />;
    if (!stats) return <ErrorState onRetry={() => fetchData()} />;

    const majors = Object.entries(stats.majorCounts).sort((a, b) => b[1] - a[1]);
    const progress = Object.entries(stats.progressDistribution);
    const maxProgress = Math.max(...Object.values(stats.progressDistribution), 1);
    const maxTraffic = Math.max(...stats.trafficByDay.map(d => d.count), 1);
    const totalDeviceCount = (Array.isArray(stats.deviceBreakdown) ? stats.deviceBreakdown : []).reduce((s, d: DeviceEntry) => s + d.count, 0) || 1;
    const weekChange = pctChange(stats.thisWeekVisits, stats.lastWeekVisits);
    const allMajorKeys = Object.keys(stats.majorCounts).sort((a, b) => a.localeCompare(b));

    const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
        { key: 'students', label: 'Students', icon: <GraduationCap className="w-3.5 h-3.5" /> },
        { key: 'visitors', label: 'Visitors', icon: <Eye className="w-3.5 h-3.5" /> },
        { key: 'ai-usage', label: 'AI Usage', icon: <Zap className="w-3.5 h-3.5" /> },
        { key: 'logs', label: 'Logs', icon: <Terminal className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="min-h-screen text-[#222d32]">

            {/* Ambient effects */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-350 h-200"
                    style={{ background: 'radial-gradient(ellipse 50% 35% at 50% 0%, rgba(220,72,53,0.08) 0%, transparent 70%)' }} />
                <div className="absolute -right-40 top-1/3 w-150 h-150"
                    style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)' }} />
                <div className="absolute -left-40 bottom-1/4 w-125 h-125"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 70%)' }} />
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-[0.015]"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">

                {/* ─── Header ──────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#dc4835]/10 border border-[#dc4835]/20 shadow-[0_0_15px_rgba(220,72,53,0.2)] overflow-hidden">
                                <Image src="/mubxai-dark-logo.png" alt="MUBXAI Logo" width={16} height={16} className="object-contain dark-logo" />
                                <Image src="/mubxai-light-logo.png" alt="MUBXAI Logo" width={16} height={16} className="object-contain light-logo" />
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest"
                                style={{ background: 'linear-gradient(135deg, rgba(220,72,53,0.15), rgba(220,72,53,0.05))', color: '#c4b5fd', border: '1px solid rgba(220,72,53,0.2)' }}>
                                Admin Panel
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                                <span className="text-xs font-medium text-emerald-400/80">Live</span>
                            </div>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-linear-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                            Platform Analytics
                        </h1>
                        <p className="text-[#222d32]/50 text-xs mt-1.5 font-medium">
                            {lastFetched ? `Updated ${timeAgo(lastFetched.toISOString())} · Auto-refreshes every 10s` : 'Loading...'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <button onClick={() => fetchData(true)} disabled={refreshing}
                            className="group flex items-center gap-2 text-[11px] font-medium text-[#222d32]/50 hover:text-[#222d32]/60 transition-all duration-300 px-4 py-2.5 rounded-xl
                        border border-[#dde3ec]/60 hover:border-[#dde3ec] hover:shadow-lg hover:shadow-[#dc4835]/5"
                            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
                            <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-90'}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </motion.div>

                {/* ─── Controls Row ────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 rounded-2xl border border-[#dde3ec]/60"
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${tab === t.key
                                    ? 'bg-white text-black shadow-md shadow-[#dde3ec]/10'
                                    : 'text-[#222d32]/50 hover:text-[#222d32]/55 hover:bg-[#edf1f6]/30'
                                    }`}>
                                {t.icon}{t.label}
                            </button>
                        ))}
                    </div>

                    {/* Major Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#dde3ec]/60"
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
                        <Filter className="w-3.5 h-3.5 text-[#222d32]/40" />
                        <select value={majorFilter} onChange={e => setMajorFilter(e.target.value)}
                            className="bg-transparent text-xs text-[#222d32]/60 outline-none cursor-pointer appearance-none pr-4 font-medium">
                            <option value="all" className="bg-neutral-900">All Majors</option>
                            {allMajorKeys.map(m => (
                                <option key={m} value={m} className="bg-neutral-900">{formatMajor(m)}</option>
                            ))}
                        </select>
                    </div>
                </motion.div>

                {/* ─── Tab Content ─────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {tab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-6">
                            <OverviewTab stats={stats} majors={majors} progress={progress} maxProgress={maxProgress} maxTraffic={maxTraffic} weekChange={weekChange} />
                        </motion.div>
                    )}
                    {tab === 'students' && (
                        <motion.div key="students" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-6">
                            <StudentsTab students={filteredStudents} total={stats.students.length} search={search} setSearch={setSearch} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} />
                        </motion.div>
                    )}
                    {tab === 'visitors' && (
                        <motion.div key="visitors" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-6">
                            <VisitorsTab stats={stats} totalDeviceCount={totalDeviceCount} />
                        </motion.div>
                    )}
                    {tab === 'ai-usage' && (
                        <motion.div key="ai-usage" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-6">
                            <AIUsageTab aiUsage={stats.aiUsage} onResetAll={resetAiUsage} resetting={resettingAiUsage} />
                        </motion.div>
                    )}
                    {tab === 'logs' && (
                        <motion.div key="logs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-6">
                            <LogsTab logs={stats.adminLogs} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="text-center text-xs text-[#222d32]/10 pt-6 pb-10 font-bold tracking-widest uppercase">
                    MUBXAI &middot; Admin Dashboard
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Overview Tab
   ═══════════════════════════════════════════════════════════════════ */

function OverviewTab({ stats, majors, progress, maxProgress, maxTraffic, weekChange }: Readonly<{
    stats: Stats; majors: [string, number][]; progress: [string, number][];
    maxProgress: number; maxTraffic: number; weekChange: number;
}>) {
    const animStudents = useCountUp(stats.totalStudents);
    const animVisitors = useCountUp(stats.totalVisitors);
    const animCourses = useCountUp(stats.totalCompletedCourses);
    const weekBadge = weekChange === 0 ? undefined : { value: `${weekChange > 0 ? '+' : ''}${weekChange}%`, positive: weekChange > 0 };

    return (
        <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <StatCard icon={<Users className="w-4 h-4" />} label="Total Students" value={animStudents} gradient="from-[#dc4835]/20 to-[#dc4835]/5" iconBg="#7c3aed" delay={0} />
                <StatCard icon={<Eye className="w-4 h-4" />} label="Total Visits" value={animVisitors} gradient="from-blue-500/20 to-cyan-500/5" iconBg="#2563eb" delay={0.04}
                    badge={weekBadge} />
                <StatCard icon={<BookOpen className="w-4 h-4" />} label="Courses Done" value={animCourses} gradient="from-blue-500/20 to-indigo-500/5" iconBg="#4f46e5" delay={0.08} />
                <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Avg Progress" value={`${stats.avgWeightedProgress || 0}%`} gradient="from-rose-500/20 to-pink-500/5" iconBg="#e11d48" delay={0.12} />
                <StatCard icon={<Flame className="w-4 h-4" />} label="Avg CGPA" value={(stats.avgCgpa || 0).toFixed(2)} gradient="from-emerald-500/20 to-teal-500/5" iconBg="#10b981" delay={0.16} />
                <StatCard icon={<Clock className="w-4 h-4" />} label="Avg Study Time" value={`${stats.avgStudyHours || 0}h`} gradient="from-orange-500/20 to-yellow-500/5" iconBg="#f59e0b" delay={0.2} />
            </div>

            {/* Traffic Chart — Professional SVG Area Chart */}
            <GlassCard delay={0.1}>
                <div className="flex items-center justify-between mb-6">
                    <CardHeader icon={<TrendingUp className="w-4 h-4" />} title="Visitor Traffic" iconColor="#60a5fa" />
                    <span className="text-xs text-[#222d32]/40 font-medium px-2.5 py-1 rounded-lg bg-[#edf1f6]/30">Last 30 days</span>
                </div>
                {stats.trafficByDay.length === 0 ? <Empty text="No visitor data yet" /> : (
                    <AreaChart data={stats.trafficByDay} maxVal={maxTraffic} />
                )}
            </GlassCard>

            {/* Major + Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Major Donut */}
                <GlassCard delay={0.15}>
                    <CardHeader icon={<PieChart className="w-4 h-4" />} title="Major Distribution" iconColor="#818cf8" />
                    <MajorDonutSection majors={majors} total={stats.totalStudents} students={stats.students} />
                </GlassCard>

                {/* Progress Distribution */}
                <GlassCard delay={0.2}>
                    <CardHeader icon={<Activity className="w-4 h-4" />} title="Degree Progress" iconColor="#34d399" />
                    <div className="flex items-end gap-4 mt-4" style={{ height: 220 }}>
                        {progress.map(([range, count], i) => {
                            const minBarH = count > 0 ? 10 : 0;
                            const barH = maxProgress > 0 ? Math.max((count / maxProgress) * 170, minBarH) : 0;
                            const color = PROGRESS_COLORS[i];
                            return (
                                <div key={range} className="flex-1 flex flex-col items-center justify-end h-full gap-2.5 group cursor-default">
                                    <motion.span
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + i * 0.1 }}
                                        className="text-sm font-bold tabular-nums" style={{ color: color.text }}>
                                        {count}
                                    </motion.span>
                                    <div className="relative w-full">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: barH }}
                                            transition={{ duration: 0.9, delay: 0.3 + i * 0.12, type: 'spring', bounce: 0.3 }}
                                            className="w-full rounded-xl transition-all duration-200 group-hover:brightness-125"
                                            style={{ background: color.bar }}
                                        />
                                        {/* Glow */}
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: barH, opacity: 0.3 }}
                                            transition={{ duration: 0.9, delay: 0.3 + i * 0.12, type: 'spring', bounce: 0.3 }}
                                            className="absolute inset-x-0 bottom-0 rounded-xl blur-md -z-10"
                                            style={{ background: color.bar }}
                                        />
                                    </div>
                                    <span className="text-xs text-[#222d32]/50 font-mono font-medium">{range}</span>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            </div>

            {/* Courses + Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard delay={0.25} scrollable>
                    <div className="sticky top-0 z-10 pb-4 -mt-1"
                        style={{ background: 'linear-gradient(180deg, rgba(14,14,24,0.95) 80%, transparent 100%)' }}>
                        <CardHeader icon={<BookOpen className="w-4 h-4" />} title="Top Courses" iconColor="#fbbf24"
                            right={<span className="text-xs text-[#222d32]/40 font-mono tabular-nums">{stats.topCourses.length}</span>} />
                    </div>
                    <div className="space-y-1">
                        {stats.topCourses.map((course, i) => (
                            <motion.div key={course.code} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.02 }}
                                className="flex items-center gap-3 hover:bg-[#edf1f6]/20.5 rounded-xl px-3 py-2 -mx-1 transition-all duration-200 group cursor-default">
                                <span className="text-xs font-mono text-[#222d32]/15 w-5 shrink-0 tabular-nums">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-[#222d32]/55 truncate group-hover:text-[#222d32]/70 transition-colors font-medium">{course.name}</p>
                                    <p className="text-xs text-[#222d32]/15 font-mono">{course.code}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-bold text-[#222d32]/50 tabular-nums">{course.count}</span>
                                    <Users className="w-3 h-3 text-[#222d32]/10" />
                                </div>
                            </motion.div>
                        ))}
                        {stats.topCourses.length === 0 && <Empty text="No course data" />}
                    </div>
                </GlassCard>

                <GlassCard delay={0.3}>
                    <CardHeader icon={<Flame className="w-4 h-4" />} title="Activity Heatmap" iconColor="#fb923c"
                        right={<span className="text-xs text-[#222d32]/40">Hour × Day</span>} />
                    <div className="mt-4">
                        <Heatmap data={stats.heatmap} />
                    </div>
                </GlassCard>
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Students Tab
   ═══════════════════════════════════════════════════════════════════ */

function StudentsTab({ students, total, search, setSearch, sortKey, sortDir, toggleSort }: Readonly<{
    students: StudentRow[]; total: number;
    search: string; setSearch: (s: string) => void;
    sortKey: SortKey; sortDir: SortDir; toggleSort: (k: SortKey) => void;
}>) {
    const renderSortIcon = (col: SortKey) => {
        if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-[#222d32]/10" />;
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#dc4835]/70" /> : <ChevronDown className="w-3 h-3 text-[#dc4835]/70" />;
    };

    return (
        <GlassCard delay={0.05}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <CardHeader icon={<Database className="w-4 h-4" />} title="All Students" iconColor="#a78bfa"
                    right={<span className="text-xs text-[#222d32]/40 font-mono tabular-nums">{students.length}/{total}</span>} />
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#dde3ec]/60"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))' }}>
                    <Search className="w-3.5 h-3.5 text-[#222d32]/40" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search ID or Major..."
                        className="bg-transparent text-xs text-[#222d32] placeholder-white/15 outline-none w-44 font-medium" />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[#dde3ec]/40">
                            <Th>#</Th>
                            <Th sortable onClick={() => toggleSort('student_id')}>Student ID {renderSortIcon('student_id')}</Th>
                            <Th sortable onClick={() => toggleSort('major')}>Major {renderSortIcon('major')}</Th>
                            <Th sortable onClick={() => toggleSort('count')}>Courses {renderSortIcon('count')}</Th>
                            <Th sortable onClick={() => toggleSort('ch')}>CH {renderSortIcon('ch')}</Th>
                            <Th>Progress</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((s, i) => {
                            const realCH = s.ch ?? s.count * 3;
                            const goal = s.goal || 135;
                            const pct = Math.min(Math.round((realCH / goal) * 100), 100);
                            const barColor = getProgressBarColor(pct);
                            return (
                                <motion.tr key={`${s.student_id}-${s.major}`}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.008 }}
                                    className="border-b border-[#dde3ec]/20 hover:bg-[#edf1f6]/15 transition-colors group">
                                    <td className="py-3 pr-4 text-xs text-[#222d32]/15 font-mono tabular-nums">{i + 1}</td>
                                    <td className="py-3 pr-4 text-xs font-mono text-[#222d32]/50 group-hover:text-[#222d32]/70 transition-colors">{s.student_id}</td>
                                    <td className="py-3 pr-4">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="text-sm">{MAJOR_ICONS[s.major] || '📚'}</span>
                                            <span className="w-2.5 h-2.5 rounded-md shadow-sm"
                                                style={{ background: MAJOR_GRADIENTS[s.major] || fallbackGradient }} />
                                            <span className="text-xs text-[#222d32]/45 font-medium">{formatMajor(s.major)}</span>
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4 text-xs font-mono text-[#222d32]/45 tabular-nums">{s.count}</td>
                                    <td className="py-3 pr-4 text-xs font-mono text-[#222d32]/35 tabular-nums">{realCH}<span className="text-[#222d32]/15">/{goal}</span></td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-24 h-1.5 bg-[#edf1f6]/40 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.5, delay: i * 0.008 }}
                                                    className="h-full rounded-full shadow-sm"
                                                    style={{ background: barColor, boxShadow: `0 0 8px ${barColor}40` }} />
                                            </div>
                                            <span className="text-xs font-mono text-[#222d32]/50 w-8 tabular-nums">{pct}%</span>
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
                {students.length === 0 && <Empty text="No matching students" />}
            </div>
        </GlassCard>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   AI Usage Tab
   ═══════════════════════════════════════════════════════════════════ */

function AIUsageTab({ aiUsage, onResetAll, resetting }: Readonly<{ aiUsage?: AIUsageStats; onResetAll?: () => void; resetting?: boolean }>) {
    const usage = aiUsage ?? {
        totalCalls: 0,
        callsByEndpoint: [],
        callsByModel: [],
        callsByStatus: [],
        totalTokens: { input: 0, output: 0, total: 0 },
        avgResponseTimeMs: 0,
        recentLogs: [],
        userUsage: [],
    };

    const totalTokens = usage.totalTokens.total;
    const inputTokens = usage.totalTokens.input;
    const outputTokens = usage.totalTokens.output;
    const successRate = usage.callsByStatus.find(s => s.status === 'success')?.count || 0;
    const totalCalls = usage.totalCalls;
    const successPercentage = totalCalls > 0 ? Math.round((successRate / totalCalls) * 100) : 0;

    const animTotalCalls = useCountUp(totalCalls);
    const animTokens = useCountUp(totalTokens);
    const animAvgResponseTime = useCountUp(Math.round(usage.avgResponseTimeMs));

    return (
        <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={<Zap className="w-4 h-4" />} label="Total Calls" value={animTotalCalls} gradient="from-yellow-500/20 to-amber-500/5" iconBg="#fbbf24" delay={0} />
                <StatCard icon={<Database className="w-4 h-4" />} label="Total Tokens" value={animTokens} gradient="from-blue-500/20 to-cyan-500/5" iconBg="#2563eb" delay={0.04} />
                <StatCard icon={<Clock className="w-4 h-4" />} label="Avg Response" value={`${animAvgResponseTime}ms`} gradient="from-purple-500/20 to-pink-500/5" iconBg="#a855f7" delay={0.08} />
                <StatCard icon={<Activity className="w-4 h-4" />} label="Success Rate" value={`${successPercentage}%`} gradient="from-emerald-500/20 to-teal-500/5" iconBg="#10b981" delay={0.12} />
            </div>

            <GlassCard delay={0.03}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <CardHeader icon={<Zap className="w-4 h-4" />} title="Daily AI Usage Remaining" iconColor="#fbbf24" />
                        <p className="text-[11px] text-[#222d32]/50 mt-1">Each user has 2 AI uses per day. Reset clears today's AI usage for every account.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onResetAll}
                        disabled={resetting}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                    >
                        {resetting ? 'Resetting...' : 'Reset All AI Usage'}
                    </button>
                </div>

                <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#dde3ec] text-xs uppercase tracking-widest text-[#222d32]/50">
                                <th className="py-2 pr-4">User</th>
                                <th className="py-2 pr-4">Used Today</th>
                                <th className="py-2 pr-4">Remaining</th>
                                <th className="py-2 pr-4">Limit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usage.userUsage.length > 0 ? usage.userUsage.map((user) => (
                                <tr key={String(user.userId ?? user.email ?? user.studentId)} className="border-b border-[#dde3ec]/30">
                                    <td className="py-3 pr-4 text-xs text-[#222d32]/60">
                                        <div className="font-medium text-[#222d32]/75">{user.studentId || user.email || `User #${user.userId ?? 'unknown'}`}</div>
                                        <div className="text-xs text-[#222d32]/40">{user.email || user.studentId || 'No identifier'}</div>
                                    </td>
                                    <td className="py-3 pr-4 text-xs tabular-nums text-[#222d32]/60">{user.usedToday}</td>
                                    <td className={`py-3 pr-4 text-xs tabular-nums font-bold ${user.remainingToday === 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{user.remainingToday}</td>
                                    <td className="py-3 pr-4 text-xs tabular-nums text-[#222d32]/35">{user.limit}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td className="py-4 text-xs text-[#222d32]/50" colSpan={4}>No AI usage recorded today.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calls by Endpoint */}
                <GlassCard delay={0.05} scrollable>
                    <div className="sticky top-0 z-10 pb-4 -mt-1"
                        style={{ background: 'linear-gradient(180deg, rgba(14,14,24,0.95) 80%, transparent 100%)' }}>
                        <CardHeader icon={<BarChart3 className="w-4 h-4" />} title="Calls by Endpoint" iconColor="#fbbf24" />
                    </div>
                    <div className="space-y-2">
                        {usage.callsByEndpoint.map((item, i) => (
                            <motion.div key={item.endpoint}
                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.05 }}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#edf1f6]/15 group cursor-default">
                                <span className="text-xs text-[#222d32]/50 font-medium truncate">{item.endpoint}</span>
                                <span className="text-sm font-bold text-[#222d32]/70 tabular-nums ml-2">{item.count}</span>
                            </motion.div>
                        ))}
                        {usage.callsByEndpoint.length === 0 && <Empty text="No endpoint data" />}
                    </div>
                </GlassCard>

                {/* Calls by Status */}
                <GlassCard delay={0.1}>
                    <CardHeader icon={<Activity className="w-4 h-4" />} title="Status Distribution" iconColor="#34d399" />
                    <div className="mt-6 space-y-3">
                        {usage.callsByStatus.map((item, i) => {
                            const pct = totalCalls > 0 ? Math.round((item.count / totalCalls) * 100) : 0;
                            const statusColor = getStatusColor(item.status ?? undefined);
                            return (
                                <div key={item.status || 'unknown'} className="group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs text-[#222d32]/50 font-medium capitalize">{item.status || 'unknown'}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-[#222d32]/70 tabular-nums">{item.count}</span>
                                            <span className="text-xs text-[#222d32]/50 tabular-nums">({pct}%)</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-[#edf1f6]/40 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.6, delay: i * 0.1 }}
                                            className="h-full rounded-full"
                                            style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}40` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>

                {/* Model Distribution */}
                <GlassCard delay={0.15}>
                    <CardHeader icon={<Zap className="w-4 h-4" />} title="AI Models Used" iconColor="#8b5cf6" />
                    <div className="mt-6 space-y-2">
                        {usage.callsByModel.map((item, i) => {
                            const pct = totalCalls > 0 ? Math.round((item.count / totalCalls) * 100) : 0;
                            return (
                                <motion.div key={item.model}
                                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.05 }}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#edf1f6]/15">
                                    <span className="text-xs text-[#222d32]/50 font-medium">{item.model}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-[#222d32]/70">{item.count}</span>
                                        <span className="text-xs text-[#222d32]/50 w-8 text-right">{pct}%</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </GlassCard>
            </div>

            {/* Token Statistics */}
            <GlassCard delay={0.2}>
                <CardHeader icon={<Database className="w-4 h-4" />} title="Token Usage" iconColor="#60a5fa" />
                <div className="mt-6 grid grid-cols-3 gap-4">
                    {[
                        { label: 'Input Tokens', value: inputTokens, color: '#3b82f6' },
                        { label: 'Output Tokens', value: outputTokens, color: '#8b5cf6' },
                        { label: 'Total Tokens', value: totalTokens, color: '#06b6d4' },
                    ].map((item, i) => (
                        <motion.div key={item.label}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            className="p-4 rounded-xl" style={{ background: `${item.color}08`, border: `1px solid ${item.color}15` }}>
                            <div className="text-xs text-[#222d32]/50 uppercase font-bold tracking-wider mb-2">{item.label}</div>
                            <div className="text-2xl font-bold text-[#222d32]/80 tabular-nums">{item.value.toLocaleString()}</div>
                        </motion.div>
                    ))}
                </div>
            </GlassCard>

            {/* Recent AI Usage Logs */}
            <GlassCard delay={0.25} scrollable>
                <div className="sticky top-0 z-10 pb-4 -mt-1"
                    style={{ background: 'linear-gradient(180deg, rgba(14,14,24,0.95) 80%, transparent 100%)' }}>
                    <CardHeader icon={<Terminal className="w-4 h-4" />} title="Recent AI Calls" iconColor="#a78bfa"
                        right={<span className="text-xs text-[#222d32]/40 font-mono tabular-nums">{usage.recentLogs.length} logs</span>} />
                </div>
                <div className="space-y-1">
                    {usage.recentLogs.map((log, i) => (
                        <motion.div key={log.id}
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.01 }}
                            className="group p-3 rounded-xl hover:bg-[#edf1f6]/15 border border-transparent hover:border-[#dde3ec]/40 transition-all">
                            <div className="flex items-start justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[11px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${getStatusBadgeClass(log.status)}`}>
                                        {log.status}
                                    </span>
                                    <span className="text-xs text-[#222d32]/35 font-mono">{log.endpoint}</span>
                                </div>
                                <span className="text-xs text-[#222d32]/15 tabular-nums">{timeAgo(log.createdAt.toString())}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[#222d32]/40">
                                {log.totalTokens && <span>Tokens: {log.totalTokens}</span>}
                                {log.responseTimeMs && <span>Time: {log.responseTimeMs}ms</span>}
                                {log.studentId && <span>Student: {log.studentId}</span>}
                            </div>
                        </motion.div>
                    ))}
                    {usage.recentLogs.length === 0 && <Empty text="No AI calls yet — data appears when students use AI features" />}
                </div>
            </GlassCard>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Visitors Tab
   ═══════════════════════════════════════════════════════════════════ */

function LogsTab({ logs }: Readonly<{ logs: Record<string, unknown>[] }>) {
    if (!logs || logs.length === 0) return <Empty text="No system activity yet — logs appear when students use the platform" />;

    return (
        <GlassCard delay={0.05} scrollable>
            <div className="sticky top-0 z-10 pb-4 -mt-1"
                style={{ background: 'linear-gradient(180deg, rgba(14,14,24,0.95) 80%, transparent 100%)' }}>
                <CardHeader icon={<Terminal className="w-4 h-4" />} title="System Activity Logs" iconColor="#a78bfa"
                    right={<span className="text-xs text-[#222d32]/40 font-mono tabular-nums">{logs.length} entries</span>} />
            </div>
            <div className="space-y-1 mt-2">
                {logs.map((rawLog: Record<string, unknown>, _i: number) => {
                    const log = rawLog as { id: number; type: string; created_at: string | Date; message: string; event_kind?: string; course_id?: string; target_id?: string; details?: Record<string, unknown> };
                    return (
                        <div key={log.id} className="group hover:bg-[#edf1f6]/15 rounded-xl px-3 py-2 -mx-1 transition-all duration-200 cursor-default border border-transparent hover:border-[#dde3ec]/40">
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-[11px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${getLogTypeBadgeClass(log.type)}`}>
                                    {log.type}
                                </span>
                                <span className="text-xs text-[#222d32]/15 tabular-nums">{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-[#222d32]/70 font-medium mb-1">{log.message}</p>

                            {/* Display new relational columns if they exist */}
                            {(log.event_kind || log.course_id || log.target_id) && (
                                <div className="flex flex-wrap gap-2 mt-2 mb-1">
                                    {log.event_kind && <span className="text-xs text-[#222d32]/50 bg-[#edf1f6] px-2 py-0.5 rounded-full font-mono">Event: {log.event_kind}</span>}
                                    {log.course_id && <span className="text-xs text-[#222d32]/50 bg-[#edf1f6] px-2 py-0.5 rounded-full font-mono">Course ID: {log.course_id}</span>}
                                    {log.target_id && <span className="text-xs text-[#222d32]/50 bg-[#edf1f6] px-2 py-0.5 rounded-full font-mono">Target: {log.target_id}</span>}
                                </div>
                            )}

                            {log.details && Object.keys(log.details as object).length > 0 && (
                                <div className="mt-1.5 p-2 rounded-lg bg-[#222d32]/40 border border-[#dde3ec] overflow-x-auto">
                                    <pre className="text-xs text-[#222d32]/50 font-mono italic">
                                        {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
}

function VisitorsTab({ stats, totalDeviceCount }: Readonly<{ stats: Stats; totalDeviceCount: number }>) {
    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard delay={0.05} scrollable>
                    <div className="sticky top-0 z-10 pb-4 -mt-1"
                        style={{ background: 'linear-gradient(180deg, rgba(14,14,24,0.95) 80%, transparent 100%)' }}>
                        <CardHeader icon={<Monitor className="w-4 h-4" />} title="Devices & Browsers" iconColor="#22d3ee"
                            right={<span className="text-xs text-[#222d32]/40 font-mono tabular-nums">{stats.deviceBreakdown.length}</span>} />
                    </div>
                    <div className="space-y-3.5">
                        {stats.deviceBreakdown.map((d, i) => {
                            const pct = Math.round((d.count / totalDeviceCount) * 100);
                            const isMobile = /ios|android/i.test(d.os);
                            return (
                                <div key={`${d.os}-${d.browser}`} className="group hover:bg-[#edf1f6]/15 rounded-xl px-2 py-1.5 -mx-1 transition-all duration-200 cursor-default">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            {isMobile ? <Smartphone className="w-3.5 h-3.5 text-cyan-400/40" /> : <Globe className="w-3.5 h-3.5 text-cyan-400/40" />}
                                            <span className="text-xs text-[#222d32]/50 font-medium">{d.os} · {d.browser}</span>
                                        </div>
                                        <span className="text-xs font-mono text-[#222d32]/50 tabular-nums">{d.count} ({pct}%)</span>
                                    </div>
                                    <div className="h-1.5 bg-[#edf1f6]/30 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.7, delay: i * 0.04 }}
                                            className="h-full rounded-full"
                                            style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.5), rgba(34,211,238,0.8))', boxShadow: '0 0 10px rgba(34,211,238,0.2)' }} />
                                    </div>
                                </div>
                            );
                        })}
                        {stats.deviceBreakdown.length === 0 && <Empty text="No device data" />}
                    </div>
                </GlassCard>

                <GlassCard delay={0.1} scrollable>
                    <div className="sticky top-0 z-10 pb-4 -mt-1"
                        style={{ background: 'linear-gradient(180deg, rgba(14,14,24,0.95) 80%, transparent 100%)' }}>
                        <CardHeader icon={<Clock className="w-4 h-4" />} title="Recent Activity" iconColor="#fb7185"
                            right={<span className="text-xs text-[#222d32]/40 font-mono tabular-nums">{stats.recentActivity.length}</span>} />
                    </div>
                    <div className="space-y-1">
                        {stats.recentActivity.map((act, i) => {
                            const icon = <Activity className="w-3 h-3 text-blue-400/60" />;
                            const iconBg = 'rgba(59,130,246,0.1)';
                            const borderColor = 'rgba(59,130,246,0.15)';

                            return (
                                <motion.div key={`${act.student_id}-${act.time}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                    className="group flex flex-col gap-2 p-3 rounded-xl hover:bg-[#edf1f6]/15 border border-transparent hover:border-[#dde3ec] transition-all duration-200 cursor-default">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: `linear-gradient(135deg, ${iconBg}, transparent)`, border: `1px solid ${borderColor}` }}>
                                            {icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs text-[#222d32]/45 font-medium truncate">
                                                    <span className="font-mono text-[#222d32]/50">{act.student_id === 'Anonymous' ? 'Anon' : `${act.student_id}`}</span>{' '}
                                                    • {act.ip}
                                                </p>
                                                <p className="text-xs text-[#222d32]/15 tabular-nums shrink-0">{timeAgo(act.time)}</p>
                                            </div>
                                            <p className="text-[11px] text-[#222d32]/70 mt-0.5 font-semibold">
                                                {act.detail}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 ml-10">
                                        <span className="px-1.5 py-0.5 rounded bg-[#edf1f6]/30 text-[11px] text-[#222d32]/50 font-medium">
                                            {act.os} · {act.browser}
                                        </span>
                                        {act.vendor && (
                                            <span className="px-1.5 py-0.5 rounded bg-[#edf1f6]/30 text-[11px] text-[#222d32]/50 font-medium">
                                                {act.vendor}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                        {stats.recentActivity.length === 0 && <Empty text="No activity" />}
                    </div>
                </GlassCard>
            </div>

            <GlassCard delay={0.15}>
                <CardHeader icon={<Flame className="w-4 h-4" />} title="Visitor Heatmap" iconColor="#fb923c"
                    right={<span className="text-xs text-[#222d32]/40">Activity by hour and day</span>} />
                <div className="mt-4">
                    <Heatmap data={stats.heatmap} />
                </div>
            </GlassCard>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared Components
   ═══════════════════════════════════════════════════════════════════ */

function GlassCard({ children, delay = 0, scrollable }: Readonly<{ children: React.ReactNode; delay?: number; scrollable?: boolean }>) {
    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
            className={`premium-card p-5 sm:p-6 ${scrollable ? 'max-h-120 overflow-y-auto' : ''}`}
        >
            {children}
        </motion.div>
    );
}

function CardHeader({ icon, title, iconColor, right }: Readonly<{ icon: React.ReactNode; title: string; iconColor: string; right?: React.ReactNode }>) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}20`, color: iconColor }}>
                    {icon}
                </div>
                <h2 className="text-sm font-semibold text-[#222d32]/75">{title}</h2>
            </div>
            {right}
        </div>
    );
}

function StatCard({ icon, label, value, gradient, iconBg, delay, badge }: Readonly<{
    icon: React.ReactNode; label: string; value: string | number;
    gradient: string; iconBg: string; delay: number;
    badge?: { value: string; positive: boolean };
}>) {
    return (
        <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay, duration: 0.35 }}
            className={`relative premium-card p-4 flex items-center gap-3 group cursor-default overflow-hidden transition-all duration-300 hover:scale-[1.02]`}
        >
            {/* Color accent glow */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-br ${gradient}`} />
            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[#222d32]"
                style={{ background: `${iconBg}25`, border: `1px solid ${iconBg}30` }}>
                {icon}
            </div>
            <div className="relative min-w-0 flex-1">
                <div className="text-[11px] text-[#222d32]/50 uppercase font-bold tracking-widest mb-0.5">{label}</div>
                <div className="text-lg font-bold truncate tabular-nums">{value}</div>
            </div>
            {badge && (
                <span className={`relative text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5 ${badge.positive ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/15' : 'text-red-400 bg-red-500/10 border border-red-500/15'
                    }`}>
                    {badge.positive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                    {badge.value}
                </span>
            )}
        </motion.div>
    );
}

function Th({ children, sortable, onClick }: Readonly<{ children: React.ReactNode; sortable?: boolean; onClick?: () => void }>) {
    return (
        <th onClick={onClick}
            className={`text-xs text-[#222d32]/50 uppercase tracking-widest font-bold pb-3 pr-4 ${sortable ? 'cursor-pointer select-none hover:text-[#222d32]/45 transition-colors' : ''}`}>
            <span className="inline-flex items-center gap-1">{children}</span>
        </th>
    );
}

function MajorDonutSection({ majors, total, students }: Readonly<{ majors: [string, number][]; total: number; students: StudentRow[] }>) {
    const [hoveredMajor, setHoveredMajor] = useState<string | null>(null);
    const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
    const animTotal = useCountUp(total);

    /* ── Per-major analytics ─────────────────────────────── */
    const majorStats = useMemo(() => Object.fromEntries(majors.map(([major]) => [major, calculateMajorStats(major, students)])), [majors, students]);

    /* ── Donut geometry (dual-ring) ──────────────────────── */
    const size = 200;
    const cx = size / 2, cy = size / 2;
    const outerRadius = 78, outerStroke = 20;
    const innerRadius = 52, innerStroke = 10;
    const gapAngle = 3;
    const totalVal = majors.reduce((s, [, v]) => s + v, 0) || 1;

    // Build arc segments
    const segments: { major: string; count: number; pct: number; startAngle: number; endAngle: number; rank: number }[] = [];
    let currentAngle = -90;
    for (let idx = 0; idx < majors.length; idx++) {
        const [major, count] = majors[idx];
        const pct = count / totalVal;
        const sweep = pct * (360 - gapAngle * majors.length);
        segments.push({ major, count, pct, startAngle: currentAngle, endAngle: currentAngle + sweep, rank: idx + 1 });
        currentAngle += sweep + gapAngle;
    }

    // SVG arc path helper
    const arcPath = (startDeg: number, endDeg: number, r: number, cxo = cx, cyo = cy) => {
        const startRad = (startDeg * Math.PI) / 180;
        const endRad = (endDeg * Math.PI) / 180;
        const x1 = cxo + r * Math.cos(startRad);
        const y1 = cyo + r * Math.sin(startRad);
        const x2 = cxo + r * Math.cos(endRad);
        const y2 = cyo + r * Math.sin(endRad);
        const largeArc = endDeg - startDeg > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    };

    const activeMajor = selectedMajor || hoveredMajor;
    const activeSeg = segments.find(s => s.major === activeMajor);
    const activeStats = activeMajor ? majorStats[activeMajor] : null;

    const RANK_MEDALS = ['', '#c9b037', '#b4b4b4', '#ad6e33'];

    const handleSegmentClick = (major: string) => {
        setSelectedMajor(prev => prev === major ? null : major);
    };

    return (
        <div className="mt-5 space-y-5">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {['chart', 'table'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode as 'chart' | 'table')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${viewMode === mode
                                ? 'bg-[#edf1f6]/80 text-[#222d32]/70 border border-[#dde3ec]'
                                : 'text-[#222d32]/40 hover:text-[#222d32]/40 border border-transparent'
                                }`}
                        >
                            {mode === 'chart' ? 'Visual' : 'Details'}
                        </button>
                    ))}
                </div>
                {selectedMajor && (
                    <button onClick={() => setSelectedMajor(null)}
                        className="text-xs text-[#222d32]/50 hover:text-[#222d32]/50 transition-colors font-medium">
                        Clear Selection
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {viewMode === 'chart' ? (
                    <motion.div key="chart-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col lg:flex-row items-start gap-6">
                        {/* Dual-Ring Donut Chart */}
                        <div className="relative shrink-0 self-center" style={{ width: size, height: size }}>
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-xl">
                                <defs>
                                    {majors.map(([major]) => {
                                        const color = MAJOR_COLORS[major] || fallbackColor;
                                        return (
                                            <linearGradient key={`grad-${major}`} id={`donut-grad-${major}`} x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor={color} stopOpacity="1" />
                                                <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                                            </linearGradient>
                                        );
                                    })}
                                    <filter id="donut-glow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="4" result="blur" />
                                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                    <filter id="inner-glow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="2" result="blur" />
                                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                </defs>

                                {/* Outer background track */}
                                <circle cx={cx} cy={cy} r={outerRadius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={outerStroke} />
                                {/* Inner background track */}
                                <circle cx={cx} cy={cy} r={innerRadius} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth={innerStroke} />

                                {/* Inner ring: avg progress per major */}
                                {segments.map((seg, i) => {
                                    const stats = majorStats[seg.major];
                                    if (!stats) return null;
                                    const progressSweep = (stats.avgProgress / 100) * ((seg.endAngle - seg.startAngle));
                                    if (progressSweep < 0.5) return null;
                                    const isActive = activeMajor === seg.major;
                                    const isOtherActive = activeMajor !== null && activeMajor !== seg.major;
                                    return (
                                        <motion.path
                                            key={`inner-${seg.major}`}
                                            d={arcPath(seg.startAngle, seg.startAngle + progressSweep, innerRadius)}
                                            fill="none"
                                            stroke={`url(#donut-grad-${seg.major})`}
                                            strokeWidth={isActive ? innerStroke + 3 : innerStroke}
                                            strokeLinecap="round"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: isOtherActive ? 0.2 : 0.55 }}
                                            transition={{
                                                pathLength: { delay: 0.7 + i * 0.15, duration: 0.8, ease: 'easeOut' },
                                                opacity: { duration: 0.25 },
                                            }}
                                            style={{ filter: isActive ? `drop-shadow(0 0 6px ${MAJOR_COLORS[seg.major] || fallbackColor}60)` : 'none' }}
                                        />
                                    );
                                })}

                                {/* Outer ring: student distribution */}
                                {segments.map((seg, i) => {
                                    const isActive = activeMajor === seg.major;
                                    const isOtherActive = activeMajor !== null && activeMajor !== seg.major;
                                    return (
                                        <motion.path
                                            key={seg.major}
                                            d={arcPath(seg.startAngle, seg.endAngle, outerRadius)}
                                            fill="none"
                                            stroke={`url(#donut-grad-${seg.major})`}
                                            strokeWidth={isActive ? outerStroke + 5 : outerStroke}
                                            strokeLinecap="round"
                                            filter={isActive ? 'url(#donut-glow)' : 'none'}
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: isOtherActive ? 0.25 : 1 }}
                                            transition={{
                                                pathLength: { delay: 0.4 + i * 0.15, duration: 0.9, ease: 'easeOut' },
                                                opacity: { duration: 0.25 },
                                                strokeWidth: { duration: 0.2 },
                                            }}
                                            onMouseEnter={() => setHoveredMajor(seg.major)}
                                            onMouseLeave={() => setHoveredMajor(null)}
                                            onClick={() => handleSegmentClick(seg.major)}
                                            className="cursor-pointer"
                                            style={{
                                                filter: isActive
                                                    ? `drop-shadow(0 0 12px ${MAJOR_COLORS[seg.major] || fallbackColor}90)`
                                                    : `drop-shadow(0 0 4px ${MAJOR_COLORS[seg.major] || fallbackColor}30)`,
                                            }}
                                        />
                                    );
                                })}

                                {/* Center content */}
                                {activeSeg && activeStats ? (
                                    <>
                                        <text x={cx} y={cy - 14} textAnchor="middle" className="fill-[#222d32] font-bold" style={{ fontSize: 22 }}>
                                            {activeSeg.count}
                                        </text>
                                        <text x={cx} y={cy + 2} textAnchor="middle" style={{ fontSize: 7.5, letterSpacing: '0.12em', fill: MAJOR_COLORS[activeSeg.major] || fallbackColor }}>
                                            {formatMajor(activeSeg.major).toUpperCase()}
                                        </text>
                                        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-[#222d32]/25" style={{ fontSize: 8 }}>
                                            Avg {activeStats.avgProgress}% done
                                        </text>
                                    </>
                                ) : (
                                    <>
                                        <text x={cx} y={cy - 10} textAnchor="middle" className="fill-[#222d32] font-bold" style={{ fontSize: 28 }}>
                                            {animTotal}
                                        </text>
                                        <text x={cx} y={cy + 6} textAnchor="middle" className="fill-[#222d32]/20 font-bold" style={{ fontSize: 8, letterSpacing: '0.15em' }}>
                                            STUDENTS
                                        </text>
                                        <text x={cx} y={cy + 18} textAnchor="middle" className="fill-[#222d32]/10" style={{ fontSize: 7, letterSpacing: '0.08em' }}>
                                            CLICK TO EXPLORE
                                        </text>
                                    </>
                                )}

                                {/* Ring labels */}
                                <text x={size - 4} y={cy - outerRadius + 4} textAnchor="end" className="fill-[#222d32]/10" style={{ fontSize: 6, letterSpacing: '0.1em' }}>
                                    COUNT
                                </text>
                                <text x={size - 4} y={cy - innerRadius + 4} textAnchor="end" className="fill-[#222d32]/8" style={{ fontSize: 6, letterSpacing: '0.1em' }}>
                                    PROGRESS
                                </text>
                            </svg>

                            {/* Hover tooltip */}
                            <AnimatePresence>
                                {hoveredMajor && !selectedMajor && activeSeg && activeStats && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full z-30 pointer-events-none"
                                    >
                                        <div className="px-4 py-3 rounded-xl whitespace-nowrap"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(30,30,55,0.97), rgba(18,18,35,0.97))',
                                                border: `1px solid ${MAJOR_COLORS[activeSeg.major] || fallbackColor}40`,
                                                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${MAJOR_COLORS[activeSeg.major] || fallbackColor}15`,
                                            }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm">{MAJOR_ICONS[activeSeg.major] || '📚'}</span>
                                                <span className="text-[11px] font-semibold text-[#222d32]/80">{formatMajor(activeSeg.major)}</span>
                                                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                                                    style={{ background: `${MAJOR_COLORS[activeSeg.major] || fallbackColor}20`, color: MAJOR_COLORS[activeSeg.major] || fallbackColor }}>
                                                    #{activeSeg.rank}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 text-center">
                                                <div>
                                                    <div className="text-sm font-bold text-[#222d32] tabular-nums">{activeSeg.count}</div>
                                                    <div className="text-xs text-[#222d32]/50 uppercase font-bold">Students</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold tabular-nums" style={{ color: MAJOR_COLORS[activeSeg.major] || fallbackColor }}>{activeStats.avgCH}</div>
                                                    <div className="text-xs text-[#222d32]/50 uppercase font-bold">Avg CH</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-[#222d32] tabular-nums">{activeStats.avgProgress}%</div>
                                                    <div className="text-xs text-[#222d32]/50 uppercase font-bold">Progress</div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Right Panel: Legend + Selected Details */}
                        <div className="flex-1 w-full space-y-3">
                            {/* Legend Items */}
                            {segments.map((seg) => {
                                const isActive = activeMajor === seg.major;
                                const isSelected = selectedMajor === seg.major;
                                const isOtherActive = activeMajor !== null && activeMajor !== seg.major;
                                const pctRounded = Math.round(seg.pct * 100);
                                const stats = majorStats[seg.major];
                                const medalColor = RANK_MEDALS[seg.rank] || '';
                                const majorColor = MAJOR_COLORS[seg.major] || fallbackColor;
                                let background = 'transparent';
                                let borderColor = 'transparent';

                                if (isSelected) {
                                    background = `linear-gradient(135deg, ${majorColor}12, ${majorColor}04)`;
                                    borderColor = `${majorColor}30`;
                                } else if (isActive) {
                                    background = `${majorColor}08`;
                                    borderColor = `${majorColor}15`;
                                }
                                const rankBorderColor = medalColor ? `${medalColor}30` : 'rgba(255,255,255,0.04)';
                                const rankBackground = medalColor ? `${medalColor}20` : 'rgba(255,255,255,0.03)';

                                return (
                                    <motion.div
                                        key={seg.major}
                                        layout
                                        className="rounded-xl transition-all duration-200 cursor-pointer"
                                        style={{ background, border: `1px solid ${borderColor}` }}
                                        onMouseEnter={() => setHoveredMajor(seg.major)}
                                        onMouseLeave={() => setHoveredMajor(null)}
                                        onClick={() => handleSegmentClick(seg.major)}
                                        animate={{ opacity: isOtherActive && !isActive ? 0.4 : 1 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {/* Main legend row */}
                                        <div className="flex items-center gap-3 px-3 py-2.5">
                                            {/* Rank Badge */}
                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                                                style={{
                                                    background: rankBackground,
                                                    color: medalColor || 'rgba(255,255,255,0.2)',
                                                    border: `1px solid ${rankBorderColor}`,
                                                }}>
                                                {seg.rank}
                                            </div>

                                            {/* Major emoji */}
                                            <span className="text-base shrink-0">{MAJOR_ICONS[seg.major] || '📚'}</span>

                                            {/* Color dot */}
                                            <div className="w-3 h-3 rounded-md shrink-0 shadow-sm transition-transform duration-200"
                                                style={{
                                                    background: MAJOR_GRADIENTS[seg.major] || fallbackGradient,
                                                    transform: isActive ? 'scale(1.3)' : 'scale(1)',
                                                    boxShadow: isActive ? `0 0 10px ${MAJOR_COLORS[seg.major] || fallbackColor}50` : 'none',
                                                }} />

                                            {/* Name + bars */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs text-[#222d32]/55 font-medium group-hover:text-[#222d32]/80 transition-colors truncate">
                                                        {formatMajor(seg.major)}
                                                    </span>
                                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                                        <span className="text-xs font-mono text-[#222d32]/50 tabular-nums">
                                                            {stats?.avgProgress ?? 0}%
                                                        </span>
                                                        <span className="text-xs font-mono text-[#222d32]/40 tabular-nums">
                                                            {seg.count} <span className="text-[#222d32]/15">({pctRounded}%)</span>
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Stacked bar: distribution + progress */}
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex-1 h-1.5 bg-[#edf1f6]/40 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full rounded-full"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${pctRounded}%` }}
                                                            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                                                            style={{
                                                                background: MAJOR_GRADIENTS[seg.major] || fallbackGradient,
                                                                boxShadow: isActive ? `0 0 8px ${MAJOR_COLORS[seg.major] || fallbackColor}40` : 'none',
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="w-12 h-1.5 bg-[#edf1f6]/30 rounded-full overflow-hidden" title="Avg progress">
                                                        <motion.div
                                                            className="h-full rounded-full"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${stats?.avgProgress ?? 0}%` }}
                                                            transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
                                                            style={{
                                                                background: `${MAJOR_COLORS[seg.major] || fallbackColor}80`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expand indicator */}
                                            <motion.div
                                                animate={{ rotate: isSelected ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="shrink-0"
                                            >
                                                <ChevronDown className="w-3.5 h-3.5 text-[#222d32]/15" />
                                            </motion.div>
                                        </div>

                                        {/* Expanded detail panel */}
                                        <AnimatePresence>
                                            {isSelected && stats && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-3 pb-3 pt-1 space-y-3">
                                                        {/* Stats grid */}
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {[
                                                                { label: 'Avg Courses', value: stats.avgCourses, icon: <BookOpen className="w-3 h-3" /> },
                                                                { label: 'Avg CH', value: `${stats.avgCH}/135`, icon: <BarChart3 className="w-3 h-3" /> },
                                                                { label: 'Max CH', value: stats.maxCH, icon: <ArrowUp className="w-3 h-3" /> },
                                                                { label: 'Min CH', value: stats.minCH, icon: <ArrowDown className="w-3 h-3" /> },
                                                            ].map((item) => (
                                                                <div key={item.label} className="text-center p-2 rounded-lg"
                                                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                                    <div className="flex items-center justify-center gap-1 mb-1"
                                                                        style={{ color: `${MAJOR_COLORS[seg.major] || fallbackColor}80` }}>
                                                                        {item.icon}
                                                                    </div>
                                                                    <div className="text-xs font-bold text-[#222d32]/60 tabular-nums">{item.value}</div>
                                                                    <div className="text-[7px] text-[#222d32]/40 uppercase font-bold tracking-wide">{item.label}</div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Mini progress distribution */}
                                                        <div>
                                                            <div className="text-xs text-[#222d32]/40 uppercase font-bold tracking-wider mb-2">Progress Breakdown</div>
                                                            <div className="flex items-end gap-1.5" style={{ height: 36 }}>
                                                                {['0-25%', '26-50%', '51-75%', '76-100%'].map((label, bi) => {
                                                                    const bucketVal = stats.progressBuckets[bi];
                                                                    const maxBucket = Math.max(...stats.progressBuckets, 1);
                                                                    const barH = Math.max((bucketVal / maxBucket) * 28, bucketVal > 0 ? 4 : 0);
                                                                    const bucketColor = PROGRESS_COLORS[bi];
                                                                    return (
                                                                        <div key={label} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
                                                                            <span className="text-xs font-mono tabular-nums" style={{ color: bucketColor.text }}>{bucketVal}</span>
                                                                            <motion.div
                                                                                initial={{ height: 0 }}
                                                                                animate={{ height: barH }}
                                                                                transition={{ duration: 0.5, delay: bi * 0.05 }}
                                                                                className="w-full rounded-sm"
                                                                                style={{ background: bucketColor.bar }}
                                                                            />
                                                                            <span className="text-[6px] text-[#222d32]/15 font-mono">{label}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Circular progress indicator */}
                                                        <div className="flex items-center justify-center gap-4 pt-1">
                                                            <div className="relative" style={{ width: 44, height: 44 }}>
                                                                <svg width="44" height="44" viewBox="0 0 44 44">
                                                                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
                                                                    <motion.circle
                                                                        cx="22" cy="22" r="18" fill="none"
                                                                        stroke={MAJOR_COLORS[seg.major] || fallbackColor}
                                                                        strokeWidth="4" strokeLinecap="round"
                                                                        strokeDasharray={`${2 * Math.PI * 18}`}
                                                                        initial={{ strokeDashoffset: 2 * Math.PI * 18 }}
                                                                        animate={{ strokeDashoffset: 2 * Math.PI * 18 * (1 - stats.avgProgress / 100) }}
                                                                        transition={{ duration: 0.8, delay: 0.2 }}
                                                                        transform="rotate(-90 22 22)"
                                                                        style={{ filter: `drop-shadow(0 0 4px ${MAJOR_COLORS[seg.major] || fallbackColor}50)` }}
                                                                    />
                                                                    <text x="22" y="24" textAnchor="middle" className="fill-[#222d32] font-bold" style={{ fontSize: 11 }}>
                                                                        {stats.avgProgress}%
                                                                    </text>
                                                                </svg>
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-xs text-[#222d32]/40 font-medium">Average Degree Completion</div>
                                                                <div className="text-[11px] text-[#222d32]/40 mt-0.5">
                                                                    {stats.avgCH} of 135 credit hours
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                ) : (
                    /* ── Table View ─────────────────────────────── */
                    <motion.div key="table-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-[#dde3ec]/40">
                                        <th className="text-xs text-[#222d32]/50 uppercase tracking-widest font-bold pb-3 pr-4">#</th>
                                        <th className="text-xs text-[#222d32]/50 uppercase tracking-widest font-bold pb-3 pr-4">Major</th>
                                        <th className="text-xs text-[#222d32]/50 uppercase tracking-widest font-bold pb-3 pr-4 text-right">Students</th>
                                        <th className="text-xs text-[#222d32]/50 uppercase tracking-widest font-bold pb-3 pr-4 text-right">Avg Courses</th>
                                        <th className="text-xs text-[#222d32]/50 uppercase tracking-widest font-bold pb-3 pr-4 text-right">Avg CH</th>
                                        <th className="text-xs text-[#222d32]/50 uppercase tracking-widest font-bold pb-3 pr-4 text-right">Max CH</th>
                                        <th className="text-xs text-[#222d32]/50 uppercase tracking-widest font-bold pb-3 pr-4">Avg Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {segments.map((seg, i) => {
                                        const stats = majorStats[seg.major];
                                        if (!stats) return null;
                                        const barColor = getProgressBarColor(stats.avgProgress);
                                        return (
                                            <motion.tr key={seg.major}
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                                                className="border-b border-[#dde3ec]/20 hover:bg-[#edf1f6]/15 transition-colors">
                                                <td className="py-3 pr-4">
                                                    <span className="text-xs font-black tabular-nums"
                                                        style={{ color: RANK_MEDALS[seg.rank] || 'rgba(255,255,255,0.2)' }}>
                                                        {seg.rank}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">{MAJOR_ICONS[seg.major] || '📚'}</span>
                                                        <div className="w-3 h-3 rounded-md" style={{ background: MAJOR_GRADIENTS[seg.major] || fallbackGradient }} />
                                                        <span className="text-xs text-[#222d32]/55 font-medium">{formatMajor(seg.major)}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 text-right text-xs font-mono text-[#222d32]/45 tabular-nums">
                                                    {seg.count}
                                                    <span className="text-[#222d32]/15 ml-1">({Math.round(seg.pct * 100)}%)</span>
                                                </td>
                                                <td className="py-3 pr-4 text-right text-xs font-mono text-[#222d32]/40 tabular-nums">{stats.avgCourses}</td>
                                                <td className="py-3 pr-4 text-right text-xs font-mono text-[#222d32]/40 tabular-nums">
                                                    {stats.avgCH}<span className="text-[#222d32]/15">/135</span>
                                                </td>
                                                <td className="py-3 pr-4 text-right text-xs font-mono text-[#222d32]/35 tabular-nums">{stats.maxCH}</td>
                                                <td className="py-3 pr-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-20 h-1.5 bg-[#edf1f6]/40 rounded-full overflow-hidden">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.avgProgress}%` }}
                                                                transition={{ duration: 0.6, delay: i * 0.04 }}
                                                                className="h-full rounded-full"
                                                                style={{ background: barColor, boxShadow: `0 0 6px ${barColor}40` }} />
                                                        </div>
                                                        <span className="text-xs font-mono text-[#222d32]/50 w-8 tabular-nums">{stats.avgProgress}%</span>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function AreaChart({ data, maxVal }: Readonly<{ data: TrafficDay[]; maxVal: number }>) {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const W = 700, H = 200, PL = 40, PR = 10, PT = 10, PB = 28;
    const chartW = W - PL - PR, chartH = H - PT - PB;
    const n = data.length;

    // Y-axis ticks (4 labels)
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => ({
        val: Math.round(maxVal * p),
        y: PT + chartH * (1 - p),
    }));

    // Points
    const points = data.map((d, i) => ({
        x: PL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2),
        y: PT + chartH * (1 - d.count / maxVal),
    }));

    // SVG path (smooth curve using catmull-rom → bezier)
    const linePath = points.length < 2 ? '' : (() => {
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(i - 1, 0)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(i + 2, points.length - 1)];
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return path;
    })();

    const areaPath = linePath
        ? `${linePath} L ${points.at(-1)?.x ?? 0} ${PT + chartH} L ${points[0].x} ${PT + chartH} Z`
        : '';

    return (
        <div className="relative w-full" style={{ aspectRatio: `${W}/${H}` }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(96,165,250,0.25)" />
                        <stop offset="100%" stopColor="rgba(96,165,250,0)" />
                    </linearGradient>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                </defs>

                {/* Grid lines */}
                {yTicks.map((t, i) => (
                    <g key={`tick-${t.val}`}>
                        <line x1={PL} y1={t.y} x2={W - PR} y2={t.y}
                            stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray={i === 0 ? 'none' : '4 4'} />
                        <text x={PL - 8} y={t.y + 3} textAnchor="end" fill="rgba(255,255,255,0.15)"
                            style={{ fontSize: 9, fontFamily: 'monospace' }}>{t.val}</text>
                    </g>
                ))}

                {/* Area fill */}
                {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

                {/* Line */}
                {linePath && <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" />}

                {/* Hover line + dot */}
                {hoverIdx !== null && points[hoverIdx] && (
                    <>
                        <line x1={points[hoverIdx].x} y1={PT} x2={points[hoverIdx].x} y2={PT + chartH}
                            stroke="rgba(96,165,250,0.3)" strokeWidth="1" strokeDasharray="3 3" />
                        <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="4"
                            fill="#60a5fa" stroke="#edf1f6" strokeWidth="2" />
                        <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="8"
                            fill="rgba(96,165,250,0.15)" />
                    </>
                )}

                {/* X-axis labels (every ~5 days) */}
                {data.map((d, i) => {
                    if (n > 10 && i % Math.ceil(n / 6) !== 0 && i !== n - 1) return null;
                    return (
                        <text key={`label-${d.date}`} x={points[i]?.x ?? 0} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.15)"
                            style={{ fontSize: 8, fontFamily: 'monospace' }}>{d.date.slice(5)}</text>
                    );
                })}

                {/* Invisible hover areas */}
                {points.map((pt, i) => (
                    <rect key={`hover-${pt.x}-${pt.y}`} x={pt.x - chartW / n / 2} y={PT} width={chartW / n} height={chartH}
                        fill="transparent" className="cursor-crosshair"
                        onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} />
                ))}
            </svg>

            {/* Floating tooltip */}
            {hoverIdx !== null && data[hoverIdx] && points[hoverIdx] && (
                <div className="absolute z-20 pointer-events-none transition-all duration-100"
                    style={{
                        left: `${(points[hoverIdx].x / W) * 100}%`,
                        top: `${(points[hoverIdx].y / H) * 100 - 12}%`,
                        transform: 'translate(-50%, -100%)',
                    }}>
                    <div className="px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg, rgba(30,30,50,0.95), rgba(20,20,40,0.95))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <span className="text-[#222d32]/40">{data[hoverIdx].date.slice(5)}</span>{' · '}
                        <span className="text-[#222d32] font-bold">{data[hoverIdx].count}</span>
                        <span className="text-[#222d32]/50"> visits</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function Heatmap({ data }: Readonly<{ data: HeatmapCell[] }>) {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const grid: number[][] = new Array(7).fill(null).map(() => new Array(24).fill(0));
    for (const cell of data) {
        if (cell.day >= 0 && cell.day < 7 && cell.hour >= 0 && cell.hour < 24) grid[cell.day][cell.hour] = cell.count;
    }
    if (data.length === 0) return <Empty text="No heatmap data" />;

    return (
        <div className="space-y-0.75">
            <div className="flex gap-0.75 ml-10">
                {Array.from({ length: 24 }, (_, h) => (
                    <div key={`hour-${h}`} className="flex-1 text-center text-[7px] text-[#222d32]/12 font-mono font-bold">{h % 3 === 0 ? `${h}` : ''}</div>
                ))}
            </div>
            {grid.map((row, dayIdx) => (
                <div key={`day-${DAYS[dayIdx]}`} className="flex items-center gap-0.75">
                    <span className="w-8 text-[11px] text-[#222d32]/40 font-mono text-right pr-1 font-bold">{DAYS[dayIdx]}</span>
                    {row.map((count, hourIdx) => {
                        const intensity = count / maxCount;
                        return (
                            <motion.div key={`cell-${dayIdx}-${hourIdx}`}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: dayIdx * 0.02 + hourIdx * 0.003, duration: 0.2 }}
                                title={`${DAYS[dayIdx]} ${hourIdx}:00 — ${count} visits`}
                                className="flex-1 aspect-square rounded-sm cursor-default transition-transform duration-200 hover:scale-150 hover:z-10"
                                style={{
                                    background: count === 0
                                        ? 'rgba(255,255,255,0.015)'
                                        : `rgba(220, 72, 53, ${0.12 + intensity * 0.75})`,
                                    boxShadow: intensity > 0.5 ? `0 0 8px rgba(220,72,53,${intensity * 0.3})` : 'none',
                                }}
                            />
                        );
                    })}
                </div>
            ))}
            <div className="flex items-center justify-end gap-1.5 mt-3">
                <span className="text-xs text-[#222d32]/15 font-bold">Less</span>
                {[0, 0.2, 0.4, 0.7, 1].map((v) => (
                    <div key={`legend-${v}`} className="w-3.5 h-3.5 rounded-[3px]"
                        style={{
                            background: v === 0 ? 'rgba(255,255,255,0.015)' : `rgba(220,72,53,${0.12 + v * 0.75})`,
                            boxShadow: v > 0.5 ? `0 0 6px rgba(220,72,53,${v * 0.25})` : 'none'
                        }} />
                ))}
                <span className="text-xs text-[#222d32]/15 font-bold">More</span>
            </div>
        </div>
    );
}

function Empty({ text }: Readonly<{ text: string }>) {
    return (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-8 h-8 rounded-full bg-[#edf1f6]/30 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[#222d32]/10" />
            </div>
            <p className="text-xs text-[#222d32]/15 font-medium">{text}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Loading States
   ═══════════════════════════════════════════════════════════════════ */

function SkeletonLoader() {
    const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.03] before:to-transparent';

    return (
        <div className="min-h-screen text-[#222d32]">
            <style>{`@keyframes shimmer { to { transform: translateX(100%); } }`}</style>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
                {/* Header skeleton */}
                <div className="space-y-3">
                    <div className={`h-4 w-28 rounded-lg bg-[#edf1f6]/40 ${shimmer}`} />
                    <div className={`h-8 w-56 rounded-xl bg-[#edf1f6]/40 ${shimmer}`} />
                    <div className={`h-3 w-40 rounded-lg bg-[#edf1f6]/30 ${shimmer}`} />
                </div>
                {/* Stat cards skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {new Array(5).fill(null).map((_, i) => (
                        <div key={`skeleton-${i + 1}`} className={`h-20 rounded-2xl bg-[#edf1f6]/20 border border-[#dde3ec]/30 ${shimmer}`} />
                    ))}
                </div>
                {/* Chart skeleton */}
                <div className={`h-64 rounded-2xl bg-[#edf1f6]/20 border border-[#dde3ec]/30 ${shimmer}`} />
                {/* Two columns skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`h-72 rounded-2xl bg-[#edf1f6]/20 border border-[#dde3ec]/30 ${shimmer}`} />
                    <div className={`h-72 rounded-2xl bg-[#edf1f6]/20 border border-[#dde3ec]/30 ${shimmer}`} />
                </div>
            </div>
        </div>
    );
}

function ErrorState({ onRetry }: Readonly<{ onRetry: () => void }>) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-400/60" />
            </div>
            <p className="text-sm text-[#222d32]/50 font-medium">Failed to load analytics</p>
            <button onClick={onRetry}
                className="text-xs font-semibold text-[#222d32]/40 hover:text-[#222d32]/70 transition-colors px-4 py-2 rounded-xl border border-[#dde3ec]/60 hover:border-[#dde3ec]">
                Try Again
            </button>
        </div>
    );
}
