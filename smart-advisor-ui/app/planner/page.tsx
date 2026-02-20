"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import PlannerSetup from "../../components/PlannerSetup";
import PlannerDashboard from "../../components/PlannerDashboard";

export interface PlannerCourse {
    id: string;
    name: string;
    hasMidterm: boolean;
    credits: number;
    status: "In Progress" | "Completed" | "At Risk";
    midtermDate?: string;
    professor?: string;
}

const STORAGE_KEY = "htu_semester_planner_v1";

export default function PlannerPage() {
    const [courses, setCourses] = useState<PlannerCourse[] | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setCourses(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved planner data", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const handleSave = (updatedCourses: PlannerCourse[]) => {
        setCourses(updatedCourses);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCourses));
    };

    const handleReset = () => {
        if (confirm("Are you sure you want to reset your planner? All data will be lost.")) {
            setCourses(null);
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    if (!isLoaded) return <div className="min-h-screen bg-black" />;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-violet-500/30">
            {/* Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            <h1 className="text-sm font-bold tracking-tight">Semester Planner</h1>
                        </div>
                    </div>

                    {courses && (
                        <button
                            onClick={handleReset}
                            className="text-[10px] uppercase tracking-wider font-bold text-white/20 hover:text-red-400/60 transition-colors"
                        >
                            Reset Workspace
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-12 relative z-10">
                <AnimatePresence mode="wait">
                    {!courses ? (
                        <motion.div
                            key="setup"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <PlannerSetup onComplete={handleSave} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <PlannerDashboard courses={courses} onUpdate={handleSave} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
