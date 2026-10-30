import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { breadcrumbSchema, HTU_GRADING_SCALE, SITE_URL } from "@/lib/seo";

const PAGE_PATH = "/how-it-works";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = {
    title: "How MUBXAI Works — HTU Course Tracking & GPA Planning",
    description:
        "How MUBXAI tracks your HTU degree: pick a major, mark completed courses, calculate GPA and CGPA, check prerequisites and plan future semesters. A step-by-step guide to the free academic tracker.",
    keywords: [
        "how MUBXAI works",
        "HTU course tracker guide",
        "HTU degree progress",
        "prerequisite checker HTU",
        "semester planner HTU",
    ],
    alternates: { canonical: PAGE_URL },
    openGraph: {
        title: "How MUBXAI Works",
        description:
            "A step-by-step guide to tracking your HTU degree, GPA and prerequisites with MUBXAI.",
        url: PAGE_URL,
        type: "website",
    },
};

const STEPS = [
    {
        title: "1. Choose your HTU major",
        body: "MUBXAI loads the curriculum for your program — core courses, electives, university and college requirements, credit hours and prerequisite links. Eight majors are supported, from Computer Science to Mechanical Engineering.",
        link: { href: "/majors", label: "See the majors" },
    },
    {
        title: "2. Mark what you have completed",
        body: "Tap a course to mark it complete and enter your grade on the HTU D/M/P/U scale. MUBXAI immediately recalculates completed credits, remaining requirements and your GPA per requirement category.",
        link: { href: "/gpa-calculator", label: "Try the GPA calculator" },
    },
    {
        title: "3. See what you can take next",
        body: "Every course knows its prerequisites. MUBXAI highlights courses whose prerequisites are satisfied and shows the chain that unlocks the ones that are not, so you never plan a semester around a locked course.",
        link: { href: "/courses", label: "Browse the catalog" },
    },
    {
        title: "4. Plan and predict",
        body: "The semester planner lets you add courses, enter expected grades and preview the GPA and CGPA outcome before finals. Study sessions can be logged and synced to Google Calendar.",
        link: { href: "/", label: "Open the planner" },
    },
];

export default function HowItWorksPage() {
    return (
        <ContentPage
            eyebrow="Guide"
            title="How MUBXAI works"
            lede="MUBXAI turns the HTU study plan into a live dashboard. Here is exactly what it does, step by step."
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@graph": [
                            breadcrumbSchema([
                                { name: "Home", path: "/" },
                                { name: "How It Works", path: PAGE_PATH },
                            ]),
                            {
                                "@type": "HowTo",
                                name: "How to track your HTU degree with MUBXAI",
                                description:
                                    "Use MUBXAI to track completed HTU courses, calculate GPA and CGPA, check prerequisites and plan future semesters.",
                                totalTime: "PT10M",
                                step: STEPS.map((step) => ({
                                    "@type": "HowToStep",
                                    name: step.title.replace(/^\d+\.\s*/, ""),
                                    text: step.body,
                                })),
                            },
                        ],
                    }),
                }}
            />

            <section aria-labelledby="steps" className="space-y-5">
                <h2 id="steps" className="text-2xl font-black tracking-tight text-[#222d32]">
                    Four steps from transcript to plan
                </h2>
                <ol className="space-y-4">
                    {STEPS.map((step) => (
                        <li key={step.title} className="rounded-2xl border border-[#dde3ec] bg-white p-6">
                            <h3 className="text-lg font-bold text-[#222d32]">{step.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-[#5a6472]">{step.body}</p>
                            <Link
                                href={step.link.href}
                                className="mt-3 inline-block text-xs font-bold text-[#dc4835] hover:underline"
                            >
                                {step.link.label} →
                            </Link>
                        </li>
                    ))}
                </ol>
            </section>

            <section aria-labelledby="grading" className="space-y-4">
                <h2 id="grading" className="text-2xl font-black tracking-tight text-[#222d32]">
                    The grading math
                </h2>
                <p className="text-sm leading-relaxed text-[#5a6472]">
                    HTU does not use letter grades. Each course receives D, M, P or U, and GPA is weighted by
                    credit hours:
                </p>
                <div className="overflow-hidden rounded-2xl border border-[#dde3ec] bg-white">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-[#dde3ec] bg-[#edf1f6] text-left text-[11px] font-black uppercase tracking-[0.16em] text-[#5a6472]">
                                <th scope="col" className="px-5 py-3">Grade</th>
                                <th scope="col" className="px-5 py-3">Meaning</th>
                                <th scope="col" className="px-5 py-3">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {HTU_GRADING_SCALE.map((entry) => (
                                <tr key={entry.grade} className="border-b border-[#dde3ec] last:border-0">
                                    <td className="px-5 py-3 font-black text-[#222d32]">{entry.grade}</td>
                                    <td className="px-5 py-3 text-[#5a6472]">{entry.label}</td>
                                    <td className="px-5 py-3 tabular-nums font-bold text-[#222d32]">{entry.points.toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="rounded-2xl border border-[#dde3ec] bg-white p-5 text-sm leading-relaxed text-[#5a6472]">
                    <strong className="text-[#222d32]">GPA</strong> = Σ(grade points × credit hours) ÷ Σ(graded credit hours).
                    Courses that are in progress or only planned are excluded from the calculation until a grade is
                    entered.
                </p>
            </section>

            <section aria-labelledby="what-you-get" className="space-y-4">
                <h2 id="what-you-get" className="text-2xl font-black tracking-tight text-[#222d32]">
                    What you get
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                    {[
                        "Live GPA and CGPA on the HTU 4-point scale",
                        "Completed vs remaining credit hours by requirement group",
                        "Prerequisite checking for every course",
                        "Semester planner with grade prediction",
                        "Study session logging with streaks and XP",
                        "Google Calendar sync for exams and study blocks",
                    ].map((item) => (
                        <li key={item} className="rounded-xl border border-[#dde3ec] bg-white px-4 py-3 text-sm font-medium text-[#5a6472]">
                            {item}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="rounded-2xl border border-[#dde3ec] bg-white p-6">
                <h2 className="text-lg font-bold text-[#222d32]">Start tracking</h2>
                <p className="mt-2 text-sm text-[#5a6472]">
                    It takes about two minutes to enter a transcript and see the rest of your degree.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
                    <Link href="/" className="text-[#dc4835] hover:underline">Open MUBXAI</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/gpa-calculator" className="text-[#dc4835] hover:underline">GPA calculator</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/majors" className="text-[#dc4835] hover:underline">Majors</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/faq" className="text-[#dc4835] hover:underline">FAQ</Link>
                </div>
            </section>
        </ContentPage>
    );
}
