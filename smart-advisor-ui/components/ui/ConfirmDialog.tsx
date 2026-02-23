"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "default";
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    isOpen, title, description,
    confirmLabel = "Confirm", cancelLabel = "Cancel",
    variant = "default", onConfirm, onCancel,
}: ConfirmDialogProps) {
    const isDanger = variant === "danger";

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 10 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-sm glass-card-premium rounded-3xl border border-white/10 p-6 shadow-2xl"
                    >
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 p-1.5 rounded-xl text-white/30 hover:text-white/60 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-start gap-4 mb-6">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                isDanger ? "bg-red-500/10 text-red-400" : "bg-violet-500/10 text-violet-400"
                            }`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
                                <p className="text-xs text-white/50 leading-relaxed">{description}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white/50 hover:text-white hover:bg-white/5 transition-all"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={() => { onConfirm(); onCancel(); }}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    isDanger
                                        ? "bg-red-500/80 hover:bg-red-500 text-white"
                                        : "bg-white text-black hover:bg-white/90"
                                }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
