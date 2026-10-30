import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { breadcrumbSchema, PERSON_URL, SITE_URL, STUDIO_URL } from "@/lib/seo";

const PAGE_PATH = "/about";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = {
    title: "About MUBXAI — Who Builds the HTU Academic Tracker",
    description:
        "MUBXAI is an independent academic tracker for Al Hussein Technical University students, built by Omar Mubaidin and the MUBX studio in Amman, Jordan. Learn the story, the mission and the limits of the tool.",
    keywords: [
        "about MUBXAI",
        "who made MUBXAI",
        "MUBXAI Omar Mubaidin",
        "MUBX studio",
        "HTU student project",
    ],
    alternates: { canonical: PAGE_URL },
    openGraph: {
        title: "About MUBXAI",
        description:
            "An independent academic tracker for HTU students, built by Omar Mubaidin and MUBX.",
        url: PAGE_URL,
        type: "website",
    },
};

export default function AboutPage() {
    return (
        <ContentPage
            eyebrow="About"
            title="About MUBXAI"
            lede="MUBXAI is a free academic tracker for Al Hussein Technical University students. It is independent, student-built and maintained by the MUBX studio."
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        ...breadcrumbSchema([
                            { name: "Home", path: "/" },
                            { name: "About", path: PAGE_PATH },
                        ]),
                    }),
                }}
            />

            <section aria-labelledby="story" className="space-y-4">
                <h2 id="story" className="text-2xl font-black tracking-tight text-[#222d32]">
                    Why it exists
                </h2>
                <p className="text-sm leading-relaxed text-[#5a6472]">
                    HTU students plan their degrees with PDFs, printed study plans and spreadsheets. The rules are
                    strict — prerequisites chain across levels, the grading scale is D/M/P/U rather than letter
                    grades, and a single missed prerequisite can delay a semester. MUBXAI started as a personal tool
                    to answer one question: <em>what can I take next, and what will it do to my GPA?</em>
                </p>
                <p className="text-sm leading-relaxed text-[#5a6472]">
                    It grew into a full tracker used by students across the university. The goal is simple: give
                    every HTU student the same clarity that a good academic advisor provides, for free.
                </p>
            </section>

            <section aria-labelledby="team" className="space-y-4">
                <h2 id="team" className="text-2xl font-black tracking-tight text-[#222d32]">
                    Who builds it
                </h2>
                <div className="rounded-2xl border border-[#dde3ec] bg-white p-6">
                    <p className="text-sm leading-relaxed text-[#5a6472]">
                        MUBXAI is designed and developed by <strong className="text-[#222d32]">Omar Mubaidin</strong>,
                        founder of <a href={STUDIO_URL} className="font-semibold text-[#dc4835] hover:underline">MUBX</a>,
                        a web engineering studio in Amman, Jordan. MUBX builds websites, e-commerce stores, web systems
                        and AI products — MUBXAI is its education product.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-[#5a6472]">
                        <li>
                            <span className="font-bold text-[#222d32]">Product:</span>{" "}
                            <a href={SITE_URL} className="text-[#dc4835] hover:underline">ai.mubx.dev</a>
                        </li>
                        <li>
                            <span className="font-bold text-[#222d32]">Studio:</span>{" "}
                            <a href={STUDIO_URL} className="text-[#dc4835] hover:underline">mubx.dev</a>
                        </li>
                        <li>
                            <span className="font-bold text-[#222d32]">Founder:</span>{" "}
                            <a href={PERSON_URL} className="text-[#dc4835] hover:underline">me.mubx.dev</a>
                        </li>
                    </ul>
                </div>
            </section>

            <section aria-labelledby="independence" className="space-y-4">
                <h2 id="independence" className="text-2xl font-black tracking-tight text-[#222d32]">
                    Independence and accuracy
                </h2>
                <p className="text-sm leading-relaxed text-[#5a6472]">
                    MUBXAI is <strong className="text-[#222d32]">not an official Al Hussein Technical University
                    product</strong>. It is not operated, endorsed or supervised by the university. Curriculum data is
                    compiled from published study plans and corrected by students when it drifts.
                </p>
                <p className="text-sm leading-relaxed text-[#5a6472]">
                    Because of that, MUBXAI is a planning aid, not an academic record. Always confirm your official
                    GPA, completed credits and graduation status with HTU before making decisions.
                </p>
            </section>

            <section aria-labelledby="principles" className="space-y-4">
                <h2 id="principles" className="text-2xl font-black tracking-tight text-[#222d32]">
                    Principles
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {[
                        {
                            title: "Free, permanently",
                            body: "No premium tier, no ads, no paywall on GPA or degree progress. Students should never pay to understand their own transcript.",
                        },
                        {
                            title: "Private by default",
                            body: "Academic data is never sold and never used to train AI models. Google Calendar access is limited to the events you choose to sync.",
                        },
                        {
                            title: "Accurate over flashy",
                            body: "Curriculum and prerequisite data are the product. When HTU changes a plan, the tracker is updated.",
                        },
                        {
                            title: "Honest about limits",
                            body: "The tool is independent and can be wrong. It tells you to verify official results instead of pretending to replace them.",
                        },
                    ].map((item) => (
                        <div key={item.title} className="rounded-2xl border border-[#dde3ec] bg-white p-5">
                            <h3 className="text-base font-bold text-[#222d32]">{item.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-[#5a6472]">{item.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-[#dde3ec] bg-white p-6">
                <h2 className="text-lg font-bold text-[#222d32]">Explore MUBXAI</h2>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold">
                    <Link href="/how-it-works" className="text-[#dc4835] hover:underline">How it works</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/gpa-calculator" className="text-[#dc4835] hover:underline">GPA calculator</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/courses" className="text-[#dc4835] hover:underline">Course catalog</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/majors" className="text-[#dc4835] hover:underline">Majors</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/faq" className="text-[#dc4835] hover:underline">FAQ</Link>
                </div>
            </section>
        </ContentPage>
    );
}
