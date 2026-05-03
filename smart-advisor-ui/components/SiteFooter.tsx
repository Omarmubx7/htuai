'use client';

import { usePathname } from 'next/navigation';

export default function SiteFooter() {
    const pathname = usePathname();

    if (pathname?.startsWith('/admin')) {
        return null;
    }

    return (
        <footer className="w-full px-6 py-8 mt-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-widest text-white/20 select-none border-t border-white/5 bg-black/20 backdrop-blur-sm z-50">
            <div className="flex items-center gap-4">
                <a href="/privacy" className="hover:text-white/40 transition-colors pointer-events-auto">Privacy</a>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <a href="/terms" className="hover:text-white/40 transition-colors pointer-events-auto">Terms</a>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <a href="/ai-transparency" className="hover:text-white/40 transition-colors pointer-events-auto">AI Transparency</a>
            </div>
            <div className="flex items-center gap-2">
                <span>Made with ❤️ by</span>
                <a
                    href="https://mubx.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white transition-colors pointer-events-auto"
                >
                    mubx
                </a>
            </div>
        </footer>
    );
}