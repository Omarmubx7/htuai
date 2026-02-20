"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronRight, Check, AlertCircle, Sparkles } from "lucide-react";
import { PlannerCourse } from "@/app/planner/page";

interface PlannerSetupProps {
    onComplete: (courses: PlannerCourse[]) => void;
}

export default function PlannerSetup({ onComplete }: PlannerSetupProps) {
    const [step, setStep] = useState(1);
    const [inputList, setInputList] = useState<string[]>([""]);
    const [courses, setCourses] = useState<PlannerCourse[]>([]);

    // Autocomplete state
    const [allAvailableCourses, setAllAvailableCourses] = useState<{ name: string, code: string, ch: number }[]>([]);
    const [suggestions, setSuggestions] = useState<{ name: string, code: string, ch: number }[]>([]);
    const [activeInput, setActiveInput] = useState<number | null>(null);

    useEffect(() => {
        fetch("/api/courses")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAllAvailableCourses(data);
            })
            .catch(console.error);
    }, []);

    const addInput = () => {
        setInputList([...inputList, ""]);
        setSuggestions([]);
    };

    const removeInput = (index: number) => {
        const next = [...inputList];
        next.splice(index, 1);
        setInputList(next);
        setSuggestions([]);
    };

    const handleInputChange = (index: number, value: string) => {
        const next = [...inputList];
        next[index] = value;
        setInputList(next);
        setActiveInput(index);

        if (value.length > 1) {
            const searchTerm = value.toLowerCase();
            const filtered = allAvailableCourses.filter(c =>
                c.name.toLowerCase().includes(searchTerm) ||
                c.code.includes(value)
            );

            const uniqueByName = new Map<string, { name: string, code: string, ch: number }>();
            filtered.forEach(c => {
                if (!uniqueByName.has(c.name.toLowerCase()) || c.code.length < uniqueByName.get(c.name.toLowerCase())!.code.length) {
                    uniqueByName.set(c.name.toLowerCase(), c);
                }
            });

            setSuggestions(Array.from(uniqueByName.values()).slice(0, 6));
        } else {
            setSuggestions([]);
        }
    };

    // Track selected course CH for each input slot
    const [selectedCh, setSelectedCh] = useState<Record<number, number>>({});

    const selectSuggestion = (index: number, course: { name: string, code: string, ch: number }) => {
        const next = [...inputList];
        next[index] = course.name;
        setInputList(next);
        setSelectedCh(prev => ({ ...prev, [index]: course.ch }));
        setSuggestions([]);
    };

    const proceedToStep2 = () => {
        const validEntries = inputList
            .map((name, idx) => ({ name: name.trim(), idx }))
            .filter(e => e.name !== "");
        if (validEntries.length === 0) return;

        const initialCourses: PlannerCourse[] = validEntries.map(({ name, idx }) => {
            // Use CH from selection, or try to look up from available courses, fallback to 3
            let ch = selectedCh[idx];
            if (ch === undefined) {
                const match = allAvailableCourses.find(c => c.name.toLowerCase() === name.toLowerCase());
                ch = match?.ch ?? 3;
            }
            return {
                id: Math.random().toString(36).substr(2, 9),
                name,
                hasMidterm: false,
                credits: ch,
                status: "In Progress"
            };
        });

        setCourses(initialCourses);
        setStep(2);
    };

    const toggleMidterm = (id: string) => {
        setCourses(prev => prev.map(c =>
            c.id === id ? { ...c, hasMidterm: !c.hasMidterm } : c
        ));
    };

    const finishSetup = () => {
        onComplete(courses);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                    {step === 1 ? "Which courses are you taking?" : "Identify High-Stakes Assessments"}
                </h2>
                <p className="text-white/40 text-sm max-w-md mx-auto">
                    {step === 1
                        ? "Enter the names of the courses you're registered for this semester to build your workspace."
                        : "Research shows midterms are strong predictors of success. Mark courses that have a midterm exam."}
                </p>
            </div>

            <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="glass-card-premium p-6 rounded-3xl border border-white/5 space-y-3">
                            {inputList.map((value, idx) => (
                                <motion.div
                                    layout
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`relative flex items-center group ${activeInput === idx ? 'z-[60]' : 'z-10'}`}
                                >
                                    <input
                                        autoFocus={idx === inputList.length - 1}
                                        value={value}
                                        onChange={(e) => handleInputChange(idx, e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && addInput()}
                                        onFocus={() => setActiveInput(idx)}
                                        onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                                        placeholder="e.g. Data Structures"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-white placeholder-white/20 outline-none transition-all focus:bg-white/[0.05] focus:border-violet-500/40 text-sm font-medium"
                                    />

                                    {/* Autocomplete Dropdown */}
                                    <AnimatePresence>
                                        {activeInput === idx && suggestions.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full left-0 right-0 mt-2 z-[100] bg-[#0A0A0A] rounded-2xl border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl max-h-[280px] overflow-y-auto"
                                            >
                                                <div className="p-2 space-y-1">
                                                    {suggestions.map((course, sIdx) => (
                                                        <button
                                                            key={`${course.code}-${sIdx}`}
                                                            onClick={() => selectSuggestion(idx, course)}
                                                            className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-all flex flex-col items-start gap-1 group/item"
                                                        >
                                                            <span className="text-sm font-semibold text-white group-hover/item:text-violet-400 transition-colors">
                                                                {course.name}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-white/20 font-mono uppercase tracking-widest group-hover/item:text-white/40">
                                                                    {course.code}
                                                                </span>
                                                                <div className="h-px w-4 bg-white/5" />
                                                                <span className="text-[9px] text-violet-500/40 font-bold uppercase tracking-tighter group-hover/item:text-violet-500/60 transition-colors">
                                                                    Official Course
                                                                </span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {inputList.length > 1 && (
                                        <button
                                            onClick={() => removeInput(idx)}
                                            className="absolute right-3 p-1.5 text-white/20 hover:text-white/60 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </motion.div>
                            ))}

                            <button
                                onClick={addInput}
                                className="w-full py-3 rounded-xl border border-dashed border-white/10 text-white/30 text-xs font-bold uppercase tracking-widest hover:border-white/20 hover:text-white/50 transition-all flex items-center justify-center gap-2 group relative z-[0]"
                            >
                                <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                Add Another Course
                            </button>
                        </div>

                        <div className="h-4" />

                        <button
                            disabled={inputList.every(v => v.trim() === "")}
                            onClick={proceedToStep2}
                            className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 disabled:opacity-50 relative z-0"
                        >
                            Next Step
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 gap-3">
                            {courses.map((course) => (
                                <button
                                    key={course.id}
                                    onClick={() => toggleMidterm(course.id)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${course.hasMidterm
                                        ? "bg-violet-500/10 border-violet-500/40"
                                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                                        }`}
                                >
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-sm font-semibold">{course.name}</span>
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-white/30 mt-0.5">
                                            {course.hasMidterm ? "Includes Midterm" : "No Midterm"}
                                        </span>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${course.hasMidterm
                                        ? "bg-violet-500 border-violet-500 text-white"
                                        : "border-white/10 text-transparent"
                                        }`}>
                                        <Check className="w-3.5 h-3.5" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 mb-6">
                            <AlertCircle className="w-5 h-5 text-amber-500/60 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-200/60 leading-relaxed">
                                <strong>Pro-tip:</strong> Courses with midterms often require earlier planning. Identifying them now helps the system prioritize your study alerts later.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-4 rounded-2xl bg-white/[0.05] border border-white/10 text-white font-bold text-sm transition-all hover:bg-white/[0.08]"
                            >
                                Back
                            </button>
                            <button
                                onClick={finishSetup}
                                className="flex-[2] py-4 rounded-2xl bg-violet-600 text-white font-bold text-sm transition-all hover:bg-violet-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
                            >
                                Generate Workspace
                                <Sparkles className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
