"use client";

import { motion } from "framer-motion";
import { Sparkles, Target, TrendingUp, BookOpen, AlertCircle, Info } from "lucide-react";
import { CourseData, Course } from "@/types";
import { useMemo } from "react";

interface InsightsViewProps {
    data: CourseData;
    completedCourses: Map<string, number>;
    majorKey: string;
    rules: any;
}

export default function InsightsView({ data, completedCourses, majorKey, rules }: InsightsViewProps) {
    const allCourses = useMemo(() => [
        ...data.university_requirements,
        ...data.college_requirements,
        ...(data.university_electives ?? []),
        ...data.department_requirements,
        ...data.electives,
    ], [data]);

    // Real Weighted GPA Calculation
    const { completedCredits, weightedSum } = useMemo(() => {
        let credits = 0;
        let sum = 0;
        allCourses.forEach(c => {
            const grade = completedCourses.get(c.code);
            if (grade !== undefined) {
                const ch = c.ch || 3;
                credits += ch;
                sum += (grade * ch);
            }
        });
        return { completedCredits: credits, weightedSum: sum };
    }, [allCourses, completedCourses]);

    const currentGPA = useMemo(() => {
        if (completedCredits === 0) return 0;
        return (weightedSum / completedCredits) / 25; // Assuming 0-100 scale translates to 0.0-4.0
    }, [weightedSum, completedCredits]);

    const gpaPercentage = useMemo(() => {
        if (completedCredits === 0) return 0;
        return weightedSum / completedCredits;
    }, [weightedSum, completedCredits]);

    const totalRequired = useMemo(() => {
        const ruleSet = Object.values(rules.degree_types).find((rs: any) =>
            rs.major_keys.includes(majorKey)
        ) as any || rules.degree_types.computing_bsc;
        return ruleSet.total_credits || 160;
    }, [rules, majorKey]);

    const progressPercentage = Math.round((completedCredits / totalRequired) * 100);

    // Dynamic Smart Path Logic
    const unlockedCourses = useMemo(() => {
        return allCourses
            .filter(c => !completedCourses.has(c.code)) // Not completed
            .filter(c => {
                if (!c.prereq) return true;
                const prereqs = c.prereq.split('&').map(p => p.trim());
                return prereqs.every(p => {
                    if (p.startsWith('>=')) return true; // Simplify CH checks for now
                    return completedCourses.has(p);
                });
            })
            .slice(0, 3); // Top 3 next steps
    }, [allCourses, completedCourses]);

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                        Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-500">Insights</span>
                    </h1>
                    <p className="text-white/40 font-medium lowercase tracking-tight">AI-powered analysis of your academic path</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="glass-card px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-widest">{progressPercentage}% Progress</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* GPA Projection Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 glass-card-premium p-8 rounded-[32px] border border-white/10 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-[80px] -mr-32 -mt-32" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                <Target className="w-5 h-5 text-violet-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-tight">GPA Projection</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">Current Weighted GPA</label>
                                    <div className="text-5xl font-black text-white tracking-tighter italic">
                                        {currentGPA.toFixed(2)} <span className="text-xl text-white/20 not-italic ml-2">/ 4.00</span>
                                    </div>
                                    <div className="text-sm font-bold text-violet-400 mt-1 uppercase tracking-widest">
                                        Avg: {Math.round(gpaPercentage)}%
                                    </div>
                                </div>
                                <p className="text-sm text-white/40 leading-relaxed">
                                    Based on your current progress, you need an average of <span className="text-white">{Math.max(0, (3.8 * totalRequired - weightedSum / 25) / (totalRequired - completedCredits)).toFixed(2)}</span> in your remaining <span className="text-white">{totalRequired - completedCredits} CH</span> to hit a <span className="text-white">3.80</span> target.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-white/60">Estimated Grade Trend</span>
                                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Rising</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 w-[85%]" />
                                    </div>
                                </div>
                                <div className="p-4 flex items-start gap-3 rounded-2xl bg-violet-500/5 border border-violet-500/10">
                                    <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-violet-300/60 leading-normal font-medium">
                                        Tip: Improving your grades in Major Requirements will have the highest impact on your GPA.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Next Steps / Unlock Alerts */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-8 rounded-[32px] border border-white/5 flex flex-col"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <BookOpen className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Smart Path</h2>
                    </div>

                    <div className="space-y-4 flex-1">
                        {unlockedCourses.length > 0 ? unlockedCourses.map((course, idx) => (
                            <div key={course.code} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors cursor-default">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                        {idx === 0 ? "Next Priority" : "Unlocked"}
                                    </span>
                                    <AlertCircle className="w-3 h-3 text-white/20" />
                                </div>
                                <div className="text-sm font-bold text-white mb-1">{course.name}</div>
                                <div className="text-[11px] text-white/30 font-medium">Lvl {course.level} • {course.ch} CH</div>
                            </div>
                        )) : (
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                                <p className="text-[11px] text-white/20 font-bold uppercase tracking-widest">All current paths explored</p>
                            </div>
                        )}
                    </div>

                </motion.div>
            </div>

            {/* AI Advisor Banner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-8 rounded-[32px] bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-white/10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
                <div className="relative z-10 shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        <Sparkles className="w-8 h-8 text-violet-600" />
                    </div>
                </div>
                <div className="relative z-10 text-center md:text-left flex-1">
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-2">Advisor Intelligence</h3>
                    <p className="text-sm text-white/60 font-medium max-w-2xl leading-relaxed">
                        Your academic advisor is analyzing your {completedCredits} completed credit hours. We're calculating the most efficient route through the School of Computing curriculums to ensure you graduate on time with the best possible GPA.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
