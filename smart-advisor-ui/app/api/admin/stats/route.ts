import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getAllStudents } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const students = await getAllStudents();

        // ── 1. Total Students ────────────────────────────────────────
        const totalStudents = students.length;

        // ── 2. Major Distribution ────────────────────────────────────
        const majorCounts: Record<string, number> = {};

        // ── 3. Progress Distribution ─────────────────────────────────
        const progressDistribution: Record<string, number> = {
            "0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0,
        };
        const TOTAL_CREDITS = 135;
        let totalCompletedCourses = 0;

        // ── 4. Course Counts ─────────────────────────────────────────
        const courseCounts: Record<string, number> = {};

        for (const s of students) {
            const major = s.major || "Unknown";
            majorCounts[major] = (majorCounts[major] || 0) + 1;
            totalCompletedCourses += s.count;

            const estimatedCredits = s.count * 3;
            const percent = Math.min((estimatedCredits / TOTAL_CREDITS) * 100, 100);
            if (percent <= 25) progressDistribution["0-25%"]++;
            else if (percent <= 50) progressDistribution["26-50%"]++;
            else if (percent <= 75) progressDistribution["51-75%"]++;
            else progressDistribution["76-100%"]++;
        }

        // Scan completed arrays
        try {
            const { rows: progressRows } = await sql`SELECT completed FROM student_progress`;
            for (const row of progressRows) {
                let courses: (string | { code: string; name?: string })[] = [];
                try { courses = JSON.parse(row.completed); } catch { /* skip */ }
                for (const c of courses) {
                    const code = typeof c === 'string' ? c : c.code;
                    const name = typeof c === 'object' && c.name ? c.name : code;
                    const key = `${code}||${name}`;
                    courseCounts[key] = (courseCounts[key] || 0) + 1;
                }
            }
        } catch { /* table might not exist yet */ }

        const topCourses = Object.entries(courseCounts)
            .map(([key, count]) => {
                const [code, name] = key.split('||');
                return { code, name: name || code, count };
            })
            .sort((a, b) => b.count - a.count);

        // ── 5. Visitor Traffic (last 30 days) ────────────────────────
        let trafficByDay: { date: string; count: number }[] = [];
        try {
            const { rows } = await sql`
                SELECT DATE(visited_at) as day, COUNT(*) as count
                FROM visitor_logs
                WHERE visited_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(visited_at)
                ORDER BY day ASC
            `;
            trafficByDay = rows.map(r => ({
                date: String(r.day).slice(0, 10),
                count: Number(r.count),
            }));
        } catch { /* table might not exist */ }

        // ── 6. Device / OS / Browser Breakdown ───────────────────────
        let deviceBreakdown: { os: string; browser: string; count: number }[] = [];
        let totalVisitors = 0;
        try {
            const { rows } = await sql`
                SELECT
                    COALESCE(os_name, 'Unknown') as os,
                    COALESCE(browser_name, 'Unknown') as browser,
                    COUNT(*) as count
                FROM visitor_logs
                GROUP BY os_name, browser_name
                ORDER BY count DESC
            `;
            deviceBreakdown = rows.map(r => ({
                os: String(r.os),
                browser: String(r.browser),
                count: Number(r.count),
            }));

            const { rows: totalRows } = await sql`SELECT COUNT(*) as total FROM visitor_logs`;
            totalVisitors = Number(totalRows[0]?.total ?? 0);
        } catch { /* table might not exist */ }

        // ── 7. Recent Activity ───────────────────────────────────────
        let recentActivity: { type: string; student_id: string; detail: string; time: string }[] = [];
        try {
            const { rows: visitRows } = await sql`
                SELECT student_id, os_name, browser_name, device_model, visited_at
                FROM visitor_logs
                ORDER BY visited_at DESC
                LIMIT 50
            `;
            for (const r of visitRows) {
                const device = r.device_model || r.os_name || 'Unknown device';
                const browser = r.browser_name || '';
                recentActivity.push({
                    type: 'visit',
                    student_id: r.student_id || 'Anonymous',
                    detail: `Visited from ${device}${browser ? ` (${browser})` : ''}`,
                    time: String(r.visited_at),
                });
            }
        } catch { /* ok */ }

        // ── 8. Activity Heatmap (hour × day of week) ─────────────────
        let heatmap: { day: number; hour: number; count: number }[] = [];
        try {
            const { rows } = await sql`
                SELECT
                    EXTRACT(DOW FROM visited_at)::int as day,
                    EXTRACT(HOUR FROM visited_at)::int as hour,
                    COUNT(*) as count
                FROM visitor_logs
                GROUP BY day, hour
                ORDER BY day, hour
            `;
            heatmap = rows.map(r => ({
                day: Number(r.day),
                hour: Number(r.hour),
                count: Number(r.count),
            }));
        } catch { /* ok */ }

        // ── 9. Comparison: this week vs last week ────────────────────
        let thisWeekVisits = 0;
        let lastWeekVisits = 0;
        try {
            const { rows: tw } = await sql`
                SELECT COUNT(*) as count FROM visitor_logs
                WHERE visited_at >= DATE_TRUNC('week', NOW())
            `;
            thisWeekVisits = Number(tw[0]?.count ?? 0);

            const { rows: lw } = await sql`
                SELECT COUNT(*) as count FROM visitor_logs
                WHERE visited_at >= DATE_TRUNC('week', NOW()) - INTERVAL '7 days'
                AND visited_at < DATE_TRUNC('week', NOW())
            `;
            lastWeekVisits = Number(lw[0]?.count ?? 0);
        } catch { /* ok */ }

        // Average courses completed
        const avgCoursesCompleted = totalStudents > 0
            ? Math.round(totalCompletedCourses / totalStudents)
            : 0;
        const avgCreditHours = avgCoursesCompleted * 3;

        return NextResponse.json({
            totalStudents,
            totalVisitors,
            totalCompletedCourses,
            avgCoursesCompleted,
            avgCreditHours,
            thisWeekVisits,
            lastWeekVisits,
            majorCounts,
            progressDistribution,
            topCourses,
            trafficByDay,
            deviceBreakdown,
            recentActivity,
            heatmap,
            students,
        });

    } catch (e) {
        console.error("Stats API Error:", e);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
