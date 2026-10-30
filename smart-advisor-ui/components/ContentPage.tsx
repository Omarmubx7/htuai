import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import SiteFooter from "@/components/SiteFooter";

interface ContentPageProps {
    eyebrow?: string;
    title: string;
    lede?: string;
    children: React.ReactNode;
    width?: "default" | "wide";
}

/**
 * Shared chrome for the public, crawlable content pages
 * (/about, /faq, /courses, /majors, /gpa-calculator, ...).
 * Keeps headings, spacing and footer identical across pages.
 */
export default function ContentPage({
    eyebrow,
    title,
    lede,
    children,
    width = "default",
}: Readonly<ContentPageProps>) {
    const maxWidth = width === "wide" ? "max-w-6xl" : "max-w-4xl";

    return (
        <div className="min-h-screen bg-[#edf1f6] text-[#222d32] selection:bg-[#dc4835]/20 font-sans flex flex-col">
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none mesh-gradient" />

            <main className={`${maxWidth} mx-auto w-full px-6 py-16 relative z-10 flex-1`}>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#5a6472] hover:text-[#222d32] transition-colors mb-10 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to MUBXAI
                </Link>

                <header className="space-y-4 mb-12">
                    <div className="flex items-center gap-4">
                        <BrandMark size="lg" />
                        {eyebrow && (
                            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-[#dc4835]">
                                {eyebrow}
                            </span>
                        )}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#222d32]">
                        {title}
                    </h1>
                    {lede && (
                        <p className="max-w-3xl text-base font-medium leading-relaxed text-[#5a6472]">
                            {lede}
                        </p>
                    )}
                </header>

                <div className="space-y-14 text-[#222d32]/85 leading-relaxed font-medium">
                    {children}
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
