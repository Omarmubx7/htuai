"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Link from "next/link";

interface MobileHeaderProps {
    title?: string;
    showBack?: boolean;
    backHref?: string;
}

export default function MobileHeader({ title, showBack = false, backHref }: Readonly<MobileHeaderProps>) {
    const pathname = usePathname();
    const router = useRouter();
    const { status } = useSession();

    // Hide on login/landing pages
    if (pathname === "/" && status === "unauthenticated") {
        return null;
    }

    // Hide on admin pages
    if (pathname?.startsWith("/admin")) {
        return null;
    }

    // Only show on small screens
    return (
        <div className="sm:hidden fixed top-0 left-0 right-0 z-60 bg-white/90 backdrop-blur-xl border-b border-[#dde3ec] shadow-xs">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
                {showBack ? (
                    <button
                        onClick={() => {
                            if (backHref) {
                                router.push(backHref);
                            } else {
                                router.back();
                            }
                        }}
                        className="p-2 hover:bg-[#edf1f6] rounded-lg transition-colors"
                        title="Go back"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-5 h-5 text-[#222d32]" />
                    </button>
                ) : (
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <BrandMark size="sm" />
                    </Link>
                )}

                {title && (
                    <h1 className="flex-1 text-sm font-bold text-[#222d32] truncate text-center">{title}</h1>
                )}

                {!showBack && !title && (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-xs font-black tracking-[0.2em] uppercase text-[#222d32]">MUBXAI</span>
                    </div>
                )}

                <div className="w-8" /> {/* Spacer for balance */}
            </div>
        </div>
    );
}
