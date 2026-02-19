'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users, Activity, PieChart, TrendingUp,
    Monitor, Smartphone, Globe, BookOpen,
    Eye, Clock, ArrowUpRight
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */

interface TopCourse { code: string; name: string; count: number }
interface TrafficDay { date: string; count: number }
interface DeviceEntry { os: string; browser: string; count: number }
interface ActivityEntry { type: string; student_id: string; detail: string; time: string }

interface Stats {
    totalStudents: number;
    totalVisitors: number;
    majorCounts: Record<string, number>;
    progressDistribution: Record<string, number>;
    topCourses: TopCourse[];
    trafficByDay: TrafficDay[];
    deviceBreakdown: DeviceEntry[];
    recentActivity: ActivityEntry[];
}

/* ── Palette ───────────────────────────────────────────────────────── */

const MAJOR_COLORS: Record<string, string> = {
    computer_science: '#8b5cf6',
    cybersecurity: '#ef4444',
    data_science: '#3b82f6',
};
const fallbackColor = '#6366f1';

const PROGRESS_GRADIENT = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

/* ── Animation variants ───────────────────────────────────────────── */

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
};

/* ── Helpers ───────────────────────────────────────────────────────── */

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
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/* ── Main Component ───────────────────────────────────────────────── */

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(r => r.json())
            .then(d => { setStats(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <Loader />;
    if (!stats) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Failed to load stats.</div>;

    const majors = Object.entries(stats.majorCounts).sort((a, b) => b[1] - a[1]);
    const maxMajor = Math.max(...Object.values(stats.majorCounts), 1);
    const progress = Object.entries(stats.progressDistribution);
    const maxProgress = Math.max(...Object.values(stats.progressDistribution), 1);
    const maxTraffic = Math.max(...stats.trafficByDay.map(d => d.count), 1);
    const totalDeviceCount = stats.deviceBreakdown.reduce((s, d) => s + d.count, 0) || 1;

    return (
        <div className="min-h-screen bg-black text-white">

            {/* Background glow */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[1200px] h-[600px]"
                    style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

                {/* ─── Header ────────────────────────────────────────── */}
                <motion.div {...fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/20 text-violet-300 text-[10px] font-semibold uppercase tracking-wider">
                                Admin
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Platform Analytics</h1>
                        <p className="text-white/35 text-sm mt-1">Real-time insights from your database</p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-white/25">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                    </div>
                </motion.div>

                {/* ─── Stat Cards Row ────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard icon={<Users className="w-4 h-4" />} label="Students" value={stats.totalStudents} color="violet" delay={0} />
                    <StatCard icon={<Eye className="w-4 h-4" />} label="Total Visits" value={stats.totalVisitors} color="blue" delay={0.05} />
                    <StatCard icon={<BookOpen className="w-4 h-4" />} label="Top Course" value={stats.topCourses[0]?.name?.slice(0, 18) || '—'} color="emerald" delay={0.1} sub />
                    <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Majors" value={Object.keys(stats.majorCounts).length} color="amber" delay={0.15} />
                </div>

                {/* ─── Traffic Chart (full width) ────────────────────── */}
                <motion.div {...fadeUp} transition={{ delay: 0.15 }}
                    className="rounded-3xl border border-white/5 bg-neutral-900/40 p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2.5">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <h2 className="text-sm font-semibold text-white/80">Visitor Traffic</h2>
                        </div>
                        <span className="text-[11px] text-white/25">Last 30 days</span>
                    </div>

                    {stats.trafficByDay.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-white/20 text-sm">No visitor data yet</div>
                    ) : (
                        <div className="h-44 flex items-end gap-[3px]">
                            {stats.trafficByDay.map((day, i) => {
                                const h = (day.count / maxTraffic) * 100;
                                return (
                                    <div key={day.date} className="flex-1 relative group" title={`${day.date}: ${day.count}`}>
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${h}%` }}
                                            transition={{ duration: 0.6, delay: i * 0.02, ease: 'easeOut' }}
                                            className="w-full rounded-t-sm bg-blue-500/60 group-hover:bg-blue-400 transition-colors min-h-[2px]"
                                        />
                                        {/* Tooltip */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 left-1/2 -translate-x-1/2
                                            bg-neutral-800 text-[10px] text-white px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none border border-white/10">
                                            {day.date.slice(5)} · {day.count}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* ─── Two-column grid ───────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Major Distribution */}
                    <motion.div {...fadeUp} transition={{ delay: 0.2 }}
                        className="rounded-3xl border border-white/5 bg-neutral-900/40 p-5 sm:p-6">
                        <div className="flex items-center gap-2.5 mb-6">
                            <PieChart className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-sm font-semibold text-white/80">Major Distribution</h2>
                        </div>

                        {/* Donut */}
                        <div className="flex items-center gap-8">
                            <DonutChart data={majors} />
                            <div className="flex-1 space-y-3">
                                {majors.map(([major, count]) => (
                                    <div key={major} className="flex items-center gap-2.5">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ background: MAJOR_COLORS[major] || fallbackColor }} />
                                        <span className="text-xs text-white/60 flex-1">{formatMajor(major)}</span>
                                        <span className="text-xs font-mono text-white/40">
                                            {count} <span className="text-white/20">({Math.round(count / stats.totalStudents * 100)}%)</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Progress Distribution */}
                    <motion.div {...fadeUp} transition={{ delay: 0.25 }}
                        className="rounded-3xl border border-white/5 bg-neutral-900/40 p-5 sm:p-6">
                        <div className="flex items-center gap-2.5 mb-6">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <h2 className="text-sm font-semibold text-white/80">Degree Progress</h2>
                        </div>

                        <div className="flex items-end gap-5 h-44">
                            {progress.map(([range, count], i) => {
                                const h = (count / maxProgress) * 100;
                                return (
                                    <div key={range} className="flex-1 flex flex-col items-center gap-2 group">
                                        <span className="text-xs font-bold text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {count}
                                        </span>
                                        <div className="w-full flex-1 bg-white/5 rounded-xl overflow-hidden flex items-end">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${h}%` }}
                                                transition={{ duration: 0.8, delay: 0.3 + i * 0.1, type: 'spring' }}
                                                className="w-full rounded-t-lg transition-colors"
                                                style={{ background: PROGRESS_GRADIENT[i] }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-white/30 font-mono">{range}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>

                {/* ─── Three-column grid ─────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Top Courses */}
                    <motion.div {...fadeUp} transition={{ delay: 0.3 }}
                        className="rounded-3xl border border-white/5 bg-neutral-900/40 p-5 sm:p-6">
                        <div className="flex items-center gap-2.5 mb-5">
                            <BookOpen className="w-4 h-4 text-amber-400" />
                            <h2 className="text-sm font-semibold text-white/80">Top Courses</h2>
                        </div>
                        <div className="space-y-2.5">
                            {stats.topCourses.slice(0, 6).map((course, i) => (
                                <div key={course.code} className="flex items-center gap-3 group">
                                    <span className="text-[10px] font-mono text-white/20 w-4">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white/60 truncate">{course.name}</p>
                                        <p className="text-[10px] text-white/20 font-mono">{course.code}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-semibold text-white/40">{course.count}</span>
                                        <Users className="w-3 h-3 text-white/15" />
                                    </div>
                                </div>
                            ))}
                            {stats.topCourses.length === 0 && (
                                <p className="text-xs text-white/20 text-center py-6">No course data yet</p>
                            )}
                        </div>
                    </motion.div>

                    {/* Device & Browser */}
                    <motion.div {...fadeUp} transition={{ delay: 0.35 }}
                        className="rounded-3xl border border-white/5 bg-neutral-900/40 p-5 sm:p-6">
                        <div className="flex items-center gap-2.5 mb-5">
                            <Monitor className="w-4 h-4 text-cyan-400" />
                            <h2 className="text-sm font-semibold text-white/80">Devices & Browsers</h2>
                        </div>
                        <div className="space-y-3">
                            {stats.deviceBreakdown.slice(0, 6).map((d, i) => {
                                const pct = Math.round((d.count / totalDeviceCount) * 100);
                                const isMobile = /ios|android/i.test(d.os);
                                return (
                                    <div key={i}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                {isMobile
                                                    ? <Smartphone className="w-3 h-3 text-white/25" />
                                                    : <Globe className="w-3 h-3 text-white/25" />}
                                                <span className="text-xs text-white/60">{d.os} · {d.browser}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-white/30">{pct}%</span>
                                        </div>
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.8, delay: 0.4 + i * 0.05 }}
                                                className="h-full bg-cyan-500/60 rounded-full"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {stats.deviceBreakdown.length === 0 && (
                                <p className="text-xs text-white/20 text-center py-6">No device data yet</p>
                            )}
                        </div>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div {...fadeUp} transition={{ delay: 0.4 }}
                        className="rounded-3xl border border-white/5 bg-neutral-900/40 p-5 sm:p-6">
                        <div className="flex items-center gap-2.5 mb-5">
                            <Clock className="w-4 h-4 text-rose-400" />
                            <h2 className="text-sm font-semibold text-white/80">Recent Activity</h2>
                        </div>
                        <div className="space-y-3">
                            {stats.recentActivity.map((act, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="mt-0.5 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                        <ArrowUpRight className="w-3 h-3 text-white/30" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-white/50 truncate">
                                            <span className="font-mono text-white/35">
                                                ...{(act.student_id || '').slice(-4)}
                                            </span>{' '}
                                            {act.detail}
                                        </p>
                                        <p className="text-[10px] text-white/20">{timeAgo(act.time)}</p>
                                    </div>
                                </div>
                            ))}
                            {stats.recentActivity.length === 0 && (
                                <p className="text-xs text-white/20 text-center py-6">No activity yet</p>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <div className="text-center text-[11px] text-white/15 pt-4 pb-8">
                    HTU Course Tracker · Admin Dashboard
                </div>
            </div>
        </div>
    );
}

/* ── Sub-components ───────────────────────────────────────────────── */

function StatCard({ icon, label, value, color, delay, sub }: {
    icon: React.ReactNode; label: string; value: string | number;
    color: string; delay: number; sub?: boolean;
}) {
    const colorMap: Record<string, string> = {
        violet: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
        blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
        emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    };
    const cls = colorMap[color] || colorMap.violet;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="rounded-2xl border border-white/5 bg-neutral-900/40 p-4 flex items-center gap-3"
        >
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cls}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-[10px] text-white/35 uppercase font-semibold tracking-wider">{label}</div>
                <div className={`font-bold truncate ${sub ? 'text-sm' : 'text-xl'}`}>{value}</div>
            </div>
        </motion.div>
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
            {/* Background ring */}
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
            {data.map(([major, count], i) => {
                const pct = count / total;
                const dashLength = pct * circumference;
                const dashGap = circumference - dashLength;
                const currentOffset = offset;
                offset += dashLength;

                return (
                    <motion.circle
                        key={major}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={MAJOR_COLORS[major] || fallbackColor}
                        strokeWidth={stroke}
                        strokeDasharray={`${dashLength} ${dashGap}`}
                        strokeDashoffset={-currentOffset}
                        strokeLinecap="round"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.15, duration: 0.6 }}
                        style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                    />
                );
            })}
            {/* Center text */}
            <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="fill-white text-lg font-bold">{total}</text>
            <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="fill-white/30 text-[9px]">STUDENTS</text>
        </svg>
    );
}

function Loader() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="w-6 h-6 border border-white/10 border-t-violet-500 rounded-full animate-spin" />
        </div>
    );
}
