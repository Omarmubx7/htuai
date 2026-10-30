import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { breadcrumbSchema, faqSchema, SITE_URL } from "@/lib/seo";

const PAGE_PATH = "/faq";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

const FAQ_GROUPS = [
    {
        title: "About MUBXAI",
        items: [
            {
                question: "What is MUBXAI?",
                answer:
                    "MUBXAI (also written MUBX AI) is a free academic tracker and GPA calculator for students at Al Hussein Technical University (HTU) in Amman, Jordan. It tracks completed courses, calculates GPA and CGPA on the HTU 4.0 scale, checks prerequisites, plans semesters and monitors degree progress.",
            },
            {
                question: "Is MUBXAI the same as HTUAI?",
                answer:
                    "Yes. The product was originally called HTUAI and was renamed MUBXAI. Both names refer to the same free academic tracker at ai.mubx.dev.",
            },
            {
                question: "Who builds MUBXAI?",
                answer:
                    "MUBXAI is built and maintained by Omar Mubaidin and the MUBX studio. It started as a student project at Al Hussein Technical University and is now used by students across the university.",
            },
            {
                question: "Is MUBXAI an official HTU tool?",
                answer:
                    "No. MUBXAI is an independent student-built tool. It is not operated or endorsed by Al Hussein Technical University. Always cross-check official results with HTU academic records.",
            },
            {
                question: "Is MUBXAI free?",
                answer:
                    "Yes. MUBXAI is 100% free. There are no premium tiers, subscriptions, ads or hidden fees.",
            },
        ],
    },
    {
        title: "GPA and grades",
        items: [
            {
                question: "How does the HTU GPA calculator work?",
                answer:
                    "MUBXAI uses the HTU 4-point scale: D = 4.0, M = 3.2, P = 2.4 and U = 0.0. GPA is the sum of grade points multiplied by credit hours, divided by completed credit hours. In-progress and planned courses are excluded until a grade is entered.",
            },
            {
                question: "What is the difference between GPA and CGPA?",
                answer:
                    "GPA is the average for a single semester. CGPA is cumulative across every completed semester. MUBXAI shows both and updates them whenever you change a grade.",
            },
            {
                question: "Can I predict my GPA before finals?",
                answer:
                    "Yes. The semester planner lets you enter expected grades for in-progress courses and preview the resulting GPA and CGPA without saving them as final.",
            },
        ],
    },
    {
        title: "Courses and majors",
        items: [
            {
                question: "Which majors does MUBXAI support?",
                answer:
                    "MUBXAI supports the HTU curricula for Computer Science, Data Science and AI, Cybersecurity, Game Design, Electrical Engineering, Energy Engineering, Industrial Engineering and Mechanical Engineering.",
            },
            {
                question: "Does MUBXAI check prerequisites?",
                answer:
                    "Yes. Each course in the curriculum includes its prerequisite codes. MUBXAI marks a course as available only when its prerequisites are completed, and shows the full prerequisite chain for planning.",
            },
            {
                question: "What if my curriculum changes?",
                answer:
                    "MUBXAI's curriculum data is updated when HTU publishes changes. If you notice a course that is missing or outdated, report it from the app and it will be reviewed.",
            },
        ],
    },
    {
        title: "Data, privacy and Google",
        items: [
            {
                question: "Does MUBXAI sync with Google Calendar?",
                answer:
                    "Yes. After you connect Google Calendar, MUBXAI can push exam dates and study sessions to your calendar. It only writes the events you choose and does not read unrelated calendar data.",
            },
            {
                question: "Does MUBXAI train AI models on my data?",
                answer:
                    "No. Your academic data is never used to train AI models and is never sold. See the privacy policy and the AI transparency page for the full details.",
            },
            {
                question: "Do I need an account to use the GPA calculator?",
                answer:
                    "No. The public GPA calculator works without an account. An account is only needed to save courses, grades and semester plans across devices.",
            },
        ],
    },
];

const ALL_FAQ = FAQ_GROUPS.flatMap((group) => group.items);

export const metadata: Metadata = {
    title: "MUBXAI FAQ — HTU GPA, Courses & Majors",
    description:
        "Answers to common questions about MUBXAI: what it is, how the HTU GPA calculator works, which majors are supported, whether it is official, and how your data is handled.",
    keywords: [
        "MUBXAI FAQ",
        "is MUBXAI official",
        "HTU GPA calculator FAQ",
        "MUBXAI vs HTUAI",
        "HTU academic tracker questions",
    ],
    alternates: { canonical: PAGE_URL },
    openGraph: {
        title: "MUBXAI FAQ",
        description:
            "Common questions about MUBXAI, the free HTU GPA calculator and academic tracker.",
        url: PAGE_URL,
        type: "website",
    },
};

export default function FaqPage() {
    return (
        <ContentPage
            eyebrow="Help centre"
            title="Frequently asked questions"
            lede="Everything students ask about MUBXAI — the free GPA calculator and academic tracker for Al Hussein Technical University."
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@graph": [
                            breadcrumbSchema([
                                { name: "Home", path: "/" },
                                { name: "FAQ", path: PAGE_PATH },
                            ]),
                            faqSchema(ALL_FAQ),
                        ],
                    }),
                }}
            />

            <nav aria-label="FAQ sections" className="flex flex-wrap gap-2">
                {FAQ_GROUPS.map((group, index) => (
                    <a
                        key={group.title}
                        href={`#faq-${index}`}
                        className="rounded-full border border-[#dde3ec] bg-white px-3 py-1.5 text-xs font-bold text-[#222d32] transition-colors hover:border-[#dc4835]/40 hover:text-[#dc4835]"
                    >
                        {group.title}
                    </a>
                ))}
            </nav>

            {FAQ_GROUPS.map((group, index) => (
                <section key={group.title} aria-labelledby={`faq-${index}`} className="space-y-4">
                    <h2 id={`faq-${index}`} className="text-2xl font-black tracking-tight text-[#222d32]">
                        {group.title}
                    </h2>
                    <div className="divide-y divide-[#dde3ec] rounded-2xl border border-[#dde3ec] bg-white">
                        {group.items.map((item) => (
                            <details key={item.question} className="group px-6 py-5">
                                <summary className="cursor-pointer list-none text-sm font-bold text-[#222d32] marker:hidden group-open:text-[#dc4835]">
                                    {item.question}
                                </summary>
                                <p className="mt-3 text-sm leading-relaxed text-[#5a6472]">{item.answer}</p>
                            </details>
                        ))}
                    </div>
                </section>
            ))}

            <section className="rounded-2xl border border-[#dde3ec] bg-white p-6">
                <h2 className="text-lg font-bold text-[#222d32]">Still have a question?</h2>
                <p className="mt-2 text-sm text-[#5a6472]">
                    Read more about how the product works, or open the tracker and try it for free.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
                    <Link href="/how-it-works" className="text-[#dc4835] hover:underline">How MUBXAI works</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/about" className="text-[#dc4835] hover:underline">About the project</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/for-ai" className="text-[#dc4835] hover:underline">For AI assistants</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/" className="text-[#dc4835] hover:underline">Open MUBXAI</Link>
                </div>
            </section>
        </ContentPage>
    );
}
