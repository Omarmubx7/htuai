"use client";

import { ExternalLink, FileText, Video, Link2, Image, Folder, HelpCircle, Flag, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string; label: string }> = {
    pdf: { icon: FileText, color: "#dc4835", label: "PDF" },
    video: { icon: Video, color: "#43aad7", label: "Video" },
    link: { icon: Link2, color: "#0da55a", label: "Link" },
    image: { icon: Image, color: "#c249a8", label: "Image" },
    folder: { icon: Folder, color: "#f39c14", label: "Folder" },
    other: { icon: HelpCircle, color: "#5a6472", label: "Other" },
};

export interface ResourceItem {
    id: number;
    course_code: string;
    title: string;
    type: string;
    url: string;
    file_path: string | null;
    description: string | null;
    uploaded_by: string | null;
    semester: string | null;
    report_count: number;
    created_at: string;
}

interface ResourceCardProps {
    resource: ResourceItem;
    onReport: (resource: ResourceItem) => void;
    onDelete?: (resource: ResourceItem) => void;
    isOwner?: boolean;
    courseNameMap?: Record<string, string>;
    majorLabels?: string[];
}

const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export default function ResourceCard({ resource, onReport, onDelete, isOwner, courseNameMap, majorLabels }: Readonly<ResourceCardProps>) {
    const config = TYPE_CONFIG[resource.type] || TYPE_CONFIG.other;
    const Icon = config.icon;
    const courseLabel = courseNameMap?.[resource.course_code] || resource.course_code;

    return (
        <motion.article
            variants={cardVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="premium-card rounded-xl p-4 sm:p-5 flex flex-col gap-3 group focus-within:ring-2 focus-within:ring-[#dc4835]/20 focus-within:ring-offset-2"
            aria-label={`${resource.title} — ${config.label}${resource.description ? ` — ${resource.description}` : ""}`}
        >
            <div className="flex items-start gap-3">
                <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{ backgroundColor: `${config.color}12` }}
                >
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#222d32] truncate leading-tight">{resource.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                            style={{ backgroundColor: config.color }}
                            aria-label={`Type: ${config.label}`}
                        >
                            {config.label}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#222d32]/8 text-[#222d32]">
                            {courseLabel}
                        </span>
                        {resource.semester && (
                            <span className="text-[11px] font-semibold text-[#5a6472]">
                                {resource.semester}
                            </span>
                        )}
                    </div>
                    {majorLabels && majorLabels.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {majorLabels.slice(0, 3).map((major) => (
                                <span
                                    key={major}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide bg-[#43aad7]/10 text-[#43aad7]"
                                >
                                    {major}
                                </span>
                            ))}
                            {majorLabels.length > 3 && (
                                <span className="text-[9px] font-bold text-[#5a6472]">
                                    +{majorLabels.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {resource.description && (
                <p className="text-xs text-[#5a6472] line-clamp-2 leading-relaxed">
                    {resource.description}
                </p>
            )}

            <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-[#dde3ec]/60">
                <div className="flex items-center gap-3">
                    {resource.uploaded_by && (
                        <span className="text-[11px] text-[#92604c] font-medium">
                            by {resource.uploaded_by}
                        </span>
                    )}
                    {resource.report_count > 0 && (
                        <span className="text-[11px] text-[#dc4835] font-semibold" aria-label={`${resource.report_count} reports`}>
                            {resource.report_count} report{resource.report_count > 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {isOwner && onDelete && (
                        <button
                            onClick={() => onDelete(resource)}
                            className="p-2 rounded-lg text-[#5a6472]/40 hover:text-[#dc4835] hover:bg-[#dc4835]/10 focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 transition-all duration-200"
                            title="Delete resource"
                            aria-label={`Delete ${resource.title}`}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}

                    <button
                        onClick={() => onReport(resource)}
                        className="p-2 rounded-lg text-[#5a6472]/40 hover:text-[#dc4835] hover:bg-[#dc4835]/10 focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 transition-all duration-200"
                        title="Report resource"
                        aria-label={`Report ${resource.title}`}
                    >
                        <Flag className="w-3.5 h-3.5" />
                    </button>

                    <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#dc4835] text-white text-xs font-bold hover:bg-[#c43a2a] focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 focus:ring-offset-1 transition-all duration-200 active:scale-95"
                        aria-label={`Open ${resource.title} in new tab`}
                    >
                        Open
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </motion.article>
    );
}
