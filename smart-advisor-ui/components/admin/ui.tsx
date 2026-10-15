"use client";

import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

/* ── Card ─────────────────────────────────────────────────────────── */

export function AdminCard({
    title,
    description,
    icon,
    children,
    className = "",
}: Readonly<{
    title?: string;
    description?: string;
    icon?: ReactNode;
    children: ReactNode;
    className?: string;
}>) {
    return (
        <section className={`rounded-2xl border border-[#dde3ec] bg-white shadow-sm ${className}`}>
            {(title || description) && (
                <header className="flex items-start gap-3 border-b border-[#edf1f6] px-5 py-4">
                    {icon && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#dc4835]/10 text-[#dc4835]">
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        {title && <h2 className="text-sm font-bold text-[#222d32]">{title}</h2>}
                        {description && (
                            <p className="mt-0.5 text-xs text-[#5a6472]">{description}</p>
                        )}
                    </div>
                </header>
            )}
            <div className="p-5">{children}</div>
        </section>
    );
}

/* ── Field wrapper ────────────────────────────────────────────────── */

export function Field({
    label,
    hint,
    children,
}: Readonly<{ label: string; hint?: string; children: ReactNode }>) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#5a6472]">
                {label}
            </span>
            {children}
            {hint && <span className="mt-1 block text-[11px] text-[#5a6472]">{hint}</span>}
        </label>
    );
}

/* ── Inputs ───────────────────────────────────────────────────────── */

const inputClasses =
    "w-full rounded-xl border border-[#dde3ec] bg-white px-3 py-2 text-sm text-[#222d32] placeholder:text-[#5a6472]/60 outline-none transition focus:border-[#dc4835]/40 focus:ring-2 focus:ring-[#dc4835]/25";

export function TextInput(props: Readonly<InputHTMLAttributes<HTMLInputElement>>) {
    return <input {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

export function TextArea(props: Readonly<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
    return <textarea {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

/* ── Toggle ───────────────────────────────────────────────────────── */

export function Toggle({
    checked,
    onChange,
    label,
    description,
    disabled,
}: Readonly<{
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description?: string;
    disabled?: boolean;
}>) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-[#222d32]">{label}</p>
                {description && <p className="mt-0.5 text-xs text-[#5a6472]">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    checked ? "bg-[#dc4835]" : "bg-[#c9d2de]"
                }`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        checked ? "translate-x-5" : "translate-x-0.5"
                    }`}
                />
            </button>
        </div>
    );
}

/* ── Button ───────────────────────────────────────────────────────── */

export function AdminButton({
    children,
    onClick,
    variant = "primary",
    disabled,
    type = "button",
}: Readonly<{
    children: ReactNode;
    onClick?: () => void;
    variant?: "primary" | "ghost" | "danger";
    disabled?: boolean;
    type?: "button" | "submit";
}>) {
    const styles: Record<string, string> = {
        primary: "bg-[#dc4835] text-white hover:bg-[#c43a2a]",
        ghost: "bg-white text-[#222d32] border border-[#dde3ec] hover:bg-[#edf1f6]",
        danger: "bg-[#dc4835]/10 text-[#dc4835] hover:bg-[#dc4835]/20",
    };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
        >
            {children}
        </button>
    );
}
