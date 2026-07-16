"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function NotFound() {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-[#edf1f6]">
            {/* Background accents */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#dc4835]/5 rounded-full blur-[140px] animate-slow-glow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#43aad7]/5 rounded-full blur-[140px] animate-slow-glow" style={{ animationDelay: "-4s" }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex flex-col items-center text-center max-w-md"
            >
                {/* Brand */}
                <div className="flex items-center gap-2 mb-12">
                    <div className="w-8 h-8 rounded-xl bg-[#dc4835]/10 flex items-center justify-center">
                        <Image src="/mubxai-dark-logo.png" alt="MUBXAI" width={18} height={18} className="dark-logo" />
                        <Image src="/mubxai-light-logo.png" alt="MUBXAI" width={18} height={18} className="light-logo" />
                    </div>
                    <span className="text-sm font-black tracking-tight text-[#222d32] uppercase italic">MUBXAI</span>
                </div>

                {/* 404 Display */}
                <div className="w-20 h-20 rounded-3xl bg-white border border-[#dde3ec] flex items-center justify-center mb-8 shadow-sm">
                    <AlertTriangle className="w-9 h-9 text-[#dc4835]" />
                </div>

                <h1 className="text-7xl font-black text-[#222d32] tracking-[-0.04em] mb-4">
                    404
                </h1>
                <p className="text-lg font-bold text-[#222d32] mb-2">Page not found</p>
                <p className="text-sm text-[#5a6472] font-medium mb-12 leading-relaxed">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                <Link
                    href="/"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#dc4835] hover:bg-[#c03d2e] text-white font-bold text-sm transition-all shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </motion.div>
        </div>
    );
}
