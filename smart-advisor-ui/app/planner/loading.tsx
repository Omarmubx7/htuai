"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function Loading() {
    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden bg-[var(--background)]">
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mesh-gradient" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 flex flex-col items-center gap-6"
            >
                <div className="relative">
                    <div className="absolute -inset-4 bg-violet-500/20 rounded-full blur-xl animate-pulse" />
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative z-10 shadow-[0_0_30px_rgba(139,92,246,0.15)] flex-col gap-2">
                        <Image priority src="/htuai-dark-logo.svg" alt="HTUAI" width={32} height={32} className="dark-logo animate-pulse" />
                        <Image priority src="/htuai-light-logo.svg" alt="HTUAI" width={32} height={32} className="light-logo animate-pulse" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-[var(--foreground)]/40 text-[10px] font-black tracking-widest uppercase">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                        <span>Loading Planner...</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
