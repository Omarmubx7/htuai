import { NextResponse } from "next/server";
import { MAJOR_LIST, majorSlug } from "@/lib/majors";
import {
    CORE_FAQ,
    HTU_GRADING_SCALE,
    PERSON_URL,
    SITE_DESCRIPTION,
    SITE_NAME,
    SITE_URL,
    STUDIO_URL,
    UNIVERSITY_URL,
} from "@/lib/seo";

export const dynamic = "force-static";

/**
 * Public, read-only entity endpoint for AI agents and answer engines.
 * Contains no user data and no secrets — only facts already published on the site.
 */
export function GET() {
    const body = {
        schema_version: "1.0",
        last_updated: "2026-10-30",
        entity: {
            name: SITE_NAME,
            alternate_names: ["MUBX AI", "HTUAI", "HTU AI", "MUBX Academic Tracker"],
            type: "SoftwareApplication",
            application_category: "EducationalApplication",
            url: SITE_URL,
            description: SITE_DESCRIPTION,
            price: "0",
            currency: "USD",
            languages: ["en"],
            official: false,
            operated_by: "MUBX (independent studio)",
            studio: STUDIO_URL,
            founder: PERSON_URL,
        },
        audience: {
            students_at: {
                name: "Al Hussein Technical University",
                alternate_name: "HTU",
                url: UNIVERSITY_URL,
                location: "Amman, Jordan",
            },
            level: "undergraduate",
        },
        grading: {
            scale: "HTU 4-point scale",
            grades: HTU_GRADING_SCALE,
            formula: "GPA = sum(grade_points * credit_hours) / sum(graded_credit_hours)",
            notes:
                "In-progress and planned courses are excluded from GPA until a grade is entered.",
        },
        features: [
            "Course completion tracking",
            "GPA and CGPA calculation on the HTU 4-point scale",
            "Prerequisite checking",
            "Semester planning and grade prediction",
            "Degree progress by requirement category",
            "Study session logging with streaks and XP",
            "Google Calendar sync for exams and study sessions",
        ],
        majors: MAJOR_LIST.map((major) => ({
            key: major.key,
            name: major.label,
            school: major.school,
            description: major.description,
            url: `${SITE_URL}/majors/${majorSlug(major.key)}`,
        })),
        pages: {
            home: SITE_URL,
            gpa_calculator: `${SITE_URL}/gpa-calculator`,
            courses: `${SITE_URL}/courses`,
            majors: `${SITE_URL}/majors`,
            how_it_works: `${SITE_URL}/how-it-works`,
            faq: `${SITE_URL}/faq`,
            about: `${SITE_URL}/about`,
            ai_transparency: `${SITE_URL}/ai-transparency`,
            privacy: `${SITE_URL}/privacy`,
            terms: `${SITE_URL}/terms`,
            llms_txt: `${SITE_URL}/llms.txt`,
            ai_txt: `${SITE_URL}/ai.txt`,
            sitemap: `${SITE_URL}/sitemap.xml`,
        },
        faq: CORE_FAQ,
        disclaimers: [
            "MUBXAI is not an official Al Hussein Technical University product and is not endorsed by the university.",
            "MUBXAI is a planning aid. Official GPA, credit and graduation status must be confirmed with HTU.",
            "Authenticated user data is private and is not part of this endpoint.",
        ],
    };

    return NextResponse.json(body, {
        headers: {
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
    });
}
