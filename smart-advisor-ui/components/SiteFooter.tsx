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
        <footer className="relative w-full px-6 py-8 mt-auto flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] font-bold uppercase tracking-widest text-white/50 border-t border-white/5 bg-black/20 backdrop-blur-sm z-50">
            {/* Left: Brand & Description */}
            <div className="flex flex-col items-center md:items-start gap-2">
                <div className="flex items-center gap-2">
                    <BrandMark size="sm" showWordmark={true} />
                </div>
                <p className="text-[9px] text-white/30 font-normal tracking-normal">Smart Academic Planning for MUBX Students</p>
            </div>

            {/* Center: Links */}
            <nav aria-label="Footer navigation" className="flex items-center gap-4 flex-wrap justify-center">
                <Link href="/privacy" className="hover:text-white/80 transition-colors pointer-events-auto">Privacy</Link>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <Link href="/terms" className="hover:text-white/80 transition-colors pointer-events-auto">Terms</Link>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <Link href="/ai-transparency" className="hover:text-white/80 transition-colors pointer-events-auto">AI Transparency</Link>
            </nav>

            {/* Right: Credits */}
            <div className="flex items-center gap-2">
                <span>Made with ❤️ by</span>
                <a
                    href="https://mubx.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white transition-colors pointer-events-auto font-bold"
                >
                    mubx
                </a>
            </div>
        </footer>
    );
}