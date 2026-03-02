"use client";

import { motion } from "framer-motion";
import { CheckCircle2, GraduationCap, LayoutDashboard, ArrowRight } from "lucide-react";
import Image from "next/image";

interface LandingPageProps {
    onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: Readonly<LandingPageProps>) {
    const features = [
        {
            title: "Course Tracker",
            description: "Monitor your degree progress with automated prerequisite checking and credit hour calculation.",
            icon: <LayoutDashboard className="w-6 h-6 text-violet-400" />,
            color: "violet"
        },
        {
            title: "HTU Curriculums",
            description: "Built-in support for all engineering and computer science majors at HTU.",
            icon: <GraduationCap className="w-6 h-6 text-blue-400" />,
            color: "blue"
        },
        {
            title: "Smart Progress",
            description: "Track your GPA, completed credits, and remaining requirements in real-time.",
            icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
            color: "emerald"
        }
    ];

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
            {/* Phase 2: Premium Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-violet-600/20 rounded-full blur-[80px] md:blur-[140px] animate-slow-glow mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[80px] md:blur-[140px] animate-slow-glow mix-blend-screen" style={{ animationDelay: "-4s" }} />
                <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-fuchsia-600/10 rounded-full blur-[60px] md:blur-[100px] animate-float mix-blend-screen hidden md:block" style={{ animationDelay: "-2s" }} />

                {/* Mesh noise overlay */}
            </div>

            <main className="relative z-10 w-full max-w-6xl flex flex-col items-center text-center">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pill-badge-premium mb-8 hover:border-violet-400/40 transition-colors cursor-default"
                >
                    <Image priority src="/htuai-dark-logo.svg" alt="HTUAI Logo" width={16} height={16} className="animate-pulse dark-logo" />
                    <Image priority src="/htuai-light-logo.svg" alt="HTUAI Logo" width={16} height={16} className="animate-pulse light-logo" />
                    Student Success Reimagined
                </motion.div>

                {/* Hero Title with Multi-layered Gradient */}
                <div className="relative mb-6">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="text-6xl sm:text-7xl md:text-9xl font-black text-white tracking-[-0.04em] leading-[0.9] px-4 uppercase italic"
                    >
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-400 to-blue-500 drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]">HTUAI</span>
                    </motion.h1>
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-base md:text-xl text-white/40 max-w-2xl mb-6 font-medium leading-relaxed px-6 tracking-tight"
                >
                    The all-in-one AI platform for Al Hussein Technical University students to master their academic journey, from 0 to 160 CH.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="flex items-center gap-2 mb-14 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] select-none"
                >
                    <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
                    Powered by Google Gemini
                </motion.div>

                {/* Feature Grid with Staggered Entrance & Shimmer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 w-full px-4">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            layout
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -10, scale: 1.02 }}
                            transition={{
                                delay: 0.3 + (i * 0.1),
                                duration: 0.6,
                                ease: [0.16, 1, 0.3, 1]
                            }}
                            className="premium-card p-10 text-left group cursor-default"
                        >
                            <div className="mb-8 p-4 rounded-[22px] bg-white/[0.03] w-fit border border-white/5 group-hover:bg-white/[0.06] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-xl">
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight group-hover:text-violet-300 transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-white/30 leading-relaxed font-medium group-hover:text-white/50 transition-colors">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* CTA Area with Blooming Glow */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="flex flex-col items-center gap-8"
                >
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                        <motion.button
                            onClick={onGetStarted}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative px-12 py-5 rounded-2xl bg-white text-black font-black text-xl transition-all flex items-center gap-4 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)]"
                        >
                            Start Tracking Progress
                            <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-2" />
                        </motion.button>
                    </div>

                    <div className="flex items-center gap-6 text-[11px] font-bold text-white/10 uppercase tracking-[0.3em] select-none">
                        <div className="flex items-center gap-2 group cursor-default">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500/30 group-hover:text-emerald-500 transition-colors" />
                            <span className="group-hover:text-white/40 transition-colors">100% Free</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        <div className="flex items-center gap-2 group cursor-default">
                            <GraduationCap className="w-5 h-5 text-violet-500/30 group-hover:text-violet-500 transition-colors" />
                            <span className="group-hover:text-white/40 transition-colors">HTU Curriculums</span>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
