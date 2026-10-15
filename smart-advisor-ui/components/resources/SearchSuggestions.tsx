"use client";

import React from "react";
import { BookOpen, FileText, Clock } from "lucide-react";
import Highlight from "./Highlight";

export type SuggestionKind = "course" | "resource" | "recent";

export interface SuggestionItem {
    /** Stable unique key for the row. */
    key: string;
    kind: SuggestionKind;
    /** Primary line (already human-readable). */
    label: string;
    /** Optional secondary line. */
    sublabel?: string;
    /** Query text to populate when picked. */
    query: string;
    /** When set, picking this selects the course instead of a free-text query. */
    courseCode?: string;
}

interface SearchSuggestionsProps {
    items: SuggestionItem[];
    activeIndex: number;
    query: string;
    onHover: (index: number) => void;
    onSelect: (item: SuggestionItem) => void;
}

const SECTION_LABELS: Record<SuggestionKind, string> = {
    course: "Courses",
    resource: "Resources",
    recent: "Recent searches",
};

const SECTION_ICONS: Record<SuggestionKind, typeof BookOpen> = {
    course: BookOpen,
    resource: FileText,
    recent: Clock,
};

/** YouTube-style live suggestions dropdown for the resources search bar. */
export default function SearchSuggestions({
    items,
    activeIndex,
    query,
    onHover,
    onSelect,
}: Readonly<SearchSuggestionsProps>) {
    if (items.length === 0) return null;

    let lastKind: SuggestionKind | null = null;

    return (
        <div className="absolute left-0 right-0 top-full mt-2 z-50" role="listbox" aria-label="Search suggestions">
            <div className="bg-white border border-[#dde3ec] rounded-xl shadow-xl overflow-hidden max-h-[60dvh] overflow-y-auto">
                {items.map((item, index) => {
                    const showHeader = item.kind !== lastKind;
                    lastKind = item.kind;
                    const Icon = SECTION_ICONS[item.kind];
                    const isActive = index === activeIndex;

                    return (
                        <React.Fragment key={item.key}>
                            {showHeader && (
                                <div className="px-3 pt-2.5 pb-1 text-[10px] font-black uppercase tracking-wider text-[#5a6472]">
                                    {SECTION_LABELS[item.kind]}
                                </div>
                            )}
                            <button
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                onMouseEnter={() => onHover(index)}
                                onMouseDown={(e) => {
                                    // Prevent the input from blurring before the click registers.
                                    e.preventDefault();
                                    onSelect(item);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                                    isActive ? "bg-[#edf1f6]" : "hover:bg-[#edf1f6]/60"
                                }`}
                            >
                                <span className="w-7 h-7 rounded-lg bg-[#edf1f6] flex items-center justify-center shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-[#5a6472]" />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm text-[#222d32] truncate">
                                        <Highlight text={item.label} query={item.kind === "recent" ? "" : query} />
                                    </span>
                                    {item.sublabel && (
                                        <span className="block text-[11px] text-[#5a6472] truncate">
                                            {item.sublabel}
                                        </span>
                                    )}
                                </span>
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
