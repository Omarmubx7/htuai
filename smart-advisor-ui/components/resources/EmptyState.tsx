"use client";

import { motion } from "framer-motion";
import { BookOpen, Search, Upload, Heart } from "lucide-react";

interface EmptyStateProps {
    type: "no-search" | "no-results" | "no-resources";
    courseName?: string;
    query?: string;
    onUpload?: () => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function EmptyState({ type, courseName, query, onUpload }: Readonly<EmptyStateProps>) {
    if (type === "no-results") {
        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col items-center justify-center py-20 px-4 text-center"
                role="status"
                aria-label="No matching resources found"
            >
                <motion.div variants={itemVariants} className="w-16 h-16 rounded-2xl bg-[#edf1f6] flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-[#5a6472]" />
                </motion.div>
                <motion.h3 variants={itemVariants} className="text-base font-bold text-[#222d32] mb-1">
                    No matching resources
                </motion.h3>
                <motion.p variants={itemVariants} className="text-sm text-[#5a6472] max-w-xs">
                    {query ? <>Nothing found for &ldquo;{query}&rdquo;. </> : null}Try a different keyword, course code, or check the spelling.
                </motion.p>
            </motion.div>
        );
    }

    if (type === "no-resources") {
        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col items-center justify-center py-20 px-4 text-center"
                role="status"
                aria-label={`No resources available for ${courseName || "this course"}`}
            >
                <motion.div variants={itemVariants} className="w-16 h-16 rounded-2xl bg-[#edf1f6] flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-[#5a6472]" />
                </motion.div>
                <motion.h3 variants={itemVariants} className="text-base font-bold text-[#222d32] mb-1">
                    No resources yet{courseName ? ` for ${courseName}` : ""}
                </motion.h3>
                <motion.p variants={itemVariants} className="text-sm text-[#5a6472] max-w-xs mb-4">
                    No one's shared yet. Help your classmates — upload one now.
                </motion.p>
                {onUpload && (
                    <motion.button
                        variants={itemVariants}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onUpload}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#dc4835] text-white text-sm font-bold hover:bg-[#c43a2a] transition-colors shadow-sm"
                        aria-label="Upload a resource"
                    >
                        <Upload className="w-4 h-4" />
                        Upload Resource
                    </motion.button>
                )}
                <motion.div variants={itemVariants} className="mt-4 flex items-center gap-1.5 text-[11px] text-[#5a6472]">
                    <Heart className="w-3.5 h-3.5 text-[#dc4835]" />
                    <span>Built by students, for students — MubxAI</span>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
            role="status"
            aria-label="Search for a course to find resources"
        >
            <motion.div variants={itemVariants} className="w-16 h-16 rounded-2xl bg-[#edf1f6] flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-[#5a6472]" />
            </motion.div>
            <motion.h3 variants={itemVariants} className="text-base font-bold text-[#222d32] mb-1">
                Find course resources
            </motion.h3>
            <motion.p variants={itemVariants} className="text-sm text-[#5a6472] max-w-xs mb-2">
                Search for a course to browse PDFs, videos, links, and more.
            </motion.p>
            <motion.div variants={itemVariants} className="flex items-center gap-1.5 text-[11px] text-[#5a6472]">
                <Heart className="w-3.5 h-3.5 text-[#dc4835]" />
                <span>Share, upload, help your classmates — MubxAI</span>
            </motion.div>
        </motion.div>
    );
}
