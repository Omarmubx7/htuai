"use client";

import { motion } from "framer-motion";
import { MAJORS, MajorKey } from "@/lib/useMajor";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

interface MajorSelectorProps {
    onSelect: (key: MajorKey) => void;
    onCancel?: () => void;
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    },
};
const item = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 260,
            damping: 20
        }
    },
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
    "mechanical_engineering": "rgba(249,115,22,0.18)",
};

/** Per-major solid accent colour for border & text */
const majorAccent: Record<string, string> = {
    "data_science": "#8b5cf6",
    "computer_science": "#3b82f6",
    "cybersecurity": "#10b981",
    "game_design": "#f43f5e",
    "electrical_engineering": "#fbbf24",
    "energy_engineering": "#84cc16",
    "industrial_engineering": "#94a3b8",
    "mechanical_engineering": "#f97316",
};

function MajorCard({ major, onSelect }: { major: typeof MAJORS[number]; onSelect: (key: MajorKey) => void }) {
    const accent = majorAccent[major.key] ?? "#8b5cf6";
    const glow = majorGlow[major.key] ?? "rgba(139,92,246,0.15)";

    return (
        <motion.button
            variants={item}
            whileHover={{ y: -6, scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(major.key)}
            className="group relative text-left p-6 rounded-2xl overflow-hidden cursor-pointer
                       glass-card glass-card-hover transition-all duration-300"
            style={{
                borderTop: `2px solid ${accent}50`,
                background: `linear-gradient(135deg, ${accent}08, transparent 60%)`,
            }}
        >
            {/* Hover glow */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${glow}, transparent)` }}
            />
            {/* Subtle corner accent */}
            <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at 100% 0%, ${accent}, transparent 70%)` }} />

            <div className="relative z-10">
                {/* Icon with colored background */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110"
                    style={{
                        background: `${accent}15`,
                        border: `1px solid ${accent}20`,
                        boxShadow: `0 0 0 0 ${accent}00`,
                    }}>
                    {major.icon}
                </div>
                <h2 className="text-base font-semibold mb-1.5 leading-snug tracking-tight transition-colors duration-200"
                    style={{ color: accent }}>
                    {major.label}
                </h2>
                <p className="text-[13px] text-white/60 mb-5 leading-relaxed">
                    {major.description}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-medium transition-all duration-200 group-hover:gap-2.5"
                    style={{ color: `${accent}70` }}>
                    Select major
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                </div>
            </div>
        </motion.button>
    );
}

export default function MajorSelector({ onSelect, onCancel }: MajorSelectorProps) {
    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">

            {/* Ambient background effects */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[900px] h-[700px]"
                    style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.18) 0%, transparent 70%)" }} />
                <div className="absolute right-0 bottom-0 w-[500px] h-[500px]"
                    style={{ background: "radial-gradient(circle at 100% 100%, rgba(59,130,246,0.06) 0%, transparent 60%)" }} />
                <div className="absolute left-0 bottom-1/3 w-[400px] h-[400px]"
                    style={{ background: "radial-gradient(circle at 0% 50%, rgba(16,185,129,0.05) 0%, transparent 60%)" }} />
            </div>

            <div className="relative z-10 w-full max-w-3xl py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-14"
                >
                    <div className="flex justify-center mb-6">
                        <span className="pill-badge-premium">
                            <Image src="/mubxai-dark-logo.png" alt="MUBXAI Logo" width={16} height={16} className="dark-logo" />
                            <Image src="/mubxai-light-logo.png" alt="MUBXAI Logo" width={16} height={16} className="light-logo" />
                            MUBXAI
                        </span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight leading-none">
                        {onCancel ? "Switch Your Major" : "Setup Your Academic Profile"}
                    </h1>
                    <p className="text-white/50 text-sm sm:text-base max-w-md mx-auto">
                        {onCancel 
                            ? "Selecting a new major will update your curriculum roadmap immediately."
                            : "This is permanent — your courses and progress are tied to it."
                        }
                    </p>

                    {onCancel && (
                        <button 
                            onClick={onCancel}
                            className="mt-6 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest"
                        >
                            Cancel & Go Back
                        </button>
                    )}
                </motion.div>

                {/* School of Computing Section */}
                <div className="mb-12">
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-4 mb-6">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-white/50 whitespace-nowrap">
                            School of Computing & Informatics
                        </h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/8 to-transparent" />
                    </motion.div>
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                        {MAJORS.filter(m => m.school === "Computing").map((major) => (
                            <MajorCard key={major.key} major={major} onSelect={onSelect} />
                        ))}
                    </motion.div>
                </div>

                {/* College of Engineering Section */}
                <div className="mb-8">
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="flex items-center gap-4 mb-6">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-white/50 whitespace-nowrap">
                            College of Engineering
                        </h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/8 to-transparent" />
                    </motion.div>
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                        {MAJORS.filter(m => m.school === "Engineering").map((major) => (
                            <MajorCard key={major.key} major={major} onSelect={onSelect} />
                        ))}
                    </motion.div>
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center mt-12 space-y-3"
                >
                    <p className="text-white/15 text-[11px]">
                        You can change your major later from the dashboard settings.
                    </p>
                    <p className="text-white/65 text-[11px]">
                        made by{" "}
                        <a href="https://mubx.dev" target="_blank" rel="noopener noreferrer"
                            className="text-white/50 hover:text-white/50 font-semibold transition-colors duration-200">
                            mubx
                        </a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
