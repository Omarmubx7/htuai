"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X } from "lucide-react";
import { fetchWithRetry } from "@/lib/fetch-retry";
import { useToast } from "../ui/Toast";

interface CourseOption {
    code: string;
    name: string;
    credits: number;
}

interface AddCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    semesterId: number | null;
    existingCourses?: { code: string }[];
    onSuccess: () => void;
}

export default function AddCourseModal({ isOpen, onClose, semesterId, existingCourses = [], onSuccess }: Readonly<AddCourseModalProps>) {
    const { toast } = useToast();
    const [newCourse, setNewCourse] = useState({ code: "", name: "", credits: 3 });
    const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;

        const loadCurriculum = async () => {
            try {
                const res = await fetchWithRetry("/data/curriculum.json", { retries: 2 });
                if (res.ok && isMounted) {
                    const curriculum = await res.json() as {
                        shared?: Record<string, Array<{ code?: string; name?: string; ch?: number }>>;
                        majors?: Record<string, Record<string, Array<{ code?: string; name?: string; ch?: number }>>>;
                    };
                    const uniqueCourses = new Map<string, CourseOption>();

                    const processList = (list?: Array<{ code?: string; name?: string; ch?: number }>) => {
                        if (!list) return;
                        list.forEach(c => {
                            if (c.code && c.name) {
                                uniqueCourses.set(c.code, { code: c.code, name: c.name, credits: c.ch || 3 });
                            }
                        });
                    };

                    if (curriculum.shared) {
                        processList(curriculum.shared.university_requirements);
                        processList(curriculum.shared.college_requirements);
                        processList(curriculum.shared.university_electives);
                    }

                    if (curriculum.majors) {
                        Object.values(curriculum.majors).forEach((m) => {
                            processList(m.university_requirements);
                            processList(m.college_requirements);
                            processList(m.department_requirements);
                            processList(m.electives);
                            processList(m.work_market_requirements);
                            processList(m.university_electives);
                        });
                    }
                    setAvailableCourses(Array.from(uniqueCourses.values()));
                }
            } catch (err) {
                console.error("Failed to load curriculum", err);
            }
        };
        
        if (availableCourses.length === 0) {
            loadCurriculum();
        }
        
        return () => { isMounted = false; };
    }, [isOpen, availableCourses.length]);

    if (!isOpen) return null;

    const filteredSuggestions = availableCourses.filter(c => {
        const alreadyAdded = existingCourses.some(existingCourse => 
            existingCourse.code.toUpperCase() === c.code.toUpperCase()
        );
        if (alreadyAdded) return false;
        
        return c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
               c.name.toLowerCase().includes(searchQuery.toLowerCase());
    }).slice(0, 10);

    const handleAddCourse = async () => {
        setError(null);
        if (!semesterId) {
            setError("No active semester found. Please create a semester first.");
            return;
        }

        if (!newCourse.code || !newCourse.name) {
            setError("Please provide both Course Code and Course Name.");
            return;
        }
        
        const isDuplicate = existingCourses.some(c => 
            c.code.toUpperCase() === newCourse.code.toUpperCase()
        );
        
        if (isDuplicate) {
            toast("This course is already added to the semester.", "error");
            return;
        }
        
        setIsSubmitting(true);
        try {
            const res = await fetchWithRetry("/api/planner/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    semester_id: semesterId,
                    ...newCourse
                }),
                retries: 2
            });
            if (res.ok) {
                setNewCourse({ code: "", name: "", credits: 3 });
                setSearchQuery("");
                setError(null);
                toast("Course added successfully!", "success");
                onSuccess();
                onClose();
            } else {
                const errorData = await res.json();
                setError(errorData.error || "Failed to add course.");
            }
        } catch (err) {
            setError(`Failed to add course: ${err instanceof Error ? err.message : 'Network error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => {
                        if (!isSubmitting) onClose();
                    }}
                />
                <motion.div
                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 20, opacity: 0 }}
                    className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-visible"
                >
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="absolute top-4 right-4 p-2 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h3 className="text-xl font-bold mb-4 text-white">Add Course</h3>
                    <div className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                                {error}
                            </div>
                        )}
                        <div className="relative">
                            <label htmlFor="search-db" className="text-xs uppercase text-white/50 tracking-widest font-bold pl-1">Search Course (Database)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                <input
                                    id="search-db"
                                    type="text"
                                    placeholder="Search by code or name..."
                                    value={searchQuery}
                                    onChange={e => {
                                        setSearchQuery(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
                                />
                            </div>

                            {showSuggestions && searchQuery && filteredSuggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-2 bg-zinc-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                                    {filteredSuggestions.map((c) => (
                                        <button
                                            key={c.code}
                                            type="button"
                                            className="w-full px-4 py-2 hover:bg-white/10 cursor-pointer text-sm flex justify-between items-center text-left"
                                            onClick={() => {
                                                setNewCourse({ code: c.code, name: c.name, credits: c.credits });
                                                setSearchQuery(c.name);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white/90 truncate max-w-[200px]">{c.name}</span>
                                                <span className="text-xs text-white/40">{c.code}</span>
                                            </div>
                                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-md text-white/60">{c.credits} CH</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label htmlFor="new-code" className="text-xs uppercase text-white/50 tracking-widest font-bold pl-1">Course Code</label>
                                <input
                                    id="new-code"
                                    type="text" placeholder="e.g. CS101"
                                    value={newCourse.code} onChange={e => setNewCourse({ ...newCourse, code: e.target.value })}
                                    className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-blue-500 transition-colors uppercase text-white"
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="new-credits" className="text-xs uppercase text-white/50 tracking-widest font-bold pl-1">Credits</label>
                                <select
                                    id="new-credits"
                                    value={newCourse.credits} onChange={e => setNewCourse({ ...newCourse, credits: Number(e.target.value) })}
                                    className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-blue-500 transition-colors appearance-none text-white"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(num => (
                                        <option key={num} value={num} className="bg-black text-white">{num} CH</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="new-name" className="text-xs uppercase text-white/50 tracking-widest font-bold pl-1">Course Name</label>
                            <input
                                id="new-name"
                                type="text" placeholder="e.g. Introduction to Programming"
                                value={newCourse.name} onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                                className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-blue-500 transition-colors text-white"
                            />
                        </div>

                        <button
                            onClick={handleAddCourse}
                            disabled={isSubmitting || !semesterId}
                            className="w-full mt-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Course'}
                            {!isSubmitting && <Plus className="w-4 h-4" />}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
