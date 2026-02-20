"use client";

import { useState, useEffect } from "react";

export type MajorKey = "data_science" | "computer_science" | "cybersecurity" | "game_design";

export const MAJORS: { key: MajorKey; label: string; description: string; icon: string; color: string }[] = [
    {
        key: "data_science",
        label: "Data Science & AI",
        description: "Machine Learning, Analytics, and Artificial Intelligence",
        icon: "🧠",
        color: "from-blue-500 to-purple-600",
    },
    {
        key: "computer_science",
        label: "Computer Science",
        description: "Software Engineering, Algorithms, and Systems",
        icon: "💻",
        color: "from-emerald-500 to-teal-600",
    },
    {
        key: "cybersecurity",
        label: "Cybersecurity",
        description: "Network Security, Ethical Hacking, and Cryptography",
        icon: "🔐",
        color: "from-orange-500 to-red-600",
    },
    {
        key: "game_design",
        label: "Game Design",
        description: "Game Mechanics, Graphics, and Interactive Design",
        icon: "🎮",
        color: "from-pink-500 to-rose-600",
    },
];

const STORAGE_KEY = "htu_selected_major";

export function useMajor() {
    const [major, setMajorState] = useState<MajorKey | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY) as MajorKey | null;
        if (saved && MAJORS.find((m) => m.key === saved)) {
            setMajorState(saved);
        }
        setLoaded(true);
    }, []);

    const setMajor = (key: MajorKey) => {
        localStorage.setItem(STORAGE_KEY, key);
        setMajorState(key);
    };

    const clearMajor = () => {
        localStorage.removeItem(STORAGE_KEY);
        setMajorState(null);
    };

    return { major, setMajor, clearMajor, loaded };
}
