"use client";

import React from "react";
import { motion } from "framer-motion";
import { Home, CalendarDays, Settings2, LogOut, Bot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const NAV_ITEMS = [
    { label: "Tracker", icon: Home, href: "/" },
    { label: "Planner", icon: CalendarDays, href: "/planner" },
    { label: "Settings", icon: Settings2, href: "/planner/settings" },
];

export default function MobileNav() {
    const pathname = usePathname();
    const { status } = useSession();

    if (status !== "authenticated") {
        return null;
    }

    return (
        <nav id="wt-mobile-nav" className="sm:hidden fixed bottom-0 left-0 right-0 z-70 px-4 pb-6 pt-3 bg-white/95 backdrop-blur-2xl border-t border-[#dde3ec] shadow-lg flex justify-center">
            <div className="w-full max-w-md premium-card rounded-[2.5rem] flex items-center justify-between p-2 shadow-2xl bg-[#edf1f6] border border-[#dde3ec]">
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
                                    className="absolute inset-0 bg-[#dc4835]/10 rounded-2xl border border-[#dc4835]/20"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            <span className={`relative z-10 text-xs font-black uppercase tracking-widest transition-all ${isActive ? "text-[#dc4835]" : "text-[#5a6472] group-hover:text-[#222d32]"}`}>
                                {item.label}
                            </span>
                            <div className={`relative z-10 p-1 rounded-xl transition-all ${isActive ? "text-[#dc4835] scale-110" : "text-[#5a6472]/80 group-hover:text-[#222d32]"}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                        </Link>
                    );
                })}

                <div className="w-px h-8 bg-[#dde3ec] mx-1" />

                {/* Quick Actions */}
                <div className="flex items-center gap-1">
                    <a
                        href="https://bot.mubx.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-2xl text-[#222d32]/50 hover:text-[#5a6472] transition-all active:scale-90"
                        title="Open mubxbot"
                        aria-label="Open mubxbot"
                    >
                        <Bot className="w-5 h-5" />
                    </a>
                    <button
                        onClick={() => void signOut({ callbackUrl: '/' })}
                        className="p-3 rounded-2xl text-[#222d32]/50 hover:text-[#dc4835] transition-all active:scale-90"
                        title="Sign out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </nav>
    );
}
