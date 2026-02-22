import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getAllStudents } from '@/lib/database';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/* ─── Load course catalog and rules from JSON files (server-side) ────────── */

interface CourseEntry { code: string; name: string; ch: number; level?: number }
interface MajorRules { total_credits: number; major_keys: string[] }

let courseCache: Map<string, CourseEntry> | null = null;
let rulesCache: Record<string, number> | null = null; // major_key -> total_credits

async function getDashboardData() {
    if (courseCache && rulesCache) return { courseMap: courseCache, majorGoals: rulesCache };

    const dataDir = path.join(process.cwd(), 'public', 'data');
    const curriculumFile = path.join(dataDir, 'curriculum.json');
    const sharedFile = path.join(dataDir, 'shared.json');
    const rulesFile = path.join(dataDir, 'curriculum_rules.json');

    const courseMap = new Map<string, CourseEntry>();
    const majorGoals: Record<string, number> = {};

    try {
        // 1. Load Curriculum & Shared Courses
        const [currRaw, sharedRaw, rulesRaw] = await Promise.all([
            fs.readFile(curriculumFile, 'utf-8'),
            fs.readFile(sharedFile, 'utf-8'),
            fs.readFile(rulesFile, 'utf-8'),
        ]);

        const currJson = JSON.parse(currRaw);
        const sharedJson = JSON.parse(sharedRaw);
        const rulesJson = JSON.parse(rulesRaw);

        const extractCourses = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            for (const key in obj) {
                const val = obj[key];
                if (Array.isArray(val)) {
                    for (const c of val) {
                        if (c && typeof c === 'object' && 'code' in c && 'ch' in c) {
                            courseMap.set(c.code, { code: c.code, name: c.name || c.code, ch: c.ch, level: c.level });
                        }
                    }
                } else if (val && typeof val === 'object') {
                    extractCourses(val);
                }
            }
        };

        extractCourses(currJson);
        extractCourses(sharedJson);

        // 2. Load Major Credit Goals
        for (const type in rulesJson.degree_types) {
            const rule = rulesJson.degree_types[type];
            for (const mKey of rule.major_keys) {
                majorGoals[mKey] = rule.total_credits;
            }
        }

    } catch (e) {
        console.error("Failed to load dashboard data sources:", e);
    }

    courseCache = courseMap;
    rulesCache = majorGoals;
    return { courseMap, majorGoals };
}

export async function GET(request: Request) {
    const secret = request.headers.get('x-admin-secret');
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [students, { courseMap, majorGoals }] = await Promise.all([
            getAllStudents(),
            getDashboardData(),
        ]);

        // ── 1. Totals ────────────────────────────────────────────────
        const totalStudents = students.length;

        // ── 2. Distributions ─────────────────────────────────────────
        const majorCounts: Record<string, number> = {};
        const progressDistribution: Record<string, number> = {
            "0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0,
        };

        const courseCounts: Record<string, number> = {};
        let totalWeightedProgress = 0;
        let totalRealCreditHours = 0;
        let totalCompletedCourses = 0;

        // ── 3. Load Progress Persistence for Depth Analysis ─────────
        let progressRows: { student_id: string; major: string; completed: string }[] = [];
        try {
            const { rows } = await sql`SELECT student_id, major, completed FROM student_progress`;
            progressRows = rows as { student_id: string; major: string; completed: string }[];
        } catch { /* ok */ }

        // Map for quick lookup
        const studentProgressMap = new Map<string, string[]>();
        for (const row of progressRows) {
            try {
                const courses = JSON.parse(row.completed);
                studentProgressMap.set(`${row.student_id}||${row.major}`, courses);
            } catch { continue; }
        }

        const studentRealCH: { student_id: string; major: string; count: number; ch: number; goal: number }[] = [];

        // ── 4. Process Every Student ─────────────────────────────────
        for (const s of students) {
            const major = s.major || "Unknown";
            const goal = majorGoals[major] || 135; // Fallback to 135 if major not in rules
            majorCounts[major] = (majorCounts[major] || 0) + 1;

            const completedList = studentProgressMap.get(`${s.student_id}||${s.major}`) || [];

            let studentCH = 0;
            for (const c of completedList) {
                const code = typeof c === 'string' ? c : (c as any).code;
                const name = typeof c === 'object' && (c as any).name ? (c as any).name : code;
                const key = `${code}||${name}`;

                courseCounts[key] = (courseCounts[key] || 0) + 1;

                const catalogEntry = courseMap.get(code);
                studentCH += catalogEntry ? catalogEntry.ch : 3;
            }

            totalRealCreditHours += studentCH;
            totalCompletedCourses += completedList.length;

            const percent = Math.min((studentCH / goal) * 100, 100);
            totalWeightedProgress += percent;

            studentRealCH.push({
                student_id: s.student_id,
                major: s.major,
                count: completedList.length,
                ch: studentCH,
                goal: goal
            });

            if (percent <= 25) progressDistribution["0-25%"]++;
            else if (percent <= 50) progressDistribution["26-50%"]++;
            else if (percent <= 75) progressDistribution["51-75%"]++;
            else progressDistribution["76-100%"]++;
        }

        // ── 5. Analytics & Formatting ────────────────────────────────
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

        // Traffic & Visitor data
        let trafficTrends: any[] = [];
        let totalVisitors = 0;
        let deviceBreakdown: any[] = [];
        let recentActivity: any[] = [];
        let heatmap: any[] = [];
        let thisWeekVisits = 0;
        let lastWeekVisits = 0;

        try {
            const [trafficRes, visitorCountRes, deviceRes, activityRes, heatmapRes, weekRes] = await Promise.all([
                sql`SELECT DATE(visited_at) as day, COUNT(*) as count FROM visitor_logs WHERE visited_at >= NOW() - INTERVAL '30 days' GROUP BY DATE(visited_at) ORDER BY day ASC`,
                sql`SELECT COUNT(*) as total FROM visitor_logs`,
                sql`SELECT COALESCE(os_name, 'Unknown') as os, COALESCE(browser_name, 'Unknown') as browser, COUNT(*) as count FROM visitor_logs GROUP BY os_name, browser_name ORDER BY count DESC`,
                sql`SELECT student_id, os_name, browser_name, device_model, visited_at FROM visitor_logs ORDER BY visited_at DESC LIMIT 50`,
                sql`SELECT EXTRACT(DOW FROM visited_at)::int as day, EXTRACT(HOUR FROM visited_at)::int as hour, COUNT(*) as count FROM visitor_logs GROUP BY day, hour ORDER BY day, hour`,
                sql`SELECT 
                    (SELECT COUNT(*) FROM visitor_logs WHERE visited_at >= DATE_TRUNC('week', NOW())) as tw,
                    (SELECT COUNT(*) FROM visitor_logs WHERE visited_at >= DATE_TRUNC('week', NOW()) - INTERVAL '7 days' AND visited_at < DATE_TRUNC('week', NOW())) as lw`
            ]);

            trafficTrends = trafficRes.rows.map(r => ({ date: String(r.day).slice(0, 10), count: Number(r.count) }));
            totalVisitors = Number(visitorCountRes.rows[0]?.total ?? 0);
            deviceBreakdown = deviceRes.rows.map(r => ({ os: String(r.os), browser: String(r.browser), count: Number(r.count) }));
            recentActivity = activityRes.rows.map(r => ({
                type: 'visit',
                student_id: r.student_id || 'Anonymous',
                detail: `Visited from ${r.device_model || r.os_name || 'Device'} (${r.browser_name || 'Browser'})`,
                time: String(r.visited_at)
            }));
            heatmap = heatmapRes.rows.map(r => ({ day: Number(r.day), hour: Number(r.hour), count: Number(r.count) }));
            thisWeekVisits = Number(weekRes.rows[0]?.tw ?? 0);
            lastWeekVisits = Number(weekRes.rows[0]?.lw ?? 0);
        } catch (e) { console.error("Database detail fetch failed:", e); }

        return NextResponse.json({
            totalStudents,
            totalVisitors,
            totalCompletedCourses,
            avgCoursesCompleted: totalStudents > 0 ? Math.round(totalCompletedCourses / totalStudents) : 0,
            avgCreditHours: totalStudents > 0 ? Math.round(totalRealCreditHours / totalStudents) : 0,
            avgWeightedProgress: totalStudents > 0 ? Math.round(totalWeightedProgress / totalStudents) : 0,
            thisWeekVisits,
            lastWeekVisits,
            majorCounts,
            progressDistribution,
            topCourses,
            trafficByDay: trafficTrends,
            deviceBreakdown,
            recentActivity,
            heatmap,
            students: studentRealCH,
        });

    } catch (e) {
        console.error("Stats API Error:", e);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
