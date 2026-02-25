"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CalendarDays, Target, ArrowRight, ShieldCheck } from "lucide-react";

export default function PlannerOnboarding({ onComplete }: Readonly<{ onComplete: () => void }>) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const handleCreateFirstSemester = async () => {
        setLoading(true);
        try {
            const today = new Date();
            let term = "fall";
            if (today.getMonth() < 5) term = "spring";
            else if (today.getMonth() < 8) term = "summer";

            const res = await fetch("/api/planner/semesters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: term,
                    year: today.getFullYear(),
                    name: `${term.charAt(0).toUpperCase() + term.slice(1)} ${today.getFullYear()}`
                })
            });
            if (res.ok) {
                onComplete();
            } else {
                throw new Error("Failed to create semester");
            }
        } catch (e) {
            console.error(e);
            alert("Something went wrong setting up your planner.");
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        {
            title: "Welcome to HTU Planner",
            desc: "Take control of your academic journey. The Planner helps you track courses, manage exams, and analyze your CGPA dynamically.",
            icon: <Sparkles className="w-12 h-12 text-violet-400" />
        },
        {
            title: "Track & Predict",
            desc: "Add your currently enrolled courses. Input your expected grades to instantly see how they affect your overall CGPA.",
            icon: <Target className="w-12 h-12 text-blue-400" />
        },
        {
            title: "Study Logs & Gamification",
            desc: "Log your study sessions to earn XP, level up, and unlock exclusive academic badges. Keep your streak alive!",
            icon: <ShieldCheck className="w-12 h-12 text-emerald-400" />
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 selection:bg-violet-500/30">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg premium-card rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(139,92,246,0.1)] relative"
            >
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                    <motion.div
                        className="h-full bg-violet-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${(step / steps.length) * 100}%` }}
                    />
                </div>

                <div className="p-8 sm:p-12 text-center min-h-[400px] flex flex-col items-center justify-center relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col items-center w-full"
                        >
                            <div className="w-24 h-24 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-violet-500/10 blur-xl" />
                                <div className="relative z-10">{steps[step - 1].icon}</div>
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white mb-4">
                                {steps[step - 1].title}
                            </h2>
                            <p className="text-white/50 text-base leading-relaxed max-w-sm">
                                {steps[step - 1].desc}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-12 w-full flex flex-col items-center gap-4">
                        <div className="flex gap-2 mb-2">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${step - 1 === i ? 'w-6 bg-violet-400' : 'w-2 bg-white/10'}`}
                                />
                            ))}
                        </div>

                        {step < steps.length ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateFirstSemester}
                                disabled={loading}
                                className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:opacity-50"
                            >
                                {loading ? 'Initializing...' : "Let's Get Started!"}
                                {!loading && <CalendarDays className="w-4 h-4" />}
                            </button>
                        )}

                        <button
                            onClick={handleCreateFirstSemester}
                            className={`text-xs text-white/30 hover:text-white/60 font-bold uppercase tracking-widest transition-colors ${step === steps.length ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        >
                            Skip Tutorial
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
