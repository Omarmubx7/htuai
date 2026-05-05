"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { safeStorage } from "@/lib/safe-storage";

type ThemeContextType = {
    isLightMode: boolean;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
    isLightMode: false,
    toggleTheme: () => { },
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [isLightMode, setIsLightMode] = useState(false);

    useEffect(() => {
        const stored = safeStorage.get("mubxai-theme");
        if (stored === "light") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLightMode(true);
            document.documentElement.classList.add("light-theme");
        }
    }, []);

    const toggleTheme = () => {
        setIsLightMode((prev) => {
            const next = !prev;
            if (next) {
                document.documentElement.classList.add("light-theme");
                safeStorage.set("mubxai-theme", "light");
            } else {
                document.documentElement.classList.remove("light-theme");
                safeStorage.set("mubxai-theme", "dark");
            }
            return next;
        });
    };

    const value = React.useMemo(() => ({ isLightMode, toggleTheme }), [isLightMode]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}
