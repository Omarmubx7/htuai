"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

interface Toast {
    id: string;
    message: string;
    type: "success" | "error" | "info";
}

interface ToastContextType {
    toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-300 flex flex-col gap-3 pointer-events-none max-w-md">
                <AnimatePresence>
                    {toasts.map(t => (
                        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const icon = toast.type === "success"
        ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        : toast.type === "error"
            ? <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            : <Info className="w-5 h-5 text-blue-400 shrink-0" />;

    const bgColor = toast.type === "success"
        ? "bg-emerald-500/15 border-emerald-500/40"
        : toast.type === "error"
            ? "bg-red-500/15 border-red-500/40"
            : "bg-blue-500/15 border-blue-500/40";

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl border ${bgColor} shadow-2xl backdrop-blur-sm`}
        >
            {icon}
            <span className="text-sm font-semibold text-white flex-1">{toast.message}</span>
            <button onClick={onDismiss} className="text-white/40 hover:text-white/80 transition-colors shrink-0">
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
