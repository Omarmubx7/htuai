"use client";

import { motion } from "framer-motion";
import { CheckCircle2, GraduationCap, LayoutDashboard, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MAJOR_LIST, majorSlug } from "@/lib/majors";
import { CORE_FAQ } from "@/lib/seo";

interface LandingPageProps {
    onGetStarted: () => void;
}

const FEATURES = [
    {
        title: "Course Tracker",
        description: "Monitor your degree progress with automated prerequisite checking and credit hour calculation.",
        icon: <LayoutDashboard className="w-6 h-6 text-[#dc4835]" />,
    },
    {
        title: "HTU Curricula",
        description: "Built-in support for every computing and engineering major at Al Hussein Technical University.",
        icon: <GraduationCap className="w-6 h-6 text-[#43aad7]" />,
    },
    {
        title: "Smart Progress",
        description: "Track your GPA, completed credits, and remaining requirements in real-time.",
        icon: <CheckCircle2 className="w-6 h-6 text-[#0da55a]" />,
    },
];

const STEPS = [
    {
        title: "Pick your HTU major",
        body: "Choose Computer Science, Data Science & AI, Cybersecurity, Game Design, or one of the engineering programs. MUBXAI loads that major's official curriculum.",
    },
    {
        title: "Mark what you have completed",
        body: "Tap a course to mark it complete and enter your grade. MUBXAI recalculates GPA, credit hours and remaining requirements instantly.",
    },
    {
        title: "Plan the rest of your degree",
        body: "Use the semester planner to test grade scenarios, predict CGPA, and see exactly which prerequisites unlock next.",
    },
];

export default function LandingPage({ onGetStarted }: Readonly<LandingPageProps>) {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#edf1f6]">
            <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#edf1f6]" />

            {/* ── Hero ─────────────────────────────────────────────── */}
            <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-10 text-center">
                <header className="w-full max-w-6xl flex justify-end p-4">
                    <button onClick={onGetStarted} className="text-sm text-[#92604c] hover:text-[#222d32] transition-colors">Back to Dashboard</button>
                </header>

                <main className="relative z-10 w-full max-w-6xl flex flex-col items-center text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="pill-badge-premium mb-8 hover:border-[#dc4835]/40 transition-colors cursor-default"
                    >
                        <Image priority src="/mubxai-dark-logo.png" alt="MUBXAI logo" width={16} height={16} className="animate-pulse dark-logo" />
                        <Image priority src="/mubxai-light-logo.png" alt="MUBXAI logo" width={16} height={16} className="animate-pulse light-logo" />
                        Student Success Reimagined
                    </motion.div>

                    <div className="relative mb-6">
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="text-6xl sm:text-7xl md:text-9xl font-black tracking-[-0.04em] leading-[0.9] px-4 uppercase italic"
                        >
                            <span className="text-[#222d32]">MUBXAI</span>
                        </motion.h1>
                    </div>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="text-base md:text-xl text-[#92604c] max-w-3xl mb-6 font-medium leading-relaxed px-6 tracking-tight"
                    >
                        The free GPA calculator and academic tracker for{" "}
                        <strong className="font-bold text-[#222d32]">Al Hussein Technical University (HTU)</strong>{" "}
                        students — plan every semester from enrollment to graduation.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="flex items-center gap-2 mb-14 px-4 py-1.5 rounded-full bg-[#edf1f6] border border-[#dde3ec] text-xs font-bold text-[#92604c] uppercase tracking-[0.2em] select-none"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#dc4835] animate-pulse" />
                        Powered by Google Gemini
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 w-full px-4">
                        {FEATURES.map((feature, i) => (
                            <motion.button
                                key={feature.title}
                                onClick={() => onGetStarted()}
                                layout
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -10, scale: 1.02 }}
                                transition={{
                                    delay: 0.3 + (i * 0.1),
                                    duration: 0.6,
                                    ease: [0.16, 1, 0.3, 1]
                                }}
                                className="premium-card p-10 text-left group cursor-pointer rounded-2xl"
                            >
                                <div className="mb-8 p-4 rounded-[22px] bg-[#edf1f6] w-fit border border-[#dde3ec] group-hover:bg-[#dde3ec] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-xs">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-[#222d32] mb-3 tracking-tight group-hover:text-[#dc4835] transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-[#92604c] leading-relaxed font-medium group-hover:text-[#222d32]/85 transition-colors">
                                    {feature.description}
                                </p>
                            </motion.button>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="flex flex-col items-center gap-8"
                    >
                        <div className="relative group">
                            <motion.button
                                onClick={onGetStarted}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                className="relative px-12 py-5 rounded-lg bg-[#dc4835] text-white font-black text-xl transition-all flex items-center gap-4 hover:bg-[#fe1f11]"
                            >
                                Start Tracking Progress
                                <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-2" />
                            </motion.button>
                        </div>

                        <div className="flex items-center gap-6 text-[11px] font-bold text-[#222d32]/30 uppercase tracking-[0.3em] select-none">
                            <div className="flex items-center gap-2 group cursor-default">
                                <CheckCircle2 className="w-4 h-4 text-[#0da55a]/40 group-hover:text-[#0da55a] transition-colors" />
                                <span className="group-hover:text-[#222d32]/60 transition-colors">100% Free</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#222d32]/20" />
                            <div className="flex items-center gap-2 group cursor-default">
                                <GraduationCap className="w-5 h-5 text-[#dc4835]/40 group-hover:text-[#dc4835] transition-colors" />
                                <span className="group-hover:text-[#222d32]/60 transition-colors">HTU Curricula</span>
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>

            {/* ── Crawlable content below the fold ─────────────────── */}
            <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24 pt-20">
                <section className="mb-20" aria-labelledby="what-is-mubxai">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#dc4835]">What is MUBXAI?</p>
                    <h2 id="what-is-mubxai" className="mb-5 text-3xl font-black tracking-tight text-[#222d32] md:text-4xl">
                        A free academic tracker built around the HTU curriculum
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <p className="text-sm leading-relaxed text-[#5a6472]">
                            MUBXAI (also written <strong className="text-[#222d32]">MUBX AI</strong>) is an independent academic
                            planning tool for students at <strong className="text-[#222d32]">Al Hussein Technical University
                            (HTU)</strong> in Amman, Jordan. It replaces scattered notes and spreadsheets with one dashboard for
                            completed courses, GPA, CGPA, prerequisites and degree progress.
                        </p>
                        <p className="text-sm leading-relaxed text-[#5a6472]">
                            The platform uses HTU&apos;s 4-point grading scale — D = 4.0, M = 3.2, P = 2.4 and U = 0.0 — and
                            excludes planned or in-progress courses from GPA until a grade is entered. It is free, has no
                            premium tier, and is built by <a href="https://mubx.dev" className="font-semibold text-[#dc4835] underline-offset-2 hover:underline">MUBX</a>.
                        </p>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link href="/gpa-calculator" className="rounded-lg border border-[#dde3ec] bg-white px-4 py-2 text-xs font-bold text-[#222d32] transition-colors hover:border-[#dc4835]/40 hover:text-[#dc4835]">
                            Open the HTU GPA calculator
                        </Link>
                        <Link href="/courses" className="rounded-lg border border-[#dde3ec] bg-white px-4 py-2 text-xs font-bold text-[#222d32] transition-colors hover:border-[#dc4835]/40 hover:text-[#dc4835]">
                            Browse the HTU course catalog
                        </Link>
                        <Link href="/majors" className="rounded-lg border border-[#dde3ec] bg-white px-4 py-2 text-xs font-bold text-[#222d32] transition-colors hover:border-[#dc4835]/40 hover:text-[#dc4835]">
                            Explore HTU majors
                        </Link>
                    </div>
                </section>

                <section className="mb-20" aria-labelledby="how-it-works">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#dc4835]">How it works</p>
                    <h2 id="how-it-works" className="mb-8 text-3xl font-black tracking-tight text-[#222d32] md:text-4xl">
                        Three steps to a clearer degree plan
                    </h2>
                    <div className="grid gap-5 md:grid-cols-3">
                        {STEPS.map((step, index) => (
                            <div key={step.title} className="rounded-2xl border border-[#dde3ec] bg-white p-6">
                                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#dc4835]/10 text-sm font-black text-[#dc4835]">
                                    {index + 1}
                                </span>
                                <h3 className="mb-2 text-lg font-bold text-[#222d32]">{step.title}</h3>
                                <p className="text-sm leading-relaxed text-[#5a6472]">{step.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-20" aria-labelledby="supported-majors">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#dc4835]">Supported majors</p>
                    <h2 id="supported-majors" className="mb-8 text-3xl font-black tracking-tight text-[#222d32] md:text-4xl">
                        Every HTU computing and engineering program
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {MAJOR_LIST.map((major) => (
                            <Link
                                key={major.key}
                                href={`/majors/${majorSlug(major.key)}`}
                                className="group rounded-xl border border-[#dde3ec] bg-white p-4 transition-colors hover:border-[#dc4835]/40"
                            >
                                <span className="block text-sm font-bold text-[#222d32] group-hover:text-[#dc4835]">{major.label}</span>
                                <span className="mt-1 block text-[11px] font-medium leading-snug text-[#5a6472]">{major.description}</span>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="mb-20" aria-labelledby="faq">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#dc4835]">FAQ</p>
                    <h2 id="faq" className="mb-8 text-3xl font-black tracking-tight text-[#222d32] md:text-4xl">
                        Frequently asked questions
                    </h2>
                    <div className="divide-y divide-[#dde3ec] rounded-2xl border border-[#dde3ec] bg-white">
                        {CORE_FAQ.map((item) => (
                            <details key={item.question} className="group px-6 py-5">
                                <summary className="cursor-pointer list-none text-sm font-bold text-[#222d32] marker:hidden group-open:text-[#dc4835]">
                                    {item.question}
                                </summary>
                                <p className="mt-3 text-sm leading-relaxed text-[#5a6472]">{item.answer}</p>
                            </details>
                        ))}
                    </div>
                </section>

                <section aria-labelledby="about-mubxai" className="rounded-2xl border border-[#dde3ec] bg-white p-8">
                    <h2 id="about-mubxai" className="mb-3 text-2xl font-black tracking-tight text-[#222d32]">
                        Built by students, for HTU students
                    </h2>
                    <p className="mb-4 max-w-3xl text-sm leading-relaxed text-[#5a6472]">
                        MUBXAI is built and maintained by Omar Mubaidin and the team at MUBX. It is an independent project and
                        is not operated or endorsed by Al Hussein Technical University. Always confirm official results with
                        HTU academic records.
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs font-bold">
                        <Link href="/about" className="text-[#dc4835] hover:underline">About MUBXAI</Link>
                        <span className="text-[#dde3ec]">•</span>
                        <Link href="/faq" className="text-[#dc4835] hover:underline">Full FAQ</Link>
                        <span className="text-[#dde3ec]">•</span>
                        <Link href="/for-ai" className="text-[#dc4835] hover:underline">For AI assistants</Link>
                    </div>
                </section>
            </div>
        </div>
    );
}
