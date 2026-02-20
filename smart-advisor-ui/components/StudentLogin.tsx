"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, User, Chrome, Sparkles } from "lucide-react";
import { signIn } from "next-auth/react";

export default function StudentLogin() {
    const [id, setId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isClaiming, setIsClaiming] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanId = id.trim();
        if (!cleanId || cleanId.length < 5) {
            setError("Please enter a valid university ID.");
            return;
        }
        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                student_id: cleanId,
                password,
                is_claiming: isClaiming ? "true" : "false",
                redirect: false,
            });

            if (result?.error) {
                setError(isClaiming ? "Account already exists or invalid data." : "Invalid ID or password.");
            } else {
                window.location.reload();
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-[#030303] flex items-center justify-center px-4 overflow-hidden glow-premium">
            {/* Animated Background Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] animate-slow-glow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px] animate-slow-glow" style={{ animationDelay: "-4s" }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-[400px] z-10"
            >
                {/* Badge */}
                <div className="flex justify-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="pill-badge-premium"
                    >
                        <Sparkles className="w-3.5 h-3.5 fill-violet-400/20" />
                        HTU Smart Advisor
                    </motion.div>
                </div>

                <div className="glass-card-premium rounded-[32px] p-8 md:p-10 border border-white/10 relative overflow-hidden">
                    {/* Subtle inner flare */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-400/20 to-transparent" />

                    <div className="text-center mb-10">
                        <AnimatePresence mode="wait">
                            <motion.h1
                                key={isClaiming ? "claim" : "login"}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-[32px] font-extrabold text-white mb-2 tracking-tight leading-none"
                            >
                                {isClaiming ? "Claim Your Spot" : "Welcome Back"}
                            </motion.h1>
                        </AnimatePresence>
                        <p className="text-sm text-white/50 font-semibold">
                            {isClaiming
                                ? "Link your university ID to start tracking."
                                : "Sign in to access your advisor dashboard."}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-4">
                            <div className="relative group">
                                <label htmlFor="student_id" className="sr-only">University ID</label>
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-violet-400/50 transition-colors">
                                    <User className="w-4.5 h-4.5" aria-hidden="true" />
                                </div>
                                <input
                                    id="student_id"
                                    type="text"
                                    value={id}
                                    onChange={(e) => { setId(e.target.value); setError(""); }}
                                    placeholder="University ID"
                                    autoComplete="username"
                                    aria-required="true"
                                    aria-invalid={!!error}
                                    aria-describedby={error ? "login-error" : undefined}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 outline-none transition-all focus:bg-white/[0.05] focus:border-violet-500/40 text-sm font-medium"
                                />
                            </div>

                            <div className="relative group">
                                <label htmlFor="password" className="sr-only">Password</label>
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-violet-400/50 transition-colors">
                                    <Lock className="w-4.5 h-4.5" aria-hidden="true" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                    placeholder="Secure Password"
                                    autoComplete={isClaiming ? "new-password" : "current-password"}
                                    aria-required="true"
                                    aria-invalid={!!error}
                                    aria-describedby={error ? "login-error" : undefined}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 outline-none transition-all focus:bg-white/[0.05] focus:border-violet-500/40 text-sm font-medium"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.p
                                id="login-error"
                                role="alert"
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-[11px] font-semibold text-red-400/90 text-center"
                            >
                                {error}
                            </motion.p>
                        )}

                        <motion.button
                            disabled={loading}
                            whileHover={{ scale: 1.01, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            aria-label={isClaiming ? "Verify and Claim Account" : "Sign into Dashboard"}
                            className="w-full relative group overflow-hidden py-4 rounded-2xl bg-white text-black font-bold text-sm transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                        >
                            {loading ? "Initializing..." : isClaiming ? "Verify & Claim" : "Enter Dashboard"}
                            {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
                        </motion.button>
                    </form>

                    <div className="relative my-10 px-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-white/5" /></div>
                        <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-white/20">
                            <span className="bg-[#121212] px-3 py-1 rounded-full border border-white/5">Universal Login</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <motion.button
                            whileHover={{ scale: 1.01, border: "rgba(255,255,255,0.2)" }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => signIn("google")}
                            aria-label="Continue with Google"
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-white text-sm font-semibold transition-all hover:bg-white/[0.05]"
                        >
                            <div className="w-6 h-6 flex items-center justify-center bg-white/5 rounded-full" aria-hidden="true">
                                <Chrome className="w-3.5 h-3.5 text-white/60" />
                            </div>
                            Continue with Google
                        </motion.button>

                        <p className="text-center mt-2">
                            <button
                                type="button"
                                onClick={() => { setIsClaiming(!isClaiming); setError(""); }}
                                className="text-[10px] uppercase tracking-wider font-bold text-violet-400/60 hover:text-violet-400 transition-colors focus:outline-none focus:ring-1 focus:ring-violet-400/40 rounded px-2"
                            >
                                {isClaiming
                                    ? "Already have an account? Login"
                                    : "First time? Sign up & Claim your progress"
                                }
                            </button>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
