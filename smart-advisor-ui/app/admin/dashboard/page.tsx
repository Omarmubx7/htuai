'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart3, PieChart, Activity } from 'lucide-react';

interface Stats {
    totalStudents: number;
    majorCounts: Record<string, number>;
    progressDistribution: Record<string, number>;
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-6 h-6 border border-white/10 border-t-violet-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!stats) return <div className="p-10 text-white">Failed to load stats.</div>;

    // Transform for Charts
    const majors = Object.entries(stats.majorCounts).sort((a, b) => b[1] - a[1]);
    const maxMajorCount = Math.max(...Object.values(stats.majorCounts), 1);

    const progress = Object.entries(stats.progressDistribution);
    const maxProgressCount = Math.max(...Object.values(stats.progressDistribution), 1);

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Overview</h1>
                        <p className="text-white/40 text-sm">Real-time insights from student database.</p>
                    </div>
                    {/* Stat Card: Total Students */}
                    <div className="glass-card px-6 py-4 rounded-2xl flex items-center gap-4 bg-white/5 border border-white/10">
                        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-white/40 uppercase font-semibold tracking-wider">Total Students</div>
                            <div className="text-2xl font-bold">{stats.totalStudents}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Major Distribution */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 rounded-3xl border border-white/5 bg-neutral-900/50"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <PieChart className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-lg font-semibold">Major Distribution</h2>
                        </div>

                        <div className="space-y-4">
                            {majors.map(([major, count], i) => (
                                <div key={major} className="group">
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="capitalize text-white/70 font-medium">
                                            {major.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-white/40">{count}</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(count / maxMajorCount) * 100}%` }}
                                            transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                                            className="h-full bg-indigo-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Progress Distribution */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-6 rounded-3xl border border-white/5 bg-neutral-900/50"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            <h2 className="text-lg font-semibold">Student Progress</h2>
                        </div>

                        <div className="flex items-end justify-between h-48 gap-4 pt-4">
                            {progress.map(([range, count], i) => {
                                const heightPercent = (count / maxProgressCount) * 100;
                                return (
                                    <div key={range} className="flex-1 flex flex-col items-center gap-3 group">
                                        <div className="w-full relative flex-1 bg-white/5 rounded-xl overflow-hidden flex items-end">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${heightPercent}%` }}
                                                transition={{ duration: 0.8, delay: 0.2 + (i * 0.1), type: "spring" }}
                                                className="w-full bg-emerald-500/80 group-hover:bg-emerald-400 transition-colors"
                                            />
                                            {/* Tooltip-ish number */}
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 1 }}
                                                className="absolute bottom-2 left-0 right-0 text-center text-xs font-bold text-black/60 mix-blend-screen"
                                            >
                                                {count > 0 ? count : ''}
                                            </motion.div>
                                        </div>
                                        <span className="text-xs text-white/30 font-mono">{range}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 text-center text-xs text-white/20">
                            Based on estimated credit hours completed
                        </div>
                    </motion.div>
                </div>

            </div>
        </div>
    );
}
