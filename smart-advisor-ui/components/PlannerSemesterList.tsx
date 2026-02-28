"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Plus, ArrowRight, BookOpen, Clock, Target, Settings2 } from "lucide-react";
import Link from "next/link";

export default function PlannerSemesterList() {
    const { status } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSem, setNewSem] = useState({ type: "Spring", year: new Date().getFullYear() });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        } else if (status === "authenticated") {
            fetchSemesters();
        }
    }, [status, router]);

    const fetchSemesters = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/planner/semesters");
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            setSemesters(data.semesters || []);
        } catch (e: unknown) {
            console.error("Failed to load semesters:", e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    const handleAddSemester = async () => {
        setCreating(true);
        try {
            const res = await fetch("/api/planner/semesters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `${newSem.type} ${newSem.year}`,
                    type: newSem.type,
                    year: newSem.year
                })
            });
            if (res.ok) {
                const data = await res.json();
                setSemesters([data.semester, ...semesters]);
                setShowAddModal(false);
            }
        } catch (e: unknown) {
            console.error("Failed to add semester:", e instanceof Error ? e.message : String(e));
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 bg-black text-white selection:bg-violet-500/30">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                    <Link href="/planner" className="text-[10px] text-white/40 uppercase tracking-widest font-bold hover:text-white transition-colors mb-1 flex items-center gap-1">
                        ← Dashboard
                    </Link>
                    <h1 className="font-bold text-base sm:text-lg flex items-center gap-2 truncate">
                        <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 shrink-0" /> <span className="truncate">All Semesters</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <Link href="/planner/settings" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-colors" title="Settings">
                        <Settings2 className="w-4 h-4" />
                    </Link>
                    <Link href="/" className="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] sm:text-xs font-semibold sm:text-sm text-white/70 transition-colors whitespace-nowrap">
                        Course Tracker
                    </Link>
                </div>
            </header>

            <main className="max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-4 md:px-6 pt-8">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black font-display tracking-tight">Timeline</h2>
                        <p className="text-white/40 text-sm mt-1">Manage your active and completed semesters.</p>
                    </div>
                    {/* Placeholder for Add Semester modal trigger - to be implemented fully if needed */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all group"
                    >
                        <Plus className="w-4 h-4 text-white/60 group-hover:text-white" />
                        Add Term
                    </button>
                </div>

                <div className="space-y-4">
                    <AnimatePresence>
                        {semesters.map((sem, i) => {
                            const courseCount = sem.courses?.length || 0;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            // A semester is past/completed if its end date is strictly before today
                            const isPast = sem.end_date ? new Date(sem.end_date) < today : false;

                            // Calculate dynamic GPA if not officially set
                            let gpa = sem.semester_gpa ?? 0;
                            if (sem.semester_gpa === null && sem.courses?.length > 0) {
                                let totalPoints = 0;
                                let totalCredits = 0;
                                sem.courses.forEach((c: any) => {
                                    if (c.grade_point !== null && c.grade_letter) {
                                        totalPoints += (c.grade_point * c.credits);
                                        totalCredits += c.credits;
                                    }
                                });
                                if (totalCredits > 0) gpa = totalPoints / totalCredits;
                            }

                            return (
                                <motion.div
                                    key={sem.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group relative bg-white/[0.02] border border-white/5 hover:border-violet-500/30 rounded-[2rem] p-6 transition-colors overflow-hidden flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center"
                                >
                                    <div className="flex items-start gap-4 z-10">
                                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border ${isPast ? 'bg-white/5 border-white/5 text-white/40' : 'bg-violet-600/20 border-violet-500/30 text-violet-400'}`}>
                                            <span className="text-[10px] font-bold uppercase">{sem.type.substring(0, 3)}</span>
                                            <span className="text-lg font-black leading-none">{sem.year}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-xl font-bold">{sem.name}</h3>
                                                {isPast && <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-white/40 font-bold uppercase">Completed</span>}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-white/50">
                                                <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {courseCount} Courses</span>
                                                <span className="hidden sm:flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> GPA: {gpa > 0 ? gpa.toFixed(2) : '-.-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full sm:w-auto z-10 flex sm:justify-end">
                                        <Link
                                            href={`/planner/semesters/${sem.id}`}
                                            className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold flex items-center justify-center sm:justify-between gap-3 transition-colors text-white/90 group-hover:text-white"
                                        >
                                            View Semester <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                        </Link>
                                    </div>

                                    {/* Hover gradient effect */}
                                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>

                    {semesters.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                            <Clock className="w-10 h-10 text-white/20 mb-4" />
                            <h3 className="text-lg font-bold mb-1">No Semesters Found</h3>
                            <p className="text-white/40 text-sm">Create your first term to begin tracking.</p>
                        </div>
                    )}
                </div>

            </main>

            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold mb-4">Add Semester</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="term-type" className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Term Type</label>
                                    <select
                                        id="term-type"
                                        value={newSem.type} onChange={e => setNewSem({ ...newSem, type: e.target.value })}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors appearance-none"
                                    >
                                        <option value="Spring" className="bg-black text-white">Spring</option>
                                        <option value="Summer" className="bg-black text-white">Summer</option>
                                        <option value="Fall" className="bg-black text-white">Fall</option>
                                        <option value="Winter" className="bg-black text-white">Winter</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="academic-year" className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Academic Year</label>
                                    <input
                                        id="academic-year"
                                        type="number"
                                        value={newSem.year}
                                        onChange={e => setNewSem({ ...newSem, year: Number.parseInt(e.target.value) })}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                                <button onClick={handleAddSemester} disabled={creating} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
                                    {creating ? "Adding..." : "Add Term"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
