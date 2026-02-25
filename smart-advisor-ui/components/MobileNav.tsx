"use client";

import React from "react";
import { motion } from "framer-motion";
import { Home, CalendarDays, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

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
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-70 px-6 pb-6 pt-2 bg-linear-to-t from-[var(--background)] via-[var(--background)]/90 to-transparent pointer-events-none">
            <div className="premium-card rounded-3xl flex items-center justify-around p-2 pointer-events-auto">
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

                            <span className={`relative z-10 text-[9px] font-black uppercase tracking-widest transition-all ${isActive ? "text-violet-500" : "text-[var(--foreground)]/40 group-hover:text-[var(--foreground)]/60"}`}>
                                {item.label}
                            </span>
                            <div className={`relative z-10 p-1 rounded-xl transition-all ${isActive ? "text-violet-500 scale-110" : "text-[var(--foreground)]/50 group-hover:text-[var(--foreground)]/70"}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
