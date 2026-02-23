"use client";

import React from "react";
import { motion } from "framer-motion";
import { Home, BookOpen, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Courses", icon: BookOpen, href: "/?tab=tracker" },
    { label: "Planner", icon: Sparkles, href: "/planner" },
    { label: "Profile", icon: User, href: "/profile" },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-70 px-6 pb-6 pt-2 bg-linear-to-t from-black via-black/90 to-transparent pointer-events-none">
            <div className="glass-card-premium rounded-3xl border border-white/10 flex items-center justify-around p-2 pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href === "/" && pathname === "/");

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center py-2 px-4 gap-1 group transition-all"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabMobile"
                                    className="absolute inset-0 bg-violet-600/10 rounded-2xl border border-violet-500/20"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            <div className={`relative z-10 p-1 rounded-xl transition-all ${isActive ? "text-violet-400 scale-110" : "text-white/40 group-hover:text-white/60"}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <span className={`relative z-10 text-[9px] font-black uppercase tracking-widest transition-all ${isActive ? "text-violet-400" : "text-white/20 group-hover:text-white/40"}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
