"use client";

import { motion } from "framer-motion";
import {
    Calendar,
    BookOpen,
    Clock,
    CheckCircle2,
    Circle,
    MoreHorizontal,
    LayoutGrid,
    List,
    Trophy,
    Target
} from "lucide-react";
import { PlannerCourse } from "@/app/planner/page";

interface PlannerDashboardProps {
    courses: PlannerCourse[];
    onUpdate: (courses: PlannerCourse[]) => void;
}

export default function PlannerDashboard({ courses, onUpdate }: PlannerDashboardProps) {
    const totalCredits = courses.reduce((acc, c) => acc + (c.credits || 0), 0);
    const midtermCount = courses.filter(c => c.hasMidterm).length;

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const toggleStatus = (id: string) => {
        const next = courses.map(c => {
            if (c.id === id) {
                const nextStatus: Record<string, "In Progress" | "Completed" | "At Risk"> = {
                    "In Progress": "Completed",
                    "Completed": "At Risk",
                    "At Risk": "In Progress"
                };
                return { ...c, status: nextStatus[c.status] };
            }
            return c;
        });
        onUpdate(next);
    };

    return (
        <div className="space-y-10">
            {/* Header / Stats */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-bold tracking-tight text-white mb-2">My Semester</h2>
                    <p className="text-white/40 font-medium">Auto-generated workspace for Spring 2026</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="glass-card-premium px-4 py-2.5 rounded-2xl border border-white/5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white leading-none">{totalCredits}</span>
                            <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold mt-1">Total CH</span>
                        </div>
                    </div>
                    <div className="glass-card-premium px-4 py-2.5 rounded-2xl border border-white/5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Target className="w-4 h-4 text-amber-500 font-bold" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white leading-none">{midtermCount}</span>
                            <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold mt-1">Midterms</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Quick Views */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card-premium p-4 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm font-bold">In Good Standing</div>
                            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Current Pace</div>
                        </div>
                    </div>
                </div>
                <div className="glass-card-premium p-4 rounded-3xl border border-white/5 flex items-center justify-between col-span-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-sm font-bold">Next Milestone: Midterm Season</div>
                            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Starting in 4 weeks</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Database View */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white border-b-2 border-violet-500 pb-2">
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Table View
                        </button>
                        <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors pb-2">
                            <List className="w-3.5 h-3.5" />
                            List
                        </button>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/20">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>

                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="glass-card-premium rounded-[32px] border border-white/5 overflow-hidden"
                >
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30">Course Name</th>
                                <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30">Credits</th>
                                <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30 text-center">Midterm</th>
                                <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30">Status</th>
                                <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30">Next Step</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.map((course) => (
                                <motion.tr
                                    variants={item}
                                    key={course.id}
                                    className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-violet-500/50" />
                                            <span className="text-sm font-semibold">{course.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="text-xs font-mono text-white/40">{course.credits} CH</span>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex justify-center">
                                            {course.hasMidterm ? (
                                                <div className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-500 uppercase tracking-tighter">
                                                    High Stakes
                                                </div>
                                            ) : (
                                                <span className="text-white/10">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <button
                                            onClick={() => toggleStatus(course.id)}
                                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${course.status === "Completed"
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                    : course.status === "At Risk"
                                                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                                                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                                }`}
                                        >
                                            {course.status}
                                        </button>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2 text-white/30 group-hover:text-white/60 transition-colors">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span className="text-xs">Update progress</span>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            </section>

            {/* Individual Pages Mockup */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {courses.map((course) => (
                    <motion.div
                        key={course.id + "_card"}
                        whileHover={{ y: -4 }}
                        className="glass-card-premium p-5 rounded-[24px] border border-white/5 hover:border-violet-500/20 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:bg-violet-500/10 group-hover:border-violet-500/20 transition-all">
                                <BookOpen className="w-5 h-5 text-white/20 group-hover:text-violet-400 transition-colors" />
                            </div>
                            <button className="text-white/10 hover:text-white/30 transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                        <h3 className="font-bold text-sm mb-1 leading-tight">{course.name}</h3>
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-4">Course Page</p>

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/50" />
                                <span>Lecture 01 Notes</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <Circle className="w-3.5 h-3.5" />
                                <span>Assignment 01</span>
                            </div>
                        </div>

                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "25%" }}
                                className="h-full bg-violet-500"
                            />
                        </div>
                    </motion.div>
                ))}
            </section>
        </div>
    );
}
