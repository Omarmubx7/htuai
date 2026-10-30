import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import GpaCalculator from "@/components/GpaCalculator";
import { breadcrumbSchema, faqSchema, HTU_GRADING_SCALE, SITE_URL } from "@/lib/seo";

const PAGE_PATH = "/gpa-calculator";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = {
    title: "HTU GPA Calculator — Free 4.0 Scale Calculator",
    description:
        "Free GPA and CGPA calculator for Al Hussein Technical University (HTU) students. Enter your courses, credit hours and D/M/P/U grades to calculate your semester GPA and cumulative GPA instantly.",
    keywords: [
        "HTU GPA calculator",
        "Al Hussein Technical University GPA calculator",
        "HTU CGPA calculator",
        "MUBXAI GPA calculator",
        "university GPA calculator Jordan",
        "4.0 GPA calculator",
    ],
    alternates: { canonical: PAGE_URL },
    openGraph: {
        title: "HTU GPA Calculator — MUBXAI",
        description:
            "Calculate your HTU semester GPA and CGPA on the official 4-point D/M/P/U scale. Free, no sign-up.",
        url: PAGE_URL,
        type: "website",
    },
};

const FAQ = [
    {
        question: "How is GPA calculated at HTU?",
        answer:
            "HTU uses a 4-point scale where D = 4.0, M = 3.2, P = 2.4 and U = 0.0. Multiply each course's grade points by its credit hours, add the results, then divide by the total graded credit hours.",
    },
    {
        question: "Does this calculator include in-progress courses?",
        answer:
            "No. Only courses with a grade are counted. Courses marked as in progress or planned are excluded until a final grade is entered, which matches how HTU reports GPA.",
    },
    {
        question: "What is the difference between GPA and CGPA?",
        answer:
            "GPA usually refers to one semester. CGPA is cumulative across every completed semester. Enter your prior credits and prior GPA in the second section to estimate your new CGPA after this semester.",
    },
    {
        question: "Is this the official HTU calculator?",
        answer:
            "No. This is an independent tool built by MUBXAI. It follows the published HTU grading scale but is not operated by the university. Always confirm official results with HTU student records.",
    },
];

export default function GpaCalculatorPage() {
    return (
        <ContentPage
            eyebrow="Free tool"
            title="HTU GPA Calculator"
            lede="Calculate your semester GPA and cumulative GPA on the Al Hussein Technical University 4-point scale. Enter each course, its credit hours and your grade — the result updates as you type."
            width="wide"
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@graph": [
                            breadcrumbSchema([
                                { name: "Home", path: "/" },
                                { name: "GPA Calculator", path: PAGE_PATH },
                            ]),
                            faqSchema(FAQ),
                        ],
                    }),
                }}
            />

            <GpaCalculator />

            <section aria-labelledby="grading-scale" className="space-y-4">
                <h2 id="grading-scale" className="text-2xl font-black tracking-tight text-[#222d32]">
                    The HTU grading scale
                </h2>
                <div className="overflow-hidden rounded-2xl border border-[#dde3ec] bg-white">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-[#dde3ec] bg-[#edf1f6] text-left text-[11px] font-black uppercase tracking-[0.16em] text-[#5a6472]">
                                <th scope="col" className="px-5 py-3">Grade</th>
                                <th scope="col" className="px-5 py-3">Meaning</th>
                                <th scope="col" className="px-5 py-3">Grade points</th>
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
                <p className="text-sm text-[#5a6472]">
                    GPA = Σ(grade points × credit hours) ÷ Σ(graded credit hours). A course with 3 credit
                    hours and a grade of M contributes 3 × 3.2 = 9.6 quality points.
                </p>
            </section>

            <section aria-labelledby="gpa-faq" className="space-y-4">
                <h2 id="gpa-faq" className="text-2xl font-black tracking-tight text-[#222d32]">
                    GPA calculator questions
                </h2>
                <div className="divide-y divide-[#dde3ec] rounded-2xl border border-[#dde3ec] bg-white">
                    {FAQ.map((item) => (
                        <details key={item.question} className="group px-6 py-5">
                            <summary className="cursor-pointer list-none text-sm font-bold text-[#222d32] marker:hidden group-open:text-[#dc4835]">
                                {item.question}
                            </summary>
                            <p className="mt-3 text-sm leading-relaxed text-[#5a6472]">{item.answer}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-[#dde3ec] bg-white p-6">
                <h2 className="text-lg font-bold text-[#222d32]">Track every semester, not just one</h2>
                <p className="mt-2 text-sm text-[#5a6472]">
                    The calculator handles one semester at a time. MUBXAI keeps a permanent record of your
                    courses, grades and CGPA, checks prerequisites and shows what is left to graduate.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
                    <Link href="/courses" className="text-[#dc4835] hover:underline">Browse the course catalog</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/majors" className="text-[#dc4835] hover:underline">See your major&apos;s curriculum</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/" className="text-[#dc4835] hover:underline">Open the tracker</Link>
                </div>
            </section>
        </ContentPage>
    );
}
