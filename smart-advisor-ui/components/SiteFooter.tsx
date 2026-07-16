'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function SiteFooter() {
    const pathname = usePathname();

    if (pathname?.startsWith('/admin')) {
        return null;
    }

    return (
        <footer className="relative w-full px-6 py-8 mt-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-bold uppercase tracking-widest text-[#5a6472] border-t border-[#dde3ec] bg-white/60 backdrop-blur-sm z-50">
            {/* Left: Brand & Description */}
            <div className="flex flex-col items-center md:items-start gap-2">
                <div className="flex items-center gap-2">
                    <BrandMark size="sm" showWordmark={true} />
                </div>
                <p className="text-[11px] text-[#5a6472] font-normal tracking-normal">Smart Academic Planning for MUBX Students</p>
            </div>

            {/* Center: Links */}
            <nav aria-label="Footer navigation" className="flex items-center gap-4 flex-wrap justify-center">
                <Link href="/privacy" className="hover:text-[#222d32] transition-colors pointer-events-auto">Privacy</Link>
                <div className="w-1 h-1 rounded-full bg-[#dde3ec]" />
                <Link href="/terms" className="hover:text-[#222d32] transition-colors pointer-events-auto">Terms</Link>
                <div className="w-1 h-1 rounded-full bg-[#dde3ec]" />
                <Link href="/ai-transparency" className="hover:text-[#222d32] transition-colors pointer-events-auto">AI Transparency</Link>
            </nav>

            {/* Right: Credits */}
            <div className="flex items-center gap-2">
                <span>Made with ❤️ by</span>
                <a
                    href="https://mubx.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5a6472] hover:text-[#222d32] transition-colors pointer-events-auto font-bold"
                >
                    mubx
                </a>
            </div>
        </footer>
    );
}