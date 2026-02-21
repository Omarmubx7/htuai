import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function GET() {
    const dataDir = path.join(process.cwd(), "public/data");

    try {
        const content = await fs.readFile(path.join(dataDir, "curriculum.json"), "utf8");
        const data = JSON.parse(content);

        const courseMap: Map<string, { name: string, code: string, ch: number }> = new Map();

        const processList = (list: any[]) => {
            if (!list) return;
            list.forEach(c => {
                if (c.code && c.name) {
                    let code = c.code.trim();
                    if (code.startsWith('00') && code.length === 10) code = code.substring(2);

                    const existing = courseMap.get(code);
                    if (!existing || c.name.length > existing.name.length) {
                        courseMap.set(code, { name: c.name.trim(), code, ch: c.ch ?? 3 });
                    }
                }
            });
        };

        // 1. Process Shared Requirements
        processList(data.shared.university_requirements);
        processList(data.shared.college_requirements);
        processList(data.shared.university_electives);

        // 2. Process All Majors
        for (const majorKey in data.majors) {
            const majorData = data.majors[majorKey];
            processList(majorData.university_requirements);
            processList(majorData.college_requirements);
            processList(majorData.university_electives);
            processList(majorData.department_requirements);
            processList(majorData.electives);
            processList(majorData.work_market_requirements);
        }

        const sortedCourses = Array.from(courseMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json(sortedCourses);
    } catch (error: any) {
        console.error("Failed to load courses for autocomplete:", error);
        return NextResponse.json({ error: "Failed to load courses" }, { status: 500 });
    }
}
