"use client";

import CourseNotesEditor from "@/components/CourseNotesEditor";
import { useEffect, useState, use } from "react";
// import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CourseNotesPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [notes, setNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Removed unused router

  // Fetch notes for this course
  useEffect(() => {
    async function fetchNotes() {
      setLoading(true);
      try {
        const res = await fetch(`/api/courses/${courseId}/notes`);
        const data = await res.json();
        setNotes(data.notes || null);
      } catch {
        setNotes(null);
      }
      setLoading(false);
    }
    fetchNotes();
  }, [courseId]);

  // Save notes handler
  async function handleSave(val: string) {
    setNotes(val);
    await fetch(`/api/courses/${courseId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: val }),
    });
  }

  return (
    <div className="max-w-3xl mx-auto py-12">
      <Link
        href="/planner"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-white/40 hover:text-white transition-colors group"
      >
        <span className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </span>
        Back to Planner
      </Link>
      <h1 className="text-3xl font-bold mb-4 text-white">Course Notes</h1>
      {loading ? (
        <div className="glass-card-premium p-8 rounded-2xl border border-white/10 animate-pulse text-white/30">Loading notes...</div>
      ) : (
        <CourseNotesEditor value={notes ?? undefined} onChange={handleSave} />
      )}
    </div>
  );
}
