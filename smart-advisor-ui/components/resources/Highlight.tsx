"use client";

import React from "react";

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface HighlightProps {
    text: string;
    query: string;
    className?: string;
}

/**
 * Renders `text`, wrapping any substring that matches a search token in a soft
 * highlight. Only whole tokens (>= 2 chars) are matched, matching the search UX.
 */
export default function Highlight({ text, query, className }: Readonly<HighlightProps>) {
    const tokens = query
        .trim()
        .split(/\s+/)
        .filter((t) => t.length >= 2);

    if (tokens.length === 0) {
        return <span className={className}>{text}</span>;
    }

    const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "ig");
    const parts = text.split(pattern);
    const tokenSet = new Set(tokens.map((t) => t.toLowerCase()));

    return (
        <span className={className}>
            {parts.map((part, index) =>
                tokenSet.has(part.toLowerCase()) ? (
                    <mark
                        key={index}
                        className="bg-[#dc4835]/15 text-[#222d32] rounded px-0.5"
                    >
                        {part}
                    </mark>
                ) : (
                    <React.Fragment key={index}>{part}</React.Fragment>
                )
            )}
        </span>
    );
}
