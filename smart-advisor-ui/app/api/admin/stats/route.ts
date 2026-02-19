import { NextResponse } from 'next/server';
import { getAllStudents } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const students = await getAllStudents();

        // 1. Total Students
        const totalStudents = students.length;

        // 2. Major Distribution
        const majorCounts: Record<string, number> = {};

        // 3. Progress Distribution
        // We track ranges: 0-25%, 26-50%, 51-75%, 76-100%
        const progressDistribution = {
            "0-25%": 0,
            "26-50%": 0,
            "51-75%": 0,
            "76-100%": 0,
        };

        const TOTAL_CREDITS = 135; // We assume 135 for all (simplified)

        for (const s of students) {
            // Count Major
            // Normalize major keys if needed (e.g. computer_science -> Computer Science)
            const major = s.major || "Unknown";
            majorCounts[major] = (majorCounts[major] || 0) + 1;

            // Calculate Progress %
            // s.count is the number of COMPLETED courses.
            // We need to estimate credits? `getAllStudents` returns `count` (array length).
            // A precise credit count requires joining with course data, which is in JSONs.
            // For a dashboard, approximating 3 CH per course is a reasonable heuristic 
            // OR we can just show "Completed Courses" distribution.
            // BUT the user wants "graph with current db".
            // Let's rely on the `count` returned by `getAllStudents`.
            // Avg course ~3 CH. 135 CH / 3 = 45 courses approx.
            const estimatedCredits = s.count * 3;
            const percent = Math.min((estimatedCredits / TOTAL_CREDITS) * 100, 100);

            if (percent <= 25) progressDistribution["0-25%"]++;
            else if (percent <= 50) progressDistribution["26-50%"]++;
            else if (percent <= 75) progressDistribution["51-75%"]++;
            else progressDistribution["76-100%"]++;
        }

        return NextResponse.json({
            totalStudents,
            majorCounts,
            progressDistribution
        });

    } catch (e) {
        console.error("Stats API Error:", e);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
