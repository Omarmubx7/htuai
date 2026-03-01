"use client";

import { useState, useEffect } from "react";
import { safeStorage } from "./safe-storage";

export type MajorKey = "data_science" | "computer_science" | "cybersecurity" | "game_design" | "electrical_engineering" | "energy_engineering" | "industrial_engineering" | "mechanical_engineering";

export interface Major {
    key: MajorKey;
    label: string;
    description: string;
    icon: string;
    color: string;
    school: "Engineering" | "Computing";
}

export const MAJORS: Major[] = [
    {
        key: "data_science",
        label: "Data Science & AI",
        description: "Machine Learning, Analytics, and Artificial Intelligence",
        icon: "🧠",
        color: "from-blue-500 to-purple-600",
        school: "Computing",
    },
    {
        key: "computer_science",
        label: "Computer Science",
        description: "Software Engineering, Algorithms, and Systems",
        icon: "💻",
        color: "from-emerald-500 to-teal-600",
        school: "Computing",
    },
    {
        key: "cybersecurity",
        label: "Cybersecurity",
        description: "Network Security, Ethical Hacking, and Cryptography",
        icon: "🔐",
        color: "from-orange-500 to-red-600",
        school: "Computing",
    },
    {
        key: "game_design",
        label: "Game Design",
        description: "Game Mechanics, Graphics, and Interactive Design",
        icon: "🎮",
        color: "from-pink-500 to-rose-600",
        school: "Computing",
    },
    {
        key: "electrical_engineering",
        label: "Electrical Engineering",
        description: "Power Systems, Electronics, and Control Systems",
        icon: "⚡",
        color: "from-yellow-400 to-amber-500",
        school: "Engineering",
    },
    {
        key: "energy_engineering",
        label: "Energy Engineering",
        description: "Renewable Energy, Power Generation, and Sustainability",
        icon: "🔋",
        color: "from-lime-500 to-emerald-600",
        school: "Engineering",
    },
    {
        key: "industrial_engineering",
        label: "Industrial Engineering",
        description: "Optimization, Logistics, and Manufacturing Systems",
        icon: "🏭",
        color: "from-slate-400 to-gray-500",
        school: "Engineering",
    },
    {
        key: "mechanical_engineering",
        label: "Mechanical Engineering",
        description: "Thermodynamics, Robotics, and Machine Design",
        icon: "⚙️",
        color: "from-blue-500 to-indigo-600",
        school: "Engineering",
    },
];

const STORAGE_KEY = "htu_selected_major";

export function useMajor() {
    const [major, setMajorState] = useState<MajorKey | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            const saved = safeStorage.get(STORAGE_KEY) as MajorKey | null;
            if (saved && MAJORS.find((m) => m.key === saved)) {
                setMajorState(saved);
            }
            setLoaded(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const setMajor = (key: MajorKey) => {
        safeStorage.set(STORAGE_KEY, key);
        setMajorState(key);
    };

    const clearMajor = () => {
        safeStorage.remove(STORAGE_KEY);
        setMajorState(null);
    };

    return { major, setMajor, clearMajor, loaded };
}
