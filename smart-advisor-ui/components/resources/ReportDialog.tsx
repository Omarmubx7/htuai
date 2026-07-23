"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { ResourceItem } from "./ResourceCard";

const REASONS = [
    { value: "broken_link", label: "Broken link" },
    { value: "wrong_course", label: "Wrong course" },
    { value: "inappropriate", label: "Inappropriate" },
];

interface ReportDialogProps {
    resource: ResourceItem | null;
    onClose: () => void;
}

export default function ReportDialog({ resource, onClose }: Readonly<ReportDialogProps>) {
    const [reason, setReason] = useState("");
    const [detail, setDetail] = useState("");
    const [createdBy, setCreatedBy] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();
    const dialogRef = useRef<HTMLDivElement>(null);

    // Escape key handler
    useEffect(() => {
        if (!resource) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [resource, onClose]);

    // Focus trap
    useEffect(() => {
        if (!resource || !dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) focusable[0].focus();
    }, [resource]);

    if (!resource) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!reason || !resource) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/directory/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resource_id: resource.id,
                    reason,
                    detail: detail || undefined,
                    created_by: createdBy || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit report");
            }

            toast("Report submitted. Thank you!", "success");
            onClose();
            setReason("");
            setDetail("");
            setCreatedBy("");
        } catch (err) {
            toast(err instanceof Error ? err.message : "Failed to submit report", "error");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                onClick={onClose}
                role="dialog"
                aria-modal="true"
                aria-label="Report resource"
            >
                <motion.div
                    ref={dialogRef}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#dc4835]/10 flex items-center justify-center">
                                <Flag className="w-4 h-4 text-[#dc4835]" />
                            </div>
                            <h2 className="text-base font-bold text-[#222d32]">Report Resource</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[#edf1f6] focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 transition-all duration-200"
                            aria-label="Close dialog"
                        >
                            <X className="w-4 h-4 text-[#5a6472]" />
                        </button>
                    </div>

                    <p className="text-xs text-[#5a6472] mb-4">
                        Reporting: <span className="font-semibold text-[#222d32]">{resource.title}</span>
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3" aria-label="Report form">
                        <fieldset>
                            <legend className="text-xs font-bold text-[#222d32] mb-2">Reason *</legend>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select report reason">
                                {REASONS.map((r) => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => setReason(r.value)}
                                        role="radio"
                                        aria-checked={reason === r.value}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 ${
                                            reason === r.value
                                                ? "bg-[#dc4835] text-white border-[#dc4835] shadow-sm"
                                                : "bg-white text-[#5a6472] border-[#dde3ec] hover:border-[#dc4835]"
                                        }`}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        <div>
                            <label htmlFor="report-detail" className="text-xs font-bold text-[#222d32] mb-1 block">
                                Additional detail (optional)
                            </label>
                            <textarea
                                id="report-detail"
                                value={detail}
                                onChange={(e) => setDetail(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-[#dde3ec] text-sm text-[#222d32] placeholder:text-[#5a6472]/50 focus:outline-none focus:border-[#dc4835] focus:ring-2 focus:ring-[#dc4835]/10 resize-none transition-all duration-200"
                                placeholder="Any extra context..."
                            />
                        </div>

                        <div>
                            <label htmlFor="report-name" className="text-xs font-bold text-[#222d32] mb-1 block">
                                Your name (optional)
                            </label>
                            <input
                                id="report-name"
                                type="text"
                                value={createdBy}
                                onChange={(e) => setCreatedBy(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-[#dde3ec] text-sm text-[#222d32] placeholder:text-[#5a6472]/50 focus:outline-none focus:border-[#dc4835] focus:ring-2 focus:ring-[#dc4835]/10 transition-all duration-200"
                                placeholder="Anonymous"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!reason || submitting}
                            className="w-full py-2.5 rounded-lg bg-[#dc4835] text-white text-sm font-bold hover:bg-[#c43a2a] focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1 active:scale-[0.98]"
                            aria-label={submitting ? "Submitting report..." : "Submit report"}
                        >
                            {submitting ? "Submitting..." : "Submit Report"}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
