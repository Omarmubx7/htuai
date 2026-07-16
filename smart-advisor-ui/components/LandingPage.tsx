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
            icon: <LayoutDashboard className="w-6 h-6 text-[#dc4835]" />,
            color: "red"
        },
        {
            title: "MUBX Curricula",
            description: "Built-in support for all engineering and computer science majors at MUBX.",
            icon: <GraduationCap className="w-6 h-6 text-[#43aad7]" />,
            color: "blue"
        },
        {
            title: "Smart Progress",
            description: "Track your GPA, completed credits, and remaining requirements in real-time.",
            icon: <CheckCircle2 className="w-6 h-6 text-[#0da55a]" />,
            color: "green"
        }
    ];

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
            {/* Clean solid page background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#edf1f6]" />

            <header className="w-full max-w-6xl flex justify-end p-4">
                <button onClick={onGetStarted} className="text-sm text-[#92604c] hover:text-[#222d32] transition-colors">Back to Dashboard</button>
            </header>

            <main className="relative z-10 w-full max-w-6xl flex flex-col items-center text-center">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pill-badge-premium mb-8 hover:border-[#dc4835]/40 transition-colors cursor-default"
                >
                    <Image priority src="/mubxai-dark-logo.png" alt="MUBXAI Logo" width={16} height={16} className="animate-pulse dark-logo" />
                    <Image priority src="/mubxai-light-logo.png" alt="MUBXAI Logo" width={16} height={16} className="animate-pulse light-logo" />
                    Student Success Reimagined
                </motion.div>

                {/* Hero Title with Multi-layered Gradient */}
                <div className="relative mb-6">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="text-6xl sm:text-7xl md:text-9xl font-black tracking-[-0.04em] leading-[0.9] px-4 uppercase italic"
                    >
                        <span className="text-[#222d32]">MUBXAI</span>
                    </motion.h1>
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-base md:text-xl text-[#92604c] max-w-2xl mb-6 font-medium leading-relaxed px-6 tracking-tight"
                >
                    The all-in-one AI platform for MUBX University students to master their academic journey, from enrollment to graduation.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="flex items-center gap-2 mb-14 px-4 py-1.5 rounded-full bg-[#edf1f6] border border-[#dde3ec] text-xs font-bold text-[#92604c] uppercase tracking-[0.2em] select-none"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#dc4835] animate-pulse" />
                    Powered by Google Gemini
                </motion.div>

                {/* Feature Grid with Staggered Entrance & Shimmer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 w-full px-4">
                    {features.map((feature, i) => (
                        <motion.button
                            key={feature.title}
                            onClick={() => onGetStarted()}
                            layout
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -10, scale: 1.02 }}
                            transition={{
                                delay: 0.3 + (i * 0.1),
                                duration: 0.6,
                                ease: [0.16, 1, 0.3, 1]
                            }}
                            className="premium-card p-10 text-left group cursor-pointer rounded-2xl"
                        >
                            <div className="mb-8 p-4 rounded-[22px] bg-[#edf1f6] w-fit border border-[#dde3ec] group-hover:bg-[#dde3ec] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-xs">
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-[#222d32] mb-3 tracking-tight group-hover:text-[#dc4835] transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-[#92604c] leading-relaxed font-medium group-hover:text-[#222d32]/85 transition-colors">
                                {feature.description}
                            </p>
                        </motion.button>
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
                        <motion.button
                            onClick={onGetStarted}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative px-12 py-5 rounded-lg bg-[#dc4835] text-white font-black text-xl transition-all flex items-center gap-4 hover:bg-[#fe1f11]"
                        >
                            Start Tracking Progress
                            <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-2" />
                        </motion.button>
                    </div>

                    <div className="flex items-center gap-6 text-[11px] font-bold text-[#222d32]/30 uppercase tracking-[0.3em] select-none">
                        <div className="flex items-center gap-2 group cursor-default">
                            <CheckCircle2 className="w-4 h-4 text-[#0da55a]/40 group-hover:text-[#0da55a] transition-colors" />
                            <span className="group-hover:text-[#222d32]/60 transition-colors">100% Free</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#222d32]/20" />
                        <div className="flex items-center gap-2 group cursor-default">
                            <GraduationCap className="w-5 h-5 text-[#dc4835]/40 group-hover:text-[#dc4835] transition-colors" />
                            <span className="group-hover:text-[#222d32]/60 transition-colors">MUBX Curricula</span>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
