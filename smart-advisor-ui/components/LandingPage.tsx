"use client";

import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, GraduationCap, LayoutDashboard, Calendar, ArrowRight } from "lucide-react";

interface LandingPageProps {
    onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
    const features = [
        {
            title: "Course Tracker",
            description: "Monitor your degree progress with automated prerequisite checking and credit hour calculation.",
            icon: <LayoutDashboard className="w-6 h-6 text-violet-400" />,
            color: "violet"
        },
        {
            title: "Semester Planner",
            description: "Plan your future semesters, track midterm/final dates, and projected grades.",
            icon: <Calendar className="w-6 h-6 text-blue-400" />,
            color: "blue"
        },
        {
            title: "Smart Insights",
            description: "Get personalized study tips, GPA projections, and 'at-risk' course alerts.",
            icon: <Sparkles className="w-6 h-6 text-emerald-400" />,
            color: "emerald"
        }
    ];

    return (
        <div className="relative min-h-screen bg-[#030303] flex flex-col items-center justify-center px-4 overflow-hidden glow-premium">
            {/* Ambient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] animate-slow-glow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-slow-glow" style={{ animationDelay: "-4s" }} />
            </div>

            <main className="relative z-10 w-full max-w-5xl flex flex-col items-center text-center">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pill-badge-premium mb-8"
                >
                    <img src="/mubxlogo.svg" alt="Mubx Logo" className="w-4 h-4" />
                    Student Success Reimagined
                </motion.div>

                {/* Hero Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-none px-4"
                >
                    HTU Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-500">Advisor</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-base md:text-xl text-white/50 max-w-2xl mb-12 font-medium leading-relaxed px-6"
                >
                    The all-in-one AI platform for Al Hussein Technical University students to master their academic journey, from 0 to 160 CH.
                </motion.p>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 w-full px-4">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            transition={{
                                delay: 0.3 + (i * 0.1),
                                duration: 0.4,
                                ease: [0.16, 1, 0.3, 1]
                            }}
                            className="glass-card-premium p-8 rounded-[32px] border border-white/10 text-left relative group overflow-hidden cursor-default"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] rounded-bl-full group-hover:bg-white/[0.05] transition-colors" />
                            <div className="mb-6 p-3 rounded-2xl bg-white/[0.03] w-fit border border-white/5 transition-transform group-hover:scale-110 duration-500">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
                            <p className="text-sm text-white/40 leading-relaxed font-medium">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* CTA Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col items-center gap-6"
                >
                    <motion.button
                        onClick={onGetStarted}
                        whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255,255,255,0.2)" }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative px-8 py-4 rounded-2xl bg-white text-black font-black text-lg transition-all flex items-center gap-3"
                    >
                        Start Planning Now
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </motion.button>

                    <div className="flex items-center gap-4 text-[11px] font-bold text-white/20 uppercase tracking-[0.2em] select-none">
                        <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500/50" />
                            100% Free
                        </div>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <div className="flex items-center gap-1">
                            <GraduationCap className="w-4 h-4 text-violet-500/50" />
                            HTU Official Curriculums
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
