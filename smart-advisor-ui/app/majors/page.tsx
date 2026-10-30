import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { getAllMajorCurricula } from "@/lib/curriculum";
import { MAJOR_LIST, majorSlug } from "@/lib/majors";
import { breadcrumbSchema, SITE_URL } from "@/lib/seo";

const PAGE_PATH = "/majors";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = {
    title: "HTU Majors & Degree Plans",
    description:
        "Explore every Al Hussein Technical University (HTU) major supported by MUBXAI — Computer Science, Data Science & AI, Cybersecurity, Game Design and four engineering programs — with credit totals and course lists.",
    keywords: [
        "HTU majors",
        "Al Hussein Technical University majors",
        "HTU degree plans",
        "HTU computer science curriculum",
        "HTU engineering programs",
        "MUBXAI majors",
    ],
    alternates: { canonical: PAGE_URL },
    openGraph: {
        title: "HTU Majors & Degree Plans — MUBXAI",
        description:
            "Credit totals, course lists and degree plans for every HTU major MUBXAI supports.",
        url: PAGE_URL,
        type: "website",
    },
};

export default async function MajorsPage() {
    const curricula = await getAllMajorCurricula();
    const byKey = new Map(curricula.map((entry) => [entry.major.key, entry.major]));

    const computing = MAJOR_LIST.filter((major) => major.school === "Computing");
    const engineering = MAJOR_LIST.filter((major) => major.school === "Engineering");

    return (
        <ContentPage
            eyebrow="Degree plans"
            title="HTU Majors"
            lede="MUBXAI supports every computing and engineering program at Al Hussein Technical University. Pick a major to see its credit total, core courses, electives and prerequisites."
            width="wide"
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        ...breadcrumbSchema([
                            { name: "Home", path: "/" },
                            { name: "Majors", path: PAGE_PATH },
                        ]),
                    }),
                }}
            />

            {[
                { id: "computing", title: "School of Computing", majors: computing },
                { id: "engineering", title: "School of Engineering", majors: engineering },
            ].map((group) => (
                <section key={group.id} aria-labelledby={`group-${group.id}`} className="space-y-4">
                    <h2 id={`group-${group.id}`} className="text-2xl font-black tracking-tight text-[#222d32]">
                        {group.title}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {group.majors.map((major) => {
                            const data = byKey.get(major.key);
                            return (
                                <Link
                                    key={major.key}
                                    href={`/majors/${majorSlug(major.key)}`}
                                    className="group rounded-2xl border border-[#dde3ec] bg-white p-6 transition-colors hover:border-[#dc4835]/40"
                                >
                                    <span className="text-2xl" aria-hidden="true">{major.icon}</span>
                                    <h3 className="mt-3 text-lg font-bold text-[#222d32] group-hover:text-[#dc4835]">
                                        {major.label}
                                    </h3>
                                    <p className="mt-1 text-sm leading-relaxed text-[#5a6472]">{major.description}</p>
                                    {data && (
                                        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-[#5a6472]">
                                            {data.total_credits} credits · {data.department_requirements.length} core courses
                                        </p>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </section>
            ))}

            <section className="rounded-2xl border border-[#dde3ec] bg-white p-6">
                <h2 className="text-lg font-bold text-[#222d32]">Not sure which courses you still need?</h2>
                <p className="mt-2 text-sm text-[#5a6472]">
                    Open MUBXAI, select your major and mark the courses you have completed. The tracker shows
                    your remaining requirements, GPA and prerequisites automatically.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
                    <Link href="/courses" className="text-[#dc4835] hover:underline">Full course catalog</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/gpa-calculator" className="text-[#dc4835] hover:underline">GPA calculator</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/" className="text-[#dc4835] hover:underline">Open the tracker</Link>
                </div>
            </section>
        </ContentPage>
    );
}
