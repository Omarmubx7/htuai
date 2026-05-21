"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, X, Plus, Trash2, GraduationCap, TrendingUp, BookOpen } from "lucide-react";
import { gradeToPoints } from "@/lib/grading";

interface GpaCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPreviousGpa?: number | null;
    initialPreviousCredits?: number | null;
}

interface CourseRow {
    id: string;
    name: string;
    credits: string;
    grade: string;
}

export default function GpaCalculatorModal({
    isOpen,
    onClose,
    initialPreviousGpa,
    initialPreviousCredits
}: Readonly<GpaCalculatorModalProps>) {
    const [prevGpa, setPrevGpa] = useState<string>(initialPreviousGpa ? initialPreviousGpa.toString() : "");
    const [prevCredits, setPrevCredits] = useState<string>(initialPreviousCredits ? initialPreviousCredits.toString() : "");
    const [courses, setCourses] = useState<CourseRow[]>([
        { id: "1", name: "", credits: "", grade: "" },
        { id: "2", name: "", credits: "", grade: "" },
        { id: "3", name: "", credits: "", grade: "" },
        { id: "4", name: "", credits: "", grade: "" },
    ]);

    // Update state if props change when opening
    useEffect(() => {
        if (isOpen) {
            setPrevGpa(initialPreviousGpa ? initialPreviousGpa.toString() : "");
            setPrevCredits(initialPreviousCredits ? initialPreviousCredits.toString() : "");
        }
    }, [isOpen, initialPreviousGpa, initialPreviousCredits]);

    const addRow = () => {
        setCourses([...courses, { id: Date.now().toString() + Math.random().toString(36).substring(7), name: "", credits: "", grade: "" }]);
    };

    const removeRow = (id: string) => {
        setCourses(courses.filter(c => c.id !== id));
    };

    const updateRow = (id: string, field: keyof CourseRow, value: string) => {
        setCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const { semesterGpa, semesterCredits, cumulativeGpa, cumulativeCredits } = useMemo(() => {
        let semPts = 0;
        let semCr = 0;

        courses.forEach(c => {
            const cr = parseFloat(c.credits);
            if (!isNaN(cr) && cr > 0 && c.grade) {
                semPts += gradeToPoints(c.grade) * cr;
                semCr += cr;
            }
        });

        const sGpa = semCr > 0 ? semPts / semCr : 0;

        const pGpa = parseFloat(prevGpa);
        const pCr = parseFloat(prevCredits);

        let cumPts = semPts;
        let cumCr = semCr;

        if (!isNaN(pGpa) && !isNaN(pCr) && pCr >= 0) {
            cumPts += pGpa * pCr;
            cumCr += pCr;
        }

        const cGpa = cumCr > 0 ? cumPts / cumCr : 0;

        return {
            semesterGpa: sGpa,
            semesterCredits: semCr,
            cumulativeGpa: cGpa,
            cumulativeCredits: cumCr
        };
    }, [courses, prevGpa, prevCredits]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <button
                type="button"
                className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-default"
                onClick={onClose}
                aria-label="Close modal"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl max-h-[90vh] bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                            <Calculator className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight">GPA Calculator</h2>
                            <p className="text-xs text-white/50 font-medium">Estimate your Semester and Cumulative GPA</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8 min-h-0">
                    
                    {/* Previous GPA Section */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="w-4 h-4 text-violet-400" />
                            <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest">Previous Academic History</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1.5">Cumulative GPA</label>
                                <input
                                    type="number" step="0.01" min="0" max="4.0"
                                    value={prevGpa} onChange={e => setPrevGpa(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:border-violet-500 transition-colors"
                                    placeholder="e.g. 3.45"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1.5">Total Credits</label>
                                <input
                                    type="number" step="1" min="0"
                                    value={prevCredits} onChange={e => setPrevCredits(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:border-violet-500 transition-colors"
                                    placeholder="e.g. 45"
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-white/40 italic">Leave these blank if you only want to calculate your semester GPA.</p>
                    </section>

                    {/* Current Semester Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest">Current Semester</h3>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 px-2 hidden sm:grid">
                                <div className="col-span-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Course Name (Optional)</div>
                                <div className="col-span-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">Credits</div>
                                <div className="col-span-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">Grade</div>
                            </div>
                            <AnimatePresence initial={false}>
                                {courses.map((course) => (
                                    <motion.div
                                        key={course.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white/2 p-3 sm:p-2 rounded-2xl sm:rounded-xl border border-white/5"
                                    >
                                        <div className="sm:col-span-5">
                                            <label className="sm:hidden block text-[10px] font-bold text-white/40 uppercase mb-1">Course Name</label>
                                            <input
                                                type="text"
                                                value={course.name} onChange={e => updateRow(course.id, "name", e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-violet-500 transition-colors"
                                                placeholder="Course Name..."
                                            />
                                        </div>
                                        <div className="sm:col-span-3">
                                            <label className="sm:hidden block text-[10px] font-bold text-white/40 uppercase mb-1 mt-2">Credits</label>
                                            <select
                                                value={course.credits} onChange={e => updateRow(course.id, "credits", e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-violet-500 transition-colors"
                                            >
                                                <option value="" disabled>Select CH...</option>
                                                {[1, 2, 3, 4, 5, 6].map(num => (
                                                    <option key={num} value={num.toString()}>{num} CH</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="sm:col-span-3">
                                            <label className="sm:hidden block text-[10px] font-bold text-white/40 uppercase mb-1 mt-2">Grade</label>
                                            <select
                                                value={course.grade} onChange={e => updateRow(course.id, "grade", e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-violet-500 transition-colors"
                                            >
                                                <option value="" disabled>Grade...</option>
                                                <option value="D">D (4.0)</option>
                                                <option value="M">M (3.2)</option>
                                                <option value="P">P (2.4)</option>
                                                <option value="U">U (1.6)</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-1 flex justify-end sm:justify-center mt-2 sm:mt-0">
                                            <button
                                                onClick={() => removeRow(course.id)}
                                                className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                                title="Remove Course"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            <button
                                onClick={addRow}
                                className="w-full py-3 mt-2 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                            >
                                <Plus className="w-4 h-4" /> Add Course
                            </button>
                        </div>
                    </section>
                </div>

                {/* Footer Results */}
                <div className="p-5 sm:p-6 border-t border-white/10 bg-white/5 shrink-0 grid grid-cols-2 gap-4">
                    <div className="glass-card p-4 rounded-2xl bg-black/40 border border-white/10">
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3" /> Semester GPA
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">{semesterGpa.toFixed(2)}</span>
                            <span className="text-xs text-white/40 font-medium">/ 4.0</span>
                        </div>
                        <div className="text-[11px] text-white/40 mt-1">{semesterCredits} Credits this term</div>
                    </div>
                    <div className="glass-card p-4 rounded-2xl bg-violet-600/10 border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingUp className="w-12 h-12 text-violet-400" />
                        </div>
                        <div className="relative z-10">
                            <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3" /> Cumulative GPA
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white">{cumulativeGpa.toFixed(2)}</span>
                                <span className="text-xs text-white/40 font-medium">/ 4.0</span>
                            </div>
                            <div className="text-[11px] text-violet-300/50 mt-1">{cumulativeCredits} Total Credits</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
