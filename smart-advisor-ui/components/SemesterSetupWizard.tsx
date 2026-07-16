"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, ChevronRight, ChevronLeft, Check, Search, Trash2,
    CalendarDays, BookOpen, GraduationCap, User, MapPin, Sparkles
} from "lucide-react";
import { fetchWithRetry } from "@/lib/fetch-retry";
import { useToast } from "./ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CurriculumCourse {
    code: string;
    name: string;
    credits: number;
}

interface WizardCourse {
    code: string;
    name: string;
    credits: number;
    midterm_date: string;
    final_date: string;
    instructor_name: string;
    location: string;
}

export interface SemesterSetupWizardProps {
    onClose: () => void;
    onComplete: (semesterId: number) => void;
}

// ─── Date Presets (Asia/Amman aware) ─────────────────────────────────────────

type SemType = "Fall" | "Spring" | "Summer";

function extractCurriculumCourses(curriculum: {
    shared?: Record<string, Array<{ code?: string; name?: string; ch?: number }>>;
    majors?: Record<string, Record<string, Array<{ code?: string; name?: string; ch?: number }>>>;
}) {
    const map = new Map<string, CurriculumCourse>();

    const addCourseList = (list?: Array<{ code?: string; name?: string; ch?: number }>) => {
        if (!Array.isArray(list)) return;

        for (const course of list) {
            if (!course.code || !course.name) continue;
            map.set(course.code, {
                code: course.code,
                name: course.name,
                credits: course.ch ?? 3,
            });
        }
    };

    if (curriculum.shared) {
        for (const list of Object.values(curriculum.shared)) addCourseList(list);
    }

    if (curriculum.majors) {
        for (const major of Object.values(curriculum.majors)) {
            if (!major || typeof major !== 'object') continue;
            for (const list of Object.values(major)) addCourseList(list);
        }
    }

    return Array.from(map.values());
}

function getPresetDates(type: SemType): { start: string; end: string; year: number } {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Amman" }));
    const y = now.getFullYear();
    if (type === "Fall")   return { start: `${y}-10-01`, end: `${y + 1}-02-28`, year: y };
    if (type === "Spring") return { start: `${y}-03-01`, end: `${y}-06-30`,    year: y };
    return                        { start: `${y}-07-01`, end: `${y}-09-30`,    year: y };
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ["Semester", "Courses", "Exams", "Details", "Finish"];

function StepBar({ current }: Readonly<{ current: number }>) {
    const getStepDotClasses = (index: number) => {
        if (index < current) return "bg-[#dc4835] text-white";
        if (index === current) return "bg-[#dc4835] text-white ring-2 ring-[#dc4835]/30";
        return "bg-[#edf1f6] text-[#5a6472]";
    };

    return (
        <div className="flex items-center gap-1 mb-6">
            {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-1 flex-1">
                    <div className={`flex flex-col items-center gap-1 flex-1 ${i <= current ? "opacity-100" : "opacity-30"}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-colors ${getStepDotClasses(i)}`}>
                            {i < current ? <Check className="w-3 h-3" /> : i + 1}
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5a6472] hidden sm:block">{label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div className={`h-px flex-1 mb-4 transition-colors ${i < current ? "bg-[#dc4835]/50" : "bg-[#edf1f6]"}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function SemesterSetupWizard({ onClose, onComplete }: Readonly<SemesterSetupWizardProps>) {
    const { toast } = useToast();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);

    // Step 1
    const [semType, setSemType] = useState<SemType | null>(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [semYear, setSemYear] = useState(new Date().getFullYear());

    // Step 2
    const [courses, setCourses] = useState<WizardCourse[]>([]);
    const [hasMidterms, setHasMidterms] = useState(true);
    const [hasFinals, setHasFinals] = useState(true);
    const [allCurriculumCourses, setAllCurriculumCourses] = useState<CurriculumCourse[]>([]);
    const [searchQ, setSearchQ] = useState("");
    const [showSugg, setShowSugg] = useState(false);

    // Created semester ID (set after step 1 POST)
    const [semesterId, setSemesterId] = useState<number | null>(null);

    // Load curriculum for autocomplete
    useEffect(() => {
        fetchWithRetry("/data/curriculum.json", { retries: 2 })
            .then(r => r.json())
            .then((curriculum: {
                shared?: Record<string, Array<{ code?: string; name?: string; ch?: number }>>;
                majors?: Record<string, Record<string, Array<{ code?: string; name?: string; ch?: number }>>>;
            }) => {
                setAllCurriculumCourses(extractCurriculumCourses(curriculum));
            })
            .catch(() => {/* curriculum load failure is non-fatal */});
    }, []);

    const suggestions = allCurriculumCourses.filter(c => {
        if (!c.code || !c.name) return false;
        if (courses.some(x => x.code === c.code)) return false;
        const q = searchQ.toLowerCase();
        return String(c.code).toLowerCase().includes(q) || String(c.name).toLowerCase().includes(q);
    }).slice(0, 8);

    const pickSemType = (t: SemType) => {
        setSemType(t);
        const preset = getPresetDates(t);
        setStartDate(preset.start);
        setEndDate(preset.end);
        setSemYear(preset.year);
    };

    const addCourse = (c: CurriculumCourse) => {
        setCourses(prev => [...prev, { ...c, midterm_date: "", final_date: "", instructor_name: "", location: "" }]);
        setSearchQ("");
        setShowSugg(false);
    };

    const removeCourse = (code: string) => setCourses(prev => prev.filter(c => c.code !== code));

    const updateCourse = (code: string, field: keyof WizardCourse, value: string) => {
        setCourses(prev => prev.map(c => c.code === code ? { ...c, [field]: value } : c));
    };

    // ─── Step navigation with lazy semester creation ──────────────────────────

    const createSemester = useCallback(async (): Promise<number | null> => {
        if (semesterId) {
            console.log(`[createSemester] Semester already exists: id=${semesterId}`);
            return semesterId;
        }
        if (!semType) {
            console.warn(`[createSemester] No semester type selected`);
            return null;
        }
        try {
            console.log(`[createSemester] Posting semester: type=${semType}, year=${semYear}`);
            const res = await fetchWithRetry("/api/planner/semesters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: semType,
                    year: semYear,
                    name: `${semType} ${semYear}`,
                    start_date: startDate || null,
                    end_date: endDate || null,
                }),
                retries: 2,
            });
            if (!res.ok) { 
                console.error(`[createSemester] POST failed with status ${res.status}`);
                toast("Failed to create semester", "error"); 
                return null; 
            }
            const data = await res.json() as { semester: { id: number } };
            console.log(`[createSemester] Semester created successfully: id=${data.semester.id}`);
            setSemesterId(data.semester.id);
            return data.semester.id;
        } catch (e) {
            console.error(`[createSemester] Caught exception:`, e);
            toast("Network error creating semester", "error");
            return null;
        }
    }, [semesterId, semType, semYear, startDate, endDate, toast]);

    // eslint-disable-next-line sonarjs/cognitive-complexity
    const handleFinish = async () => {
        setSaving(true);
        try {
            console.log(`[SemesterSetupWizard.handleFinish] Starting semester setup...`);
            const sid = await createSemester();
            console.log(`[SemesterSetupWizard.handleFinish] Semester created: id=${sid}`);
            if (!sid) { 
                console.error(`[SemesterSetupWizard.handleFinish] Failed to create semester, sid is null`);
                setSaving(false); 
                return; 
            }

            // POST all courses sequentially
            for (const course of courses) {
                const res = await fetchWithRetry("/api/planner/courses", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ semester_id: sid, code: course.code, name: course.name, credits: course.credits }),
                    retries: 2,
                });
                    if (!res.ok) {
                        // Try to surface server-provided error message when possible
                        let msg = `Failed to add ${course.code}`;
                        try {
                            const body = await res.json().catch(() => null);
                            if (body?.error) msg = String(body.error);
                        } catch {}
                        toast(msg, "error");
                        // If duplicate course, stop attempting further adds to avoid repeated 400s
                        if (res.status === 400) break;
                        continue;
                    }

                    const { course: created } = await res.json() as { course: { id: number } };

                // Update exam dates + details if provided
                const hasMeta = course.midterm_date || course.final_date || course.instructor_name || course.location;
                if (hasMeta) {
                    await fetchWithRetry(`/api/planner/courses/${created.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            midterm_date: course.midterm_date || null,
                            final_date: course.final_date || null,
                            instructor_name: course.instructor_name || null,
                            location: course.location || null,
                        }),
                        retries: 2,
                    });
                }
            }

            toast("Semester set up successfully! 🎉", "success");
            console.log(`[SemesterSetupWizard.handleFinish] Calling onComplete with sid=${sid}`);
            onComplete(sid);
        } catch {
            toast("Something went wrong. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    const goNext = async () => {
        if (step === 0 && !semType) { toast("Please choose a semester type", "error"); return; }
        if (step === 0 && startDate && endDate && endDate <= startDate) {
            toast("End date must be after the start date", "error"); return;
        }
        if (step === 1 && courses.length === 0) { toast("Add at least one course to continue", "error"); return; }
        if (step === 4) { await handleFinish(); return; }
        setStep(s => s + 1);
    };

    const renderFinishButton = () => {
        if (saving) {
            return (
                <>
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Saving...
                </>
            );
        }

        return (
            <>
                <Sparkles className="w-4 h-4" />
                Create Semester
            </>
        );
    };

    const renderContinueButton = () => {
        const label = step === 1 && courses.length === 0 ? "Add Courses First" : "Continue";

        return (
            <>
                {label}
                <ChevronRight className="w-4 h-4" />
            </>
        );
    };

    // ─── Render steps ─────────────────────────────────────────────────────────

    const renderStep = () => {
        switch (step) {
            case 0: return (
                <div className="space-y-4">
                    <p className="text-[#5a6472] text-sm">Choose the semester type — dates will be pre-filled for you.</p>
                    <div className="grid grid-cols-3 gap-3">
                        {(["Fall", "Spring", "Summer"] as SemType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => pickSemType(t)}
                                className={`py-5 rounded-2xl border-2 font-bold text-sm transition-all flex flex-col items-center gap-2
                                    ${semType === t
                                        ? "border-[#dc4835] bg-[#dc4835]/15 text-[#222d32]"
                                        : "border-[#dde3ec] bg-[#edf1f6] text-[#5a6472] hover:border-[#dc4835] hover:text-[#222d32]"}`}
                            >
                                <span className="text-2xl">
                                    {(() => {
                                        if (t === "Fall") return "🍂";
                                        if (t === "Spring") return "🌸";
                                        return "☀️";
                                    })()}
                                </span>
                                {t}
                            </button>
                        ))}
                    </div>
                    {semType && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                                <label htmlFor="start-date" className="text-xs uppercase font-bold text-[#5a6472] tracking-widest pl-1">Start Date</label>
                                <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className="w-full mt-1 bg-white border border-[#dde3ec] rounded-xl px-3 py-2.5 text-sm focus:border-[#dc4835] focus:outline-none transition-colors" />
                            </div>
                            <div>
                                <label htmlFor="end-date" className="text-xs uppercase font-bold text-[#5a6472] tracking-widest pl-1">End Date</label>
                                <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="w-full mt-1 bg-white border border-[#dde3ec] rounded-xl px-3 py-2.5 text-sm focus:border-[#dc4835] focus:outline-none transition-colors" />
                            </div>
                        </motion.div>
                    )}
                </div>
            );

            case 1: return (
                <div className="space-y-4">
                    <p className="text-[#5a6472] text-sm">Search and add your courses. You need at least one.</p>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6472] pointer-events-none" />
                        <input
                            type="text" placeholder="Search by code or name..."
                            value={searchQ}
                            onChange={e => { setSearchQ(e.target.value); setShowSugg(true); }}
                            onFocus={() => setShowSugg(true)}
                            onBlur={() => setTimeout(() => setShowSugg(false), 200)}
                            className="w-full bg-white border border-[#dde3ec] rounded-xl pl-10 pr-4 py-3 text-sm focus:border-[#dc4835] focus:outline-none transition-colors"
                        />
                        {showSugg && searchQ && suggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-[#dde3ec] rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto">
                                {suggestions.map(c => (
                                    <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => addCourse(c)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-[#edf1f6] cursor-pointer flex items-center justify-between gap-2"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-[#222d32] truncate max-w-55">{c.name}</p>
                                            <p className="text-xs text-[#5a6472]">{c.code}</p>
                                        </div>
                                        <span className="text-xs bg-[#edf1f6] px-2 py-0.5 rounded-md text-[#5a6472] shrink-0">{c.credits} CH</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {courses.length === 0 ? (
                            <div className="py-8 text-center text-[#5a6472] border border-dashed border-[#dde3ec] rounded-2xl">
                                <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-40" />
                                <p className="text-xs">No courses added yet</p>
                            </div>
                        ) : courses.map(c => (
                            <div key={c.code} className="flex items-center justify-between bg-[#edf1f6] border border-[#dde3ec] rounded-xl px-4 py-2.5">
                                <div>
                                    <p className="text-sm font-semibold">{c.name}</p>
                                    <p className="text-xs text-[#5a6472]">{c.code} · {c.credits} CH</p>
                                </div>
                                <button onClick={() => removeCourse(c.code)} className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-[#5a6472] rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            );

            case 2: return (
                <div className="space-y-3">
                    <p className="text-[#5a6472] text-sm">Tell us whether you have midterms or finals, then add dates only where needed.</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setHasMidterms(v => !v)}
                            className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${hasMidterms ? "border-[#dc4835] bg-[#dc4835]/15 text-[#222d32]" : "border-[#dde3ec] bg-[#edf1f6] text-[#5a6472]"}`}
                        >
                            Midterms {hasMidterms ? "On" : "Off"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setHasFinals(v => !v)}
                            className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${hasFinals ? "border-[#dc4835] bg-[#dc4835]/15 text-[#222d32]" : "border-[#dde3ec] bg-[#edf1f6] text-[#5a6472]"}`}
                        >
                            Finals {hasFinals ? "On" : "Off"}
                        </button>
                    </div>
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                        {courses.map(c => (
                            <div key={c.code} className="bg-[#edf1f6] border border-[#dde3ec] rounded-2xl p-4">
                                <p className="text-sm font-bold mb-3">{c.code} <span className="text-[#5a6472] font-normal">— {c.name}</span></p>
                                <div className="grid grid-cols-2 gap-3">
                                    {hasMidterms && (
                                        <div>
                                            <label htmlFor={`midterm-${c.code}`} className="text-xs uppercase font-bold text-[#5a6472] tracking-widest pl-1">Midterm</label>
                                            <input id={`midterm-${c.code}`} type="date" value={c.midterm_date} onChange={e => updateCourse(c.code, "midterm_date", e.target.value)}
                                                className="w-full mt-1 bg-white border border-[#dde3ec] rounded-xl px-3 py-2 text-sm focus:border-[#dc4835] focus:outline-none transition-colors" />
                                        </div>
                                    )}
                                    {hasFinals && (
                                        <div>
                                            <label htmlFor={`final-${c.code}`} className="text-xs uppercase font-bold text-[#5a6472] tracking-widest pl-1">Final</label>
                                            <input id={`final-${c.code}`} type="date" value={c.final_date} onChange={e => updateCourse(c.code, "final_date", e.target.value)}
                                                className="w-full mt-1 bg-white border border-[#dde3ec] rounded-xl px-3 py-2 text-sm focus:border-[#dc4835] focus:outline-none transition-colors" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );

            case 3: return (
                <div className="space-y-3">
                    <p className="text-[#5a6472] text-sm">Add instructor and room details (optional — you can skip).</p>
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                        {courses.map(c => (
                            <div key={c.code} className="bg-[#edf1f6] border border-[#dde3ec] rounded-2xl p-4">
                                <p className="text-sm font-bold mb-3">{c.code}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor={`instructor-${c.code}`} className="text-xs uppercase font-bold text-[#5a6472] tracking-widest pl-1 flex items-center gap-1"><User className="w-3 h-3" /> Instructor</label>
                                        <input id={`instructor-${c.code}`} type="text" placeholder="Dr. ..." value={c.instructor_name} onChange={e => updateCourse(c.code, "instructor_name", e.target.value)}
                                            className="w-full mt-1 bg-white border border-[#dde3ec] rounded-xl px-3 py-2 text-sm focus:border-[#dc4835] focus:outline-none transition-colors" />
                                    </div>
                                    <div>
                                        <label htmlFor={`location-${c.code}`} className="text-xs uppercase font-bold text-[#5a6472] tracking-widest pl-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Room</label>
                                        <input id={`location-${c.code}`} type="text" placeholder="e.g. B201" value={c.location} onChange={e => updateCourse(c.code, "location", e.target.value)}
                                            className="w-full mt-1 bg-white border border-[#dde3ec] rounded-xl px-3 py-2 text-sm focus:border-[#dc4835] focus:outline-none transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );

            case 4: return (
                <div className="space-y-4 text-center py-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-[#dc4835]/20 border border-[#dc4835]/30 flex items-center justify-center">
                        <GraduationCap className="w-8 h-8 text-[#dc4835]" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black">Ready to go!</h3>
                        <p className="text-[#5a6472] text-sm mt-2">
                            Setting up <span className="text-[#222d32] font-bold">{semType} {semYear}</span> with{" "}
                            <span className="text-[#dc4835] font-bold">{courses.length} course{courses.length === 1 ? "" : "s"}</span>.
                        </p>
                    </div>
                    <div className="bg-[#edf1f6] border border-[#dde3ec] rounded-2xl p-4 text-left space-y-1.5">
                        {courses.map(c => (
                            <div key={c.code} className="flex items-center gap-2 text-sm">
                                <Check className="w-3.5 h-3.5 text-[#dc4835] shrink-0" />
                                <span className="text-[#222d32]">{c.code}</span>
                                <span className="text-[#5a6472] truncate">{c.name}</span>
                            </div>
                        ))}
                    </div>
                    {saving && (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={`skeleton-${i + 1}`} className="h-3 rounded-full bg-[#edf1f6] animate-pulse" style={{ width: `${80 - i * 15}%`, margin: "0 auto" }} />
                            ))}
                        </div>
                    )}
                </div>
            );

            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-200 flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.95, y: 24, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 24, opacity: 0 }}
                transition={{ type: "spring", damping: 22, stiffness: 300 }}
                className="relative w-full max-w-md bg-white border border-[#dde3ec] rounded-3xl p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[#dc4835]" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[#5a6472]">Semester Setup</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-[#edf1f6] rounded-lg text-[#5a6472] transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <StepBar current={step} />

                {/* Step title */}
                <h2 className="text-lg font-black mb-4">
                    {["Choose Semester Type", "Add Courses", "Add Exam Dates", "Course Details", "All Set!"][step]}
                </h2>

                <AnimatePresence>
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.18 }}
                    >
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>

                {/* Footer buttons */}
                <div className="flex gap-3 mt-6">
                    {step > 0 && (
                        <button onClick={() => setStep(s => s - 1)} disabled={saving}
                            className="flex items-center gap-1 px-4 py-2.5 bg-[#edf1f6] hover:bg-[#edf1f6] rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                    )}
                    {(step === 2 || step === 3) && (
                        <button onClick={() => setStep(s => s + 1)} disabled={saving}
                            className="flex-1 py-2.5 bg-[#edf1f6] hover:bg-[#edf1f6] rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                            Skip
                        </button>
                    )}
                    <button onClick={goNext} disabled={saving || (step === 0 && !semType)}
                        className="flex-1 py-2.5 bg-[#dc4835] hover:bg-[#dc4835] disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                        {step === 4 ? renderFinishButton() : renderContinueButton()}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
