"use client";

import CourseNotesEditor from "@/components/CourseNotesEditor";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { fetchWithRetry, fetchJSON } from "@/lib/fetch-retry";

export default function CourseNotesPage({ params }: Readonly<{ params: Promise<{ courseId: string }> }>) {
  const { courseId } = use(params);
  const [notes, setNotes] = useState<Record<string, unknown> | string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState("");

  // Fetch course name and notes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch curriculum for name
        const curriculum = await fetchJSON<Array<{ code?: string; name?: string }>>("/api/courses", { retries: 2 });
        const course = curriculum.find((c) => c.code === courseId);
        if (course?.name) setCourseName(course.name);

        const data = await fetchJSON<{ notes: Record<string, unknown> | string | null; updatedAt?: string }>(
          `/api/courses/${courseId}/notes`,
          { retries: 2 }
        );
        setNotes(data.notes || null);
        setUpdatedAt(data.updatedAt || "");
      } catch (error) {
        console.error("Fetch Data Error:", error);
        setNotes(null);
      }
      setLoading(false);
    }
    fetchData();
  }, [courseId]);

  // Save notes handler (for non-autosave changes or immediate feedback)
  const handleSave = async (val: Record<string, unknown> | string | null) => {
    try {
      await fetchWithRetry(`/api/courses/${courseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: val }),
        retries: 2
      });
    } catch (error) {
      console.error("Save Error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Layer */}
      <div className="fixed top-4 left-4 z-60 pointer-events-none">
        <Link
          href="/planner"
          className="p-3 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/5 text-white/40 hover:text-white transition-all flex items-center justify-center pointer-events-auto hover:bg-white/5 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/40 animate-ping" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/20 animate-pulse">Loading Workspace...</span>
        </div>
      ) : (
        <CourseNotesEditor
          value={notes}
          onChange={setNotes}
          onAutoSave={handleSave}
          courseTitle={courseName || courseId}
          updatedAt={updatedAt}
        />
      )}
    </div>
  );
}
