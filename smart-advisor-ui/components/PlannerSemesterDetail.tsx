"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ArrowLeft, BookOpen, Plus, MoreVertical, Target, MapPin, User, Save, ArrowRight, Search, Calendar as CalendarIcon, Edit2, Trash2, FileText, ChevronRight, Settings2 } from "lucide-react";
import Link from "next/link";
import { GRADE_MAP } from "@/lib/grading";
import { useToast } from "./ui/Toast";
import ConfirmDialog from "./ui/ConfirmDialog";
import ThemeToggle from "@/components/ThemeToggle";

export default function PlannerSemesterDetail({ semesterId }: { semesterId: string }) {
    const { status } = useSession();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [semester, setSemester] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);

    // Add manual course modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCourse, setNewCourse] = useState({ code: "", name: "", credits: 3 });

    // Edit course modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState<any>(null);

    // Autocomplete state
    const [availableCourses, setAvailableCourses] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Semester Dates State
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [savingDates, setSavingDates] = useState(false);

    // Semester Notes State
    const [notes, setNotes] = useState<any[]>([]);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [editingNote, setEditingNote] = useState<any>(null);
    const [noteDraft, setNoteDraft] = useState({ title: "", notes: "" });

    // Confirm Dialog States
    const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
    const [showDeleteCourseConfirm, setShowDeleteCourseConfirm] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<number | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        } else if (status === "authenticated") {
            fetchSemester();
            fetchNotes();
        }
    }, [status, router, semesterId]);

    const fetchNotes = async () => {
        try {
            const res = await fetch(`/api/planner/semesters/${semesterId}/notes`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data.notes || []);
            }
        } catch (e) { console.error("Failed to fetch notes"); }
    };

    const handleSaveNote = async () => {
        if (!noteDraft.title) return;
        try {
            const method = editingNote ? "PATCH" : "POST";
            const body = editingNote ? { ...noteDraft, id: editingNote.id } : noteDraft;
            const res = await fetch(`/api/planner/semesters/${semesterId}/notes`, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const data = await res.json();
                if (editingNote) {
                    setNotes(notes.map(n => n.id === editingNote.id ? data.note : n));
                } else {
                    setNotes([data.note, ...notes]);
                }
                setShowNoteModal(false);
                setEditingNote(null);
                setNoteDraft({ title: "", notes: "" });
                toast("Note saved!", "success");
            }
        } catch (e) { toast("Failed to save note", "error"); }
    };

    const confirmDeleteNote = (id: number) => {
        setNoteToDelete(id);
        setShowDeleteNoteConfirm(true);
    };

    const handleDeleteNote = async () => {
        if (!noteToDelete) return;
        try {
            const res = await fetch(`/api/planner/semesters/${semesterId}/notes?id=${noteToDelete}`, { method: "DELETE" });
            if (res.ok) {
                setNotes(notes.filter(n => n.id !== noteToDelete));
                toast("Note deleted.", "success");
            }
        } catch (e) { toast("Failed to delete note", "error"); }
        setShowDeleteNoteConfirm(false);
        setNoteToDelete(null);
    };
    const fetchSemester = async () => {
        try {
            setLoading(true);
            const [res, currRes] = await Promise.all([
                fetch("/api/planner/semesters"),
                fetch("/data/curriculum.json")
            ]);

            if (!res.ok) throw new Error("Failed fetching semesters");

            // Handle curriculum logic for autocomplete
            if (currRes.ok) {
                const curriculum = await currRes.json();
                const uniqueCourses = new Map<string, any>();

                const processList = (list: any[]) => {
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
                    Object.values(curriculum.majors).forEach((m: any) => {
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

            const data = await res.json();
            const found = data.semesters.find((s: any) => s.id.toString() === semesterId);

            if (found) {
                setSemester(found);
                if (found.start_date) setStartDate(new Date(found.start_date).toISOString().slice(0, 10));
                if (found.end_date) setEndDate(new Date(found.end_date).toISOString().slice(0, 10));
                setCourses(found.courses || []);
            } else {
                toast("Semester not found.", "error");
                router.push("/planner/semesters");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCourse = async () => {
        if (!newCourse.code || !newCourse.name) return;
        try {
            const res = await fetch("/api/planner/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    semester_id: semesterId,
                    ...newCourse
                })
            });
            if (res.ok) {
                const data = await res.json();
                setCourses([...courses, data.course]);
                setShowAddModal(false);
                setNewCourse({ code: "", name: "", credits: 3 });
                setSearchQuery("");
            }
        } catch (e) {
            toast("Failed to add course.", "error");
        }
    };

    const handleUpdateGrade = async (courseId: number, grade: string) => {
        try {
            const gradeInfo = GRADE_MAP[grade];
            const res = await fetch(`/api/planner/courses/${courseId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    grade_letter: grade,
                    grade_point: gradeInfo ? gradeInfo.points : null,
                    is_completed: !!gradeInfo
                })
            });

            if (res.ok) {
                const data = await res.json();
                setCourses(courses.map(c => c.id === courseId ? data.course : c));
            }
        } catch (e) {
            toast("Failed to update grade.", "error");
        }
    };

    const handleEditCourse = async () => {
        if (!editingCourse) return;
        try {
            const res = await fetch(`/api/planner/courses/${editingCourse.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: editingCourse.code,
                    name: editingCourse.name,
                    credits: editingCourse.credits
                })
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(courses.map(c => c.id === editingCourse.id ? data.course : c));
                setShowEditModal(false);
                toast("Course updated!", "success");
            }
        } catch (e) {
            toast("Failed to update course.", "error");
        }
    };

    const confirmDeleteCourse = (courseId: number) => {
        setCourseToDelete(courseId);
        setShowDeleteCourseConfirm(true);
    };

    const handleDeleteCourse = async () => {
        if (!courseToDelete) return;
        try {
            const res = await fetch(`/api/planner/courses/${courseToDelete}`, { method: "DELETE" });
            if (res.ok) {
                setCourses(courses.filter(c => c.id !== courseToDelete));
                toast("Course deleted.", "success");
            }
        } catch (e) {
            toast("Failed to delete course.", "error");
        }
        setShowDeleteCourseConfirm(false);
        setCourseToDelete(null);
    };

    const handleSaveSemesterDates = async () => {
        setSavingDates(true);
        try {
            const res = await fetch(`/api/planner/semesters/${semester.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    start_date: startDate || null,
                    end_date: endDate || null
                })
            });

            if (res.ok) {
                toast("Semester dates saved successfully!", "success");
            } else {
                toast("Failed to save dates.", "error");
            }
        } catch (e) {
            toast("An error occurred while saving dates.", "error");
        } finally {
            setSavingDates(false);
        }
    };

    // Calculate dynamic GPA for this view
    const calculateLiveGPA = () => {
        let totalPoints = 0;
        let totalCredits = 0;
        courses.forEach(c => {
            if (c.grade_point !== null && c.grade_letter) {
                totalPoints += (c.grade_point * c.credits);
                totalCredits += c.credits;
            }
        });
        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '-.--';
    };

    const filteredSuggestions = availableCourses.filter(c =>
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10); // Show max 10 suggestions

    // Note: Due to time constraints, the Course Detail Page (Notes/StudyLog/Quests) is built inside 
    // the semantic modal or separate route `/planner/courses/[id]`. We will link there.

    if (loading || !semester) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" />
            </div>
        );
    }

    const liveGPA = calculateLiveGPA();

    return (
        <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 font-sans pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/planner/semesters" className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition-all group">
                            <ArrowLeft className="w-5 h-5 text-white/60 group-hover:text-white" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                                {semester.name}
                            </h1>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-none mt-1">
                                {semester.type} {semester.year}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link href="/planner/settings" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-colors">
                            <Settings2 className="w-4 h-4" />
                        </Link>
                        <Link href="/" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold sm:text-sm text-white/70 transition-colors">
                            Course Tracker
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] group">
                        <p className="text-white/50 text-xs font-bold uppercase tracking-widest font-display flex items-center justify-between">
                            <span>Term GPA</span>
                            {semester.semester_gpa !== null && (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">Official</span>
                            )}
                        </p>
                        <h2 className="text-4xl font-black mt-2 text-transparent bg-clip-text bg-linear-to-r from-violet-400 to-blue-400">
                            {semester.semester_gpa !== null ? semester.semester_gpa.toFixed(2) : liveGPA}
                        </h2>
                        {semester.semester_gpa !== null && (
                            <p className="text-[10px] text-white/20 mt-2 font-medium italic">Calculated: {liveGPA}</p>
                        )}
                    </div>
                    <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-white/[0.02]">
                        <p className="text-white/50 text-xs font-bold uppercase tracking-widest font-display">Hours Registered</p>
                        <h2 className="text-4xl font-black mt-2 text-white/90">
                            {courses.reduce((acc, c) => acc + c.credits, 0)} <span className="text-lg text-white/30">CH</span>
                        </h2>
                    </div>
                    <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] flex items-center justify-center">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="w-full h-full min-h-[100px] border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 rounded-3xl transition-all flex flex-col items-center justify-center text-white/50 hover:text-white group"
                        >
                            <Plus className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-sm tracking-tight">Add Course</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold font-display tracking-tight border-b border-white/5 pb-2 mb-4">Enrolled Courses</h3>

                    {courses.map(course => (
                        <div key={course.id} className="group bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-white/10 transition-all flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center relative overflow-hidden">
                            <div className="flex items-start gap-4 z-10">
                                <div className="w-12 h-12 shrink-0 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    {course.code.substring(0, 2)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-base hover:text-blue-400 transition-colors">
                                        <Link href={`/planner/courses/${course.id}`}>{course.name}</Link>
                                    </h4>
                                    <p className="text-[11px] font-bold tracking-wider text-white/30 uppercase mt-0.5">{course.code} • {course.credits} CH</p>

                                    <div className="flex gap-4 mt-3">
                                        {course.instructor_name && (
                                            <span className="flex items-center gap-1 text-xs text-white/50"><User className="w-3.5 h-3.5" /> {course.instructor_name}</span>
                                        )}
                                        {course.location && (
                                            <span className="flex items-center gap-1 text-xs text-white/50"><MapPin className="w-3.5 h-3.5" /> {course.location}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4 z-10 pt-4 sm:pt-0 border-t border-white/5 sm:border-0 mt-2 sm:mt-0">
                                <div className="flex flex-col items-start sm:items-end">
                                    <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1 mb-1">Grade</label>
                                    <div className="relative group/select">
                                        <select
                                            value={course.grade_letter || ""}
                                            onChange={(e) => handleUpdateGrade(course.id, e.target.value)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        >
                                            <option value="" className="bg-black text-white">-</option>
                                            <option value="D" className="bg-black text-white">D</option>
                                            <option value="M" className="bg-black text-white">M</option>
                                            <option value="P" className="bg-black text-white">P</option>
                                            <option value="U" className="bg-black text-white">U</option>
                                        </select>
                                        <div className={`px-4 py-2 flex items-center justify-center rounded-xl font-black text-sm transition-all border
                                            ${course.grade_letter === 'D' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                course.grade_letter === 'M' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    course.grade_letter === 'P' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                        course.grade_letter === 'U' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                            'bg-white/5 text-white/40 border-white/5'}
                                            group-hover/select:border-white/20`}
                                        >
                                            {course.grade_letter || "-"}
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    href={`/planner/courses/${course.id}`}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    <ArrowRight className="w-4 h-4 text-white/60" />
                                </Link>
                            </div>
                        </div>
                    ))}

                    {courses.length === 0 && (
                        <div className="py-16 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl text-white/30">
                            <BookOpen className="w-8 h-8 mb-3 opacity-50" />
                            <p className="text-sm font-semibold">No courses logged for this semester.</p>
                        </div>
                    )}
                </div>

                {/* Semester Notes Section */}
                <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4">
                        <h3 className="text-lg font-bold font-display tracking-tight flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-400" /> Semester Notes & Generic Pages
                        </h3>
                        <button
                            onClick={() => {
                                setEditingNote(null);
                                setNoteDraft({ title: "", notes: "" });
                                setShowNoteModal(true);
                            }}
                            className="p-2 hover:bg-white/5 rounded-lg text-emerald-400 transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                        >
                            <Plus className="w-4 h-4" /> New Page
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {notes.map(note => (
                            <div key={note.id} className="glass-panel p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all flex flex-col justify-between group">
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-bold text-white/90 group-hover:text-emerald-400 transition-colors">{note.title}</h4>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setEditingNote(note);
                                                    setNoteDraft({ title: note.title, notes: note.notes || "" });
                                                    setShowNoteModal(true);
                                                }}
                                                className="p-1.5 hover:bg-white/10 rounded-md text-white/40 hover:text-white"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => confirmDeleteNote(note.id)}
                                                className="p-2 text-white/50 hover:text-red-400 hover:bg-white/10 rounded-xl transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/40 mt-2 line-clamp-3 leading-relaxed">
                                        {note.notes || "No additional content..."}
                                    </p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                        Last edited: {new Date(note.updated_at).toLocaleDateString()}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-white/10" />
                                </div>
                            </div>
                        ))}

                        {notes.length === 0 && (
                            <div className="sm:col-span-2 py-12 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl text-white/20">
                                <FileText className="w-8 h-8 mb-3 opacity-30" />
                                <p className="text-sm font-semibold">No generic pages created for this term.</p>
                                <button
                                    onClick={() => setShowNoteModal(true)}
                                    className="mt-4 text-xs font-bold text-emerald-400 hover:underline"
                                >
                                    + Add your first note
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Edit Semester Metadata */}
                <div className="mt-8 glass-panel p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] max-w-2xl mx-auto">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" /> Term Dates
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-white/70">Start Date</label>
                            <input
                                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-violet-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-white/70">End Date</label>
                            <input
                                type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-violet-500 transition-colors"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSaveSemesterDates} disabled={savingDates}
                        className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {savingDates ? 'Saving...' : 'Save Semester Dates'}
                        {!savingDates && <Save className="w-4 h-4" />}
                    </button>
                </div>

            </main>

            {/* Add Course Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold mb-4">Add Course</h3>
                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Search Course (Database)</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input
                                            type="text"
                                            placeholder="Search by code or name..."
                                            value={searchQuery}
                                            onChange={e => {
                                                setSearchQuery(e.target.value);
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>

                                    {showSuggestions && searchQuery && filteredSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-zinc-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                                            {filteredSuggestions.map((c, i) => (
                                                <div
                                                    key={i}
                                                    className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm flex justify-between items-center"
                                                    onClick={() => {
                                                        setNewCourse({ code: c.code, name: c.name, credits: c.credits });
                                                        setSearchQuery(`${c.code} - ${c.name}`);
                                                        setShowSuggestions(false);
                                                    }}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white/90 truncate max-w-[200px]">{c.name}</span>
                                                        <span className="text-[10px] text-white/40">{c.code}</span>
                                                    </div>
                                                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-white/60">{c.credits} CH</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Course Code</label>
                                        <input
                                            type="text" placeholder="e.g. CS101"
                                            value={newCourse.code} onChange={e => setNewCourse({ ...newCourse, code: e.target.value })}
                                            className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-blue-500 transition-colors uppercase"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Credits</label>
                                        <select
                                            value={newCourse.credits} onChange={e => setNewCourse({ ...newCourse, credits: Number(e.target.value) })}
                                            className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-blue-500 transition-colors appearance-none"
                                        >
                                            <option value={1} className="bg-zinc-900 text-white">1 CH</option>
                                            <option value={2} className="bg-zinc-900 text-white">2 CH</option>
                                            <option value={3} className="bg-zinc-900 text-white">3 CH</option>
                                            <option value={4} className="bg-zinc-900 text-white">4 CH</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Course Name</label>
                                    <input
                                        type="text" placeholder="e.g. Intro to Computer Science"
                                        value={newCourse.name} onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                                <button onClick={handleAddCourse} disabled={!newCourse.code || !newCourse.name} className="flex-1 py-3 bg-blue-600 focus:outline-[3px] outline-blue-500/30 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">Add</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Course Modal */}
            <AnimatePresence>
                {showEditModal && editingCourse && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowEditModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold mb-4">Edit Course</h3>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Course Code</label>
                                        <input
                                            type="text"
                                            value={editingCourse.code} onChange={e => setEditingCourse({ ...editingCourse, code: e.target.value })}
                                            className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-blue-500 transition-colors uppercase"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Credits</label>
                                        <select
                                            value={editingCourse.credits} onChange={e => setEditingCourse({ ...editingCourse, credits: Number(e.target.value) })}
                                            className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-blue-500 transition-colors appearance-none"
                                        >
                                            <option value={1} className="bg-zinc-900 text-white">1 CH</option>
                                            <option value={2} className="bg-zinc-900 text-white">2 CH</option>
                                            <option value={3} className="bg-zinc-900 text-white">3 CH</option>
                                            <option value={4} className="bg-zinc-900 text-white">4 CH</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Course Name</label>
                                    <input
                                        type="text"
                                        value={editingCourse.name} onChange={e => setEditingCourse({ ...editingCourse, name: e.target.value })}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                                <button onClick={handleEditCourse} className="flex-1 py-3 bg-blue-600 focus:outline-[3px] outline-blue-500/30 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">Save</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Semester Note Modal */}
            <AnimatePresence>
                {showNoteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowNoteModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-emerald-400" />
                                {editingNote ? 'Edit Semester Note' : 'New Semester Page'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Page Title</label>
                                    <input
                                        type="text" placeholder="e.g. Internship Ideas, Degree Plan..."
                                        value={noteDraft.title} onChange={e => setNoteDraft({ ...noteDraft, title: e.target.value })}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-white/50 tracking-widest font-bold pl-1">Content / Thoughts</label>
                                    <textarea
                                        placeholder="Write anything you want to keep track of this semester..."
                                        rows={8}
                                        value={noteDraft.notes} onChange={e => setNoteDraft({ ...noteDraft, notes: e.target.value })}
                                        className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setShowNoteModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                                <button
                                    onClick={handleSaveNote}
                                    disabled={!noteDraft.title}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                                >
                                    {editingNote ? 'Update Page' : 'Save Page'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <ConfirmDialog
                isOpen={showDeleteCourseConfirm}
                title="Delete Course?"
                description="Are you sure you want to delete this course and all its notes? This cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={handleDeleteCourse}
                onCancel={() => setShowDeleteCourseConfirm(false)}
            />

            <ConfirmDialog
                isOpen={showDeleteNoteConfirm}
                title="Delete Note?"
                description="Are you sure you want to delete this note? This action cannot be reversed."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={handleDeleteNote}
                onCancel={() => setShowDeleteNoteConfirm(false)}
            />
        </div>
    );
}
