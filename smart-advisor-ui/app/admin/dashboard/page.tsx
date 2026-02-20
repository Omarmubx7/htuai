'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminGate, { useAdminSecret } from '@/components/AdminGate';
import {
    Users, Activity, PieChart, TrendingUp,
    Monitor, Smartphone, Globe, BookOpen,
    Eye, Clock, ArrowUpRight, Database,
    Search, ChevronUp, ChevronDown, RefreshCw,
    Flame, BarChart3, ArrowUp, ArrowDown, Filter,
    GraduationCap, Zap
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface TopCourse { code: string; name: string; count: number; ch?: number }
interface TrafficDay { date: string; count: number }
interface DeviceEntry { os: string; browser: string; count: number }
interface ActivityEntry { type: string; student_id: string; detail: string; time: string }
interface StudentRow { student_id: string; major: string; count: number; ch?: number }
interface HeatmapCell { day: number; hour: number; count: number }

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
}

type SortKey = 'student_id' | 'major' | 'count' | 'ch';
type SortDir = 'asc' | 'desc';
type TabKey = 'overview' | 'students' | 'visitors';

/* ═══════════════════════════════════════════════════════════════════
   Design Tokens
   ═══════════════════════════════════════════════════════════════════ */

const MAJOR_COLORS: Record<string, string> = {
    computer_science: '#a78bfa',
    cybersecurity: '#f87171',
    data_science: '#60a5fa',
    artificial_intelligence: '#34d399',
};
const MAJOR_GRADIENTS: Record<string, string> = {
    computer_science: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    cybersecurity: 'linear-gradient(135deg, #ef4444, #f87171)',
    data_science: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    artificial_intelligence: 'linear-gradient(135deg, #10b981, #34d399)',
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
const AUTO_REFRESH_INTERVAL = 30_000;

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function formatMajor(key: string) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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

/* ═══════════════════════════════════════════════════════════════════
   Animated Counter
   ═══════════════════════════════════════════════════════════════════ */

function useCountUp(target: number, duration = 1400) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        const startTime = performance.now();
        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
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

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'x-admin-secret': adminSecret }
            });
            const data = await res.json();
            setStats(data);
            setLastFetched(new Date());
        } catch { /* ignore */ }
        setLoading(false);
        setRefreshing(false);
    }, [adminSecret]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), AUTO_REFRESH_INTERVAL);
        return () => clearInterval(interval);
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
            const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
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
    const totalDeviceCount = stats.deviceBreakdown.reduce((s, d) => s + d.count, 0) || 1;
    const weekChange = pctChange(stats.thisWeekVisits, stats.lastWeekVisits);
    const allMajorKeys = Object.keys(stats.majorCounts).sort();

    const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
        { key: 'students', label: 'Students', icon: <GraduationCap className="w-3.5 h-3.5" /> },
        { key: 'visitors', label: 'Visitors', icon: <Eye className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)' }}>

            {/* Ambient effects */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[1400px] h-[800px]"
                    style={{ background: 'radial-gradient(ellipse 50% 35% at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
                <div className="absolute -right-40 top-1/3 w-[600px] h-[600px]"
                    style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)' }} />
                <div className="absolute -left-40 bottom-1/4 w-[500px] h-[500px]"
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
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)' }}>
                                Admin Panel
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                                <span className="text-[10px] font-medium text-emerald-400/80">Live</span>
                            </div>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                            Platform Analytics
                        </h1>
                        <p className="text-white/25 text-xs mt-1.5 font-medium">
                            {lastFetched ? `Updated ${timeAgo(lastFetched.toISOString())} · Auto-refreshes every 30s` : 'Loading...'}
                        </p>
                    </div>
                    <button onClick={() => fetchData(true)} disabled={refreshing}
                        className="group flex items-center gap-2 text-[11px] font-medium text-white/30 hover:text-white/60 transition-all duration-300 px-4 py-2.5 rounded-xl
                        border border-white/[0.06] hover:border-white/10 hover:shadow-lg hover:shadow-violet-500/5"
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
                        <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-90'}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </motion.div>

                {/* ─── Controls Row ────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 rounded-2xl border border-white/[0.06]"
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${tab === t.key
                                    ? 'bg-white text-black shadow-md shadow-white/10'
                                    : 'text-white/30 hover:text-white/55 hover:bg-white/[0.03]'
                                    }`}>
                                {t.icon}{t.label}
                            </button>
                        ))}
                    </div>

                    {/* Major Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06]"
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))' }}>
                        <Filter className="w-3.5 h-3.5 text-white/20" />
                        <select value={majorFilter} onChange={e => setMajorFilter(e.target.value)}
                            className="bg-transparent text-xs text-white/60 outline-none cursor-pointer appearance-none pr-4 font-medium">
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
                </AnimatePresence>

                <div className="text-center text-[10px] text-white/10 pt-6 pb-10 font-medium tracking-wider uppercase">
                    HTU Smart Advisor · Admin Dashboard
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Overview Tab
   ═══════════════════════════════════════════════════════════════════ */

function OverviewTab({ stats, majors, progress, maxProgress, maxTraffic, weekChange }: {
    stats: Stats; majors: [string, number][]; progress: [string, number][];
    maxProgress: number; maxTraffic: number; weekChange: number;
}) {
    const animStudents = useCountUp(stats.totalStudents);
    const animVisitors = useCountUp(stats.totalVisitors);
    const animCourses = useCountUp(stats.totalCompletedCourses);
    const animAvg = useCountUp(stats.avgCoursesCompleted);
    const animCH = useCountUp(stats.avgCreditHours);

    return (
        <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard icon={<Users className="w-4 h-4" />} label="Total Students" value={animStudents} gradient="from-violet-500/20 to-purple-500/5" iconBg="#7c3aed" delay={0} />
                <StatCard icon={<Eye className="w-4 h-4" />} label="Total Visits" value={animVisitors} gradient="from-blue-500/20 to-cyan-500/5" iconBg="#2563eb" delay={0.04}
                    badge={weekChange !== 0 ? { value: `${weekChange > 0 ? '+' : ''}${weekChange}%`, positive: weekChange > 0 } : undefined} />
                <StatCard icon={<BookOpen className="w-4 h-4" />} label="Courses Done" value={animCourses} gradient="from-emerald-500/20 to-teal-500/5" iconBg="#059669" delay={0.08} />
                <StatCard icon={<Flame className="w-4 h-4" />} label="Avg Courses" value={animAvg} gradient="from-amber-500/20 to-orange-500/5" iconBg="#d97706" delay={0.12} />
                <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Avg CH" value={`${animCH}/135`} gradient="from-rose-500/20 to-pink-500/5" iconBg="#e11d48" delay={0.16} />
            </div>

            {/* Traffic Chart — Professional SVG Area Chart */}
            <GlassCard delay={0.1}>
                <div className="flex items-center justify-between mb-6">
                    <CardHeader icon={<TrendingUp className="w-4 h-4" />} title="Visitor Traffic" iconColor="#60a5fa" />
                    <span className="text-[10px] text-white/20 font-medium px-2.5 py-1 rounded-lg bg-white/[0.03]">Last 30 days</span>
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
                    <MajorDonutSection majors={majors} total={stats.totalStudents} />
                </GlassCard>

                {/* Progress Distribution */}
                <GlassCard delay={0.2}>
                    <CardHeader icon={<Activity className="w-4 h-4" />} title="Degree Progress" iconColor="#34d399" />
                    <div className="flex items-end gap-4 mt-4" style={{ height: 220 }}>
                        {progress.map(([range, count], i) => {
                            const barH = maxProgress > 0 ? Math.max((count / maxProgress) * 170, count > 0 ? 10 : 0) : 0;
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
                                    <span className="text-[10px] text-white/25 font-mono font-medium">{range}</span>
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
                            right={<span className="text-[10px] text-white/20 font-mono tabular-nums">{stats.topCourses.length}</span>} />
                    </div>
                    <div className="space-y-1">
                        {stats.topCourses.map((course, i) => (
                            <motion.div key={course.code} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.02 }}
                                className="flex items-center gap-3 hover:bg-white/[0.025] rounded-xl px-3 py-2 -mx-1 transition-all duration-200 group cursor-default">
                                <span className="text-[10px] font-mono text-white/15 w-5 shrink-0 tabular-nums">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white/55 truncate group-hover:text-white/70 transition-colors font-medium">{course.name}</p>
                                    <p className="text-[10px] text-white/15 font-mono">{course.code}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-bold text-white/30 tabular-nums">{course.count}</span>
                                    <Users className="w-3 h-3 text-white/10" />
                                </div>
                            </motion.div>
                        ))}
                        {stats.topCourses.length === 0 && <Empty text="No course data" />}
                    </div>
                </GlassCard>

                <GlassCard delay={0.3}>
                    <CardHeader icon={<Flame className="w-4 h-4" />} title="Activity Heatmap" iconColor="#fb923c"
                        right={<span className="text-[10px] text-white/20">Hour × Day</span>} />
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

function StudentsTab({ students, total, search, setSearch, sortKey, sortDir, toggleSort }: {
    students: StudentRow[]; total: number;
    search: string; setSearch: (s: string) => void;
    sortKey: SortKey; sortDir: SortDir; toggleSort: (k: SortKey) => void;
}) {
    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-white/10" />;
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-violet-400/70" /> : <ChevronDown className="w-3 h-3 text-violet-400/70" />;
    };

    return (
        <GlassCard delay={0.05}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <CardHeader icon={<Database className="w-4 h-4" />} title="All Students" iconColor="#a78bfa"
                    right={<span className="text-[10px] text-white/20 font-mono tabular-nums">{students.length}/{total}</span>} />
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06]"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))' }}>
                    <Search className="w-3.5 h-3.5 text-white/20" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search ID or Major..."
                        className="bg-transparent text-xs text-white placeholder-white/15 outline-none w-44 font-medium" />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/[0.04]">
                            <Th>#</Th>
                            <Th sortable onClick={() => toggleSort('student_id')}>Student ID <SortIcon col="student_id" /></Th>
                            <Th sortable onClick={() => toggleSort('major')}>Major <SortIcon col="major" /></Th>
                            <Th sortable onClick={() => toggleSort('count')}>Courses <SortIcon col="count" /></Th>
                            <Th sortable onClick={() => toggleSort('ch')}>CH <SortIcon col="ch" /></Th>
                            <Th>Progress</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((s, i) => {
                            const realCH = s.ch ?? s.count * 3;
                            const pct = Math.min(Math.round((realCH / 135) * 100), 100);
                            const barColor = pct >= 75 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444';
                            return (
                                <motion.tr key={`${s.student_id}-${s.major}`}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.008 }}
                                    className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-colors group">
                                    <td className="py-3 pr-4 text-[10px] text-white/15 font-mono tabular-nums">{i + 1}</td>
                                    <td className="py-3 pr-4 text-xs font-mono text-white/50 group-hover:text-white/70 transition-colors">{s.student_id}</td>
                                    <td className="py-3 pr-4">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-md shadow-sm"
                                                style={{ background: MAJOR_GRADIENTS[s.major] || fallbackGradient }} />
                                            <span className="text-xs text-white/45 font-medium">{formatMajor(s.major)}</span>
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4 text-xs font-mono text-white/45 tabular-nums">{s.count}</td>
                                    <td className="py-3 pr-4 text-xs font-mono text-white/35 tabular-nums">{realCH}<span className="text-white/15">/135</span></td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-24 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.5, delay: i * 0.008 }}
                                                    className="h-full rounded-full shadow-sm"
                                                    style={{ background: barColor, boxShadow: `0 0 8px ${barColor}40` }} />
                                            </div>
                                            <span className="text-[10px] font-mono text-white/25 w-8 tabular-nums">{pct}%</span>
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
   Visitors Tab
   ═══════════════════════════════════════════════════════════════════ */

function VisitorsTab({ stats, totalDeviceCount }: { stats: Stats; totalDeviceCount: number }) {
    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard delay={0.05} scrollable>
                    <div className="sticky top-0 z-10 pb-4 -mt-1"
                        style={{ background: 'linear-gradient(180deg, rgba(14,14,24,0.95) 80%, transparent 100%)' }}>
                        <CardHeader icon={<Monitor className="w-4 h-4" />} title="Devices & Browsers" iconColor="#22d3ee"
                            right={<span className="text-[10px] text-white/20 font-mono tabular-nums">{stats.deviceBreakdown.length}</span>} />
                    </div>
                    <div className="space-y-3.5">
                        {stats.deviceBreakdown.map((d, i) => {
                            const pct = Math.round((d.count / totalDeviceCount) * 100);
                            const isMobile = /ios|android/i.test(d.os);
                            return (
                                <div key={i} className="group hover:bg-white/[0.015] rounded-xl px-2 py-1.5 -mx-1 transition-all duration-200 cursor-default">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            {isMobile ? <Smartphone className="w-3.5 h-3.5 text-cyan-400/40" /> : <Globe className="w-3.5 h-3.5 text-cyan-400/40" />}
                                            <span className="text-xs text-white/50 font-medium">{d.os} · {d.browser}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-white/25 tabular-nums">{d.count} ({pct}%)</span>
                                    </div>
                                    <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
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
                            right={<span className="text-[10px] text-white/20 font-mono tabular-nums">{stats.recentActivity.length}</span>} />
                    </div>
                    <div className="space-y-1">
                        {stats.recentActivity.map((act, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                className="flex items-start gap-3 hover:bg-white/[0.015] rounded-xl px-2 py-2 -mx-1 transition-all duration-200 cursor-default">
                                <div className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'linear-gradient(135deg, rgba(251,113,133,0.1), rgba(251,113,133,0.02))', border: '1px solid rgba(251,113,133,0.08)' }}>
                                    <ArrowUpRight className="w-3 h-3 text-rose-400/50" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-white/45 font-medium">
                                        <span className="font-mono text-white/30">{act.student_id === 'Anonymous' ? 'Anon' : `...${act.student_id.slice(-4)}`}</span>{' '}
                                        {act.detail}
                                    </p>
                                    <p className="text-[10px] text-white/15 mt-0.5">{timeAgo(act.time)}</p>
                                </div>
                            </motion.div>
                        ))}
                        {stats.recentActivity.length === 0 && <Empty text="No activity" />}
                    </div>
                </GlassCard>
            </div>

            <GlassCard delay={0.15}>
                <CardHeader icon={<Flame className="w-4 h-4" />} title="Visitor Heatmap" iconColor="#fb923c"
                    right={<span className="text-[10px] text-white/20">Activity by hour and day</span>} />
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

function GlassCard({ children, delay = 0, scrollable }: { children: React.ReactNode; delay?: number; scrollable?: boolean }) {
    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
            className={`rounded-2xl p-5 sm:p-6 ${scrollable ? 'max-h-[480px] overflow-y-auto' : ''}`}
            style={{
                background: 'linear-gradient(135deg, rgba(14,14,24,0.8), rgba(10,10,18,0.6))',
                border: '1px solid rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)',
            }}>
            {children}
        </motion.div>
    );
}

function CardHeader({ icon, title, iconColor, right }: { icon: React.ReactNode; title: string; iconColor: string; right?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}20`, color: iconColor }}>
                    {icon}
                </div>
                <h2 className="text-sm font-semibold text-white/75">{title}</h2>
            </div>
            {right}
        </div>
    );
}

function StatCard({ icon, label, value, gradient, iconBg, delay, badge }: {
    icon: React.ReactNode; label: string; value: string | number;
    gradient: string; iconBg: string; delay: number;
    badge?: { value: string; positive: boolean };
}) {
    return (
        <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay, duration: 0.35 }}
            className={`relative rounded-2xl p-4 flex items-center gap-3 group cursor-default overflow-hidden transition-all duration-300 hover:scale-[1.02]`}
            style={{
                background: 'linear-gradient(135deg, rgba(14,14,24,0.8), rgba(10,10,18,0.6))',
                border: '1px solid rgba(255,255,255,0.04)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            }}>
            {/* Color accent glow */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
                style={{ background: `${iconBg}25`, border: `1px solid ${iconBg}30` }}>
                {icon}
            </div>
            <div className="relative min-w-0 flex-1">
                <div className="text-[9px] text-white/30 uppercase font-bold tracking-widest mb-0.5">{label}</div>
                <div className="text-lg font-bold truncate tabular-nums">{value}</div>
            </div>
            {badge && (
                <span className={`relative text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5 ${badge.positive ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/15' : 'text-red-400 bg-red-500/10 border border-red-500/15'
                    }`}>
                    {badge.positive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                    {badge.value}
                </span>
            )}
        </motion.div>
    );
}

function Th({ children, sortable, onClick }: { children: React.ReactNode; sortable?: boolean; onClick?: () => void }) {
    return (
        <th onClick={onClick}
            className={`text-[10px] text-white/25 uppercase tracking-widest font-bold pb-3 pr-4 ${sortable ? 'cursor-pointer select-none hover:text-white/45 transition-colors' : ''}`}>
            <span className="inline-flex items-center gap-1">{children}</span>
        </th>
    );
}

function MajorDonutSection({ majors, total }: { majors: [string, number][]; total: number }) {
    const [hoveredMajor, setHoveredMajor] = useState<string | null>(null);
    const animTotal = useCountUp(total);

    // Donut geometry
    const size = 160;
    const cx = size / 2, cy = size / 2;
    const radius = 58;
    const stroke = 18;
    const gapAngle = 3; // degrees gap between segments
    const totalVal = majors.reduce((s, [, v]) => s + v, 0) || 1;

    // Build arc segments
    const segments: { major: string; count: number; pct: number; startAngle: number; endAngle: number }[] = [];
    let currentAngle = -90; // start from top
    for (const [major, count] of majors) {
        const pct = count / totalVal;
        const sweep = pct * (360 - gapAngle * majors.length);
        segments.push({ major, count, pct, startAngle: currentAngle, endAngle: currentAngle + sweep });
        currentAngle += sweep + gapAngle;
    }

    // SVG arc path helper
    const arcPath = (startDeg: number, endDeg: number, r: number) => {
        const startRad = (startDeg * Math.PI) / 180;
        const endRad = (endDeg * Math.PI) / 180;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const largeArc = endDeg - startDeg > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    };

    // Hovered segment info for tooltip
    const hoveredSeg = segments.find(s => s.major === hoveredMajor);

    return (
        <div className="flex flex-col sm:flex-row items-center gap-6 mt-6">
            {/* Donut Chart */}
            <div className="relative shrink-0" style={{ width: size, height: size }}>
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
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Background track */}
                    <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={stroke} />

                    {/* Arc segments */}
                    {segments.map((seg, i) => {
                        const isHovered = hoveredMajor === seg.major;
                        const isOtherHovered = hoveredMajor !== null && hoveredMajor !== seg.major;
                        return (
                            <motion.path
                                key={seg.major}
                                d={arcPath(seg.startAngle, seg.endAngle, radius)}
                                fill="none"
                                stroke={`url(#donut-grad-${seg.major})`}
                                strokeWidth={isHovered ? stroke + 4 : stroke}
                                strokeLinecap="round"
                                filter={isHovered ? 'url(#donut-glow)' : 'none'}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: isOtherHovered ? 0.35 : 1 }}
                                transition={{
                                    pathLength: { delay: 0.4 + i * 0.15, duration: 0.9, ease: 'easeOut' },
                                    opacity: { duration: 0.25 },
                                    strokeWidth: { duration: 0.2 },
                                }}
                                onMouseEnter={() => setHoveredMajor(seg.major)}
                                onMouseLeave={() => setHoveredMajor(null)}
                                className="cursor-pointer"
                                style={{
                                    filter: isHovered
                                        ? `drop-shadow(0 0 10px ${MAJOR_COLORS[seg.major] || fallbackColor}90)`
                                        : `drop-shadow(0 0 4px ${MAJOR_COLORS[seg.major] || fallbackColor}30)`,
                                }}
                            />
                        );
                    })}

                    {/* Center text */}
                    <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white font-bold" style={{ fontSize: 26 }}>
                        {animTotal}
                    </text>
                    <text x={cx} y={cy + 12} textAnchor="middle" className="fill-white/20 font-bold" style={{ fontSize: 8, letterSpacing: '0.15em' }}>
                        STUDENTS
                    </text>
                </svg>

                {/* Hover tooltip */}
                <AnimatePresence>
                    {hoveredSeg && (
                        <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-30 pointer-events-none"
                        >
                            <div className="px-3 py-2 rounded-xl text-center whitespace-nowrap"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(30,30,55,0.97), rgba(18,18,35,0.97))',
                                    border: `1px solid ${MAJOR_COLORS[hoveredSeg.major] || fallbackColor}40`,
                                    boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${MAJOR_COLORS[hoveredSeg.major] || fallbackColor}15`,
                                }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: MAJOR_COLORS[hoveredSeg.major] || fallbackColor }} />
                                    <span className="text-[11px] font-semibold text-white/80">{formatMajor(hoveredSeg.major)}</span>
                                </div>
                                <div className="text-sm font-bold text-white tabular-nums">
                                    {hoveredSeg.count} <span className="text-white/30 text-xs font-medium">({Math.round(hoveredSeg.pct * 100)}%)</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-3 w-full">
                {segments.map((seg) => {
                    const isHovered = hoveredMajor === seg.major;
                    const pctRounded = Math.round(seg.pct * 100);
                    return (
                        <motion.div
                            key={seg.major}
                            className="flex items-center gap-3 group cursor-pointer rounded-xl px-3 py-2.5 -mx-2 transition-all duration-200"
                            style={{
                                background: isHovered ? `${MAJOR_COLORS[seg.major] || fallbackColor}10` : 'transparent',
                                border: `1px solid ${isHovered ? `${MAJOR_COLORS[seg.major] || fallbackColor}20` : 'transparent'}`,
                            }}
                            onMouseEnter={() => setHoveredMajor(seg.major)}
                            onMouseLeave={() => setHoveredMajor(null)}
                            animate={{ opacity: hoveredMajor && !isHovered ? 0.45 : 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm transition-transform duration-200"
                                style={{
                                    background: MAJOR_GRADIENTS[seg.major] || fallbackGradient,
                                    transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                                    boxShadow: isHovered ? `0 0 10px ${MAJOR_COLORS[seg.major] || fallbackColor}50` : 'none',
                                }} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-white/55 font-medium group-hover:text-white/80 transition-colors truncate">
                                        {formatMajor(seg.major)}
                                    </span>
                                    <span className="text-xs font-mono text-white/40 tabular-nums shrink-0 ml-2">
                                        {seg.count} <span className="text-white/20">({pctRounded}%)</span>
                                    </span>
                                </div>
                                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pctRounded}%` }}
                                        transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                                        style={{
                                            background: MAJOR_GRADIENTS[seg.major] || fallbackGradient,
                                            boxShadow: isHovered ? `0 0 8px ${MAJOR_COLORS[seg.major] || fallbackColor}40` : 'none',
                                        }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

function AreaChart({ data, maxVal }: { data: TrafficDay[]; maxVal: number }) {
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
        ? `${linePath} L ${points[points.length - 1].x} ${PT + chartH} L ${points[0].x} ${PT + chartH} Z`
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
                    <g key={i}>
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
                            fill="#60a5fa" stroke="#0a0a0f" strokeWidth="2" />
                        <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="8"
                            fill="rgba(96,165,250,0.15)" />
                    </>
                )}

                {/* X-axis labels (every ~5 days) */}
                {data.map((d, i) => {
                    if (n > 10 && i % Math.ceil(n / 6) !== 0 && i !== n - 1) return null;
                    return (
                        <text key={i} x={points[i]?.x ?? 0} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.15)"
                            style={{ fontSize: 8, fontFamily: 'monospace' }}>{d.date.slice(5)}</text>
                    );
                })}

                {/* Invisible hover areas */}
                {points.map((pt, i) => (
                    <rect key={i} x={pt.x - chartW / n / 2} y={PT} width={chartW / n} height={chartH}
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
                    <div className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg, rgba(30,30,50,0.95), rgba(20,20,40,0.95))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <span className="text-white/40">{data[hoverIdx].date.slice(5)}</span>{' · '}
                        <span className="text-white font-bold">{data[hoverIdx].count}</span>
                        <span className="text-white/25"> visits</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function Heatmap({ data }: { data: HeatmapCell[] }) {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const cell of data) {
        if (cell.day >= 0 && cell.day < 7 && cell.hour >= 0 && cell.hour < 24) grid[cell.day][cell.hour] = cell.count;
    }
    if (data.length === 0) return <Empty text="No heatmap data" />;

    return (
        <div className="space-y-[3px]">
            <div className="flex gap-[3px] ml-10">
                {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="flex-1 text-center text-[7px] text-white/12 font-mono font-bold">{h % 3 === 0 ? `${h}` : ''}</div>
                ))}
            </div>
            {grid.map((row, dayIdx) => (
                <div key={dayIdx} className="flex items-center gap-[3px]">
                    <span className="w-8 text-[9px] text-white/20 font-mono text-right pr-1 font-bold">{DAYS[dayIdx]}</span>
                    {row.map((count, hourIdx) => {
                        const intensity = count / maxCount;
                        return (
                            <motion.div key={hourIdx}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: dayIdx * 0.02 + hourIdx * 0.003, duration: 0.2 }}
                                title={`${DAYS[dayIdx]} ${hourIdx}:00 — ${count} visits`}
                                className="flex-1 aspect-square rounded-[4px] cursor-default transition-transform duration-200 hover:scale-150 hover:z-10"
                                style={{
                                    background: count === 0
                                        ? 'rgba(255,255,255,0.015)'
                                        : `rgba(139, 92, 246, ${0.12 + intensity * 0.75})`,
                                    boxShadow: intensity > 0.5 ? `0 0 8px rgba(139,92,246,${intensity * 0.3})` : 'none',
                                }}
                            />
                        );
                    })}
                </div>
            ))}
            <div className="flex items-center justify-end gap-1.5 mt-3">
                <span className="text-[8px] text-white/15 font-bold">Less</span>
                {[0, 0.2, 0.4, 0.7, 1].map((v, i) => (
                    <div key={i} className="w-3.5 h-3.5 rounded-[3px]"
                        style={{
                            background: v === 0 ? 'rgba(255,255,255,0.015)' : `rgba(139,92,246,${0.12 + v * 0.75})`,
                            boxShadow: v > 0.5 ? `0 0 6px rgba(139,92,246,${v * 0.25})` : 'none'
                        }} />
                ))}
                <span className="text-[8px] text-white/15 font-bold">More</span>
            </div>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-8 h-8 rounded-full bg-white/[0.03] flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white/10" />
            </div>
            <p className="text-xs text-white/15 font-medium">{text}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Loading States
   ═══════════════════════════════════════════════════════════════════ */

function SkeletonLoader() {
    const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.03] before:to-transparent';

    return (
        <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)' }}>
            <style>{`@keyframes shimmer { to { transform: translateX(100%); } }`}</style>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
                {/* Header skeleton */}
                <div className="space-y-3">
                    <div className={`h-4 w-28 rounded-lg bg-white/[0.04] ${shimmer}`} />
                    <div className={`h-8 w-56 rounded-xl bg-white/[0.04] ${shimmer}`} />
                    <div className={`h-3 w-40 rounded-lg bg-white/[0.03] ${shimmer}`} />
                </div>
                {/* Stat cards skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={`h-20 rounded-2xl bg-white/[0.02] border border-white/[0.03] ${shimmer}`} />
                    ))}
                </div>
                {/* Chart skeleton */}
                <div className={`h-64 rounded-2xl bg-white/[0.02] border border-white/[0.03] ${shimmer}`} />
                {/* Two columns skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`h-72 rounded-2xl bg-white/[0.02] border border-white/[0.03] ${shimmer}`} />
                    <div className={`h-72 rounded-2xl bg-white/[0.02] border border-white/[0.03] ${shimmer}`} />
                </div>
            </div>
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)' }}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-400/60" />
            </div>
            <p className="text-sm text-white/30 font-medium">Failed to load analytics</p>
            <button onClick={onRetry}
                className="text-xs font-semibold text-white/40 hover:text-white/70 transition-colors px-4 py-2 rounded-xl border border-white/[0.06] hover:border-white/10">
                Try Again
            </button>
        </div>
    );
}
