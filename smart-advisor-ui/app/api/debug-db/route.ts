import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { initDB, initPlannerTables, loadMajor, loadPlanner, savePlanner } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const trace = searchParams.get('trace');

    try {
        if (trace === 'init') {
            try {
                console.log("Debug: Running initDB...");
                await initDB();
                console.log("Debug: Running initPlannerTables...");
                await initPlannerTables();
                return NextResponse.json({
                    status: 'success',
                    message: 'Migrations executed Successfully'
                });
            } catch (err: any) {
                console.error("Migration Error:", err);
                return NextResponse.json({
                    status: 'error',
                    message: err.message,
                    stack: err.stack
                }, { status: 500 });
            }
        }

        if (trace === 'load') {
            const sid = searchParams.get('sid');
            if (!sid) return NextResponse.json({ error: 'Missing sid' }, { status: 400 });
            console.log(`Debug: Manual loadPlanner for ${sid}`);
            const data = await loadPlanner(sid);
            return NextResponse.json({ status: 'success', data });
        }

        if (trace === 'save') {
            const sid = searchParams.get('sid') || 'debug-user';
            console.log(`Debug: Manual savePlanner for ${sid}`);
            await savePlanner(sid, {
                id: 'debug-sem-' + Date.now(),
                name: 'Debug Semester',
                courses: [{ id: 'c1', name: 'Test Course', credits: 3 }],
                studySessions: [{ id: 's1', courseId: 'c1', date: '2026-02-23', hours: 1, notes: 'Debug' }]
            });
            return NextResponse.json({ status: 'success', message: 'Save completed' });
        }

        if (trace === 'schema') {
            const { rows: coursesCols } = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'planner_courses'`;
            const { rows: sessionsCols } = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'planner_study_sessions'`;
            return NextResponse.json({
                status: 'success',
                planner_courses: coursesCols.map(c => c.column_name),
                planner_study_sessions: sessionsCols.map(c => c.column_name)
            });
        }

        // Default: test connection and list tables
        const { rows } = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        return NextResponse.json({
            status: 'success',
            tables: rows.map(r => r.table_name)
        });
    } catch (error: any) {
        console.error("Debug Route Error:", error);
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
