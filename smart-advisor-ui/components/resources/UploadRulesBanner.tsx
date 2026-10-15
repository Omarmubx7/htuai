"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Check, X, ChevronDown, Info } from "lucide-react";
import { useSitePolicy } from "@/lib/use-site-policy";

const DISMISS_KEY = "mubx-resource-rules-dismissed";

interface UploadRulesBannerProps {
    /** Called when the user taps the "Upload a resource" CTA. */
    onUpload?: () => void;
}

/**
 * Collapsible rules + disclaimer shown on the Resources page.
 * Dismissible; the dismissed state is remembered in localStorage.
 */
export default function UploadRulesBanner({ onUpload }: Readonly<UploadRulesBannerProps>) {
    const policy = useSitePolicy();
    const { uploadRulesTitle, uploadRulesSubtitle, uploadRulesAllowed, uploadRulesDisallowed, uploadDisclaimer } = policy.content;
    const [hidden, setHidden] = useState(false);
    const [open, setOpen] = useState(true);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            setHidden(localStorage.getItem(DISMISS_KEY) === "1");
        } catch {
            // ignore storage access errors
        }
        setHydrated(true);
    }, []);

    function dismiss() {
        setHidden(true);
        try {
            localStorage.setItem(DISMISS_KEY, "1");
        } catch {
            // ignore
        }
    }

    // Avoid a flash before we know the persisted state.
    if (!hydrated) return null;

    if (hidden) {
        return (
            <button
                type="button"
                onClick={() => setHidden(false)}
                className="inline-flex items-center gap-2 text-[11px] font-bold text-[#5a6472] hover:text-[#dc4835] transition-colors mb-3"
            >
                <ShieldAlert className="w-3.5 h-3.5" />
                {uploadRulesTitle}
            </button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white border border-[#dde3ec] rounded-xl shadow-sm mb-4 overflow-hidden"
            role="note"
            aria-label="Upload rules and disclaimer"
        >
            <div className="flex items-center gap-3 p-3.5 sm:p-4">
                <div className="w-9 h-9 rounded-lg bg-[#dc4835]/10 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4.5 h-4.5 text-[#dc4835]" />
                </div>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="flex-1 min-w-0 text-left"
                    aria-expanded={open}
                >
                    <p className="text-sm font-bold text-[#222d32] leading-tight">
                        {uploadRulesTitle}
                    </p>
                    <p className="text-[11px] text-[#5a6472] leading-snug mt-0.5">
                        {uploadRulesSubtitle}
                    </p>
                </button>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="p-2 rounded-lg text-[#5a6472] hover:bg-[#edf1f6] transition-colors shrink-0"
                    aria-label={open ? "Collapse upload rules" : "Expand upload rules"}
                >
                    <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="block">
                        <ChevronDown className="w-4 h-4" />
                    </motion.span>
                </button>
                <button
                    type="button"
                    onClick={dismiss}
                    className="p-2 rounded-lg text-[#5a6472] hover:bg-[#edf1f6] transition-colors shrink-0"
                    aria-label="Dismiss upload rules"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3.5 sm:px-4 pb-4 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border border-[#0da55a]/25 bg-[#0da55a]/5 p-3">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-[#0da55a] mb-2 flex items-center gap-1.5">
                                        <Check className="w-3.5 h-3.5" /> Do upload
                                    </p>
                                    <ul className="space-y-1.5">
                                        {uploadRulesAllowed.map((line) => (
                                            <li key={line} className="flex items-start gap-1.5 text-[11px] text-[#222d32]/80 leading-snug">
                                                <Check className="w-3 h-3 text-[#0da55a] mt-0.5 shrink-0" />
                                                <span>{line}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="rounded-lg border border-[#dc4835]/25 bg-[#dc4835]/5 p-3">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-[#dc4835] mb-2 flex items-center gap-1.5">
                                        <X className="w-3.5 h-3.5" /> Don&apos;t upload
                                    </p>
                                    <ul className="space-y-1.5">
                                        {uploadRulesDisallowed.map((line) => (
                                            <li key={line} className="flex items-start gap-1.5 text-[11px] text-[#222d32]/80 leading-snug">
                                                <X className="w-3 h-3 text-[#dc4835] mt-0.5 shrink-0" />
                                                <span>{line}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 rounded-lg border border-[#f39c14]/30 bg-[#f39c14]/10 p-3">
                                <Info className="w-3.5 h-3.5 text-[#f39c14] mt-0.5 shrink-0" />
                                <p className="text-[11px] text-[#222d32]/80 leading-snug">
                                    {uploadDisclaimer}
                                </p>
                            </div>

                            {onUpload && (
                                <button
                                    type="button"
                                    onClick={onUpload}
                                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#dc4835] text-white text-xs font-bold hover:bg-[#c43a2a] focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 transition-all active:scale-[0.98]"
                                >
                                    I understand — upload a resource
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
