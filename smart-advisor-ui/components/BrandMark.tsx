"use client";

type BrandMarkProps = {
    className?: string;
    size?: "sm" | "md" | "lg";
    showWordmark?: boolean;
};

export default function BrandMark({ className = "", size = "md", showWordmark = false }: Readonly<BrandMarkProps>) {
    const boxSize = size === "sm" ? "w-6 h-6" : size === "lg" ? "w-14 h-14" : "w-10 h-10";
    const textSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-base" : "text-sm";

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            <div className={`${boxSize} rounded-2xl bg-linear-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_0_20px_rgba(139,92,246,0.2)] flex items-center justify-center text-white font-black`}>M</div>
            {showWordmark && <span className={`${textSize} font-black tracking-[0.2em] uppercase text-white/80`}>MUBXAI</span>}
        </div>
    );
}