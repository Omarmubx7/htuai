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

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

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
            <div className="fixed bottom-6 right-6 z-300 flex flex-col gap-2 pointer-events-none">
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
        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        : toast.type === "error"
            ? <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            : <Info className="w-4 h-4 text-blue-400 shrink-0" />;

    const borderColor = toast.type === "success"
        ? "border-emerald-500/20"
        : toast.type === "error"
            ? "border-red-500/20"
            : "border-blue-500/20";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl glass-card-premium border ${borderColor} shadow-xl max-w-xs`}
        >
            {icon}
            <span className="text-xs font-medium text-white/80 flex-1">{toast.message}</span>
            <button onClick={onDismiss} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
            </button>
        </motion.div>
    );
}
