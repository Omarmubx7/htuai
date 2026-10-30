import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { getAllMajorCurricula } from "@/lib/curriculum";
import { MAJOR_LIST, majorSlug } from "@/lib/majors";
import { breadcrumbSchema, SITE_URL } from "@/lib/seo";
import type { Course } from "@/types";

const PAGE_PATH = "/courses";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = {
    title: "HTU Course Catalog — All Majors & Credit Hours",
    description:
        "Browse the full Al Hussein Technical University (HTU) course catalog used by MUBXAI: course codes, names, credit hours, levels and prerequisites for every computing and engineering major.",
    keywords: [
        "HTU courses",
        "HTU course catalog",
        "Al Hussein Technical University courses",
        "HTU curriculum",
        "HTU credit hours",
        "HTU prerequisites",
        "MUBXAI courses",
    ],
    alternates: { canonical: PAGE_URL },
    openGraph: {
        title: "HTU Course Catalog — MUBXAI",
        description:
            "Every course in the HTU curriculum with credit hours, levels and prerequisites.",
        url: PAGE_URL,
        type: "website",
    },
};

function CourseTable({ courses, caption }: { courses: Course[]; caption: string }) {
    if (courses.length === 0) return null;
    return (
        <div className="overflow-x-auto rounded-2xl border border-[#dde3ec] bg-white">
            <table className="w-full border-collapse text-sm">
                <caption className="sr-only">{caption}</caption>
                <thead>
                    <tr className="border-b border-[#dde3ec] bg-[#edf1f6] text-left text-[11px] font-black uppercase tracking-[0.14em] text-[#5a6472]">
                        <th scope="col" className="px-4 py-3">Code</th>
                        <th scope="col" className="px-4 py-3">Course</th>
                        <th scope="col" className="px-3 py-3 text-center">CH</th>
                        <th scope="col" className="px-3 py-3 text-center">Level</th>
                        <th scope="col" className="px-4 py-3">Prerequisite</th>
                    </tr>
                </thead>
                <tbody>
                    {courses.map((course) => (
                        <tr key={`${course.code}-${course.name}`} className="border-b border-[#dde3ec] last:border-0">
                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-[#5a6472]">{course.code}</td>
                            <td className="px-4 py-2.5 font-semibold text-[#222d32]">{course.name}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-[#5a6472]">{course.ch}</td>
                            <td className="px-3 py-2.5 text-center tabular-nums text-[#5a6472]">{course.level}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-[#5a6472]">{course.prereq || "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default async function CoursesPage() {
    const curricula = await getAllMajorCurricula();
    const byKey = new Map(curricula.map((entry) => [entry.major.key, entry]));
    const totalCourses = curricula.reduce(
        (sum, entry) =>
            sum + entry.major.department_requirements.length + entry.major.electives.length,
        0
    );

    return (
        <ContentPage
            eyebrow="Curriculum"
            title="HTU Course Catalog"
            lede={`Every course MUBXAI tracks across the ${MAJOR_LIST.length} supported Al Hussein Technical University majors — ${totalCourses} major-specific course entries with codes, credit hours, levels and prerequisites.`}
            width="wide"
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        ...breadcrumbSchema([
                            { name: "Home", path: "/" },
                            { name: "Courses", path: PAGE_PATH },
                        ]),
                    }),
                }}
            />

            <section aria-labelledby="catalog-intro" className="space-y-4">
                <h2 id="catalog-intro" className="text-2xl font-black tracking-tight text-[#222d32]">
                    How to read this catalog
                </h2>
                <p className="text-sm leading-relaxed text-[#5a6472]">
                    Course codes follow the HTU numbering scheme. <strong className="text-[#222d32]">CH</strong> is
                    credit hours, <strong className="text-[#222d32]">Level</strong> is the recommended study year,
                    and <strong className="text-[#222d32]">Prerequisite</strong> lists the course codes that must be
                    completed first. University and college requirements are shared across programs; department
                    requirements and electives are specific to each major.
                </p>
                <div className="flex flex-wrap gap-2">
                    {MAJOR_LIST.map((major) => (
                        <Link
                            key={major.key}
                            href={`/majors/${majorSlug(major.key)}`}
                            className="rounded-full border border-[#dde3ec] bg-white px-3 py-1.5 text-xs font-bold text-[#222d32] transition-colors hover:border-[#dc4835]/40 hover:text-[#dc4835]"
                        >
                            {major.label}
                        </Link>
                    ))}
                </div>
            </section>

            <section aria-labelledby="shared-courses" className="space-y-4">
                <h2 id="shared-courses" className="text-2xl font-black tracking-tight text-[#222d32]">
                    University &amp; college requirements
                </h2>
                <p className="text-sm text-[#5a6472]">
                    These courses are required for every student, regardless of major.
                </p>
                {curricula[0] && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-[#5a6472]">University requirements</h3>
                            <CourseTable
                                courses={curricula[0].shared.university_requirements}
                                caption="HTU university requirements"
                            />
                        </div>
                        <div>
                            <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-[#5a6472]">College requirements</h3>
                            <CourseTable
                                courses={curricula[0].shared.college_requirements}
                                caption="HTU college requirements"
                            />
                        </div>
                        <div>
                            <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-[#5a6472]">University electives</h3>
                            <CourseTable
                                courses={curricula[0].shared.university_electives}
                                caption="HTU university electives"
                            />
                        </div>
                    </div>
                )}
            </section>

            <section aria-labelledby="major-courses" className="space-y-6">
                <h2 id="major-courses" className="text-2xl font-black tracking-tight text-[#222d32]">
                    Courses by major
                </h2>
                {MAJOR_LIST.map((major) => {
                    const entry = byKey.get(major.key);
                    if (!entry) return null;
                    return (
                        <details key={major.key} className="group rounded-2xl border border-[#dde3ec] bg-white" open={major.key === "computer_science"}>
                            <summary className="cursor-pointer list-none px-5 py-4 marker:hidden">
                                <span className="flex flex-wrap items-baseline justify-between gap-2">
                                    <span className="text-lg font-bold text-[#222d32] group-open:text-[#dc4835]">
                                        {major.label}
                                    </span>
                                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#5a6472]">
                                        {entry.major.total_credits} credits · {entry.major.department_requirements.length} core · {entry.major.electives.length} electives
                                    </span>
                                </span>
                            </summary>
                            <div className="space-y-6 border-t border-[#dde3ec] px-5 py-5">
                                <div>
                                    <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-[#5a6472]">Department requirements</h3>
                                    <CourseTable
                                        courses={entry.major.department_requirements}
                                        caption={`${major.label} department requirements`}
                                    />
                                </div>
                                <div>
                                    <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-[#5a6472]">Major electives</h3>
                                    <CourseTable
                                        courses={entry.major.electives}
                                        caption={`${major.label} electives`}
                                    />
                                </div>
                                <Link
                                    href={`/majors/${majorSlug(major.key)}`}
                                    className="inline-block text-xs font-bold text-[#dc4835] hover:underline"
                                >
                                    View the {major.label} degree plan →
                                </Link>
                            </div>
                        </details>
                    );
                })}
            </section>
        </ContentPage>
    );
}
