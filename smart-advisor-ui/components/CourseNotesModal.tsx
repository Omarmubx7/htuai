"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { fetchWithRetry, fetchJSON } from "@/lib/fetch-retry";

const CourseNotesEditor = dynamic(() => import("./CourseNotesEditor"), {
    ssr: false,
    loading: () => (
        <div className="h-100 w-full bg-white/5 animate-pulse rounded-4xl border border-white/10 flex items-center justify-center">
            <span className="text-xs font-black uppercase tracking-widest text-white/20">Loading Editor...</span>
        </div>
    ),
});

interface CourseNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    courseTitle: string;
}

type NotesContent = Record<string, unknown> | string | null;

export default function CourseNotesModal({
    isOpen,
    onClose,
    courseId,
    courseTitle,
}: Readonly<CourseNotesModalProps>) {
    const [notes, setNotes] = useState<NotesContent>(null);
    const [loading, setLoading] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<string | undefined>();

    const loadNotes = async () => {
        setLoading(true);
        try {
            const data = await fetchJSON<{ notes: Record<string, unknown> | string | null; updatedAt?: string }>(
                `/api/courses/${courseId}/notes`,
                { retries: 2 }
            );
            setNotes(data.notes);
            setUpdatedAt(data.updatedAt);
        } catch (error) {
            console.error("Failed to load notes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && courseId) {
            loadNotes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, courseId]);

    const handleAutoSave = async (content: NotesContent) => {
        try {
            await fetchWithRetry(`/api/courses/${courseId}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: content }),
                retries: 2
            });
        } catch (error) {
            console.error("Failed to autosave notes:", error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full h-dvh sm:h-[90vh] sm:max-w-5xl bg-black sm:border sm:border-white/10 rounded-none sm:rounded-[2.5rem] overflow-hidden sm:shadow-2xl flex flex-col"
                    >
                        <div className="absolute top-6 right-8 z-50 flex items-center gap-2">
                            <Link href="/" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/40 hover:text-white" title="Back to Dashboard">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-white/20">
                                    <div className="w-12 h-12 rounded-2xl border-2 border-white/5 border-t-violet-500 animate-spin" />
                                    <span className="text-xs font-black uppercase tracking-widest">Loading your notes...</span>
                                </div>
                            ) : (
                                <CourseNotesEditor
                                    value={notes ?? "<p></p>"}
                                    courseTitle={courseTitle}
                                    onAutoSave={handleAutoSave}
                                    updatedAt={updatedAt}
                                />
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
