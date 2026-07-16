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
    "data_science": "#dc4835", // red
    "computer_science": "#43aad7", // blue
    "cybersecurity": "#0da55a", // green
    "game_design": "#dc4835", // crimson
    "electrical_engineering": "#f39c14", // orange
    "energy_engineering": "#92604c", // brown
    "industrial_engineering": "#5a6472", // secondary
    "mechanical_engineering": "#c5ac75", // gold
};

function MajorCard({ major, onSelect }: { major: typeof MAJORS[number]; onSelect: (key: MajorKey) => void }) {
    const accent = majorAccent[major.key] ?? "#dc4835";
    const glow = majorGlow[major.key] ?? "rgba(220,72,53,0.15)";

    return (
        <motion.button
            variants={item}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(major.key)}
            className="group relative text-left p-6 rounded-xl cursor-pointer bg-white border border-[#dde3ec] hover:border-[#bec7d4] hover:shadow-[0_4px_12px_rgba(34,45,50,0.08)] transition-all duration-200"
            style={{
                borderTop: `3px solid ${accent}`,
            }}
        >
            {/* No gradient overlays */}

            <div className="relative z-10">
                {/* Icon with colored background */}
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110"
                    style={{
                        background: `${accent}15`,
                        border: `1px solid ${accent}20`,
                    }}>
                    {major.icon}
                </div>
                <h2 className="text-base font-bold mb-1.5 leading-snug tracking-tight transition-colors duration-200"
                    style={{ color: accent }}>
                    {major.label}
                </h2>
                <p className="text-[13px] text-[#5a6472] mb-5 leading-relaxed">
                    {major.description}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-bold transition-all duration-200 group-hover:gap-2.5"
                    style={{ color: `${accent}` }}>
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

            {/* Clean solid page background */}
            <div className="pointer-events-none absolute inset-0 bg-[#edf1f6]" />

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
                            <Image src="/mubxai-light-logo.png" alt="MUBXAI Logo" width={16} height={16} className="light-logo" />
                            MUBXAI
                        </span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-[#222d32] mb-4 tracking-tight leading-none uppercase">
                        {onCancel ? "Switch Your Major" : "Setup Your Academic Profile"}
                    </h1>
                    <p className="text-[#5a6472] text-sm sm:text-base max-w-md mx-auto font-medium">
                        {onCancel 
                            ? "Selecting a new major will update your curriculum roadmap immediately."
                            : "This is permanent — your courses and progress are tied to it."
                        }
                    </p>

                    {onCancel && (
                        <button 
                            onClick={onCancel}
                            className="mt-6 px-6 py-2 rounded-lg bg-white border border-[#dde3ec] text-[#5a6472] hover:text-[#222d32] hover:border-[#bec7d4] transition-all text-xs font-bold uppercase tracking-widest"
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
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#5a6472] whitespace-nowrap">
                            School of Computing & Informatics
                        </h2>
                        <div className="h-px flex-1 bg-[#dde3ec]" />
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
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#5a6472] whitespace-nowrap">
                            College of Engineering
                        </h2>
                        <div className="h-px flex-1 bg-[#dde3ec]" />
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
                    <p className="text-[#92604c] text-[11px]">
                        You can change your major later from the dashboard settings.
                    </p>
                    <p className="text-[#5a6472] text-[11px]">
                        made by{" "}
                        <a href="https://mubx.dev" target="_blank" rel="noopener noreferrer"
                            className="text-[#92604c] hover:text-[#222d32] font-semibold transition-colors duration-200">
                            mubx
                        </a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
