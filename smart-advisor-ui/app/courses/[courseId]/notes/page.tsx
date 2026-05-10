"use client";

import dynamic from "next/dynamic";
import { fetchJSON, fetchWithRetry } from "@/lib/fetch-retry";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const CourseNotesEditor = dynamic(() => import("@/components/CourseNotesEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-100 w-full bg-white/5 animate-pulse rounded-4xl border border-white/10 flex items-center justify-center">
      <span className="text-xs font-black uppercase tracking-widest text-white/20">Loading Editor...</span>
    </div>
  ),
});

export default function CourseNotesPage({ params }: Readonly<{ params: Promise<{ courseId: string }> }>) {
  const { courseId } = use(params);
  const [notes, setNotes] = useState<any>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState("");

  // Fetch course name and notes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch curriculum for name (don't fail entire flow if this fails)
        try {
          const curriculum = await fetchJSON<any[]>("/api/courses");
          const course = curriculum.find((c: { code: string; name?: string }) => c.code === courseId);
          if (course) setCourseName(course.name);
        } catch (curriculumError) {
          console.error("Curriculum fetch error:", curriculumError);
        }

        const data = await fetchJSON<{ notes: import('@tiptap/core').JSONContent | null; updatedAt?: string }>(
          `/api/courses/${courseId}/notes`,
          { retries: 2 }
        );
        setNotes(data.notes || null);
        setUpdatedAt(data.updatedAt || "");
      } catch (e) {
        console.error("Fetch Data Error:", e);
        setNotes(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [courseId]);

  // Save notes handler (for non-autosave changes or immediate feedback)
  const handleSave = async (val: import('@tiptap/core').JSONContent) => {
    try {
      await fetchWithRetry(`/api/courses/${courseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: val }),
        retries: 2
      });
    } catch (e) {
      console.error("Save Error:", e);
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
          value={notes ?? "<p></p>"}
          onChange={setNotes}
          onAutoSave={handleSave}
          courseTitle={courseName || courseId}
          updatedAt={updatedAt}
        />
      )}
    </div>
  );
}
