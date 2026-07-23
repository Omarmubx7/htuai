"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface Course {
    name: string;
    code: string;
    ch: number;
}

interface CourseChipsProps {
    courses: Course[];
    selected: string | null;
    onSelect: (code: string | null) => void;
}

export default function CourseChips({ courses, selected, onSelect }: Readonly<CourseChipsProps>) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (activeRef.current && scrollRef.current) {
            const container = scrollRef.current;
            const chip = activeRef.current;
            const scrollLeft = chip.offsetLeft - container.offsetWidth / 2 + chip.offsetWidth / 2;
            container.scrollTo({ left: scrollLeft, behavior: "smooth" });
        }
    }, [selected]);

    return (
        <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide"
            role="listbox"
            aria-label="Select a course"
        >
            <motion.button
                whileTap={{ scale: 0.95 }}
                ref={selected === null ? activeRef : undefined}
                onClick={() => onSelect(null)}
                role="option"
                aria-selected={selected === null}
                className={`relative flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                    selected === null
                        ? "bg-[#0da55a] text-white border-[#0da55a] shadow-sm"
                        : "bg-white text-[#5a6472] border-[#dde3ec] hover:border-[#0da55a] hover:text-[#0da55a]"
                }`}
            >
                All Courses
            </motion.button>

            {courses.map((course) => {
                const isActive = selected === course.code;
                return (
                    <motion.button
                        key={course.code}
                        whileTap={{ scale: 0.95 }}
                        ref={isActive ? activeRef : undefined}
                        onClick={() => onSelect(course.code)}
                        role="option"
                        aria-selected={isActive}
                        className={`relative flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                            isActive
                                ? "bg-[#dc4835] text-white border-[#dc4835] shadow-sm"
                                : "bg-white text-[#5a6472] border-[#dde3ec] hover:border-[#dc4835] hover:text-[#dc4835]"
                        }`}
                    >
                        {course.code}
                        <span className="ml-1 opacity-70 font-normal">{course.name}</span>
                    </motion.button>
                );
            })}
        </div>
    );
}
