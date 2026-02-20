import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function GET() {
    const dataDir = path.join(process.cwd(), "public/data");

    try {
        const files = await fs.readdir(dataDir);
        const jsonFiles = files.filter(f => f.endsWith(".json") && f !== "shared.json");

        // Always include shared courses
        const sharedContent = await fs.readFile(path.join(dataDir, "shared.json"), "utf8");
        const sharedData = JSON.parse(sharedContent);

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

        processList(sharedData.university_requirements);
        processList(sharedData.college_requirements);
        processList(sharedData.university_electives);

        for (const file of jsonFiles) {
            const content = await fs.readFile(path.join(dataDir, file), "utf8");
            const data = JSON.parse(content);
            const rootKey = Object.keys(data)[0];
            const majorData = data[rootKey];

            if (majorData) {
                processList(majorData.department_requirements);
                processList(majorData.electives);
                processList(majorData.work_market_requirements);
            }
        }

        const sortedCourses = Array.from(courseMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json(sortedCourses);
    } catch (error: any) {
        console.error("Failed to load courses for autocomplete:", error);
        return NextResponse.json({ error: "Failed to load courses" }, { status: 500 });
    }
}
