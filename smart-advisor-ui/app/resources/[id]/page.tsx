import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Upload, FileText, Video, Link2, Image as ImageIcon, Folder, HelpCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TYPE_META: Record<string, { label: string; color: string; icon: typeof FileText }> = {
    pdf: { label: "PDF", color: "#dc4835", icon: FileText },
    video: { label: "Video", color: "#43aad7", icon: Video },
    link: { label: "Link", color: "#0da55a", icon: Link2 },
    image: { label: "Image", color: "#c249a8", icon: ImageIcon },
    folder: { label: "Folder", color: "#f39c14", icon: Folder },
    other: { label: "Other", color: "#5a6472", icon: HelpCircle },
};

const BASE_URL = "https://ai.mubx.dev";

async function getResource(id: string) {
    const resourceId = parseInt(id, 10);
    if (isNaN(resourceId)) return null;

    try {
        return await prisma.resource.findUnique({
            where: { id: resourceId },
            select: {
                id: true,
                course_code: true,
                title: true,
                type: true,
                url: true,
                description: true,
                uploaded_by: true,
                semester: true,
                report_count: true,
                created_at: true,
            },
        });
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const resource = await getResource(id);

    if (!resource) {
        return { title: "Resource not found | MubxAI" };
    }

    const typeLabel = TYPE_META[resource.type]?.label || "Resource";
    const description = resource.description
        ? `${resource.description} — shared on MubxAI`
        : `${typeLabel} for ${resource.course_code}, shared by a MUBX student on MubxAI. Don't gatekeep — help your classmates!`;

    return {
        title: `${resource.title} — ${resource.course_code} | MubxAI`,
        description,
        openGraph: {
            title: resource.title,
            description,
            url: `${BASE_URL}/resources/${resource.id}`,
            siteName: "MubxAI",
            type: "article",
        },
        twitter: {
            card: "summary_large_image",
            title: resource.title,
            description,
        },
    };
}

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const resource = await getResource(id);

    if (!resource) {
        notFound();
    }

    const meta = TYPE_META[resource.type] || TYPE_META.other;
    const Icon = meta.icon;

    return (
        <main className="min-h-dvh bg-[#edf1f6] flex flex-col">
            <header className="w-full border-b border-[#dde3ec] bg-white/80 backdrop-blur-xl">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
                    <Link
                        href="/resources"
                        className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#edf1f6] hover:bg-[#dde3ec] text-[#5a6472] hover:text-[#222d32] transition-all duration-200"
                        aria-label="Back to resources"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <span className="text-sm font-black text-[#dc4835] tracking-tight">MubxAI</span>
                    <span className="text-xs text-[#5a6472] font-semibold">Resources</span>
                </div>
            </header>

            <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8">
                <article className="bg-white rounded-2xl border border-[#dde3ec] shadow-sm p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                        <div
                            className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${meta.color}12` }}
                        >
                            <Icon className="w-7 h-7" style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-black text-[#222d32] leading-tight break-words [overflow-wrap:anywhere]">{resource.title}</h1>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                                    style={{ backgroundColor: meta.color }}
                                >
                                    {meta.label}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#222d32]/8 text-[#222d32]">
                                    {resource.course_code}
                                </span>
                                {resource.semester && (
                                    <span className="text-[11px] font-semibold text-[#5a6472]">{resource.semester}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {resource.description && (
                        <p className="text-sm text-[#5a6472] leading-relaxed mt-5">{resource.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-5 pt-5 border-t border-[#dde3ec]/60">
                        <span className="text-[11px] text-[#92604c] font-medium">
                            {resource.uploaded_by ? `by ${resource.uploaded_by}` : "by Anonymous"}
                        </span>
                    </div>

                    <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#dc4835] text-white text-sm font-bold hover:bg-[#c43a2a] focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98] shadow-sm"
                    >
                        {resource.type === "link" ? "Open link" : `Open ${meta.label}`}
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </article>

                <div className="mt-6 bg-[#222d32] rounded-2xl p-6 text-center">
                    <p className="text-base font-black text-white">Found this useful?</p>
                    <p className="text-sm text-[#c7ced6] mt-1.5">
                        Don't gatekeep. Help your classmates — upload your own files on MubxAI.
                    </p>
                    <Link
                        href="/resources"
                        className="mt-4 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#dc4835] text-white text-sm font-bold hover:bg-[#c43a2a] transition-all duration-200 active:scale-[0.98]"
                    >
                        <Upload className="w-4 h-4" />
                        Upload a resource
                    </Link>
                </div>
            </div>
        </main>
    );
}
