import type { Metadata } from "next";
import path from "node:path";
import fs from "node:fs/promises";
import DirectoryClient from "@/components/resources/DirectoryClient";

export const metadata: Metadata = {
    title: "Resources — MUBX",
    description: "Course materials shared by HTU students. Browse PDFs, videos, links, and more.",
    openGraph: {
        title: "Resources — MUBX",
        description: "Course materials shared by HTU students.",
    },
};

interface Course {
    name: string;
    code: string;
    ch: number;
}

export interface MajorGroup {
    id: string;
    label: string;
    courses: Course[];
}

const MAJOR_LABELS: Record<string, string> = {
    computer_science: "Computer Science",
    cybersecurity: "Cybersecurity",
    data_science: "Data Science",
    game_design: "Game Design",
    electrical_engineering: "Electrical Engineering",
    energy_engineering: "Energy Engineering",
    industrial_engineering: "Industrial Engineering",
    mechanical_engineering: "Mechanical Engineering",
};

function sortCourses(courses: Course[]): Course[] {
    return courses.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        if (a.code < b.code) return -1;
        if (a.code > b.code) return 1;
        return 0;
    });
}

async function getMajorGroups(): Promise<MajorGroup[]> {
    try {
        const dataDir = path.join(process.cwd(), "public/data");
        const content = await fs.readFile(path.join(dataDir, "curriculum.json"), "utf8");
        const data = JSON.parse(content);

        const processList = (list: Array<{ code?: string; name?: string; ch?: number }>, map: Map<string, Course>) => {
            if (!list) return;
            list.forEach((c) => {
                if (c.code && c.name) {
                    let code = c.code.trim();
                    if (code.startsWith("00") && code.length === 10) code = code.substring(2);
                    const existing = map.get(code);
                    if (!existing || c.name.length > existing.name.length) {
                        map.set(code, { name: c.name.trim(), code, ch: c.ch ?? 3 });
                    }
                }
            });
        };

        // Shared courses (university + college requirements + electives)
        const sharedMap = new Map<string, Course>();
        processList(data.shared.university_requirements, sharedMap);
        processList(data.shared.college_requirements, sharedMap);
        processList(data.shared.university_electives, sharedMap);
        const sharedCourses = sortCourses(Array.from(sharedMap.values()));

        // Per-major groups
        const groups: MajorGroup[] = [];

        for (const majorKey of Object.keys(data.majors)) {
            const majorData = data.majors[majorKey];
            const majorMap = new Map<string, Course>();

            // Start with shared courses
            sharedCourses.forEach((c) => majorMap.set(c.code, c));

            // Add major-specific overrides/additions
            processList(majorData.university_requirements, majorMap);
            processList(majorData.college_requirements, majorMap);
            processList(majorData.university_electives, majorMap);
            processList(majorData.department_requirements, majorMap);
            processList(majorData.electives, majorMap);
            processList(majorData.work_market_requirements, majorMap);

            groups.push({
                id: majorKey,
                label: MAJOR_LABELS[majorKey] || majorKey,
                courses: sortCourses(Array.from(majorMap.values())),
            });
        }

        // "All" group: every unique course across all majors
        const allMap = new Map<string, Course>();
        groups.forEach((g) => g.courses.forEach((c) => allMap.set(c.code, c)));
        groups.unshift({
            id: "all",
            label: "All Majors",
            courses: sortCourses(Array.from(allMap.values())),
        });

        return groups;
    } catch {
        return [{ id: "all", label: "All Majors", courses: [] }];
    }
}

export default async function ResourcesPage() {
    const majorGroups = await getMajorGroups();

    return (
        <main className="min-h-dvh">
            <DirectoryClient majorGroups={majorGroups} />
        </main>
    );
}
