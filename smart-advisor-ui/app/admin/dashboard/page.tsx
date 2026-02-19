'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Activity, PieChart, TrendingUp, TrendingDown,
    Monitor, Smartphone, Globe, BookOpen,
    Eye, Clock, ArrowUpRight, Database,
    Search, ChevronUp, ChevronDown, RefreshCw,
    Flame, BarChart3, ArrowUp, ArrowDown, Filter
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface TopCourse { code: string; name: string; count: number }
interface TrafficDay { date: string; count: number }
interface DeviceEntry { os: string; browser: string; count: number }
interface ActivityEntry { type: string; student_id: string; detail: string; time: string }
interface StudentRow { student_id: string; major: string; count: number }
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

type SortKey = 'student_id' | 'major' | 'count';
type SortDir = 'asc' | 'desc';
type TabKey = 'overview' | 'students' | 'visitors';

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const MAJOR_COLORS: Record<string, string> = {
    computer_science: '#8b5cf6',
    cybersecurity: '#ef4444',
    data_science: '#3b82f6',
};
const fallbackColor = '#6366f1';
const PROGRESS_GRADIENT = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const AUTO_REFRESH_INTERVAL = 30_000; // 30s

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
   Animated Counter Hook
   ═══════════════════════════════════════════════════════════════════ */

function useCountUp(target: number, duration = 1200) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        let start = 0;
        const startTime = performance.now();
        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            start = Math.round(eased * target);
            setValue(start);
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration]);
    return value;
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>('overview');
    const [refreshing, setRefreshing] = useState(false);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    // Student table state
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('count');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [majorFilter, setMajorFilter] = useState<string>('all');

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            setStats(data);
            setLastFetched(new Date());
        } catch { /* ignore */ }
        setLoading(false);
        setRefreshing(false);
    }, []);

    // Initial load + auto-refresh
    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), AUTO_REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Filtered + sorted students
    const filteredStudents = useMemo(() => {
        if (!stats) return [];
        let list = [...stats.students];
        if (majorFilter !== 'all') {
            list = list.filter(s => s.major === majorFilter);
        }
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.student_id.toLowerCase().includes(q) ||
                s.major.toLowerCase().includes(q)
            );
        }
        list.sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [stats, search, sortKey, sortDir, majorFilter]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    if (loading) return <Loader />;
    if (!stats) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Failed to load.</div>;

    const majors = Object.entries(stats.majorCounts).sort((a, b) => b[1] - a[1]);
    const progress = Object.entries(stats.progressDistribution);
    const maxProgress = Math.max(...Object.values(stats.progressDistribution), 1);
    const maxTraffic = Math.max(...stats.trafficByDay.map(d => d.count), 1);
    const totalDeviceCount = stats.deviceBreakdown.reduce((s, d) => s + d.count, 0) || 1;
    const weekChange = pctChange(stats.thisWeekVisits, stats.lastWeekVisits);
    const allMajorKeys = Object.keys(stats.majorCounts).sort();

    const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
        { key: 'students', label: 'Students', icon: <Users className="w-3.5 h-3.5" /> },
        { key: 'visitors', label: 'Visitors', icon: <Eye className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Ambient glow */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[1400px] h-[700px]"
                    style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
                <div className="absolute right-0 bottom-0 w-[600px] h-[400px]"
                    style={{ background: 'radial-gradient(ellipse at 100% 100%, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

                {/* ─── Header ──────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/20 text-violet-300 text-[10px] font-semibold uppercase tracking-wider">Admin</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/70">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live
                            </div>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Platform Analytics</h1>
                        <p className="text-white/30 text-xs mt-1">
                            {lastFetched ? `Updated ${timeAgo(lastFetched.toISOString())} · Auto-refreshes every 30s` : 'Loading...'}
                        </p>
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors px-3 py-2 rounded-xl border border-white/5 hover:border-white/10 bg-white/[0.02]"
                    >
                        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {/* ─── Filter + Tab Row ──────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
                        {TABS.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${tab === t.key
                                    ? 'bg-white text-black shadow-sm'
                                    : 'text-white/35 hover:text-white/60'
                                    }`}
                            >
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Major Filter */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <Filter className="w-3.5 h-3.5 text-white/25" />
                        <select
                            value={majorFilter}
                            onChange={e => setMajorFilter(e.target.value)}
                            className="bg-transparent text-xs text-white outline-none cursor-pointer appearance-none pr-4"
                        >
                            <option value="all" className="bg-neutral-900">All Majors</option>
                            {allMajorKeys.map(m => (
                                <option key={m} value={m} className="bg-neutral-900">
                                    {formatMajor(m)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {tab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
                            <OverviewTab stats={stats} majors={majors} progress={progress} maxProgress={maxProgress} maxTraffic={maxTraffic} weekChange={weekChange} totalDeviceCount={totalDeviceCount} />
                        </motion.div>
                    )}
                    {tab === 'students' && (
                        <motion.div key="students" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
                            <StudentsTab students={filteredStudents} total={stats.students.length} search={search} setSearch={setSearch} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} />
                        </motion.div>
                    )}
                    {tab === 'visitors' && (
                        <motion.div key="visitors" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
                            <VisitorsTab stats={stats} totalDeviceCount={totalDeviceCount} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="text-center text-[11px] text-white/10 pt-4 pb-8">
                    HTU Course Tracker · Admin Dashboard
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Overview Tab
   ═══════════════════════════════════════════════════════════════════ */

function OverviewTab({ stats, majors, progress, maxProgress, maxTraffic, weekChange, totalDeviceCount }: {
    stats: Stats; majors: [string, number][]; progress: [string, number][];
    maxProgress: number; maxTraffic: number; weekChange: number; totalDeviceCount: number;
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
                <StatCard icon={<Users className="w-4 h-4" />} label="Total Students" value={animStudents} color="violet" delay={0} />
                <StatCard icon={<Eye className="w-4 h-4" />} label="Total Visits" value={animVisitors} color="blue" delay={0.05}
                    badge={weekChange !== 0 ? { value: `${weekChange > 0 ? '+' : ''}${weekChange}%`, positive: weekChange > 0 } : undefined} />
                <StatCard icon={<BookOpen className="w-4 h-4" />} label="Courses Completed" value={animCourses} color="emerald" delay={0.1} />
                <StatCard icon={<Flame className="w-4 h-4" />} label="Avg Courses" value={animAvg} color="amber" delay={0.15} />
                <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Avg CH / Student" value={`${animCH} / 135`} color="violet" delay={0.2} />
            </div>

            {/* Traffic Area Chart */}
            <Card title="Visitor Traffic" icon={<TrendingUp className="w-4 h-4 text-blue-400" />} subtitle={`Last 30 days · ${stats.trafficByDay.length} data points`}>
                {stats.trafficByDay.length === 0 ? (
                    <Empty text="No visitor data yet" />
                ) : (
                    <div className="h-44 flex items-end gap-[2px]">
                        {stats.trafficByDay.map((day, i) => (
                            <div key={day.date} className="flex-1 relative group" title={`${day.date}: ${day.count}`}>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(day.count / maxTraffic) * 100}%` }}
                                    transition={{ duration: 0.5, delay: i * 0.015, ease: 'easeOut' }}
                                    className="w-full rounded-t-sm bg-gradient-to-t from-blue-500/40 to-blue-400/80 group-hover:from-blue-400/60 group-hover:to-blue-300 transition-colors min-h-[2px]"
                                />
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 left-1/2 -translate-x-1/2
                                    bg-neutral-800 text-[10px] text-white px-2 py-1 rounded-lg whitespace-nowrap z-20 pointer-events-none border border-white/10 shadow-xl">
                                    {day.date.slice(5)} · <strong>{day.count}</strong> visits
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Major + Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Major Distribution" icon={<PieChart className="w-4 h-4 text-indigo-400" />}>
                    <div className="flex items-center gap-8">
                        <DonutChart data={majors} />
                        <div className="flex-1 space-y-3">
                            {majors.map(([major, count]) => (
                                <div key={major} className="flex items-center gap-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: MAJOR_COLORS[major] || fallbackColor }} />
                                    <span className="text-xs text-white/60 flex-1">{formatMajor(major)}</span>
                                    <span className="text-xs font-mono text-white/40">{count} <span className="text-white/20">({Math.round(count / stats.totalStudents * 100)}%)</span></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card title="Degree Progress" icon={<Activity className="w-4 h-4 text-emerald-400" />}>
                    <div className="flex items-end gap-5 h-44">
                        {progress.map(([range, count], i) => (
                            <div key={range} className="flex-1 flex flex-col items-center gap-2 group">
                                <span className="text-xs font-bold text-white/50">{count}</span>
                                <div className="w-full flex-1 bg-white/5 rounded-xl overflow-hidden flex items-end">
                                    <motion.div initial={{ height: 0 }} animate={{ height: `${(count / maxProgress) * 100}%` }}
                                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1, type: 'spring' }}
                                        className="w-full rounded-t-lg" style={{ background: PROGRESS_GRADIENT[i] }} />
                                </div>
                                <span className="text-[10px] text-white/30 font-mono">{range}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Bottom row: Courses + Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Top Courses" icon={<BookOpen className="w-4 h-4 text-amber-400" />} subtitle={`${stats.topCourses.length} total`} scrollable>
                    <div className="space-y-2">
                        {stats.topCourses.map((course, i) => (
                            <div key={course.code} className="flex items-center gap-3 group hover:bg-white/[0.02] rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                                <span className="text-[10px] font-mono text-white/20 w-5 shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white/60 truncate">{course.name}</p>
                                    <p className="text-[10px] text-white/20 font-mono">{course.code}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs font-semibold text-white/40">{course.count}</span>
                                    <Users className="w-3 h-3 text-white/15" />
                                </div>
                            </div>
                        ))}
                        {stats.topCourses.length === 0 && <Empty text="No course data" />}
                    </div>
                </Card>

                {/* Heatmap */}
                <Card title="Activity Heatmap" icon={<Flame className="w-4 h-4 text-orange-400" />} subtitle="By hour × day of week">
                    <Heatmap data={stats.heatmap} />
                </Card>
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
        if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-white/15" />;
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-white/50" /> : <ChevronDown className="w-3 h-3 text-white/50" />;
    };

    return (
        <Card title="All Students" icon={<Database className="w-4 h-4 text-violet-400" />} subtitle={`${students.length} of ${total} records`}
            headerRight={
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-1.5">
                    <Search className="w-3.5 h-3.5 text-white/25" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search ID or Major..."
                        className="bg-transparent text-xs text-white placeholder-white/20 outline-none w-40"
                    />
                </div>
            }
        >
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5">
                            <Th>#</Th>
                            <Th sortable onClick={() => toggleSort('student_id')}>Student ID <SortIcon col="student_id" /></Th>
                            <Th sortable onClick={() => toggleSort('major')}>Major <SortIcon col="major" /></Th>
                            <Th sortable onClick={() => toggleSort('count')}>Courses <SortIcon col="count" /></Th>
                            <Th>Progress</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((s, i) => {
                            const pct = Math.min(Math.round((s.count * 3 / 135) * 100), 100);
                            return (
                                <motion.tr
                                    key={`${s.student_id}-${s.major}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.01 }}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="py-2.5 pr-4 text-[11px] text-white/20 font-mono">{i + 1}</td>
                                    <td className="py-2.5 pr-4 text-xs font-mono text-white/60">{s.student_id}</td>
                                    <td className="py-2.5 pr-4">
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full" style={{ background: MAJOR_COLORS[s.major] || fallbackColor }} />
                                            <span className="text-xs text-white/50">{formatMajor(s.major)}</span>
                                        </span>
                                    </td>
                                    <td className="py-2.5 pr-4 text-xs font-mono text-white/50">{s.count}</td>
                                    <td className="py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.6, delay: i * 0.01 }}
                                                    className="h-full rounded-full"
                                                    style={{ background: pct >= 75 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444' }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono text-white/30 w-8">{pct}%</span>
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
                {students.length === 0 && <Empty text="No matching students" />}
            </div>
        </Card>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Visitors Tab
   ═══════════════════════════════════════════════════════════════════ */

function VisitorsTab({ stats, totalDeviceCount }: { stats: Stats; totalDeviceCount: number }) {
    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Devices & Browsers */}
                <Card title="All Devices & Browsers" icon={<Monitor className="w-4 h-4 text-cyan-400" />} subtitle={`${stats.deviceBreakdown.length} combos`} scrollable>
                    <div className="space-y-3">
                        {stats.deviceBreakdown.map((d, i) => {
                            const pct = Math.round((d.count / totalDeviceCount) * 100);
                            const isMobile = /ios|android/i.test(d.os);
                            return (
                                <div key={i} className="group hover:bg-white/[0.02] rounded-lg px-2 py-1 -mx-2 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            {isMobile ? <Smartphone className="w-3 h-3 text-white/25" /> : <Globe className="w-3 h-3 text-white/25" />}
                                            <span className="text-xs text-white/60">{d.os} · {d.browser}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-white/30">{d.count} ({pct}%)</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.03 }}
                                            className="h-full bg-cyan-500/60 rounded-full" />
                                    </div>
                                </div>
                            );
                        })}
                        {stats.deviceBreakdown.length === 0 && <Empty text="No device data" />}
                    </div>
                </Card>

                {/* Activity Feed */}
                <Card title="Recent Activity" icon={<Clock className="w-4 h-4 text-rose-400" />} subtitle={`${stats.recentActivity.length} events`} scrollable>
                    <div className="space-y-2.5">
                        {stats.recentActivity.map((act, i) => (
                            <div key={i} className="flex items-start gap-3 hover:bg-white/[0.02] rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                                <div className="mt-0.5 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                    <ArrowUpRight className="w-3 h-3 text-white/30" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-white/50">
                                        <span className="font-mono text-white/35">{act.student_id === 'Anonymous' ? 'Anon' : `...${act.student_id.slice(-4)}`}</span>{' '}
                                        {act.detail}
                                    </p>
                                    <p className="text-[10px] text-white/20">{timeAgo(act.time)}</p>
                                </div>
                            </div>
                        ))}
                        {stats.recentActivity.length === 0 && <Empty text="No activity" />}
                    </div>
                </Card>
            </div>

            {/* Heatmap */}
            <Card title="Visitor Heatmap" icon={<Flame className="w-4 h-4 text-orange-400" />} subtitle="Activity by hour and day of week">
                <Heatmap data={stats.heatmap} />
            </Card>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared Components
   ═══════════════════════════════════════════════════════════════════ */

function Card({ title, icon, subtitle, children, scrollable, headerRight }: {
    title: string; icon: React.ReactNode; subtitle?: string;
    children: React.ReactNode; scrollable?: boolean; headerRight?: React.ReactNode;
}) {
    return (
        <div className={`rounded-3xl border border-white/5 bg-neutral-900/40 p-5 sm:p-6 ${scrollable ? 'max-h-[500px] overflow-y-auto' : ''}`}>
            <div className={`flex items-center justify-between mb-6 ${scrollable ? 'sticky top-0 bg-neutral-900/90 backdrop-blur-sm -mx-5 -mt-5 px-5 pt-5 pb-3 z-10 rounded-t-3xl' : ''}`}>
                <div className="flex items-center gap-2.5">
                    {icon}
                    <h2 className="text-sm font-semibold text-white/80">{title}</h2>
                    {subtitle && <span className="text-[10px] text-white/20 ml-1">· {subtitle}</span>}
                </div>
                {headerRight}
            </div>
            {children}
        </div>
    );
}

function StatCard({ icon, label, value, color, delay, badge }: {
    icon: React.ReactNode; label: string; value: string | number;
    color: string; delay: number; badge?: { value: string; positive: boolean };
}) {
    const colorMap: Record<string, string> = {
        violet: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
        blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
        emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    };
    const cls = colorMap[color] || colorMap.violet;

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
            className="rounded-2xl border border-white/5 bg-neutral-900/40 p-4 flex items-center gap-3 relative overflow-hidden group hover:border-white/10 transition-colors">
            {/* Subtle shimmer on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%)' }} />
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cls}`}>{icon}</div>
            <div className="min-w-0 flex-1">
                <div className="text-[10px] text-white/35 uppercase font-semibold tracking-wider">{label}</div>
                <div className="text-xl font-bold truncate">{value}</div>
            </div>
            {badge && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${badge.positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {badge.positive ? <ArrowUp className="w-2.5 h-2.5 inline" /> : <ArrowDown className="w-2.5 h-2.5 inline" />}
                    {badge.value}
                </span>
            )}
        </motion.div>
    );
}

function Th({ children, sortable, onClick }: { children: React.ReactNode; sortable?: boolean; onClick?: () => void }) {
    return (
        <th
            onClick={onClick}
            className={`text-[10px] text-white/30 uppercase tracking-wider font-semibold pb-3 pr-4 ${sortable ? 'cursor-pointer select-none hover:text-white/50 transition-colors' : ''}`}
        >
            <span className="inline-flex items-center gap-1">{children}</span>
        </th>
    );
}

function DonutChart({ data }: { data: [string, number][] }) {
    const total = data.reduce((s, [, v]) => s + v, 0) || 1;
    const size = 120;
    const radius = 44;
    const stroke = 14;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
            {data.map(([major, count], i) => {
                const pct = count / total;
                const dashLength = pct * circumference;
                const dashGap = circumference - dashLength;
                const currentOffset = offset;
                offset += dashLength;
                return (
                    <motion.circle key={major} cx={size / 2} cy={size / 2} r={radius} fill="none"
                        stroke={MAJOR_COLORS[major] || fallbackColor} strokeWidth={stroke}
                        strokeDasharray={`${dashLength} ${dashGap}`} strokeDashoffset={-currentOffset}
                        strokeLinecap="round"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.15, duration: 0.6 }}
                        style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }} />
                );
            })}
            <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="fill-white text-lg font-bold">{total}</text>
            <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="fill-white/30 text-[9px]">STUDENTS</text>
        </svg>
    );
}

function Heatmap({ data }: { data: HeatmapCell[] }) {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    // Build 7×24 grid
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const cell of data) {
        if (cell.day >= 0 && cell.day < 7 && cell.hour >= 0 && cell.hour < 24) {
            grid[cell.day][cell.hour] = cell.count;
        }
    }

    if (data.length === 0) return <Empty text="No heatmap data yet" />;

    return (
        <div className="space-y-1">
            {/* Hour labels */}
            <div className="flex gap-[2px] ml-10">
                {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="flex-1 text-center text-[8px] text-white/15 font-mono">
                        {h % 4 === 0 ? `${h}` : ''}
                    </div>
                ))}
            </div>
            {grid.map((row, dayIdx) => (
                <div key={dayIdx} className="flex items-center gap-[2px]">
                    <span className="w-8 text-[9px] text-white/25 font-mono text-right pr-1">{DAYS[dayIdx]}</span>
                    {row.map((count, hourIdx) => {
                        const intensity = count / maxCount;
                        return (
                            <motion.div
                                key={hourIdx}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: dayIdx * 0.03 + hourIdx * 0.005 }}
                                title={`${DAYS[dayIdx]} ${hourIdx}:00 — ${count} visits`}
                                className="flex-1 aspect-square rounded-[3px] transition-colors cursor-default"
                                style={{
                                    background: count === 0
                                        ? 'rgba(255,255,255,0.02)'
                                        : `rgba(139, 92, 246, ${0.15 + intensity * 0.7})`,
                                }}
                            />
                        );
                    })}
                </div>
            ))}
            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-2">
                <span className="text-[9px] text-white/20">Less</span>
                {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                    <div key={i} className="w-3 h-3 rounded-[2px]"
                        style={{ background: v === 0 ? 'rgba(255,255,255,0.02)' : `rgba(139,92,246,${0.15 + v * 0.7})` }} />
                ))}
                <span className="text-[9px] text-white/20">More</span>
            </div>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <p className="text-xs text-white/20 text-center py-8">{text}</p>;
}

function Loader() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border border-white/10 border-t-violet-500 rounded-full animate-spin" />
            <span className="text-[11px] text-white/20">Loading analytics...</span>
        </div>
    );
}
