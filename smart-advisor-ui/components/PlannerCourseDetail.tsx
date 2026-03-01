"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Save, History, PlayCircle, CheckCircle2, BookOpen, Calendar as CalendarIcon, Info } from "lucide-react";
import Link from "next/link";
import CourseNotesEditor from "./CourseNotesEditor";
import { useToast } from "./ui/Toast";
import ThemeToggle from "@/components/ThemeToggle";

export default function PlannerCourseDetail({ courseId }: { readonly courseId: string }) {
    const { status } = useSession();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);

    // New Session State
    const [duration, setDuration] = useState<number>(30);
    const [sessionType, setSessionType] = useState("reading");
    const [sessionNotes, setSessionNotes] = useState("");
    const [logging, setLogging] = useState(false);

    // Notes State
    const [courseContent, setCourseContent] = useState<any>(null);

    // Exam Dates State
    const [midtermDate, setMidtermDate] = useState<string>("");
    const [finalDate, setFinalDate] = useState<string>("");
    const [savingDates, setSavingDates] = useState(false);

    // Course Metadata State
    const [instructorName, setInstructorName] = useState("");
    const [location, setLocation] = useState("");
    const [courseStatus, setCourseStatus] = useState("planned");
    const [finalMark, setFinalMark] = useState<number | "">("");
    const [savingInfo, setSavingInfo] = useState(false);

    // Class Schedule State (Replaces flat string)
    const [scheduleDays, setScheduleDays] = useState<string[]>([]);
    const [scheduleTime, setScheduleTime] = useState("");
    const [scheduleEndTime, setScheduleEndTime] = useState("");
    const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        } else if (status === "authenticated") {
            fetchCourseData();
        }
    }, [status, router, courseId]);

    const parseAndSetSchedule = (scheduleData: any) => {
        try {
            const parsed = typeof scheduleData === 'string'
                ? JSON.parse(scheduleData)
                : scheduleData;

            let strValue = "";
            if (Array.isArray(parsed) && parsed.length > 0) strValue = parsed[0];
            else if (typeof parsed === 'string') strValue = parsed;

            // Try to parse "Mon/Wed 10:30-11:45"
            const parts = strValue.split(" ");
            if (parts.length >= 2) {
                setScheduleDays(parts[0].split("/").filter((d: string) => ALL_DAYS.includes(d)));
                const times = parts[1].split("-");
                setScheduleTime(times[0] || "");
                setScheduleEndTime(times[1] || "");
            } else {
                setScheduleTime("");
                setScheduleEndTime("");
                setScheduleDays([]);
            }
        } catch (e) { console.error("Could not parse schedule string", e); }
    };

    const fetchSessions = async () => {
        try {
            const sessRes = await fetch(`/api/planner/study-sessions?courseId=${courseId}`);
            if (sessRes.ok) {
                const sessData = await sessRes.json();
                setSessions(sessData.sessions || []);
            }
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    };

    const fetchCourseData = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/planner/semesters");
            if (!res.ok) return;

            const data = await res.json();
            let foundCourse = null;
            for (const sem of data.semesters) {
                const match = sem.courses.find((c: any) => c.id.toString() === courseId);
                if (match) {
                    foundCourse = { ...match, semester: sem };
                    break;
                }
            }

            if (!foundCourse) {
                alert("Course not found.");
                router.push("/planner/semesters");
                return;
            }

            setCourse(foundCourse);

            if (foundCourse.midterm_date) {
                const d = new Date(foundCourse.midterm_date);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                setMidtermDate(d.toISOString().slice(0, 16));
            }
            if (foundCourse.final_date) {
                const d = new Date(foundCourse.final_date);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                setFinalDate(d.toISOString().slice(0, 16));
            }

            if (foundCourse.instructor_name) setInstructorName(foundCourse.instructor_name);
            if (foundCourse.location) setLocation(foundCourse.location);
            if (foundCourse.final_mark !== null && foundCourse.final_mark !== undefined) setFinalMark(foundCourse.final_mark);
            if (foundCourse.status) setCourseStatus(foundCourse.status);

            if (foundCourse.class_schedule) {
                parseAndSetSchedule(foundCourse.class_schedule);
            }

            // Fetch dedicated course notes content if available
            try {
                const notesRes = await fetch(`/api/courses/${courseId}/notes`);
                if (notesRes.ok) {
                    const notesData = await notesRes.json();
                    setCourseContent(notesData.notes);
                }
            } catch (e) { console.error(e); }

            await fetchSessions();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoSaveNotes = async (content: any) => {
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

    const handleLogSession = async () => {
        setLogging(true);
        try {
            const res = await fetch("/api/planner/study-sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_id: courseId,
                    duration_minutes: duration,
                    type: sessionType,
                    notes: sessionNotes || null
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast(`Session Logged! Earned ${data.earnedXP} XP.`, "success");
                setSessions([data.session, ...sessions]);
                setDuration(30);
                setSessionNotes("");
            }
        } catch (error) {
            console.error(error);
            toast("Could not log session.", "error");
        } finally {
            setLogging(false);
        }
    };

    const triggerBackgroundSync = () => {
        // Fire and forget - syncs in background
        fetch("/api/connect/google/sync", { method: "POST" }).catch(e => console.error("Auto-sync trigger failed", e));
    };

    const handleSaveDates = async () => {
        setSavingDates(true);
        try {
            const res = await fetch(`/api/planner/courses/${course.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    midterm_date: midtermDate ? new Date(midtermDate).toISOString() : null,
                    final_date: finalDate ? new Date(finalDate).toISOString() : null
                })
            });

            if (res.ok) {
                toast("Exam dates saved successfully!", "success");
                triggerBackgroundSync();
            } else {
                const data = await res.json();
                toast(data.error || "Failed to save exam dates.", "error");
            }
        } catch (error) {
            console.error(error);
            toast("An error occurred while saving dates.", "error");
        } finally {
            setSavingDates(false);
        }
    };

    const handleSaveInfo = async () => {
        setSavingInfo(true);
        try {
            const compiledSchedule = (scheduleDays.length > 0 && scheduleTime && scheduleEndTime)
                ? `${scheduleDays.join("/")} ${scheduleTime}-${scheduleEndTime}`
                : "";

            const res = await fetch(`/api/planner/courses/${course.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instructor_name: instructorName || null,
                    location: location || null,
                    class_schedule: compiledSchedule ? [compiledSchedule] : [],
                    final_mark: finalMark === "" ? null : finalMark,
                    status: courseStatus
                })
            });

            if (res.ok) {
                toast("Course info saved successfully!", "success");
                triggerBackgroundSync();
            } else {
                toast("Failed to save course info.", "error");
            }
        } catch (error) {
            console.error(error);
            toast("An error occurred while saving course info.", "error");
        } finally {
            setSavingInfo(false);
        }
    };

    if (loading || !course) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 font-sans pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/planner/semesters/${course.semester_id}`} className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition-all group">
                            <ArrowLeft className="w-5 h-5 text-white/60 group-hover:text-white" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                                {course.name}
                            </h1>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-none mt-1">
                                {course.code} • {course.credits} CH
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Study Log & Details */}
                    {/* Left Column - Setup & Log */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Exam Dates - High Prominence */}
                        <div className={`glass-panel p-6 rounded-[2rem] border transition-all duration-500 bg-white/[0.02] ${!midtermDate || !finalDate ? 'border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.1)]' : 'border-white/5'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4" /> Exam Schedule
                                </h2>
                                {(!midtermDate || !finalDate) && (
                                    <span className="text-[10px] bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-bold animate-pulse">Needs Setup</span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="midtermDate" className="text-xs font-bold text-white/70">Midterm Date & Time</label>
                                    <input
                                        id="midtermDate" type="datetime-local" value={midtermDate} onChange={e => setMidtermDate(e.target.value)}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-violet-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="finalDate" className="text-xs font-bold text-white/70">Final Date & Time</label>
                                    <input
                                        id="finalDate" type="datetime-local" value={finalDate} onChange={e => setFinalDate(e.target.value)}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-violet-500 transition-colors"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveDates} disabled={savingDates}
                                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {savingDates ? 'Saving...' : 'Save Schedule'}
                                    {!savingDates && <Save className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Course Info */}
                        <div className={`glass-panel p-6 rounded-[2rem] border transition-all duration-500 bg-white/[0.02] ${!instructorName || !location || !(scheduleDays.length > 0 && scheduleTime) ? 'border-emerald-500/30' : 'border-white/5'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Course Details
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="instructorName" className="text-xs font-bold text-white/70">Instructor Name</label>
                                    <input
                                        id="instructorName" type="text" value={instructorName} onChange={e => setInstructorName(e.target.value)} placeholder="e.g. Dr. Smith"
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="location" className="text-xs font-bold text-white/70">Location</label>
                                        <input
                                            id="location" type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Room 302"
                                            className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="courseStatus" className="text-xs font-bold text-white/70">Course Status</label>
                                        <select
                                            id="courseStatus" value={courseStatus} onChange={e => setCourseStatus(e.target.value)}
                                            className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors appearance-none"
                                        >
                                            <option value="planned" className="bg-black text-white">Planned</option>
                                            <option value="in_progress" className="bg-black text-white">In Progress</option>
                                            <option value="completed" className="bg-black text-white">Completed</option>
                                            <option value="dropped" className="bg-black text-white">Dropped</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <span className="text-xs font-bold text-white/70 block">Class Schedule</span>

                                    {/* Days Toggle */}
                                    <div className="flex flex-wrap gap-2">
                                        {ALL_DAYS.map(day => {
                                            const isActive = scheduleDays.includes(day);
                                            return (
                                                <button
                                                    key={day}
                                                    onClick={() => {
                                                        if (isActive) setScheduleDays(scheduleDays.filter(d => d !== day));
                                                        else setScheduleDays([...scheduleDays, day]);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'}`}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Time Picker */}
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-white/40" />
                                        <input
                                            id="scheduleTime" type="time" title="Schedule Start Time"
                                            value={scheduleTime}
                                            onChange={e => setScheduleTime(e.target.value)}
                                            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors"
                                        />
                                        <span className="text-white/40 text-xs">to</span>
                                        <input
                                            id="scheduleEndTime" type="time" title="Schedule End Time"
                                            value={scheduleEndTime}
                                            onChange={e => setScheduleEndTime(e.target.value)}
                                            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="finalMark" className="text-xs font-bold text-white/70">Final Expected Mark (0-100)</label>
                                    <input
                                        id="finalMark" type="number" value={finalMark} onChange={e => setFinalMark(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 95"
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveInfo} disabled={savingInfo}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {savingInfo ? 'Saving...' : 'Save Meta Data'}
                                    {!savingInfo && <Save className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Log Session */}
                        <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-white/[0.02]">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                                <PlayCircle className="w-4 h-4" /> Log Session
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="duration" className="text-xs font-bold text-white/70">Duration (Minutes)</label>
                                    <input
                                        id="duration" type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="sessionType" className="text-xs font-bold text-white/70">Activity Type</label>
                                    <select
                                        id="sessionType" value={sessionType} onChange={e => setSessionType(e.target.value)}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition-colors appearance-none"
                                    >
                                        <option value="reading" className="bg-black text-white">Reading / Lecturing</option>
                                        <option value="practice" className="bg-black text-white">Practice / Homework</option>
                                        <option value="project" className="bg-black text-white">Project Work</option>
                                        <option value="review" className="bg-black text-white">Exam Review</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="sessionNotes" className="text-xs font-bold text-white/70">Optional Notes</label>
                                    <textarea
                                        id="sessionNotes" value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} rows={2}
                                        placeholder="What did you focus on?"
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition-colors resize-none"
                                    />
                                </div>
                                <button
                                    onClick={handleLogSession} disabled={logging}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {logging ? 'Logging...' : 'Log Study Time'}
                                    {!logging && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Recent Sessions */}
                        <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-white/[0.02]">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                                <History className="w-4 h-4" /> Recent Logs
                            </h2>
                            <div className="space-y-3">
                                {sessions.length > 0 ? sessions.map((s) => (
                                    <div key={s.id || crypto.randomUUID()} className="flex justify-between items-center bg-white/5 p-3 rounded-xl text-sm">
                                        <span className="capitalize font-semibold text-white/80">{s.type}</span>
                                        <span className="text-white/50 font-medium font-mono">{s.duration_minutes}m</span>
                                    </div>
                                )) : (
                                    <p className="text-white/40 text-xs italic text-center py-4">No sessions logged yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Notes Wrapper */}
                    <div className="lg:col-span-2 glass-panel rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden flex flex-col min-h-[500px]">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" /> Second Brain Notes
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-black/20">
                            <CourseNotesEditor
                                courseTitle={course.name}
                                value={courseContent || course.course_notes?.[0]?.content}
                                onAutoSave={handleAutoSaveNotes}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
