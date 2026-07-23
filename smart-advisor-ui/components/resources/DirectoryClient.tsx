"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Upload, BookOpen, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Fuse from "fuse.js";
import { useToast } from "@/components/ui/Toast";
import CourseChips from "./CourseChips";
import ResourceFilters from "./ResourceFilters";
import ResourceCard from "./ResourceCard";
import type { ResourceItem } from "./ResourceCard";
import EmptyState from "./EmptyState";
import UploadDialog from "./UploadDialog";
import ReportDialog from "./ReportDialog";
import type { MajorGroup } from "@/app/resources/page";

interface DirectoryClientProps {
    majorGroups: MajorGroup[];
    courseToMajorLabels: Record<string, string[]>;
    initialResources?: ResourceItem[];
    prefilledCourseCode?: string | null;
}

export default function DirectoryClient({
    majorGroups,
    courseToMajorLabels,
    initialResources,
    prefilledCourseCode,
}: Readonly<DirectoryClientProps>) {
    const { status, data: session } = useSession();
    const { toast } = useToast();
    const [selectedMajor, setSelectedMajor] = useState<string>("all");
    const [selectedCourse, setSelectedCourse] = useState<string | null>(prefilledCourseCode || null);
    const [typeFilter, setTypeFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [resources, setResources] = useState<ResourceItem[]>(initialResources || []);
    const [loading, setLoading] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState<ResourceItem | null>(null);
    const majorScrollRef = useRef<HTMLDivElement>(null);

    const activeMajor = useMemo(
        () => majorGroups.find((g) => g.id === selectedMajor) || majorGroups[0],
        [majorGroups, selectedMajor]
    );

    const courses = activeMajor.courses;

    const courseNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        majorGroups.forEach((g) => g.courses.forEach((c) => { map[c.code] = c.name; }));
        return map;
    }, [majorGroups]);

    // Reset course selection when major changes
    useEffect(() => {
        setSelectedCourse(null);
    }, [selectedMajor]);

    const fetchResources = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCourse) {
                params.set("course_code", selectedCourse);
            } else if (selectedMajor && selectedMajor !== "all") {
                params.set("major", selectedMajor);
            }

            const res = await fetch(`/api/directory/resources?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setResources(data.resources || []);
            }
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [selectedCourse, selectedMajor]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    // Build enriched resources with course names for Fuse.js
    const enrichedResources = useMemo(() => {
        return resources.map((r) => ({
            ...r,
            courseName: courseNameMap[r.course_code] || "",
            majorLabels: courseToMajorLabels[r.course_code] || [],
        }));
    }, [resources, courseNameMap, courseToMajorLabels]);

    // Fuse.js instance for fuzzy search
    const fuse = useMemo(
        () =>
            new Fuse(enrichedResources, {
                keys: [
                    { name: "title", weight: 0.4 },
                    { name: "description", weight: 0.2 },
                    { name: "courseName", weight: 0.25 },
                    { name: "course_code", weight: 0.1 },
                    { name: "type", weight: 0.05 },
                ],
                threshold: 0.35,
                includeScore: true,
                ignoreLocation: true,
                minMatchCharLength: 2,
            }),
        [enrichedResources]
    );

    const filteredResources = useMemo(() => {
        let results = enrichedResources;

        // Fuzzy search
        if (searchQuery.trim()) {
            results = fuse.search(searchQuery).map((r) => r.item);
        }

        // Type filter
        if (typeFilter !== "all") {
            results = results.filter((r) => r.type === typeFilter);
        }

        return results;
    }, [enrichedResources, fuse, searchQuery, typeFilter]);

    const typeCounts: Record<string, number> = {};
    enrichedResources.forEach((r) => {
        typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });

    const selectedCourseData = courses.find((c) => c.code === selectedCourse);

    const currentUser = session?.user?.name || session?.user?.email || null;

    async function handleDelete(resource: ResourceItem) {
        if (!confirm(`Delete "${resource.title}"?`)) return;
        try {
            const res = await fetch(`/api/directory/resources/${resource.id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete");
            }
            toast("Resource deleted", "success");
            fetchResources();
        } catch (err) {
            toast(err instanceof Error ? err.message : "Delete failed", "error");
        }
    }

    return (
        <div className="min-h-dvh bg-[#edf1f6]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#dde3ec]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/dashboard"
                                className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#edf1f6] hover:bg-[#dde3ec] text-[#5a6472] hover:text-[#222d32] transition-all duration-200"
                                aria-label="Back to dashboard"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="w-10 h-10 rounded-xl bg-[#dc4835]/10 flex items-center justify-center"
                            >
                                <BookOpen className="w-5 h-5 text-[#dc4835]" />
                            </motion.div>
                            <div>
                                <motion.h1
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    className="text-lg font-black text-[#222d32] tracking-tight"
                                >
                                    Resources
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                    className="text-xs text-[#5a6472] font-semibold"
                                >
                                    Course materials shared by students
                                </motion.p>
                            </div>
                        </div>

                        {status === "authenticated" && (
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setUploadOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#dc4835] text-white text-sm font-bold hover:bg-[#c43a2a] focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 focus:ring-offset-2 transition-all duration-200 shadow-sm"
                                aria-label="Upload a resource"
                            >
                                <Upload className="w-4 h-4" />
                                <span className="hidden sm:inline">Upload</span>
                            </motion.button>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6472]" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#edf1f6] border border-[#dde3ec] text-sm text-[#222d32] placeholder:text-[#5a6472]/50 focus:outline-none focus:border-[#dc4835] focus:ring-2 focus:ring-[#dc4835]/10 transition-all duration-200"
                            placeholder="Search by title, course, or description..."
                            aria-label="Search resources"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5a6472] hover:text-[#dc4835] transition-colors"
                                aria-label="Clear search"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Major chips — horizontal scroll */}
                    <div className="mb-3" ref={majorScrollRef}>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="Filter by major">
                            {majorGroups.map((group) => {
                                const isActive = group.id === selectedMajor;
                                return (
                                    <motion.button
                                        key={group.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedMajor(group.id)}
                                        role="tab"
                                        aria-selected={isActive}
                                        className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                                            isActive
                                                ? "bg-[#dc4835] text-white border-[#dc4835] shadow-sm"
                                                : "bg-white text-[#5a6472] border-[#dde3ec] hover:border-[#dc4835]/50 hover:text-[#222d32]"
                                        }`}
                                        style={{
                                            boxShadow: isActive ? "0 2px 8px #dc483525" : "none",
                                        }}
                                    >
                                        {group.label}
                                        <span
                                            className={`ml-0.5 text-[10px] rounded-full px-1 py-px font-bold ${
                                                isActive ? "bg-white/20" : "bg-[#edf1f6]"
                                            }`}
                                        >
                                            {group.courses.length}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Course chips */}
                    <div className="mb-3">
                        <CourseChips courses={courses} selected={selectedCourse} onSelect={setSelectedCourse} />
                    </div>

                    {/* Type filters */}
                    <AnimatePresence>
                        {enrichedResources.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ResourceFilters active={typeFilter} onChange={setTypeFilter} counts={typeCounts} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-16 gap-3"
                        >
                            <Loader2 className="w-6 h-6 text-[#dc4835] animate-spin" />
                            <p className="text-xs text-[#5a6472] font-medium">Loading resources...</p>
                        </motion.div>
                    ) : filteredResources.length > 0 ? (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid gap-4 sm:grid-cols-2"
                        >
                            {filteredResources.map((r) => (
                                <ResourceCard
                                    key={r.id}
                                    resource={r}
                                    onReport={setReportTarget}
                                    onDelete={handleDelete}
                                    isOwner={currentUser === r.uploaded_by}
                                    courseNameMap={courseNameMap}
                                    majorLabels={r.majorLabels}
                                />
                            ))}
                        </motion.div>
                    ) : selectedCourse ? (
                        <motion.div
                            key="no-resources"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <EmptyState type="no-resources" courseName={selectedCourseData?.name || selectedCourse} onUpload={status === "authenticated" ? () => setUploadOpen(true) : undefined} />
                        </motion.div>
                    ) : searchQuery ? (
                        <motion.div
                            key="no-results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <EmptyState type="no-results" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="no-search"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <EmptyState type="no-search" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Dialogs */}
            <UploadDialog
                open={uploadOpen}
                onClose={() => setUploadOpen(false)}
                courses={courses}
                prefilledCourseCode={selectedCourse}
                onResourceCreated={fetchResources}
                courseToMajorLabels={courseToMajorLabels}
            />
            <ReportDialog resource={reportTarget} onClose={() => setReportTarget(null)} />
        </div>
    );
}
