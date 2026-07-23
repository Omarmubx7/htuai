"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Link2, FileUp, Search, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const SEASONS = ["Spring", "Summer", "Fall", "Winter"] as const;
const YEARS = Array.from({ length: 21 }, (_, i) => 2020 + i);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function detectTypeFromExtension(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf") return "pdf";
    if (["mp4", "webm"].includes(ext)) return "video";
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
    if (["zip", "rar"].includes(ext)) return "folder";
    if (["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"].includes(ext)) return "pdf";
    return "other";
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Course {
    name: string;
    code: string;
    ch: number;
}

interface UploadFile {
    id: string;
    file: File;
    progress: number;
    status: "uploading" | "done" | "error";
    url?: string;
    error?: string;
    xhr?: XMLHttpRequest;
}

interface UploadDialogProps {
    open: boolean;
    onClose: () => void;
    courses: Course[];
    prefilledCourseCode?: string | null;
    onResourceCreated?: () => void;
    courseToMajorLabels?: Record<string, string[]>;
}

export default function UploadDialog({ open, onClose, courses, prefilledCourseCode, onResourceCreated, courseToMajorLabels }: Readonly<UploadDialogProps>) {
    const [step, setStep] = useState<"course" | "details">("course");
    const [courseCode, setCourseCode] = useState(prefilledCourseCode || "");
    const [courseSearch, setCourseSearch] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [semesterSeason, setSemesterSeason] = useState("");
    const [semesterYear, setSemesterYear] = useState("");
    const [sourceMode, setSourceMode] = useState<"url" | "file">("url");
    const [url, setUrl] = useState("");
    const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const { toast } = useToast();
    const titleRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    useEffect(() => {
        if (!open || !dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) focusable[0].focus();
    }, [open, step]);

    const filteredCourses = courses.filter((c) => {
        const q = courseSearch.toLowerCase();
        return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    });

    const selectedCourse = courses.find((c) => c.code === courseCode);

    const handleCourseSelect = useCallback((code: string) => {
        setCourseCode(code);
        setStep("details");
        setTimeout(() => titleRef.current?.focus(), 150);
    }, []);

    async function uploadFileToR2(uploadFile: UploadFile) {
        try {
            // Step 1: Get presigned URL from our server (tiny JSON request)
            const presignRes = await fetch("/api/directory/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: uploadFile.file.name,
                    contentType: uploadFile.file.type || "application/octet-stream",
                }),
            });

            if (!presignRes.ok) {
                const data = await presignRes.json();
                throw new Error(data.error || "Failed to get upload URL");
            }

            const { uploadUrl, publicUrl } = await presignRes.json();

            // Step 2: PUT file directly to R2 (bypasses Vercel entirely)
            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    setUploadFiles((prev) =>
                        prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: pct } : f))
                    );
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setUploadFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadFile.id
                                ? { ...f, status: "done", progress: 100, url: publicUrl, xhr: undefined }
                                : f
                        )
                    );
                } else {
                    setUploadFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadFile.id
                                ? { ...f, status: "error", error: `Upload failed (${xhr.status})`, xhr: undefined }
                                : f
                        )
                    );
                }
            };

            xhr.onerror = () => {
                setUploadFiles((prev) =>
                    prev.map((f) =>
                        f.id === uploadFile.id
                            ? { ...f, status: "error", error: "Network error", xhr: undefined }
                            : f
                    )
                );
            };

            xhr.open("PUT", uploadUrl);
            xhr.setRequestHeader("Content-Type", uploadFile.file.type || "application/octet-stream");
            xhr.send(uploadFile.file);

            setUploadFiles((prev) =>
                prev.map((f) => (f.id === uploadFile.id ? { ...f, xhr } : f))
            );
        } catch (err) {
            setUploadFiles((prev) =>
                prev.map((f) =>
                    f.id === uploadFile.id
                        ? { ...f, status: "error", error: err instanceof Error ? err.message : "Upload failed", xhr: undefined }
                        : f
                )
            );
        }
    }

    function reset() {
        setStep("course");
        setCourseCode("");
        setCourseSearch("");
        setTitle("");
        setDescription("");
        setSemesterSeason("");
        setSemesterYear("");
        setSourceMode("url");
        setUrl("");
        setUploadFiles([]);
        setDragActive(false);
    }

    function handleClose() {
        uploadFiles.forEach((f) => f.xhr?.abort());
        reset();
        onClose();
    }

    function validateFile(selectedFile: File): boolean {
        if (selectedFile.size > MAX_FILE_SIZE) {
            toast(`${selectedFile.name} is too large (${formatFileSize(selectedFile.size)}). Maximum size is 50 MB.`, "error");
            return false;
        }
        return true;
    }

    function addFiles(fileList: FileList | File[]) {
        const arr = Array.from(fileList);
        const newUploads: UploadFile[] = [];
        for (const f of arr) {
            if (!validateFile(f)) continue;
            const isDup = uploadFiles.some((u) => u.file.name === f.name && u.file.size === f.size);
            if (isDup) {
                toast(`${f.name} already added`, "error");
                continue;
            }
            const uf: UploadFile = {
                id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                file: f,
                progress: 0,
                status: "uploading",
            };
            newUploads.push(uf);
        }
        if (newUploads.length === 0) return;
        setUploadFiles((prev) => [...prev, ...newUploads]);
        newUploads.forEach((uf) => uploadFileToR2(uf));
    }

    function removeFile(id: string) {
        setUploadFiles((prev) => {
            const target = prev.find((f) => f.id === id);
            if (target?.xhr) target.xhr.abort();
            return prev.filter((f) => f.id !== id);
        });
    }

    function retryFile(id: string) {
        setUploadFiles((prev) => {
            const target = prev.find((f) => f.id === id);
            if (!target) return prev;
            const refreshed: UploadFile = { ...target, progress: 0, status: "uploading", error: undefined, url: undefined };
            setTimeout(() => uploadFileToR2(refreshed), 0);
            return prev.map((f) => (f.id === id ? refreshed : f));
        });
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        setDragActive(true);
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        setDragActive(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    }

    function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
        }
        e.target.value = "";
    }

    const allFilesDone = uploadFiles.length > 0 && uploadFiles.every((f) => f.status === "done");
    const anyFileUploading = uploadFiles.some((f) => f.status === "uploading");
    const doneCount = uploadFiles.filter((f) => f.status === "done").length;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const semester = `${semesterSeason} ${semesterYear}`;
        if (!courseCode || !title || !semesterSeason || !semesterYear) return;
        if (sourceMode === "url" && !url) return;
        if (sourceMode === "file" && !allFilesDone) return;

        setSubmitting(true);
        try {
            if (sourceMode === "url") {
                const res = await fetch("/api/directory/resources", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        course_code: courseCode,
                        title,
                        type: "link",
                        url,
                        description: description || undefined,
                        semester,
                    }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to submit resource");
                }
            } else {
                const doneFiles = uploadFiles.filter((f) => f.status === "done" && f.url);
                const total = doneFiles.length;
                for (let i = 0; i < total; i++) {
                    const f = doneFiles[i];
                    const fileTitle = total === 1 ? title : `${title} — ${f.file.name}`;
                    const res = await fetch("/api/directory/resources", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            course_code: courseCode,
                            title: fileTitle,
                            type: detectTypeFromExtension(f.file.name),
                            url: f.url,
                            description: description || undefined,
                            semester,
                        }),
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || `Failed to create resource for ${f.file.name}`);
                    }
                }
            }

            const count = sourceMode === "file" ? uploadFiles.filter((f) => f.status === "done").length : 1;
            toast(`${count === 1 ? "Resource" : `${count} resources`} uploaded!`, "success");
            handleClose();
            onResourceCreated?.();
        } catch (err) {
            toast(err instanceof Error ? err.message : "Upload failed", "error");
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                onClick={handleClose}
                role="dialog"
                aria-modal="true"
                aria-label="Upload resource"
            >
                <motion.div
                    ref={dialogRef}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl max-h-[85vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#dc4835]/10 flex items-center justify-center">
                                <Upload className="w-4 h-4 text-[#dc4835]" />
                            </div>
                            <h2 className="text-base font-bold text-[#222d32]">Upload Resource</h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg hover:bg-[#edf1f6] focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 transition-all duration-200"
                            aria-label="Close dialog"
                        >
                            <X className="w-4 h-4 text-[#5a6472]" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mb-5" aria-label={`Step ${step === "course" ? "1" : "2"} of 2`}>
                        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === "course" ? "bg-[#dc4835] scale-110" : "bg-[#0da55a]"}`} />
                        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step === "details" ? "bg-[#dc4835] scale-110" : "bg-[#dde3ec]"}`} />
                    </div>

                    {step === "course" && (
                        <div>
                            <label htmlFor="course-search" className="text-xs font-bold text-[#222d32] mb-2 block">
                                Select a course
                            </label>
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6472]" />
                                <input
                                    id="course-search"
                                    type="search"
                                    value={courseSearch}
                                    onChange={(e) => setCourseSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#dde3ec] text-sm text-[#222d32] placeholder:text-[#5a6472]/50 focus:outline-none focus:border-[#dc4835] focus:ring-2 focus:ring-[#dc4835]/10 transition-all duration-200"
                                    placeholder="Search by name or code..."
                                    aria-label="Search courses by name or code"
                                />
                            </div>

                            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto" role="listbox" aria-label="Available courses">
                                {filteredCourses.map((course) => {
                                    const majors = courseToMajorLabels?.[course.code];
                                    return (
                                        <button
                                            key={course.code}
                                            onClick={() => handleCourseSelect(course.code)}
                                            role="option"
                                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#edf1f6] focus:bg-[#edf1f6] focus:outline-none focus:ring-2 focus:ring-[#dc4835]/20 transition-all duration-150 flex flex-col gap-1"
                                            aria-label={`${course.code} — ${course.name}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-[#dc4835] min-w-[70px]">{course.code}</span>
                                                <span className="text-sm text-[#222d32] truncate">{course.name}</span>
                                            </div>
                                            {majors && majors.length > 0 && (
                                                <div className="flex items-center gap-1 ml-[82px] flex-wrap">
                                                    {majors.slice(0, 3).map((major) => (
                                                        <span
                                                            key={major}
                                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide bg-[#43aad7]/10 text-[#43aad7]"
                                                        >
                                                            {major}
                                                        </span>
                                                    ))}
                                                    {majors.length > 3 && (
                                                        <span className="text-[8px] font-bold text-[#5a6472]">+{majors.length - 3}</span>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                {filteredCourses.length === 0 && (
                                    <p className="text-sm text-[#5a6472] text-center py-4" role="status">No courses found</p>
                                )}
                            </div>
                        </div>
                    )}

                    {step === "details" && (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label="Resource details form">
                            {selectedCourse && (
                                <div className="flex flex-col gap-1.5 bg-[#edf1f6] rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="font-bold text-[#dc4835]">{selectedCourse.code}</span>
                                        <span className="text-[#5a6472] truncate">{selectedCourse.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => { setStep("course"); setCourseCode(""); }}
                                            className="ml-auto text-[#dc4835] font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 rounded px-1"
                                        >
                                            Change
                                        </button>
                                    </div>
                                    {courseToMajorLabels?.[selectedCourse.code] && courseToMajorLabels[selectedCourse.code].length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <span className="text-[9px] font-bold text-[#5a6472] uppercase tracking-wider">Majors:</span>
                                            {courseToMajorLabels[selectedCourse.code].map((major) => (
                                                <span
                                                    key={major}
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide bg-[#43aad7]/10 text-[#43aad7]"
                                                >
                                                    {major}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label htmlFor="upload-title" className="text-xs font-bold text-[#222d32] mb-1 block">
                                    Title *
                                </label>
                                <input
                                    ref={titleRef}
                                    id="upload-title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    maxLength={200}
                                    className="w-full px-3 py-2.5 rounded-lg border border-[#dde3ec] text-sm text-[#222d32] placeholder:text-[#5a6472]/50 focus:outline-none focus:border-[#dc4835] focus:ring-2 focus:ring-[#dc4835]/10 transition-all duration-200"
                                    placeholder="e.g. Midterm past papers"
                                    required
                                    aria-required="true"
                                />
                            </div>

                            <div>
                                <label htmlFor="upload-desc" className="text-xs font-bold text-[#222d32] mb-1 block">
                                    Description (optional)
                                </label>
                                <textarea
                                    id="upload-desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2.5 rounded-lg border border-[#dde3ec] text-sm text-[#222d32] placeholder:text-[#5a6472]/50 focus:outline-none focus:border-[#dc4835] focus:ring-2 focus:ring-[#dc4835]/10 resize-none transition-all duration-200"
                                    placeholder="Brief description of this resource..."
                                />
                            </div>

                            <fieldset>
                                <legend className="text-xs font-bold text-[#222d32] mb-2">Semester *</legend>
                                <div className="flex gap-2">
                                    <select
                                        value={semesterSeason}
                                        onChange={(e) => setSemesterSeason(e.target.value)}
                                        className="flex-1 px-3 py-2.5 rounded-lg border border-[#dde3ec] text-sm text-[#222d32] focus:outline-none focus:border-[#dc4835] focus:ring-2 focus:ring-[#dc4835]/10 bg-white transition-all duration-200"
                                        required
                                        aria-label="Semester season"
                                    >
                                        <option value="" disabled>Season</option>
                                        {SEASONS.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={semesterYear}
                                        onChange={(e) => setSemesterYear(e.target.value)}
                                        className="flex-1 px-3 py-2.5 rounded-lg border border-[#dde3ec] text-sm text-[#222d32] focus:outline-none focus:border-[#dc4835] focus:ring-2 focus:ring-[#dc4835]/10 bg-white transition-all duration-200"
                                        required
                                        aria-label="Semester year"
                                    >
                                        <option value="" disabled>Year</option>
                                        {YEARS.map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </fieldset>

                            <fieldset>
                                <legend className="text-xs font-bold text-[#222d32] mb-2">Source *</legend>
                                <div className="flex gap-1 p-1 bg-[#edf1f6] rounded-lg mb-3" role="radiogroup" aria-label="Select source type">
                                    <button
                                        type="button"
                                        onClick={() => setSourceMode("url")}
                                        role="radio"
                                        aria-checked={sourceMode === "url"}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 ${
                                            sourceMode === "url"
                                                ? "bg-white text-[#dc4835] shadow-sm"
                                                : "text-[#5a6472] hover:text-[#222d32]"
                                        }`}
                                    >
                                        <Link2 className="w-3.5 h-3.5" />
                                        URL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSourceMode("file")}
                                        role="radio"
                                        aria-checked={sourceMode === "file"}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 ${
                                            sourceMode === "file"
                                                ? "bg-white text-[#dc4835] shadow-sm"
                                                : "text-[#5a6472] hover:text-[#222d32]"
                                        }`}
                                    >
                                        <FileUp className="w-3.5 h-3.5" />
                                        File
                                    </button>
                                </div>

                                {sourceMode === "url" ? (
                                    <div>
                                        <label htmlFor="upload-url" className="sr-only">URL</label>
                                        <div className="relative">
                                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6472]" />
                                            <input
                                                id="upload-url"
                                                type="url"
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#dde3ec] text-sm text-[#222d32] placeholder:text-[#5a6472]/50 focus:outline-none focus:border-[#dc4835] focus:ring-2 focus:ring-[#dc4835]/10 transition-all duration-200"
                                                placeholder="https://drive.google.com/..."
                                                required={sourceMode === "url"}
                                                aria-required={sourceMode === "url"}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {uploadFiles.length > 0 && (
                                            <div className="space-y-1.5">
                                                {uploadFiles.map((uf) => (
                                                    <div
                                                        key={uf.id}
                                                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200 ${
                                                            uf.status === "done"
                                                                ? "border-[#0da55a]/30 bg-[#0da55a]/5"
                                                                : uf.status === "error"
                                                                ? "border-[#dc4835]/30 bg-[#dc4835]/5"
                                                                : "border-[#dde3ec] bg-[#edf1f6]/50"
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                            uf.status === "done"
                                                                ? "bg-[#0da55a]/10"
                                                                : uf.status === "error"
                                                                ? "bg-[#dc4835]/10"
                                                                : "bg-[#5a6472]/10"
                                                        }`}>
                                                            {uf.status === "uploading" ? (
                                                                <Loader2 className="w-4 h-4 text-[#dc4835] animate-spin" />
                                                            ) : uf.status === "done" ? (
                                                                <CheckCircle2 className="w-4 h-4 text-[#0da55a]" />
                                                            ) : (
                                                                <AlertCircle className="w-4 h-4 text-[#dc4835]" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-[#222d32] truncate">{uf.file.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] text-[#5a6472]">{formatFileSize(uf.file.size)}</p>
                                                                {uf.status === "uploading" && (
                                                                    <p className="text-[10px] text-[#dc4835] font-semibold">{uf.progress}%</p>
                                                                )}
                                                                {uf.status === "error" && (
                                                                    <p className="text-[10px] text-[#dc4835] font-semibold truncate">{uf.error}</p>
                                                                )}
                                                                {uf.status === "done" && (
                                                                    <p className="text-[10px] text-[#0da55a] font-semibold">Done</p>
                                                                )}
                                                            </div>
                                                            {uf.status === "uploading" && (
                                                                <div className="w-full h-1 bg-[#dde3ec] rounded-full overflow-hidden mt-1">
                                                                    <motion.div
                                                                        className="h-full bg-[#dc4835] rounded-full"
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${uf.progress}%` }}
                                                                        transition={{ duration: 0.2 }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-shrink-0 flex items-center gap-1">
                                                            {uf.status === "error" ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => retryFile(uf.id)}
                                                                        className="p-1 rounded-lg hover:bg-[#43aad7]/10 text-[#43aad7] text-[10px] font-bold transition-all duration-200"
                                                                        aria-label={`Retry ${uf.file.name}`}
                                                                    >
                                                                        Retry
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeFile(uf.id)}
                                                                        className="p-1 rounded-lg hover:bg-[#dc4835]/10 text-[#dc4835] transition-all duration-200"
                                                                        aria-label={`Delete ${uf.file.name}`}
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </>
                                                            ) : uf.status === "uploading" ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeFile(uf.id)}
                                                                    className="p-1 rounded-lg hover:bg-[#dc4835]/10 text-[#5a6472] hover:text-[#dc4835] transition-all duration-200"
                                                                    aria-label={`Cancel ${uf.file.name}`}
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeFile(uf.id)}
                                                                    className="p-1 rounded-lg hover:bg-[#dc4835]/10 text-[#5a6472] hover:text-[#dc4835] transition-all duration-200"
                                                                    aria-label={`Remove ${uf.file.name}`}
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {uploadFiles.length > 0 && (
                                            <p className="text-[10px] text-[#5a6472] text-center">
                                                {doneCount}/{uploadFiles.length} uploaded
                                            </p>
                                        )}

                                        <div
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${
                                                dragActive
                                                    ? "border-[#dc4835] bg-[#dc4835]/5"
                                                    : "border-[#dde3ec] hover:border-[#dc4835]/50 hover:bg-[#edf1f6]"
                                            }`}
                                            role="button"
                                            tabIndex={0}
                                            aria-label="Upload files area. Click or drag files here."
                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                                        >
                                            <Upload className={`w-5 h-5 ${dragActive ? "text-[#dc4835]" : "text-[#5a6472]"}`} />
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-[#222d32]">
                                                    {dragActive ? "Drop files here" : uploadFiles.length > 0 ? "Add more files" : "Drop files or click to browse"}
                                                </p>
                                                <p className="text-[11px] text-[#5a6472] mt-1">
                                                    Any file type — max 50 MB each
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={handleFileInputChange}
                                            tabIndex={-1}
                                        />
                                    </div>
                                )}
                            </fieldset>

                            <button
                                type="submit"
                                disabled={!title || !semesterSeason || !semesterYear || (sourceMode === "url" && !url) || (sourceMode === "file" && (!allFilesDone || anyFileUploading)) || submitting}
                                className="w-full py-2.5 rounded-lg bg-[#dc4835] text-white text-sm font-bold hover:bg-[#c43a2a] focus:outline-none focus:ring-2 focus:ring-[#dc4835]/30 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1 active:scale-[0.98]"
                                aria-label={submitting ? "Creating resources..." : anyFileUploading ? "Waiting for uploads to finish..." : "Upload resource"}
                            >
                                {submitting
                                    ? "Creating resources..."
                                    : anyFileUploading
                                    ? `Uploading ${doneCount}/${uploadFiles.length}...`
                                    : sourceMode === "file" && uploadFiles.length > 0
                                    ? `Upload ${uploadFiles.length} resource${uploadFiles.length > 1 ? "s" : ""}`
                                    : "Upload Resource"}
                            </button>
                        </form>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
