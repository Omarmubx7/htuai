"use client";

import React from "react";
import { motion } from "framer-motion";
import { Home, CalendarDays, Settings2, LogOut, Moon, Sun, Bot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "./ThemeProvider";

const NAV_ITEMS = [
    { label: "Tracker", icon: Home, href: "/" },
    { label: "Planner", icon: CalendarDays, href: "/planner" },
    { label: "Settings", icon: Settings2, href: "/planner/settings" },
];

export default function MobileNav() {
    const pathname = usePathname();
    const { status } = useSession();
    const { isLightMode, toggleTheme } = useTheme();

    if (status !== "authenticated") {
        return null;
    }

    return (
        <nav id="wt-mobile-nav" className="sm:hidden fixed bottom-0 left-0 right-0 z-70 px-4 pb-6 pt-3 bg-zinc-950/80 dark:bg-black/80 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] flex justify-center">
            <div className="w-full max-w-md premium-card rounded-[2.5rem] flex items-center justify-between p-2 shadow-2xl bg-white/[0.02] border border-white/5">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href === "/" && pathname === "/");

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center py-2 px-3 gap-1 group transition-all"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabMobile"
                                    className="absolute inset-0 bg-violet-600/10 rounded-2xl border border-violet-500/20"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            <span className={`relative z-10 text-[8px] font-black uppercase tracking-widest transition-all ${isActive ? "text-violet-500" : "text-white/40 group-hover:text-white/60"}`}>
                                {item.label}
                            </span>
                            <div className={`relative z-10 p-1 rounded-xl transition-all ${isActive ? "text-violet-500 scale-110" : "text-white/50 group-hover:text-white/70"}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                        </Link>
                    );
                })}

                <div className="w-px h-8 bg-white/5 mx-1" />

                {/* Quick Actions */}
                <div className="flex items-center gap-1">
                    <a
                        href="https://bot.mubx.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-2xl text-white/40 hover:text-cyan-300 transition-all active:scale-90"
                        title="Open AI Bot"
                        aria-label="Open AI Bot"
                    >
                        <Bot className="w-5 h-5" />
                    </a>
                    <button
                        onClick={toggleTheme}
                        className="p-3 rounded-2xl text-white/40 hover:text-amber-400 transition-all active:scale-90"
                        title="Toggle Theme"
                    >
                        {isLightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="p-3 rounded-2xl text-white/40 hover:text-red-400 transition-all active:scale-90"
                        title="Sign out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </nav>
    );
}
