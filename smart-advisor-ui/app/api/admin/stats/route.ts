import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getAllStudents } from '@/lib/database';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/* ─── Load course catalog from JSON files (server-side) ────────── */

interface CourseEntry { code: string; name: string; ch: number; level?: number }

let courseCache: Map<string, CourseEntry> | null = null;

async function getCourseMap(): Promise<Map<string, CourseEntry>> {
    if (courseCache) return courseCache;

    const dataDir = path.join(process.cwd(), 'public', 'data');
    const masterFile = path.join(dataDir, 'curriculum.json');
    const map = new Map<string, CourseEntry>();

    try {
        const raw = await fs.readFile(masterFile, 'utf-8');
        const json = JSON.parse(raw);

        const extractCourses = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            for (const key in obj) {
                const val = obj[key];
                if (Array.isArray(val)) {
                    for (const c of val) {
                        if (c && typeof c === 'object' && 'code' in c && 'ch' in c) {
                            map.set(c.code, { code: c.code, name: c.name || c.code, ch: c.ch, level: c.level });
                        }
                    }
                } else if (val && typeof val === 'object') {
                    extractCourses(val);
                }
            }
        };

        // Extract from shared and all majors
        extractCourses(json.shared);
        extractCourses(json.majors);

    } catch (e) {
        console.error("Failed to load course map for stats:", e);
    }

    courseCache = map;
    return map;
}

export async function GET(request: Request) {
    const secret = request.headers.get('x-admin-secret');
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [students, courseMap] = await Promise.all([
            getAllStudents(),
            getCourseMap(),
        ]);

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

        // ── 4. Course Counts (from completed arrays) ─────────────────
        const courseCounts: Record<string, number> = {};

        // ── 5. Compute REAL credit hours per student ─────────────────
        let totalRealCreditHours = 0;
        const studentRealCH: { student_id: string; major: string; count: number; ch: number }[] = [];

        // Load all completed arrays to compute real CH
        let progressRows: { student_id: string; major: string; completed: string }[] = [];
        try {
            const { rows } = await sql`SELECT student_id, major, completed FROM student_progress`;
            progressRows = rows as { student_id: string; major: string; completed: string }[];
        } catch { /* table might not exist yet */ }

        // Build a lookup of student_id+major → real credit hours
        const studentCHMap = new Map<string, number>();

        for (const row of progressRows) {
            let courses: (string | { code: string; name?: string })[] = [];
            try { courses = JSON.parse(row.completed); } catch { continue; }

            let studentCH = 0;
            for (const c of courses) {
                const code = typeof c === 'string' ? c : c.code;
                const name = typeof c === 'object' && c.name ? c.name : code;
                const key = `${code}||${name}`;
                courseCounts[key] = (courseCounts[key] || 0) + 1;

                // Look up real credit hours from course catalog
                const catalogEntry = courseMap.get(code);
                studentCH += catalogEntry ? catalogEntry.ch : 3; // fallback to 3 if not found
            }

            const mapKey = `${row.student_id}||${row.major}`;
            studentCHMap.set(mapKey, studentCH);
            totalRealCreditHours += studentCH;
        }

        // Process student summaries with real CH
        for (const s of students) {
            const major = s.major || "Unknown";
            majorCounts[major] = (majorCounts[major] || 0) + 1;
            totalCompletedCourses += s.count;

            const mapKey = `${s.student_id}||${s.major}`;
            const realCH = studentCHMap.get(mapKey) ?? s.count * 3;

            studentRealCH.push({ ...s, ch: realCH });

            const percent = Math.min((realCH / TOTAL_CREDITS) * 100, 100);
            if (percent <= 25) progressDistribution["0-25%"]++;
            else if (percent <= 50) progressDistribution["26-50%"]++;
            else if (percent <= 75) progressDistribution["51-75%"]++;
            else progressDistribution["76-100%"]++;
        }

        const topCourses = Object.entries(courseCounts)
            .map(([key, count]) => {
                const [code, name] = key.split('||');
                const catalogEntry = courseMap.get(code);
                return {
                    code,
                    name: name || code,
                    count,
                    ch: catalogEntry?.ch ?? 3,
                };
            })
            .sort((a, b) => b.count - a.count);

        // ── 6. Visitor Traffic (last 30 days) ────────────────────────
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

        // ── 7. Device / OS / Browser Breakdown ───────────────────────
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

        // ── 8. Recent Activity ───────────────────────────────────────
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

        // ── 9. Activity Heatmap (hour × day of week) ─────────────────
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

        // ── 10. Week-over-week comparison ─────────────────────────────
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

        // ── Computed Averages (REAL) ──────────────────────────────────
        const avgCoursesCompleted = totalStudents > 0
            ? Math.round(totalCompletedCourses / totalStudents)
            : 0;
        const avgCreditHours = totalStudents > 0
            ? Math.round(totalRealCreditHours / totalStudents)
            : 0;

        // Build device breakdown as an object (keyed by OS)
        const deviceBreakdownObj: Record<string, number> = {};
        for (const d of deviceBreakdown) {
            deviceBreakdownObj[d.os] = (deviceBreakdownObj[d.os] || 0) + d.count;
        }

        return NextResponse.json({
            totalStudents,
            visitorCount: totalVisitors,
            totalVisitors,
            totalCompletedCourses,
            avgCoursesCompleted,
            avgCreditHours,
            thisWeekVisits,
            lastWeekVisits,
            majorDistribution: majorCounts,
            majorCounts,
            progressDistribution,
            topCourses,
            trafficTrends: trafficByDay,
            trafficByDay,
            deviceBreakdown: deviceBreakdownObj,
            recentActivity,
            heatmap,
            studentData: studentRealCH,
            students: studentRealCH,
        });

    } catch (e) {
        console.error("Stats API Error:", e);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
