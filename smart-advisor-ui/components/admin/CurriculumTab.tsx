'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, RefreshCw, Pencil, Loader2, X, Save, CheckCircle2 } from 'lucide-react';
import { AdminCard, AdminButton, Field, TextInput } from '@/components/admin/ui';

interface CourseRow {
    id: number;
    name: string;
    code: string;
    credits: number;
    instructor_name: string | null;
    location: string | null;
    status: string | null;
    grade_letter: string | null;
    grade_point: number | null;
    final_mark: number | null;
    is_completed: boolean | null;
    created_at: string | null;
    semester: {
        id: number;
        name: string;
        type: string;
        year: number;
        user: { id: number; name: string | null; email: string | null; student_id: string | null } | null;
    } | null;
}

const STATUS_OPTIONS = ['planned', 'in_progress', 'completed', 'dropped'] as const;

interface EditState {
    name: string;
    code: string;
    credits: string;
    instructor_name: string;
    location: string;
    status: string;
    grade_letter: string;
    grade_point: string;
    final_mark: string;
    is_completed: boolean;
}

function toEditState(course: CourseRow): EditState {
    return {
        name: course.name,
        code: course.code,
        credits: String(course.credits ?? ''),
        instructor_name: course.instructor_name ?? '',
        location: course.location ?? '',
        status: course.status ?? 'planned',
        grade_letter: course.grade_letter ?? '',
        grade_point: course.grade_point == null ? '' : String(course.grade_point),
        final_mark: course.final_mark == null ? '' : String(course.final_mark),
        is_completed: Boolean(course.is_completed),
    };
}

export default function CurriculumTab({ adminSecret }: { readonly adminSecret: string }) {
    const [courses, setCourses] = useState<CourseRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [editing, setEditing] = useState<CourseRow | null>(null);
    const [form, setForm] = useState<EditState | null>(null);
    const [saving, setSaving] = useState(false);
    const [savedId, setSavedId] = useState<number | null>(null);

    const fetchCourses = useCallback(async () => {
        if (!adminSecret) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/admin/courses', {
                headers: { 'x-admin-secret': adminSecret },
                cache: 'no-store',
            });
            if (!res.ok) throw new Error('Failed to load courses');
            const data = await res.json();
            setCourses(data.courses ?? []);
        } catch {
            setError('Could not load courses.');
        } finally {
            setLoading(false);
        }
    }, [adminSecret]);

    useEffect(() => {
        void fetchCourses();
    }, [fetchCourses]);

    const q = search.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (!q) return courses;
        return courses.filter(
            (c) =>
                c.code.toLowerCase().includes(q) ||
                c.name.toLowerCase().includes(q) ||
                (c.instructor_name ?? '').toLowerCase().includes(q)
        );
    }, [courses, q]);

    const openEdit = (course: CourseRow) => {
        setEditing(course);
        setForm(toEditState(course));
        setError('');
    };

    const save = async () => {
        if (!editing || !form || !adminSecret) return;
        setSaving(true);
        setError('');

        const body: Record<string, unknown> = {
            name: form.name.trim(),
            code: form.code.trim(),
            status: form.status,
            is_completed: form.is_completed,
            instructor_name: form.instructor_name.trim() || null,
            location: form.location.trim() || null,
            grade_letter: form.grade_letter.trim() || null,
        };
        const credits = Number(form.credits);
        if (Number.isFinite(credits) && form.credits.trim() !== '') body.credits = credits;
        if (form.grade_point.trim() !== '') body.grade_point = Number(form.grade_point);
        else body.grade_point = null;
        if (form.final_mark.trim() !== '') body.final_mark = Number(form.final_mark);
        else body.final_mark = null;

        try {
            const res = await fetch(`/api/admin/courses/${editing.id}`, {
                method: 'PATCH',
                headers: { 'x-admin-secret': adminSecret, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to save course');

            setCourses((prev) =>
                prev.map((c) =>
                    c.id === editing.id
                        ? {
                              ...c,
                              name: body.name as string,
                              code: body.code as string,
                              credits: (body.credits as number) ?? c.credits,
                              status: form.status,
                              is_completed: form.is_completed,
                              instructor_name: body.instructor_name as string | null,
                              location: body.location as string | null,
                              grade_letter: body.grade_letter as string | null,
                              grade_point: body.grade_point as number | null,
                              final_mark: body.final_mark as number | null,
                          }
                        : c
                )
            );
            setSavedId(editing.id);
            setEditing(null);
            setForm(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save course');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <AdminCard
                title="Curriculum"
                description="Browse and correct course records across all students. Edits are saved in place — nothing is deleted."
                icon={<BookOpen className="h-4 w-4" />}
            >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5a6472]" />
                        <TextInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search code, name or instructor…"
                            className="pl-9"
                        />
                    </div>
                    <AdminButton variant="ghost" onClick={() => void fetchCourses()}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </AdminButton>
                </div>

                {error && !editing && (
                    <p className="mb-3 rounded-xl border border-[#dc4835]/25 bg-[#dc4835]/5 px-3 py-2 text-xs font-medium text-[#dc4835]">
                        {error}
                    </p>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#dde3ec] text-[11px] font-bold uppercase tracking-wide text-[#5a6472]">
                                <th className="py-2 pr-4">Course</th>
                                <th className="py-2 pr-4">Student</th>
                                <th className="py-2 pr-4">Term</th>
                                <th className="py-2 pr-4">Credits</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4 text-right">Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c) => (
                                <tr key={c.id} className="border-b border-[#edf1f6] hover:bg-[#edf1f6]/50">
                                    <td className="py-3 pr-4 text-xs">
                                        <p className="font-semibold text-[#222d32]">{c.name}</p>
                                        <p className="font-mono text-[11px] text-[#5a6472]">{c.code}</p>
                                    </td>
                                    <td className="py-3 pr-4 text-xs text-[#5a6472]">
                                        {c.semester?.user?.name ||
                                            c.semester?.user?.email ||
                                            c.semester?.user?.student_id ||
                                            '—'}
                                    </td>
                                    <td className="py-3 pr-4 text-[11px] text-[#5a6472]">
                                        {c.semester ? `${c.semester.name} (${c.semester.year})` : '—'}
                                    </td>
                                    <td className="py-3 pr-4 text-xs tabular-nums text-[#5a6472]">{c.credits}</td>
                                    <td className="py-3 pr-4">
                                        <span className="rounded-md bg-[#edf1f6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#5a6472]">
                                            {c.status ?? 'planned'}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4 text-right">
                                        {savedId === c.id ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => openEdit(c)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-[#edf1f6] px-2.5 py-1.5 text-[11px] font-bold text-[#5a6472] hover:bg-[#dde3ec]"
                                            >
                                                <Pencil className="h-3.5 w-3.5" /> Edit
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && filtered.length === 0 && (
                        <p className="py-8 text-center text-xs text-[#5a6472]">No matching courses.</p>
                    )}
                    {loading && <p className="py-8 text-center text-xs text-[#5a6472]">Loading courses…</p>}
                </div>
            </AdminCard>

            {editing && form && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#222d32]/40 backdrop-blur-sm"
                        onClick={() => !saving && setEditing(null)}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#dde3ec] bg-white p-6 shadow-xl"
                    >
                        <div className="mb-5 flex items-start justify-between">
                            <div>
                                <h2 className="text-base font-bold text-[#222d32]">Edit course</h2>
                                <p className="mt-0.5 text-xs text-[#5a6472]">
                                    {editing.code} · student record
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => !saving && setEditing(null)}
                                className="rounded-lg p-1.5 text-[#5a6472] hover:bg-[#edf1f6]"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Course name">
                                <TextInput
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </Field>
                            <Field label="Course code">
                                <TextInput
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                                />
                            </Field>
                            <Field label="Credits">
                                <TextInput
                                    type="number"
                                    step="0.5"
                                    value={form.credits}
                                    onChange={(e) => setForm({ ...form, credits: e.target.value })}
                                />
                            </Field>
                            <Field label="Status">
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className="w-full rounded-xl border border-[#dde3ec] bg-white px-3 py-2 text-sm text-[#222d32] outline-none focus:border-[#dc4835]/40 focus:ring-2 focus:ring-[#dc4835]/25"
                                >
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Instructor">
                                <TextInput
                                    value={form.instructor_name}
                                    onChange={(e) => setForm({ ...form, instructor_name: e.target.value })}
                                />
                            </Field>
                            <Field label="Location">
                                <TextInput
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                />
                            </Field>
                            <Field label="Grade letter">
                                <TextInput
                                    value={form.grade_letter}
                                    onChange={(e) => setForm({ ...form, grade_letter: e.target.value })}
                                />
                            </Field>
                            <Field label="Grade point">
                                <TextInput
                                    type="number"
                                    step="0.01"
                                    value={form.grade_point}
                                    onChange={(e) => setForm({ ...form, grade_point: e.target.value })}
                                />
                            </Field>
                            <Field label="Final mark">
                                <TextInput
                                    type="number"
                                    step="0.1"
                                    value={form.final_mark}
                                    onChange={(e) => setForm({ ...form, final_mark: e.target.value })}
                                />
                            </Field>
                            <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-[#222d32]">
                                <input
                                    type="checkbox"
                                    checked={form.is_completed}
                                    onChange={(e) => setForm({ ...form, is_completed: e.target.checked })}
                                    className="h-4 w-4 rounded border-[#dde3ec] accent-[#dc4835]"
                                />
                                Mark completed
                            </label>
                        </div>

                        {error && (
                            <p className="mt-4 rounded-xl border border-[#dc4835]/25 bg-[#dc4835]/5 px-3 py-2 text-xs font-medium text-[#dc4835]">
                                {error}
                            </p>
                        )}

                        <div className="mt-6 flex justify-end gap-2">
                            <AdminButton variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
                                Cancel
                            </AdminButton>
                            <AdminButton onClick={() => void save()} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saving ? 'Saving…' : 'Save'}
                            </AdminButton>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
