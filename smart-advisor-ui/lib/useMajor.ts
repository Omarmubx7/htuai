"use client";

import { useState } from "react";
import { safeStorage } from "./safe-storage";
import { MAJOR_LIST, type Major, type MajorKey } from "./majors";

export type { Major, MajorKey };

export const MAJORS: Major[] = MAJOR_LIST;

const STORAGE_KEYS = ["htu_selected_major", "mubxai-major"];

function readStoredMajor(): MajorKey | null {
    for (const k of STORAGE_KEYS) {
        const v = safeStorage.get(k);
        if (v && MAJORS.find(m => m.key === v)) return v as MajorKey;
    }
    return null;
}

export function useMajor() {
    const [major, setMajorState] = useState<MajorKey | null>(() => {
        if (typeof window === 'undefined') return null;
        return readStoredMajor();
    });

    const setMajor = (key: MajorKey) => {
        for (const k of STORAGE_KEYS) safeStorage.set(k, key);
        setMajorState(key);
    };

    const clearMajor = () => {
        for (const k of STORAGE_KEYS) safeStorage.remove(k);
        setMajorState(null);
    };

    return { major, setMajor, clearMajor, loaded: true };
}
