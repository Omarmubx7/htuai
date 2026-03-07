"use client";

import CourseNotesEditor from "@/components/CourseNotesEditor";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function CourseNotesPage({ params }: { params: Promise<{ courseId: string }> }) {
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
        // Fetch curriculum for name
        const curriculumRes = await fetch("/api/courses");
        if (curriculumRes.ok) {
          const curriculum = await curriculumRes.json();
          const course = curriculum.find((c: any) => c.code === courseId);
          if (course) setCourseName(course.name);
        }

        const res = await fetch(`/api/courses/${courseId}/notes`);
        const data = await res.json();
        setNotes(data.notes || null);
        setUpdatedAt(data.updatedAt || "");
      } catch (e) {
        console.error("Fetch Data Error:", e);
        setNotes(null);
      }
      setLoading(false);
    }
    fetchData();
  }, [courseId]);

  // Save notes handler (for non-autosave changes or immediate feedback)
  const handleSave = async (val: any) => {
    try {
      await fetch(`/api/courses/${courseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: val }),
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
