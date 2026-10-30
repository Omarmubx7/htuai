"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { HTU_GRADING_SCALE } from "@/lib/seo";

interface Row {
    id: number;
    name: string;
    credits: string;
    grade: string;
}

const GRADE_POINTS: Record<string, number> = Object.fromEntries(
    HTU_GRADING_SCALE.map((entry) => [entry.grade, entry.points])
);

let nextId = 3;

function initialRows(): Row[] {
    return [
        { id: 1, name: "", credits: "3", grade: "" },
        { id: 2, name: "", credits: "3", grade: "" },
    ];
}

export default function GpaCalculator() {
    const [rows, setRows] = useState<Row[]>(initialRows);
    const [priorCredits, setPriorCredits] = useState("");
    const [priorGpa, setPriorGpa] = useState("");

    const update = (id: number, patch: Partial<Row>) => {
        setRows((current) =>
            current.map((row) => (row.id === id ? { ...row, ...patch } : row))
        );
    };

    const addRow = () => {
        setRows((current) => [
            ...current,
            { id: nextId++, name: "", credits: "3", grade: "" },
        ]);
    };

    const removeRow = (id: number) => {
        setRows((current) =>
            current.length === 1 ? current : current.filter((row) => row.id !== id)
        );
    };

    const reset = () => {
        setRows(initialRows());
        setPriorCredits("");
        setPriorGpa("");
    };

    const result = useMemo(() => {
        let credits = 0;
        let points = 0;

        for (const row of rows) {
            const ch = Number.parseFloat(row.credits);
            const gradePoints = GRADE_POINTS[row.grade];
            if (!Number.isFinite(ch) || ch <= 0 || gradePoints === undefined) continue;
            credits += ch;
            points += ch * gradePoints;
        }

        const gpa = credits > 0 ? points / credits : null;

        const pCredits = Number.parseFloat(priorCredits);
        const pGpa = Number.parseFloat(priorGpa);
        const hasPrior =
            Number.isFinite(pCredits) && pCredits > 0 &&
            Number.isFinite(pGpa) && pGpa >= 0 && pGpa <= 4;

        const cgpa =
            hasPrior && gpa !== null && pCredits + credits > 0
                ? (pCredits * pGpa + points) / (pCredits + credits)
                : null;

        return { credits, points, gpa, cgpa };
    }, [rows, priorCredits, priorGpa]);

    const fmt = (value: number | null) =>
        value === null ? "—" : value.toFixed(2);

    return (
        <div className="space-y-8">
            <div className="overflow-hidden rounded-2xl border border-[#dde3ec] bg-white shadow-sm">
                <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">
                        Courses used to calculate your HTU semester GPA
                    </caption>
                    <thead>
                        <tr className="border-b border-[#dde3ec] bg-[#edf1f6] text-left text-[11px] font-black uppercase tracking-[0.16em] text-[#5a6472]">
                            <th scope="col" className="px-4 py-3">Course</th>
                            <th scope="col" className="w-24 px-4 py-3">Credits</th>
                            <th scope="col" className="w-32 px-4 py-3">Grade</th>
                            <th scope="col" className="w-12 px-2 py-3"><span className="sr-only">Remove</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-b border-[#dde3ec] last:border-0">
                                <td className="px-4 py-2">
                                    <input
                                        type="text"
                                        value={row.name}
                                        onChange={(event) => update(row.id, { name: event.target.value })}
                                        placeholder="e.g. Data Structures"
                                        aria-label="Course name"
                                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-2 text-sm font-medium text-[#222d32] outline-none transition-colors placeholder:text-[#9aa4b1] hover:border-[#dde3ec] focus:border-[#dc4835]"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        inputMode="decimal"
                                        value={row.credits}
                                        onChange={(event) => update(row.id, { credits: event.target.value })}
                                        aria-label="Credit hours"
                                        className="w-full rounded-lg border border-[#dde3ec] bg-white px-2 py-2 text-sm font-medium text-[#222d32] outline-none transition-colors focus:border-[#dc4835]"
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        value={row.grade}
                                        onChange={(event) => update(row.id, { grade: event.target.value })}
                                        aria-label="Grade"
                                        className="w-full rounded-lg border border-[#dde3ec] bg-white px-2 py-2 text-sm font-medium text-[#222d32] outline-none transition-colors focus:border-[#dc4835]"
                                    >
                                        <option value="">Select</option>
                                        {HTU_GRADING_SCALE.map((entry) => (
                                            <option key={entry.grade} value={entry.grade}>
                                                {entry.grade} — {entry.label} ({entry.points.toFixed(1)})
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-2 py-2 text-center">
                                    <button
                                        type="button"
                                        onClick={() => removeRow(row.id)}
                                        aria-label={`Remove course ${row.name || row.id}`}
                                        className="rounded-lg p-2 text-[#5a6472] transition-colors hover:bg-[#dc4835]/10 hover:text-[#dc4835]"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dde3ec] bg-[#edf1f6] px-4 py-3">
                    <button
                        type="button"
                        onClick={addRow}
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#222d32] border border-[#dde3ec] transition-colors hover:border-[#dc4835]/40 hover:text-[#dc4835]"
                    >
                        <Plus className="h-4 w-4" /> Add course
                    </button>
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#5a6472] transition-colors hover:text-[#222d32]"
                    >
                        <RotateCcw className="h-4 w-4" /> Reset
                    </button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#dde3ec] bg-white p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5a6472]">Graded credits</p>
                    <p className="mt-2 text-3xl font-black tabular-nums text-[#222d32]">{result.credits}</p>
                </div>
                <div className="rounded-2xl border border-[#dde3ec] bg-white p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5a6472]">Quality points</p>
                    <p className="mt-2 text-3xl font-black tabular-nums text-[#222d32]">{result.points.toFixed(1)}</p>
                </div>
                <div className="rounded-2xl border border-[#dc4835]/25 bg-[#dc4835]/5 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#dc4835]">Semester GPA</p>
                    <p className="mt-2 text-3xl font-black tabular-nums text-[#222d32]">{fmt(result.gpa)}</p>
                </div>
            </div>

            <section className="rounded-2xl border border-[#dde3ec] bg-white p-6">
                <h2 className="text-lg font-bold text-[#222d32]">Add your previous CGPA (optional)</h2>
                <p className="mt-1 mb-5 text-sm text-[#5a6472]">
                    Enter your existing GPA and completed credit hours to estimate your new cumulative GPA.
                </p>
                <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
                    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#5a6472]">
                        Prior credits
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            inputMode="decimal"
                            value={priorCredits}
                            onChange={(event) => setPriorCredits(event.target.value)}
                            placeholder="e.g. 60"
                            className="mt-2 w-full rounded-lg border border-[#dde3ec] px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#222d32] outline-none focus:border-[#dc4835]"
                        />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[#5a6472]">
                        Prior GPA (0–4)
                        <input
                            type="number"
                            min="0"
                            max="4"
                            step="0.01"
                            inputMode="decimal"
                            value={priorGpa}
                            onChange={(event) => setPriorGpa(event.target.value)}
                            placeholder="e.g. 3.20"
                            className="mt-2 w-full rounded-lg border border-[#dde3ec] px-3 py-2 text-sm font-medium normal-case tracking-normal text-[#222d32] outline-none focus:border-[#dc4835]"
                        />
                    </label>
                    <div className="rounded-xl bg-[#edf1f6] px-4 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5a6472]">New CGPA</p>
                        <p className="mt-1 text-2xl font-black tabular-nums text-[#222d32]">{fmt(result.cgpa)}</p>
                    </div>
                </div>
            </section>

            <p className="text-xs leading-relaxed text-[#5a6472]">
                This calculator uses the HTU 4-point scale (D = 4.0, M = 3.2, P = 2.4, U = 0.0).
                Courses without a grade are ignored. Results are estimates — always confirm with your
                official HTU transcript.
            </p>
        </div>
    );
}
