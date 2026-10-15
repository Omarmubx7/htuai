"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    GraduationCap,
    Eye,
    Zap,
    Shield,
    Terminal,
    Settings2,
    Menu,
    X,
    ExternalLink,
    LayoutDashboard,
    Users,
    FileText,
    BookOpen,
} from "lucide-react";

type NavItem = {
    label: string;
    /** Route the item points at. */
    href: string;
    icon: ReactNode;
    /** For dashboard tabs, the `?tab=` value that marks this item active. */
    tab?: string;
};

const PRIMARY_NAV: NavItem[] = [
    { label: "Overview", href: "/admin/dashboard?tab=overview", icon: <LayoutDashboard className="w-4 h-4" />, tab: "overview" },
    { label: "Students", href: "/admin/dashboard?tab=students", icon: <GraduationCap className="w-4 h-4" />, tab: "students" },
    { label: "Visitors", href: "/admin/dashboard?tab=visitors", icon: <Eye className="w-4 h-4" />, tab: "visitors" },
    { label: "AI Usage", href: "/admin/dashboard?tab=ai-usage", icon: <Zap className="w-4 h-4" />, tab: "ai-usage" },
    { label: "Logs", href: "/admin/dashboard?tab=logs", icon: <Terminal className="w-4 h-4" />, tab: "logs" },
];

const MODERATION_NAV: NavItem[] = [
    { label: "Resources", href: "/admin/dashboard?tab=resources", icon: <Shield className="w-4 h-4" />, tab: "resources" },
];

const MANAGEMENT_NAV: NavItem[] = [
    { label: "Users", href: "/admin/dashboard?tab=users", icon: <Users className="w-4 h-4" />, tab: "users" },
    { label: "Content", href: "/admin/dashboard?tab=content", icon: <FileText className="w-4 h-4" />, tab: "content" },
    { label: "Curriculum", href: "/admin/dashboard?tab=curriculum", icon: <BookOpen className="w-4 h-4" />, tab: "curriculum" },
    { label: "Settings", href: "/admin/settings", icon: <Settings2 className="w-4 h-4" /> },
];

function isActive(item: NavItem, pathname: string, tab: string): boolean {
    if (item.tab) {
        return pathname === "/admin/dashboard" && tab === item.tab;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tab = searchParams.get("tab") ?? "overview";
    const [mobileOpen, setMobileOpen] = useState(false);

    const sidebar = (
        <nav className="flex h-full flex-col gap-1 p-3">
            <Link
                href="/admin/dashboard"
                className="flex items-center gap-2.5 px-3 py-3 mb-2 rounded-xl hover:bg-[#edf1f6] transition-colors"
                onClick={() => setMobileOpen(false)}
            >
                <Image src="/mubxai-light-logo.png" alt="MubxAI" width={28} height={28} className="rounded-lg" />
                <div className="leading-tight">
                    <p className="text-sm font-black text-[#222d32]">MubxAI</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#dc4835]">Admin</p>
                </div>
            </Link>

            <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-[#5a6472]">Insights</p>
            {PRIMARY_NAV.map((item) => {
                const active = isActive(item, pathname, tab);
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                            active
                                ? "bg-[#dc4835]/10 text-[#dc4835]"
                                : "text-[#5a6472] hover:bg-[#edf1f6] hover:text-[#222d32]"
                        }`}
                    >
                        {active && (
                            <motion.span
                                layoutId="admin-nav-active"
                                className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-[#dc4835]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                            />
                        )}
                        {item.icon}
                        {item.label}
                    </Link>
                );
            })}

            <p className="px-3 pt-4 pb-1 text-[10px] font-black uppercase tracking-widest text-[#5a6472]">Moderation</p>
            {MODERATION_NAV.map((item) => {
                const active = isActive(item, pathname, tab);
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                            active
                                ? "bg-[#dc4835]/10 text-[#dc4835]"
                                : "text-[#5a6472] hover:bg-[#edf1f6] hover:text-[#222d32]"
                        }`}
                    >
                        {active && (
                            <motion.span
                                layoutId="admin-nav-active-mod"
                                className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-[#dc4835]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                            />
                        )}
                        {item.icon}
                        {item.label}
                    </Link>
                );
            })}

            <p className="px-3 pt-4 pb-1 text-[10px] font-black uppercase tracking-widest text-[#5a6472]">Management</p>
            {MANAGEMENT_NAV.map((item) => {
                const active = isActive(item, pathname, tab);
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                            active
                                ? "bg-[#dc4835]/10 text-[#dc4835]"
                                : "text-[#5a6472] hover:bg-[#edf1f6] hover:text-[#222d32]"
                        }`}
                    >
                        {active && (
                            <motion.span
                                layoutId="admin-nav-active-mgmt"
                                className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-[#dc4835]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                            />
                        )}
                        {item.icon}
                        {item.label}
                    </Link>
                );
            })}

            <div className="mt-auto pt-3">
                <Link
                    href="/"
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#5a6472] hover:bg-[#edf1f6] hover:text-[#222d32] transition-colors"
                >
                    <ExternalLink className="w-4 h-4" />
                    Back to site
                </Link>
            </div>
        </nav>
    );

    return (
        <div className="min-h-screen bg-[#edf1f6]">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 border-r border-[#dde3ec] bg-white">
                {sidebar}
            </aside>

            {/* Mobile top bar */}
            <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-[#dde3ec] bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                    <Image src="/mubxai-light-logo.png" alt="MubxAI" width={24} height={24} className="rounded-md" />
                    <span className="text-sm font-black text-[#222d32]">Admin</span>
                </div>
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-lg text-[#5a6472] hover:bg-[#edf1f6]"
                    aria-label="Open admin menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className="lg:hidden fixed inset-0 z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="absolute inset-0 bg-[#222d32]/40" onClick={() => setMobileOpen(false)} />
                        <motion.div
                            className="absolute inset-y-0 left-0 w-72 bg-white border-r border-[#dde3ec]"
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                        >
                            <div className="flex justify-end p-2">
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen(false)}
                                    className="p-2 rounded-lg text-[#5a6472] hover:bg-[#edf1f6]"
                                    aria-label="Close admin menu"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            {sidebar}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content */}
            <main className="lg:pl-64 min-h-screen">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</div>
            </main>
        </div>
    );
}
