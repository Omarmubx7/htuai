"use client";

import { FileText, Video, Link2, Image, Folder, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const FILTERS = [
    { key: "all", label: "All", icon: null, color: "#222d32" },
    { key: "pdf", label: "PDF", icon: FileText, color: "#dc4835" },
    { key: "video", label: "Video", icon: Video, color: "#43aad7" },
    { key: "link", label: "Link", icon: Link2, color: "#0da55a" },
    { key: "image", label: "Image", icon: Image, color: "#c249a8" },
    { key: "folder", label: "Folder", icon: Folder, color: "#f39c14" },
    { key: "other", label: "Other", icon: HelpCircle, color: "#5a6472" },
];

interface ResourceFiltersProps {
    active: string;
    onChange: (type: string) => void;
    counts?: Record<string, number>;
}

export default function ResourceFilters({ active, onChange, counts }: Readonly<ResourceFiltersProps>) {
    return (
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide" role="tablist" aria-label="Filter by resource type">
            {FILTERS.map((f) => {
                const isActive = active === f.key;
                const count = f.key === "all" ? undefined : counts?.[f.key];
                const Icon = f.icon;
                const hasContent = f.key === "all" || (count !== undefined && count > 0);

                return (
                    <motion.button
                        key={f.key}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onChange(f.key)}
                        role="tab"
                        aria-selected={isActive}
                        aria-disabled={!hasContent}
                        tabIndex={hasContent ? 0 : -1}
                        className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                            !hasContent ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                        style={{
                            backgroundColor: isActive ? f.color : "white",
                            borderColor: isActive ? f.color : "#dde3ec",
                            color: isActive ? "#ffffff" : "#5a6472",
                            boxShadow: isActive ? `0 2px 8px ${f.color}25` : "none",
                        }}
                    >
                        {Icon && <Icon className="w-3 h-3" />}
                        {f.label}
                        {count !== undefined && count > 0 && (
                            <span
                                className="ml-0.5 text-[10px] rounded-full px-1 py-px font-bold"
                                style={{
                                    backgroundColor: isActive ? "rgba(255,255,255,0.2)" : `${f.color}15`,
                                    color: isActive ? "#ffffff" : f.color,
                                }}
                            >
                                {count}
                            </span>
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
