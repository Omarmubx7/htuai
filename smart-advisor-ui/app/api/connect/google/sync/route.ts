import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getIntegrationToken } from "@/lib/database";
import { prisma } from "@/lib/prisma";

type CourseDate = string | number | Date;
type SyncResult = { course: string; type: string; success: boolean; eventId?: string; error?: string };

function getExamReminders(token: any): { method: string; minutes: number }[] {
    const metadata = token.metadata as Record<string, unknown> | null;
    const prefDays = (metadata?.exam_reminders_days as number) ?? (metadata?.exam_reminders === false ? 0 : 7);
    return prefDays > 0 ? [{ method: "popup", minutes: prefDays * 24 * 60 }] : [];
}

async function upsertGoogleEvent(url: string, method: string, token: any, eventData: any): Promise<Response> {
    let res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
    });

    if (!res.ok && res.status === 404 && method === "PATCH") {
        res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
        });
    }
    return res;
}

async function syncCourseExams(course: any, courseData: Record<string, unknown>, token: any, user: any, results: SyncResult[]) {
    // Both field names are lowercase in Prisma schema
    const examTypes = [
        { field: "midterm_date", type: "Midterm" },
        { field: "final_date", type: "Final" }
    ] as const;

    for (const { field, type } of examTypes) {
        const dateVal = courseData[field] as CourseDate;
        
        // Ensure we have a valid date value
        if (!dateVal) {
            console.log(`[Sync] Skipping ${type} for ${course.code}: No date set.`);
            continue;
        }

        try {
            const dateObj = new Date(dateVal);
            if (isNaN(dateObj.getTime())) {
                console.warn(`[Sync] Invalid date for ${course.code} ${type}:`, dateVal);
                results.push({ course: course.code, type, success: false, error: "Invalid date format" });
                continue;
            }

            const existingEvent = await prisma.calendarEvent.findFirst({
                where: { 
                    course_id: course.id, 
                    type,
                    user_id: user.id 
                }
            });

            // For exams, we set a default 2-hour duration
            const startTime = dateObj.toISOString();
            const endTime = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000).toISOString();

            const eventData = {
                summary: `${course.name} — ${type} Exam`,
                description: `${type} examination for ${course.name} (${course.credits} CH). Automatically synced from HTUAI.`,
                location: (courseData.location as string) || undefined,
                start: { dateTime: startTime, timeZone: "Asia/Amman" },
                end: { dateTime: endTime, timeZone: "Asia/Amman" },
                reminders: { 
                    useDefault: false, 
                    overrides: getExamReminders(token) 
                },
                colorId: type === "Midterm" ? "5" : "11" // Different colors for Midterm (Yellow) and Final (Red/Tomato)
            };

            const method = existingEvent?.google_event_id ? "PATCH" : "POST";
            const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events" + (existingEvent?.google_event_id ? `/${existingEvent.google_event_id}` : "");

            const googleRes = await upsertGoogleEvent(url, method, token, eventData);

            if (!googleRes.ok) {
                const errText = await googleRes.text();
                console.error(`[Sync] Google API Error (${type} for ${course.code}):`, errText);
                results.push({ course: course.code, type, success: false, error: errText });
                continue;
            }

            const data = await googleRes.json();
            const gEventId = data.id;

            await prisma.$transaction([
                prisma.calendarEvent.upsert({
                    where: { id: existingEvent?.id || -1 },
                    update: { 
                        google_event_id: gEventId, 
                        start_datetime: dateObj, 
                        end_datetime: new Date(dateObj.getTime() + 2 * 60 * 60 * 1000),
                        updated_at: new Date()
                    },
                    create: {
                        user_id: user.id, 
                        course_id: course.id, 
                        type, 
                        google_event_id: gEventId,
                        title: `${course.name} — ${type} Exam`, 
                        start_datetime: dateObj,
                        end_datetime: new Date(dateObj.getTime() + 2 * 60 * 60 * 1000)
                    }
                }),
                prisma.adminLog.create({
                    data: {
                        type: "sync_event", 
                        message: `Synced ${type} for ${course.code} to Calendar`,
                        course_id: course.id, 
                        event_kind: "calendar_sync", 
                        target_id: gEventId, 
                        details: { method, gEventId }
                    }
                })
            ]);

            results.push({ course: course.code, type, success: true, eventId: gEventId });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Sync] Unexpected Error (${type} for ${course.code}):`, msg);
            results.push({ course: course.code, type, success: false, error: msg });
        }
    }
}

function parseSchedule(schedule: any): { days: string[]; startH: number; startM: number; endH: number; endM: number } | null {
    if (!schedule) return null;
    try {
        const parsed = typeof schedule === 'string' ? JSON.parse(schedule) : schedule;
        let strValue = "";
        if (Array.isArray(parsed) && parsed.length > 0) {
            strValue = parsed[0];
        } else if (typeof parsed === 'string') {
            strValue = parsed;
        }
        const parts = strValue.split(" ");
        if (parts.length < 2) return null;

        const days = parts[0].split("/").filter(Boolean);
        const times = parts[1].split("-");
        if (days.length === 0 || !times[0] || !times[1]) return null;

        const [startH, startM] = times[0].split(":").map(Number);
        const [endH, endM] = times[1].split(":").map(Number);
        return { days, startH, startM, endH, endM };
    } catch { return null; }
}

function calculateScheduleDates(schedule: { days: string[]; startH: number; startM: number; endH: number; endM: number }, semesterObj?: Record<string, unknown>) {
    const dayToNum: Record<string, number> = { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6 };
    const targetDays = new Set(schedule.days.map(d => dayToNum[d]).filter(n => n !== undefined));
    
    // Ensure we have a valid base date (start of semester or today)
    let baseDate = new Date();
    if (semesterObj?.start_date) {
        const d = new Date(semesterObj.start_date as CourseDate);
        if (!isNaN(d.getTime())) baseDate = d;
    }

    const firstDate = new Date(baseDate);
    firstDate.setHours(schedule.startH, schedule.startM, 0, 0);
    
    // Find the first occurrence of the class
    let attempts = 0;
    while (!targetDays.has(firstDate.getDay()) && attempts < 7) {
        firstDate.setDate(firstDate.getDate() + 1);
        attempts++;
    }

    const start = new Date(firstDate);
    const end = new Date(firstDate);
    end.setHours(schedule.endH, schedule.endM, 0, 0);

    // Calculate until date (end of semester or +4 months)
    let untilDate = new Date(baseDate.getTime() + 120 * 24 * 60 * 60 * 1000);
    if (semesterObj?.end_date) {
        const d = new Date(semesterObj.end_date as CourseDate);
        if (!isNaN(d.getTime())) untilDate = d;
    }
    
    untilDate.setHours(23, 59, 59, 0);
    const untilStr = untilDate.toISOString().replaceAll("-", "").replaceAll(":", "").split(".")[0] + "Z";

    return { start, end, untilStr };
}

async function syncCourseSchedule(course: any, courseData: Record<string, unknown>, token: any, user: any, results: SyncResult[]) {
    const scheduleInfo = parseSchedule(courseData.class_schedule);
    if (!scheduleInfo) return;

    try {
        const semesterObj = courseData.semester_object as Record<string, unknown> | undefined;
        const { start, end, untilStr } = calculateScheduleDates(scheduleInfo, semesterObj);

        const dayMap: Record<string, string> = { "Sun": "SU", "Mon": "MO", "Tue": "TU", "Wed": "WE", "Thu": "TH", "Fri": "FR", "Sat": "SA" };
        const rruleDays = scheduleInfo.days.map(d => dayMap[d]).filter(Boolean).join(",");

        let description = `Weekly class schedule for ${course.name}. Automatically synced from HTUAI.`;
        if (courseData.instructor_name) {
            const instructor = courseData.instructor_name;
            let instructorStr = "";
            if (typeof instructor === 'string') {
                instructorStr = instructor;
            } else if (typeof instructor === 'number') {
                instructorStr = instructor.toString();
            } else if (instructor && typeof instructor === 'object') {
                instructorStr = (instructor as any).name || (instructor as any).title || JSON.stringify(instructor);
            }
            if (instructorStr) description += `\nInstructor: ${instructorStr}`;
        }

        const eventData = {
            summary: `${course.name} (Class)`,
            location: (courseData.location as string) || undefined,
            description,
            start: { dateTime: start.toISOString(), timeZone: "Asia/Amman" },
            end: { dateTime: end.toISOString(), timeZone: "Asia/Amman" },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${rruleDays};UNTIL=${untilStr}`],
            reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
            colorId: "1" // Lavender for classes
        };

        const existingEvent = await prisma.calendarEvent.findFirst({ 
            where: { 
                course_id: course.id, 
                type: "Schedule",
                user_id: user.id
            } 
        });
        
        const method = existingEvent?.google_event_id ? "PATCH" : "POST";
        const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events" + (existingEvent?.google_event_id ? `/${existingEvent.google_event_id}` : "");

        const googleRes = await upsertGoogleEvent(url, method, token, eventData);
        if (!googleRes.ok) {
            const errText = await googleRes.text();
            console.error(`[Sync] Schedule Error for ${course.code}:`, errText);
            results.push({ course: course.code, type: "Schedule", success: false, error: errText });
            return;
        }

        const gEventId = (await googleRes.json()).id;
        await prisma.$transaction([
            prisma.calendarEvent.upsert({
                where: { id: existingEvent?.id || -1 },
                update: { 
                    google_event_id: gEventId, 
                    start_datetime: start, 
                    end_datetime: end,
                    updated_at: new Date()
                },
                create: { 
                    user_id: user.id, 
                    course_id: course.id, 
                    type: "Schedule", 
                    google_event_id: gEventId, 
                    title: `${course.name} (Class)`, 
                    start_datetime: start, 
                    end_datetime: end 
                }
            }),
            prisma.adminLog.create({
                data: { 
                    type: "sync_event", 
                    message: `Synced Schedule for ${course.code} to Calendar`, 
                    course_id: course.id, 
                    event_kind: "calendar_sync", 
                    target_id: gEventId, 
                    details: { method, gEventId } 
                }
            })
        ]);

        results.push({ course: course.code, type: "Schedule", success: true, eventId: gEventId });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Sync] Schedule Unexpected Error for ${course.code}:`, msg);
        results.push({ course: course.code, type: "Schedule", success: false, error: msg });
    }
}

// POST /api/connect/google/sync — Force pushes semester courses and study sessions to Calendar
export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as Record<string, unknown>).student_id as string || session.user.email || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    const token = await getIntegrationToken(studentId, "google_calendar");
    if (!token) {
        return NextResponse.json({ error: "Unauthorized: Google Calendar disconnected" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: session.user.email || undefined }, { student_id: studentId || undefined }] }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        console.log(`[Sync] Starting sync for user ID: ${user.id} (${user.email})`);

        // Retrieve current active courses and study sessions for calendar push
        const activeSemesters = await prisma.semester.findMany({
            where: { user_id: user.id },
            include: { courses: true }
        });

        const results: SyncResult[] = [];
        const upcomingClasses = activeSemesters.flatMap(sem => sem.courses.map(c => ({ ...c, semester_object: sem })));

        console.log(`[Sync] Found ${activeSemesters.length} semesters and ${upcomingClasses.length} total courses for user ${user.id}`);

        for (const course of upcomingClasses) {
            const courseData = course as Record<string, unknown>;
            await syncCourseExams(course, courseData, token, user, results);
            await syncCourseSchedule(course, courseData, token, user, results);
        }

        console.log(`[Sync] Completed. Results: ${results.filter(r => r.success).length} success, ${results.filter(r => !r.success).length} failed.`);

        return NextResponse.json({ success: true, syncedItems: results.length, details: results });

    } catch (e: unknown) {
        console.error("Calendar Sync Error:", e instanceof Error ? e.message : String(e));
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
