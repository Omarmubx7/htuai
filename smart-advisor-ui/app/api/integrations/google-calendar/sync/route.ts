import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getIntegrationToken } from "@/lib/database";
import { prisma } from "@/lib/prisma";

type CourseDate = string | number | Date;
type SyncResult = { course: string; type: string; success: boolean; eventId?: string; error?: string };

async function syncCourseExams(course: any, courseData: Record<string, unknown>, token: any, user: any, results: SyncResult[]) {
    for (const [field, type] of [["midterm_date", "Midterm"], ["final_date", "Final"]] as const) {
        const dateVal = courseData[field] as CourseDate;
        if (!dateVal) continue;

        const existingEvent = await prisma.calendarEvent.findFirst({
            where: { course_id: course.id, type }
        });

        const metadata = token.metadata as Record<string, unknown> | null;
        const prefDays = (metadata?.exam_reminders_days as number) ?? (metadata?.exam_reminders === false ? 0 : 7);
        const overrides = [];
        if (prefDays > 0) {
            overrides.push({ method: "popup", minutes: prefDays * 24 * 60 });
        }

        const eventData = {
            summary: `${course.name} — ${type}`,
            description: `${type} exam for ${course.name} (${course.credits} CH)`,
            start: { dateTime: new Date(dateVal).toISOString(), timeZone: "Asia/Amman" },
            end: { dateTime: new Date(new Date(dateVal).getTime() + 2 * 60 * 60 * 1000).toISOString(), timeZone: "Asia/Amman" }, // 2 hour duration
            reminders: { useDefault: false, overrides }
        };

        try {
            let method = "POST";
            let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

            if (existingEvent?.google_event_id) {
                method = "PATCH";
                url = `${url}/${existingEvent.google_event_id}`;
            }

            let googleRes = await fetch(url, {
                method,
                headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify(eventData),
            });

            if (!googleRes.ok && googleRes.status === 404 && existingEvent?.google_event_id) {
                googleRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify(eventData),
                });
            }

            if (googleRes.ok) {
                const data = await googleRes.json();
                const gEventId = data.id;

                await prisma.calendarEvent.upsert({
                    where: { id: existingEvent?.id || -1 },
                    update: { google_event_id: gEventId, start_datetime: new Date(dateVal), end_datetime: new Date(new Date(dateVal).getTime() + 2 * 60 * 60 * 1000) },
                    create: {
                        user_id: user.id, course_id: course.id, type, google_event_id: gEventId,
                        title: `${course.name} — ${type}`, start_datetime: new Date(dateVal),
                        end_datetime: new Date(new Date(dateVal).getTime() + 2 * 60 * 60 * 1000)
                    }
                });

                await prisma.adminLog.create({
                    data: {
                        type: "sync_event", message: `Synced ${type} for ${course.code} to Calendar`,
                        course_id: course.id, event_kind: "calendar_sync", target_id: gEventId, details: {}
                    }
                });

                results.push({ course: course.code, type, success: true, eventId: gEventId });
            } else {
                const errText = await googleRes.text();
                results.push({ course: course.code, type, success: false, error: errText });
            }
        } catch (err: unknown) {
            results.push({ course: course.code, type, success: false, error: err instanceof Error ? err.message : String(err) });
        }
    }
}

async function syncCourseSchedule(course: any, courseData: Record<string, unknown>, token: any, user: any, results: SyncResult[]) {
    if (!courseData.class_schedule) return;

    try {
        const parsed = typeof courseData.class_schedule === 'string'
            ? JSON.parse(courseData.class_schedule)
            : courseData.class_schedule;
        let strValue = "";
        if (Array.isArray(parsed) && parsed.length > 0) strValue = parsed[0];
        else if (typeof parsed === 'string') strValue = parsed;

        const parts = strValue.split(" ");
        if (parts.length < 2) return;

        const days = parts[0].split("/").filter(Boolean);
        const times = parts[1].split("-");

        if (days.length > 0 && times[0] && times[1]) {
            const [startH, startM] = times[0].split(":").map(Number);
            const [endH, endM] = times[1].split(":").map(Number);

            const dayMap: Record<string, string> = { "Sun": "SU", "Mon": "MO", "Tue": "TU", "Wed": "WE", "Thu": "TH", "Fri": "FR", "Sat": "SA" };
            const rruleDays = days.map((d: string) => dayMap[d]).filter(Boolean).join(",");

            const semesterObj = courseData.semester_object as Record<string, unknown> | undefined;
            const baseDate = semesterObj?.start_date ? new Date(semesterObj.start_date as CourseDate) : new Date();
            const dayToNum: Record<string, number> = { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6 };
            const targetDays = new Set(days.map((d: string) => dayToNum[d]).filter((n: number) => n !== undefined));

            const firstDate = new Date(baseDate);
            firstDate.setHours(startH, startM, 0, 0);

            let attempts = 0;
            while (!targetDays.has(firstDate.getDay()) && attempts < 7) {
                firstDate.setDate(firstDate.getDate() + 1);
                attempts++;
            }

            const startDateTime = new Date(firstDate);
            const endDateTime = new Date(firstDate);
            endDateTime.setHours(endH, endM, 0, 0);

            const untilDate = semesterObj?.end_date ? new Date(semesterObj.end_date as CourseDate) : new Date(baseDate.getTime() + 120 * 24 * 60 * 60 * 1000);
            untilDate.setHours(23, 59, 59, 0);
            const untilStr = untilDate.toISOString().replaceAll("-", "").replaceAll(":", "").split(".")[0] + "Z";

            const existingEvent = await prisma.calendarEvent.findFirst({
                where: { course_id: course.id, type: "Schedule" }
            });

            let description = `Weekly class schedule for ${course.name}.`;
            if (courseData.instructor_name) {
                const instructorStr = typeof courseData.instructor_name === 'object' 
                    ? JSON.stringify(courseData.instructor_name) 
                    : String(courseData.instructor_name);
                description += `\nInstructor: ${instructorStr}`;
            }

            const eventData = {
                summary: `${course.name} (Class)`,
                location: courseData.location || undefined,
                description,
                start: { dateTime: startDateTime.toISOString(), timeZone: "Asia/Amman" },
                end: { dateTime: endDateTime.toISOString(), timeZone: "Asia/Amman" },
                recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${rruleDays};UNTIL=${untilStr}`],
                reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }, { method: "popup", minutes: 10 }] }
            };

            let method = "POST";
            let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

            if (existingEvent?.google_event_id) {
                method = "PATCH";
                url = `${url}/${existingEvent.google_event_id}`;
            }

            let googleRes = await fetch(url, {
                method, headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify(eventData),
            });

            if (!googleRes.ok && googleRes.status === 404 && existingEvent?.google_event_id) {
                googleRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
                    method: "POST", headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify(eventData),
                });
            }

            if (googleRes.ok) {
                const data = await googleRes.json();
                const gEventId = data.id;

                await prisma.calendarEvent.upsert({
                    where: { id: existingEvent?.id || -1 },
                    update: { google_event_id: gEventId, start_datetime: startDateTime, end_datetime: endDateTime },
                    create: { user_id: user.id, course_id: course.id, type: "Schedule", google_event_id: gEventId, title: `${course.name} (Class)`, start_datetime: startDateTime, end_datetime: endDateTime }
                });

                await prisma.adminLog.create({
                    data: { type: "sync_event", message: `Synced Schedule for ${course.code} to Calendar`, course_id: course.id, event_kind: "calendar_sync", target_id: gEventId, details: {} }
                });

                results.push({ course: course.code, type: "Schedule", success: true, eventId: gEventId });
            } else {
                const errText = await googleRes.text();
                results.push({ course: course.code, type: "Schedule", success: false, error: errText });
            }
        }
    } catch (err: unknown) {
        results.push({ course: course.code, type: "Schedule", success: false, error: err instanceof Error ? err.message : String(err) });
    }
}

// POST /api/integrations/google-calendar/sync — Force pushes semester courses and study sessions to Calendar
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

        // Retrieve current active courses and study sessions for calendar push
        const activeSemesters = await prisma.semester.findMany({
            where: { user_id: user.id },
            include: { courses: true }
        });

        const results: SyncResult[] = [];
        const upcomingClasses = activeSemesters.flatMap(sem => sem.courses.map(c => ({ ...c, semester_object: sem })));

        for (const course of upcomingClasses) {
            const courseData = course as Record<string, unknown>;
            await syncCourseExams(course, courseData, token, user, results);
            await syncCourseSchedule(course, courseData, token, user, results);
        }

        return NextResponse.json({ success: true, syncedItems: results.length, details: results });

    } catch (e: unknown) {
        console.error("Calendar Sync Error:", e instanceof Error ? e.message : String(e));
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
