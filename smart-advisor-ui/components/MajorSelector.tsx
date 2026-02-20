"use client";

import { motion } from "framer-motion";
import { MAJORS, MajorKey } from "@/lib/useMajor";
import { ArrowRight } from "lucide-react";

interface MajorSelectorProps {
    onSelect: (key: MajorKey) => void;
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const item = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { type: "spring", damping: 22, stiffness: 180 } },
} as const;

/** Per-major accent glow colour */
const majorGlow: Record<string, string> = {
    "data_science": "rgba(139,92,246,0.18)",
    "computer_science": "rgba(59,130,246,0.18)",
    "cybersecurity": "rgba(16,185,129,0.18)",
    "game_design": "rgba(244,63,94,0.18)",
    "electrical_engineering": "rgba(251,191,36,0.18)",
    "energy_engineering": "rgba(132,204,22,0.18)",
    "industrial_engineering": "rgba(148,163,184,0.18)",
    "mechanical_engineering": "rgba(59,130,246,0.18)",
};

export default function MajorSelector({ onSelect }: MajorSelectorProps) {
    return (
        <div className="relative min-h-screen bg-black flex items-center justify-center px-4 overflow-hidden">

            {/* Violet radial glow */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[900px] h-[700px]"
                    style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.22) 0%, transparent 70%)" }} />
            </div>

            <div className="relative z-10 w-full max-w-3xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-16"
                >
                    <div className="flex justify-center mb-8">
                        <span className="pill-badge">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                            HTU Courses Tracker
                        </span>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4 tracking-tight leading-none">
                        Choose your major
                    </h1>
                    <p className="text-white/40 text-base">
                        This is permanent — your courses and progress are tied to it.
                    </p>
                </motion.div>

                {/* School of Computing Section */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">
                            School of Computing & Informatics
                        </h2>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                        {MAJORS.filter(m => m.school === "Computing").map((major) => (
                            <motion.button
                                key={major.key}
                                variants={item}
                                whileHover={{ y: -6, scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSelect(major.key)}
                                className="group relative text-left p-6 rounded-2xl overflow-hidden cursor-pointer
                                           glass-card glass-card-hover transition-all duration-300"
                            >
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                                    style={{ background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${majorGlow[major.key] ?? "rgba(139,92,246,0.15)"}, transparent)` }}
                                />
                                <div className="relative z-10">
                                    <div className="text-3xl mb-5">{major.icon}</div>
                                    <h2 className="text-base font-semibold text-white mb-2 leading-snug tracking-tight">
                                        {major.label}
                                    </h2>
                                    <p className="text-sm text-white/35 mb-6 leading-relaxed">
                                        {major.description}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-white/50 group-hover:text-white/70 transition-colors">
                                        Select major
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                </div>

                {/* College of Engineering Section */}
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">
                            College of Engineering
                        </h2>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                        {MAJORS.filter(m => m.school === "Engineering").map((major) => (
                            <motion.button
                                key={major.key}
                                variants={item}
                                whileHover={{ y: -6, scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSelect(major.key)}
                                className="group relative text-left p-6 rounded-2xl overflow-hidden cursor-pointer
                                           glass-card glass-card-hover transition-all duration-300"
                            >
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                                    style={{ background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${majorGlow[major.key] ?? "rgba(139,92,246,0.15)"}, transparent)` }}
                                />
                                <div className="relative z-10">
                                    <div className="text-3xl mb-5">{major.icon}</div>
                                    <h2 className="text-base font-semibold text-white mb-2 leading-snug tracking-tight">
                                        {major.label}
                                    </h2>
                                    <p className="text-sm text-white/35 mb-6 leading-relaxed">
                                        {major.description}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-white/50 group-hover:text-white/70 transition-colors">
                                        Select major
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center text-white/20 text-xs mt-10"
                >
                    Your selection cannot be changed without admin assistance.
                </motion.p>
            </div>
        </div>
    );
}
