import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContentPage from "@/components/ContentPage";
import { getMajorCurriculum } from "@/lib/curriculum";
import { MAJOR_LIST, majorFromSlug, majorSlug } from "@/lib/majors";
import { breadcrumbSchema, SITE_URL } from "@/lib/seo";
import type { Course } from "@/types";

export const dynamicParams = false;

export function generateStaticParams() {
    return MAJOR_LIST.map((major) => ({ slug: majorSlug(major.key) }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const major = majorFromSlug(slug);
    if (!major) return {};

    const data = await getMajorCurriculum(major.key);
    const total = data?.major.total_credits;

    const title = `${major.label} at HTU — Curriculum & Courses`;
    const description = `The ${major.label} curriculum at Al Hussein Technical University (HTU): ${
        total ? `${total} credit hours, ` : ""
    }core courses, electives and prerequisites. Track your ${major.label} degree progress with MUBXAI.`;
    const url = `${SITE_URL}/majors/${slug}`;

    return {
        title,
        description,
        keywords: [
            `${major.label} HTU`,
            `HTU ${major.label} curriculum`,
            `Al Hussein Technical University ${major.label}`,
            `${major.label} courses Jordan`,
            `HTU ${major.label} credit hours`,
        ],
        alternates: { canonical: url },
        openGraph: {
            title: `${title} — MUBXAI`,
            description,
            url,
            type: "website",
        },
    };
}

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

export default async function MajorPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const major = majorFromSlug(slug);
    if (!major) notFound();

    const data = await getMajorCurriculum(major.key);
    if (!data) notFound();

    const { major: curriculum, shared } = data;
    const coreCredits = curriculum.department_requirements.reduce(
        (sum, course) => sum + (course.ch ?? 0),
        0
    );
    const electiveCredits = curriculum.electives.reduce(
        (sum, course) => sum + (course.ch ?? 0),
        0
    );
    const sharedCredits =
        curriculum.shared_credits ||
        shared.university_requirements.reduce((sum, course) => sum + (course.ch ?? 0), 0) +
            shared.college_requirements.reduce((sum, course) => sum + (course.ch ?? 0), 0);

    return (
        <ContentPage
            eyebrow={`${major.school} · HTU`}
            title={`${major.label} at HTU`}
            lede={`The full ${major.label} curriculum used by MUBXAI: ${curriculum.total_credits} credit hours to graduation, ${curriculum.department_requirements.length} core courses, ${curriculum.electives.length} electives and every prerequisite.`}
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
                                { name: "Majors", path: "/majors" },
                                { name: major.label, path: `/majors/${slug}` },
                            ]),
                            {
                                "@type": "Course",
                                name: `${major.label} — HTU Curriculum`,
                                description: `${major.label} degree plan at Al Hussein Technical University (HTU), ${curriculum.total_credits} credit hours.`,
                                provider: {
                                    "@type": "CollegeOrUniversity",
                                    name: "Al Hussein Technical University",
                                    alternateName: "HTU",
                                    url: "https://htu.edu.jo",
                                },
                            },
                        ],
                    }),
                }}
            />

            <section aria-labelledby="overview" className="space-y-4">
                <h2 id="overview" className="text-2xl font-black tracking-tight text-[#222d32]">
                    Degree overview
                </h2>
                <p className="text-sm leading-relaxed text-[#5a6472]">
                    {major.label} sits in the HTU School of {major.school} and focuses on {major.description.toLowerCase()}.
                    The program requires <strong className="text-[#222d32]">{curriculum.total_credits} credit hours</strong>:
                    {" "}{sharedCredits} shared university and college credits plus{" "}
                    <strong className="text-[#222d32]">{curriculum.core_credits || coreCredits}</strong> major-specific credits.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#dde3ec] bg-white p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5a6472]">Total credits</p>
                        <p className="mt-2 text-3xl font-black tabular-nums text-[#222d32]">{curriculum.total_credits}</p>
                    </div>
                    <div className="rounded-2xl border border-[#dde3ec] bg-white p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5a6472]">Core course credits</p>
                        <p className="mt-2 text-3xl font-black tabular-nums text-[#222d32]">{coreCredits}</p>
                    </div>
                    <div className="rounded-2xl border border-[#dde3ec] bg-white p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5a6472]">Elective credits</p>
                        <p className="mt-2 text-3xl font-black tabular-nums text-[#222d32]">{electiveCredits}</p>
                    </div>
                </div>
            </section>

            <section aria-labelledby="core-courses" className="space-y-4">
                <h2 id="core-courses" className="text-2xl font-black tracking-tight text-[#222d32]">
                    Core {major.label} courses
                </h2>
                <p className="text-sm text-[#5a6472]">
                    Required department courses, in the order MUBXAI recommends taking them.
                </p>
                <CourseTable
                    courses={curriculum.department_requirements}
                    caption={`${major.label} core courses at HTU`}
                />
            </section>

            <section aria-labelledby="electives" className="space-y-4">
                <h2 id="electives" className="text-2xl font-black tracking-tight text-[#222d32]">
                    {major.label} electives
                </h2>
                <p className="text-sm text-[#5a6472]">
                    Choose from the approved elective pool to complete your credit requirement.
                </p>
                <CourseTable
                    courses={curriculum.electives}
                    caption={`${major.label} electives at HTU`}
                />
            </section>

            <section aria-labelledby="shared" className="space-y-4">
                <h2 id="shared" className="text-2xl font-black tracking-tight text-[#222d32]">
                    Shared requirements
                </h2>
                <p className="text-sm text-[#5a6472]">
                    Every HTU student completes the same university and college requirements, whatever their major.
                </p>
                <CourseTable
                    courses={shared.university_requirements}
                    caption="HTU university requirements"
                />
                <CourseTable
                    courses={shared.college_requirements}
                    caption="HTU college requirements"
                />
            </section>

            <section className="rounded-2xl border border-[#dde3ec] bg-white p-6">
                <h2 className="text-lg font-bold text-[#222d32]">Track your {major.label} progress</h2>
                <p className="mt-2 text-sm text-[#5a6472]">
                    Mark courses complete in MUBXAI to see your GPA, remaining requirements and which
                    courses you can take next based on prerequisites.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
                    <Link href="/" className="text-[#dc4835] hover:underline">Open the tracker</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/courses" className="text-[#dc4835] hover:underline">All HTU courses</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/gpa-calculator" className="text-[#dc4835] hover:underline">GPA calculator</Link>
                    <span className="text-[#dde3ec]">•</span>
                    <Link href="/majors" className="text-[#dc4835] hover:underline">All majors</Link>
                </div>
            </section>
        </ContentPage>
    );
}
