"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface StudentLoginProps {
    onLogin: (studentId: string) => void;
}

export default function StudentLogin({ onLogin }: StudentLoginProps) {
    const [id, setId] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = id.trim();
        if (!clean || clean.length < 5) {
            setError("Please enter a valid university ID.");
            return;
        }
        setError("");
        onLogin(clean);
    };

    return (
        <div className="relative min-h-screen bg-black flex items-center justify-center px-4 overflow-hidden">

            {/* Framer-style violet radial glow */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[600px]"
                    style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.28) 0%, transparent 70%)" }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-sm z-10"
            >
                {/* Pill badge */}
                <div className="flex justify-center mb-10">
                    <span className="pill-badge">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        HTU Courses Tracker
                    </span>
                </div>

                {/* Heading */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-white mb-3 tracking-tight leading-none">
                        Welcome back
                    </h1>
                    <p className="text-[15px] text-white/40 leading-relaxed">
                        Enter your university ID to load<br />your saved progress
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="glass-card rounded-2xl p-1">
                        <input
                            type="text"
                            value={id}
                            onChange={(e) => { setId(e.target.value); setError(""); }}
                            placeholder="University ID — e.g. 2210001234"
                            autoFocus
                            className="w-full bg-transparent px-4 py-3 text-white placeholder-white/25
                                       outline-none text-sm font-mono tracking-wide rounded-xl"
                        />
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-400/80 px-1"
                        >
                            {error}
                        </motion.p>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                                   bg-white text-black font-semibold text-sm tracking-tight
                                   hover:bg-white/90 transition-colors"
                    >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                    </motion.button>
                </form>

                <p className="text-center text-white/20 text-xs mt-8">
                    Progress is saved server-side and accessible from any device.
                </p>
            </motion.div>
        </div>
    );
}
