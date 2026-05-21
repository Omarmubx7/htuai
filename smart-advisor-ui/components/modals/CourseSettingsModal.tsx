"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Info, Save, X, Clock } from "lucide-react";
import { fetchWithRetry } from "@/lib/fetch-retry";
import { useToast } from "../ui/Toast";

interface SemesterMeta {
    start_date?: string | null;
    end_date?: string | null;
}

interface PlannerCourse {
    id: number;
    semester_id: number;
    code: string;
    name: string;
    credits: number;
    midterm_date?: string | null;
    final_date?: string | null;
    instructor_name?: string | null;
    location?: string | null;
    final_mark?: number | null;
    status?: string | null;
    class_schedule?: string | null;
}

interface CourseSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: PlannerCourse | null;
    semesterMeta: SemesterMeta | null;
    onSuccess: (updatedCourse: PlannerCourse) => void;
}

const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateTimeLocalValue(dateValue?: string | null): string {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

function parseScheduleParts(scheduleText?: string | null): { days: string[]; startTime: string; endTime: string } {
    if (!scheduleText) return { days: [], startTime: "", endTime: "" };
    try {
        const [daysPart = "", timePart = ""] = scheduleText.trim().split(" ");
        const days = daysPart.split("/").filter((day) => ALL_DAYS.includes(day));
        const [startTime = "", endTime = ""] = timePart.split("-");
        return { days, startTime, endTime };
    } catch {
        return { days: [], startTime: "", endTime: "" };
    }
}

function validateDateWithinSemester(dateValue: string, label: string, semester?: SemesterMeta | null): string | null {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return `Invalid ${label.toLowerCase()} date format.`;

    if (semester?.start_date) {
        const semStart = new Date(semester.start_date);
        if (date < semStart) return `${label} date cannot be before semester start date.`;
    }

    if (semester?.end_date) {
        const semEnd = new Date(semester.end_date);
        if (date > semEnd) return `${label} date cannot be after semester end date.`;
    }
    return null;
}

function validateDateOrder(midtermValue: string, finalValue: string): string | null {
    if (!midtermValue || !finalValue) return null;
    const midterm = new Date(midtermValue);
    const final = new Date(finalValue);
    if (final <= midterm) return "Final exam must be scheduled after the Midterm.";
    return null;
}

export default function CourseSettingsModal({ isOpen, onClose, course, semesterMeta, onSuccess }: Readonly<CourseSettingsModalProps>) {
    const { toast } = useToast();

    // Exam Dates
    const [midtermDate, setMidtermDate] = useState<string>("");
    const [finalDate, setFinalDate] = useState<string>("");

    // Course Info
    const [instructorName, setInstructorName] = useState("");
    const [location, setLocation] = useState("");
    const [courseStatus, setCourseStatus] = useState("planned");
    const [finalMark, setFinalMark] = useState<number | "">("");

    // Class Schedule
    const [scheduleDays, setScheduleDays] = useState<string[]>([]);
    const [scheduleTime, setScheduleTime] = useState("");
    const [scheduleEndTime, setScheduleEndTime] = useState("");

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && course) {
            setMidtermDate(toDateTimeLocalValue(course.midterm_date));
            setFinalDate(toDateTimeLocalValue(course.final_date));
            setInstructorName(course.instructor_name ?? "");
            setLocation(course.location ?? "");
            setCourseStatus(course.status ?? "planned");
            setFinalMark(course.final_mark ?? "");

            const { days, startTime, endTime } = parseScheduleParts(course.class_schedule);
            setScheduleDays(days);
            setScheduleTime(startTime);
            setScheduleEndTime(endTime);
        }
    }, [isOpen, course]);

    if (!isOpen || !course) return null;

    const hasSemesterDateRange = Boolean(semesterMeta?.start_date) && Boolean(semesterMeta?.end_date);

    const handleSaveAll = async () => {
        // Validate Dates
        const midtermError = validateDateWithinSemester(midtermDate, "Midterm", semesterMeta);
        if (midtermError) return toast(midtermError, "error");
        
        const finalError = validateDateWithinSemester(finalDate, "Final exam", semesterMeta);
        if (finalError) return toast(finalError, "error");

        const orderError = validateDateOrder(midtermDate, finalDate);
        if (orderError) return toast(orderError, "error");

        if (!hasSemesterDateRange && (instructorName || location || scheduleDays.length > 0)) {
             toast("Please set the semester start and end dates first on the term page.", "error");
             return;
        }

        setIsSaving(true);
        try {
            const compiledSchedule = (scheduleDays.length > 0 && scheduleTime && scheduleEndTime)
                ? `${scheduleDays.join("/")} ${scheduleTime}-${scheduleEndTime}`
                : "";

            const payload = {
                midterm_date: midtermDate ? new Date(midtermDate).toISOString() : null,
                final_date: finalDate ? new Date(finalDate).toISOString() : null,
                instructor_name: instructorName || null,
                location: location || null,
                class_schedule: compiledSchedule || "",
                final_mark: finalMark === "" ? null : finalMark,
                status: courseStatus
            };

            const res = await fetchWithRetry(`/api/planner/courses/${course.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                retries: 2
            });

            if (res.ok) {
                const data = await res.json() as { course: PlannerCourse; xpEarned?: number };
                toast("Settings saved successfully!", "success");
                if (data.xpEarned && data.xpEarned > 0) {
                    toast(`Course Completed! Earned ${data.xpEarned} XP.`, "success");
                }
                onSuccess(data.course);
                onClose();
            } else {
                const data = await res.json().catch(() => ({}));
                toast(data.error || "Failed to save settings.", "error");
            }
        } catch (error) {
            toast(`Failed to save: ${error instanceof Error ? error.message : 'Network error'}`, "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => { if (!isSaving) onClose(); }}
                />
                <motion.div
                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 20, opacity: 0 }}
                    className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
                >
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="absolute top-4 right-4 p-2 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h2 className="text-xl font-bold mb-1 text-white">{course.name} Settings</h2>
                    <p className="text-sm text-white/50 mb-6">{course.code} • {course.credits} CH</p>

                    <div className="space-y-6">
                        {/* Exam Dates */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 flex items-center gap-2 mb-4">
                                <CalendarIcon className="w-4 h-4" /> Exam Schedule
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="midtermDate" className="text-xs font-bold text-white/70">Midterm Date & Time</label>
                                    <input
                                        id="midtermDate" type="datetime-local" value={midtermDate} onChange={e => setMidtermDate(e.target.value)}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-violet-500 transition-colors text-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="finalDate" className="text-xs font-bold text-white/70">Final Date & Time</label>
                                    <input
                                        id="finalDate" type="datetime-local" value={finalDate} onChange={e => setFinalDate(e.target.value)}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-violet-500 transition-colors text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Course Info */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 flex items-center gap-2 mb-4">
                                <Info className="w-4 h-4" /> Course Details
                            </h3>
                            {!hasSemesterDateRange && (
                                <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                                    Set semester start and end dates first to unlock course metadata and schedule sync.
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="instructorName" className="text-xs font-bold text-white/70">Instructor Name</label>
                                    <input
                                        id="instructorName" type="text" value={instructorName} onChange={e => setInstructorName(e.target.value)} placeholder="e.g. Dr. Smith" disabled={!hasSemesterDateRange}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors text-white disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="location" className="text-xs font-bold text-white/70">Location</label>
                                    <input
                                        id="location" type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Room 302" disabled={!hasSemesterDateRange}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors text-white disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="courseStatus" className="text-xs font-bold text-white/70">Course Status</label>
                                    <select
                                        id="courseStatus" value={courseStatus} onChange={e => setCourseStatus(e.target.value)} disabled={!hasSemesterDateRange}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors appearance-none text-white disabled:opacity-50"
                                    >
                                        <option value="planned" className="bg-black">Planned</option>
                                        <option value="in_progress" className="bg-black">In Progress</option>
                                        <option value="completed" className="bg-black">Completed</option>
                                        <option value="dropped" className="bg-black">Dropped</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="finalMark" className="text-xs font-bold text-white/70">Final Expected Mark (0-100)</label>
                                    <input
                                        id="finalMark" type="number" value={finalMark} onChange={e => setFinalMark(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 95" disabled={!hasSemesterDateRange}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors text-white disabled:opacity-50"
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-4 space-y-3">
                                <span className="text-xs font-bold text-white/70 block">Class Schedule</span>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_DAYS.map(day => {
                                        const isActive = scheduleDays.includes(day);
                                        return (
                                            <button
                                                key={day} type="button" disabled={!hasSemesterDateRange}
                                                onClick={() => {
                                                    if (isActive) setScheduleDays(scheduleDays.filter(d => d !== day));
                                                    else setScheduleDays([...scheduleDays, day]);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${isActive ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'}`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-white/40" />
                                    <input
                                        id="scheduleTime" type="time" title="Schedule Start Time"
                                        value={scheduleTime} disabled={!hasSemesterDateRange} onChange={e => setScheduleTime(e.target.value)}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors text-white disabled:opacity-50"
                                    />
                                    <span className="text-white/40 text-xs">to</span>
                                    <input
                                        id="scheduleEndTime" type="time" title="Schedule End Time"
                                        value={scheduleEndTime} disabled={!hasSemesterDateRange} onChange={e => setScheduleEndTime(e.target.value)}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors text-white disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {isSaving ? 'Saving...' : 'Save All Settings'}
                            {!isSaving && <Save className="w-4 h-4" />}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
