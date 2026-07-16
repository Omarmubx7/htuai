"use client";

type BrandMarkProps = {
    className?: string;
    size?: "sm" | "md" | "lg";
    showWordmark?: boolean;
};

export default function BrandMark({ className = "", size = "md", showWordmark = false }: Readonly<BrandMarkProps>) {
    const getBoxSize = (s: string) => {
        if (s === "sm") return "w-6 h-6";
        if (s === "lg") return "w-14 h-14";
        return "w-10 h-10";
    };
    const getTextSize = (s: string) => {
        if (s === "sm") return "text-xs";
        if (s === "lg") return "text-base";
        return "text-sm";
    };
    const boxSize = getBoxSize(size);
    const textSize = getTextSize(size);

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            <div className={`${boxSize} rounded-lg bg-[#dc4835] flex items-center justify-center text-white font-black`} style={{ boxShadow: '0 2px 6px rgba(220,72,53,0.2)' }}>M</div>
            {showWordmark && <span className={`${textSize} font-black tracking-[0.2em] uppercase text-[#222d32]`}>MUBXAI</span>}
        </div>
    );
}