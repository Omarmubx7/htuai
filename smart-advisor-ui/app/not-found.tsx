"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function NotFound() {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-black">
            {/* Background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[140px] animate-slow-glow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px] animate-slow-glow" style={{ animationDelay: "-4s" }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex flex-col items-center text-center max-w-md"
            >
                {/* Brand */}
                <div className="flex items-center gap-2 mb-12">
                    <div className="w-8 h-8 rounded-xl bg-violet-600/10 flex items-center justify-center">
                        <Image src="/mubxai-dark-logo.png" alt="MUBXAI" width={18} height={18} className="dark-logo" />
                        <Image src="/mubxai-light-logo.png" alt="MUBXAI" width={18} height={18} className="light-logo" />
                    </div>
                    <span className="text-sm font-black tracking-tight text-white uppercase italic">MUBXAI</span>
                </div>

                {/* 404 Display */}
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-2xl">
                    <AlertTriangle className="w-9 h-9 text-violet-400" />
                </div>

                <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-400 to-blue-500 tracking-[-0.04em] mb-4">
                    404
                </h1>
                <p className="text-lg font-bold text-white mb-2">Page not found</p>
                <p className="text-sm text-white/40 font-medium mb-12 leading-relaxed">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                <Link
                    href="/"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </motion.div>
        </div>
    );
}
