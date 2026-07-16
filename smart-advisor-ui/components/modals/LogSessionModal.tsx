"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayCircle, CheckCircle2, X } from "lucide-react";
import { fetchWithRetry } from "@/lib/fetch-retry";
import { useToast } from "../ui/Toast";

interface CourseOption {
    id: number;
    name: string;
    code: string;
}

interface LogSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    courses: CourseOption[];
    onSuccess: () => void;
}

export default function LogSessionModal({ isOpen, onClose, courses, onSuccess }: Readonly<LogSessionModalProps>) {
    const { toast } = useToast();
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [duration, setDuration] = useState<number>(30);
    const [sessionType, setSessionType] = useState("reading");
    const [sessionNotes, setSessionNotes] = useState("");
    const [logging, setLogging] = useState(false);

    if (!isOpen) return null;

    const handleLogSession = async () => {
        if (!selectedCourseId) {
            toast("Please select a course to log time for.", "error");
            return;
        }

        setLogging(true);
        try {
            const res = await fetchWithRetry("/api/planner/study-sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_id: Number(selectedCourseId),
                    duration_minutes: duration,
                    type: sessionType,
                    notes: sessionNotes || null
                }),
                retries: 2
            });

            if (res.ok) {
                const data = await res.json();
                toast(`Session Logged! Earned ${data.earnedXP} XP.`, "success");
                setDuration(30);
                setSessionNotes("");
                setSelectedCourseId("");
                onSuccess();
                onClose();
            } else {
                throw new Error("Failed to log session");
            }
        } catch (error) {
            console.error(error);
            toast(`Failed to log session: ${error instanceof Error ? error.message : 'Network error'}`, "error");
        } finally {
            setLogging(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => {
                        if (!logging) onClose();
                    }}
                />
                <motion.div
                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 20, opacity: 0 }}
                    className="relative w-full max-w-md bg-white border border-[#dde3ec] rounded-3xl p-6 shadow-2xl"
                >
                    <button
                        onClick={onClose}
                        disabled={logging}
                        className="absolute top-4 right-4 p-2 text-[#5a6472] hover:text-[#222d32] hover:bg-[#edf1f6] rounded-full transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#222d32]">
                        <PlayCircle className="w-5 h-5 text-blue-400" /> Log Study Session
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="course" className="text-xs uppercase font-bold text-[#5a6472] tracking-widest pl-1">Course</label>
                            <select
                                id="course"
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="w-full mt-1 bg-white border border-[#dde3ec] rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition-colors appearance-none text-[#222d32]"
                            >
                                <option value="" disabled className="bg-white text-[#5a6472]">Select a course...</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id} className="bg-white text-[#222d32]">
                                        {c.code} - {c.name}
                                    </option>
                                ))}
                            </select>
                            {courses.length === 0 && (
                                <p className="text-xs text-rose-400 mt-1 pl-1">No courses available. Please add a course first.</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="duration" className="text-xs uppercase font-bold text-[#5a6472] tracking-widest pl-1">Duration (Minutes)</label>
                            <input
                                id="duration" type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                                className="w-full mt-1 bg-white border border-[#dde3ec] rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition-colors text-[#222d32]"
                            />
                        </div>
                        <div>
                            <label htmlFor="sessionType" className="text-xs uppercase font-bold text-[#5a6472] tracking-widest pl-1">Activity Type</label>
                            <select
                                id="sessionType" value={sessionType} onChange={e => setSessionType(e.target.value)}
                                className="w-full mt-1 bg-white border border-[#dde3ec] rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition-colors appearance-none text-[#222d32]"
                            >
                                <option value="reading" className="bg-white text-[#222d32]">Reading / Lecturing</option>
                                <option value="practice" className="bg-white text-[#222d32]">Practice / Homework</option>
                                <option value="project" className="bg-white text-[#222d32]">Project Work</option>
                                <option value="review" className="bg-white text-[#222d32]">Exam Review</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="sessionNotes" className="text-xs uppercase font-bold text-[#5a6472] tracking-widest pl-1">Optional Notes</label>
                            <textarea
                                id="sessionNotes" value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} rows={2}
                                placeholder="What did you focus on?"
                                className="w-full mt-1 bg-white border border-[#dde3ec] rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition-colors resize-none text-[#222d32] placeholder-[#5a6472]/60"
                            />
                        </div>
                        <button
                            onClick={handleLogSession} disabled={logging || courses.length === 0}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
                        >
                            {logging ? 'Logging...' : 'Log Study Time'}
                            {!logging && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
