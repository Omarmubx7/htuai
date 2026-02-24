"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import CourseNotesEditor from "./CourseNotesEditor";
import { useState, useEffect } from "react";

interface CourseNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    courseTitle: string;
    studentId: string;
}

export default function CourseNotesModal({
    isOpen,
    onClose,
    courseId,
    courseTitle,
    studentId
}: CourseNotesModalProps) {
    const [notes, setNotes] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<string | undefined>();

    useEffect(() => {
        if (isOpen && courseId) {
            loadNotes();
        }
    }, [isOpen, courseId]);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/courses/${courseId}/notes`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data.notes);
                setUpdatedAt(data.updatedAt);
            }
        } catch (e) {
            console.error("Failed to load notes:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoSave = async (content: any) => {
        try {
            await fetch(`/api/courses/${courseId}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: content }),
            });
        } catch (e) {
            console.error("Failed to autosave notes:", e);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
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
                        className="relative w-full max-w-5xl h-[90vh] bg-black border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-8 z-50 p-2 rounded-full bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-white/20">
                                    <div className="w-12 h-12 rounded-2xl border-2 border-white/5 border-t-violet-500 animate-spin" />
                                    <span className="text-xs font-black uppercase tracking-widest">Loading Records...</span>
                                </div>
                            ) : (
                                <CourseNotesEditor
                                    value={notes}
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
