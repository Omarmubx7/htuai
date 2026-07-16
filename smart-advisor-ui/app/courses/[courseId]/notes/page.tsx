"use client";

import dynamic from "next/dynamic";
import { fetchJSON, fetchWithRetry } from "@/lib/fetch-retry";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const CourseNotesEditor = dynamic(() => import("@/components/CourseNotesEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-100 w-full bg-[#edf1f6] animate-pulse rounded-4xl border border-[#dde3ec] flex items-center justify-center">
      <span className="text-xs font-black uppercase tracking-widest text-[#5a6472]">Loading Editor...</span>
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
    <div className="min-h-screen bg-[#edf1f6]">
      {/* Navigation Layer */}
      <div className="fixed top-4 left-4 z-60 pointer-events-none">
        <Link
          href="/planner"
          className="p-3 rounded-2xl bg-[#edf1f6]/40 backdrop-blur-2xl border border-[#dde3ec] text-[#5a6472] hover:text-[#222d32] transition-all flex items-center justify-center pointer-events-auto hover:bg-[#edf1f6] active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#edf1f6] border border-[#dde3ec] flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 rounded-full bg-[#dc4835]/20 border border-[#dc4835]/40 animate-ping" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-[#5a6472] animate-pulse">Loading Workspace...</span>
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
