import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';
import { getAllStudents, initDB } from '@/lib/database';
import { getAIUsageStats } from '@/lib/ai-logger';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import type { StatsResponse } from '@/types/api';

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

export async function GET(request: NextRequest) {
    const secret = request.headers.get('x-admin-secret');
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await initDB();
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

        // Load degree rules for total credits lookup
        const rulesRaw = await fs.readFile(path.join(process.cwd(), 'public', 'data', 'curriculum_rules.json'), 'utf-8');
        const rulesJson = JSON.parse(rulesRaw);
        const getMajorTotalCredits = (majorKey: string) => {
            for (const type in rulesJson.degree_types) {
                if (rulesJson.degree_types[type].major_keys.includes(majorKey)) {
                    return rulesJson.degree_types[type].total_credits;
                }
            }
            return 135; // Default fallback
        };

        for (const row of progressRows) {
            let courses: (string | { code: string; name?: string })[] = [];
            try {
                courses = JSON.parse(row.completed);
                if (!Array.isArray(courses)) courses = [];
            } catch { continue; }

            let studentCH = 0;
            for (const c of courses) {
                if (!c) continue;
                const rawCode = typeof c === 'string' ? c : c.code;
                const code = rawCode?.trim() || 'UNKNOWN';

                // Group by code only for stats
                courseCounts[code] = (courseCounts[code] || 0) + 1;

                // Look up real credit hours
                const catalogEntry = courseMap.get(code);
                studentCH += catalogEntry ? catalogEntry.ch : 3;
            }

            const mapKey = `${row.student_id}||${row.major}`;
            studentCHMap.set(mapKey, studentCH);
            totalRealCreditHours += studentCH;
        }

        // Process student summaries with real CH
        let totalWeightedProgress = 0;
        for (const s of students) {
            const major = s.major || "Unknown";
            majorCounts[major] = (majorCounts[major] || 0) + 1;
            totalCompletedCourses += s.count;

            const mapKey = `${s.student_id}||${s.major}`;
            const realCH = studentCHMap.get(mapKey) ?? s.count * 3;

            studentRealCH.push({ ...s, ch: realCH });

            const majorTotalCredits = getMajorTotalCredits(s.major);
            const percent = Math.min((realCH / majorTotalCredits) * 100, 100);
            totalWeightedProgress += percent;

            if (percent <= 25) progressDistribution["0-25%"]++;
            else if (percent <= 50) progressDistribution["26-50%"]++;
            else if (percent <= 75) progressDistribution["51-75%"]++;
            else progressDistribution["76-100%"]++;
        }

        const avgWeightedProgress = totalStudents > 0 
            ? Math.round(totalWeightedProgress / totalStudents) 
            : 0;

        const topCourses = Object.entries(courseCounts)
            .map(([code, count]) => {
                const catalogEntry = courseMap.get(code);
                return {
                    code,
                    name: catalogEntry?.name || code,
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
        let recentActivity: any[] = [];
        try {
            const { rows: visitRows } = await sql`
                SELECT student_id, ip_address, user_agent, device_vendor, device_model, os_name, os_version, browser_name, visited_at
                FROM visitor_logs
                ORDER BY visited_at DESC
                LIMIT 50
            `;
            for (const r of visitRows) {
                recentActivity.push({
                    type: 'visit',
                    student_id: r.student_id || 'Anonymous',
                    ip: r.ip_address || 'Unknown',
                    userAgent: r.user_agent,
                    vendor: r.device_vendor,
                    model: r.device_model,
                    os: `${r.os_name || 'Unknown'} ${r.os_version || ''}`.trim(),
                    browser: r.browser_name || 'Unknown',
                    detail: `Visited from ${r.device_model || r.os_name || 'Unknown'}`,
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

        // ── 11. Average CGPA & Study Hours ─────────────────────────
        let avgCgpa = 0;
        let avgStudyHours = 0;
        try {
            const latestGpas = await prisma.gPAHistory.findMany({
                distinct: ['user_id'],
                orderBy: { created_at: 'desc' },
                select: { cumulative_gpa: true }
            });
            if (latestGpas.length > 0) {
                const totalGpa = latestGpas.reduce((s, g) => s + g.cumulative_gpa, 0);
                avgCgpa = Number((totalGpa / latestGpas.length).toFixed(2));
            }

            const sessions = await prisma.studySession.groupBy({
                by: ['user_id'],
                _sum: { duration_minutes: true }
            });
            if (sessions.length > 0) {
                const totalMins = sessions.reduce((s, row) => s + (row._sum.duration_minutes || 0), 0);
                avgStudyHours = Number((totalMins / 60 / sessions.length).toFixed(1));
            }
        } catch { /* ok */ }

        // ── 12. Admin Logs ──────────────────────────────────────────
        let adminLogs: any[] = [];
        try {
            adminLogs = await prisma.adminLog.findMany({
                orderBy: { created_at: 'desc' },
                take: 50
            });
        } catch { /* ok */ }

        // ── 13. AI Usage Stats ──────────────────────────────────────
        let aiUsage = null;
        try {
            aiUsage = await getAIUsageStats(7);
        } catch { /* ok */ }

        // Sort unified recent activity
        recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        recentActivity = recentActivity.slice(0, 50);

        return NextResponse.json({
            totalStudents,
            totalVisitors,
            totalCompletedCourses,
            avgCoursesCompleted,
            avgCreditHours,
            avgWeightedProgress,
            avgCgpa,
            avgStudyHours,
            thisWeekVisits,
            lastWeekVisits,
            majorCounts,
            progressDistribution,
            topCourses,
            trafficByDay,
            deviceBreakdown,
            recentActivity,
            heatmap,
            students: studentRealCH,
            studentData: studentRealCH, // Keep for legacy if any
            adminLogs,
            aiUsage,
        });

    } catch (e) {
        console.error("Stats API Error:", e);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
