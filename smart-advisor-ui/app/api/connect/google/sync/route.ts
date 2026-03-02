import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getIntegrationToken } from "@/lib/database";
import { prisma } from "@/lib/prisma";

type CourseDate = string | number | Date;
type SyncResult = { 
    course: string; 
    type: string; 
    success: boolean; 
    eventId?: string; 
    error?: string;
    status?: "synced" | "skipped" | "failed"
};

interface SyncCourse {
    id: number;
    code: string;
    name: string;
    credits: number;
    midterm_date?: Date | string | null;
    final_date?: Date | string | null;
    location?: string | null;
    class_schedule?: any;
    semester_object?: Record<string, unknown>;
}

function getExamReminders(token: any): { method: string; minutes: number }[] {
    const metadata = token.metadata as Record<string, unknown> | null;
    const prefDays = (metadata?.exam_reminders_days as number) ?? (metadata?.exam_reminders === false ? 0 : 7);
    return prefDays > 0 ? [{ method: "popup", minutes: prefDays * 24 * 60 }] : [];
}

async function updateTokenMetadata(studentId: string, metadata: any) {
    const user = await prisma.user.findFirst({
        where: { OR: [{ student_id: studentId }, { email: studentId }, { name: studentId }] }
    });
    if (!user) return;

    await prisma.integrationToken.update({
        where: { user_id_provider: { user_id: user.id, provider: "google_calendar" } },
        data: { metadata }
    });
}

async function getOrCreateHtuCalendar(token: any, studentId: string): Promise<string> {
    try {
        if (token.metadata?.htu_calendar_id) return token.metadata.htu_calendar_id;

        const listRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
            headers: { Authorization: `Bearer ${token.accessToken}` }
        });
        
        if (listRes.ok) {
            const listData = await listRes.json();
            const existing = listData.items?.find((c: any) => c.summary === "HTU Smart Advisor");
            if (existing) {
                await updateTokenMetadata(studentId, { ...token.metadata, htu_calendar_id: existing.id });
                return existing.id;
            }
        }

        const createRes = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
            method: "POST",
            headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ summary: "HTU Smart Advisor", timeZone: "Asia/Amman" })
        });

        if (createRes.ok) {
            const newCal = await createRes.json();
            const newId = newCal.id;

            await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
                method: "POST",
                headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ id: newId, selected: true, colorId: "14" })
            });

            await updateTokenMetadata(studentId, { ...token.metadata, htu_calendar_id: newId });
            return newId;
        }
    } catch (e) {
        console.error("Calendar creation failed", e);
    }
    return "primary";
}

async function upsertGoogleEvent(calendarId: string, url: string, method: string, token: any, eventData: any): Promise<Response> {
    const finalUrl = url.replace("primary", encodeURIComponent(calendarId));
    let res = await fetch(finalUrl, {
        method,
        headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
    });

    if (!res.ok && res.status === 404 && method === "PATCH") {
        const postUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
        res = await fetch(postUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
        });
    }
    return res;
}

function formatAmmanTime(date: Date) {
    // We want YYYY-MM-DDTHH:mm:ss+03:00
    const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Amman",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false
    };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value;
    
    // Amman is UTC+3. Note: If Jordan ever returns to DST, this would need to be dynamic.
    // For now, fixed offset is standard for the region.
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+03:00`;
}

async function syncCourseExams(calendarId: string, course: SyncCourse, token: any, user: any, results: SyncResult[]) {
    const examTypes = [
        { field: "midterm_date" as const, type: "Midterm" },
        { field: "final_date" as const, type: "Final" }
    ] as const;

    for (const { field, type } of examTypes) {
        const dateVal = course[field];
        if (!dateVal) {
            results.push({ course: course.code, type, success: false, status: "skipped", error: "Date not set in planner" });
            continue;
        }

        try {
            const dateObj = new Date(dateVal as string | number | Date);
            if (isNaN(dateObj.getTime())) {
                results.push({ course: course.code, type, success: false, status: "failed", error: "Invalid date format" });
                continue;
            }

            const existingEvent = await prisma.calendarEvent.findFirst({
                where: { course_id: course.id, type, user_id: user.id }
            });

            const eventData = {
                summary: `${course.name} — ${type} Exam`,
                description: `${type} examination for ${course.name}. Automatically synced from HTUAI.`,
                location: course.location || undefined,
                start: { dateTime: formatAmmanTime(dateObj), timeZone: "Asia/Amman" },
                end: { dateTime: formatAmmanTime(new Date(dateObj.getTime() + 2 * 60 * 60 * 1000)), timeZone: "Asia/Amman" },
                reminders: { useDefault: false, overrides: getExamReminders(token) },
                colorId: type === "Midterm" ? "5" : "11"
            };

            const method = existingEvent?.google_event_id ? "PATCH" : "POST";
            const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events${existingEvent?.google_event_id ? `/${existingEvent.google_event_id}` : ""}`;

            const googleRes = await upsertGoogleEvent(calendarId, url, method, token, eventData);
            if (!googleRes.ok) {
                const errText = await googleRes.text();
                results.push({ course: course.code, type, success: false, status: "failed", error: `Google API Error: ${errText}` });
                continue;
            }

            const data = await googleRes.json();
            const gEventId = data.id;

            await prisma.calendarEvent.upsert({
                where: { id: existingEvent?.id || -1 },
                update: { google_event_id: gEventId, start_datetime: dateObj, end_datetime: new Date(dateObj.getTime() + 2 * 60 * 60 * 1000), updated_at: new Date() },
                create: { user_id: user.id, course_id: course.id, type, google_event_id: gEventId, title: `${course.name} — ${type} Exam`, start_datetime: dateObj, end_datetime: new Date(dateObj.getTime() + 2 * 60 * 60 * 1000) }
            });

            results.push({ course: course.code, type, success: true, status: "synced", eventId: gEventId });
        } catch (err: unknown) {
            results.push({ course: course.code, type, success: false, status: "failed", error: String(err) });
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
    
    let baseDate = new Date();
    if (semesterObj?.start_date) {
        const d = new Date(semesterObj.start_date as CourseDate);
        if (!isNaN(d.getTime())) baseDate = d;
    }

    const firstDate = new Date(baseDate);
    firstDate.setHours(schedule.startH, schedule.startM, 0, 0);
    
    let attempts = 0;
    while (!targetDays.has(firstDate.getDay()) && attempts < 7) {
        firstDate.setDate(firstDate.getDate() + 1);
        attempts++;
    }

    const start = new Date(firstDate);
    const end = new Date(firstDate);
    end.setHours(schedule.endH, schedule.endM, 0, 0);

    let untilDate = new Date(baseDate.getTime() + 120 * 24 * 60 * 60 * 1000);
    if (semesterObj?.end_date) {
        const d = new Date(semesterObj.end_date as CourseDate);
        if (!isNaN(d.getTime())) untilDate = d;
    }
    
    untilDate.setHours(23, 59, 59, 0);
    const untilStr = untilDate.toISOString().replaceAll("-", "").replaceAll(":", "").split(".")[0] + "Z";

    return { start, end, untilStr };
}

async function syncCourseSchedule(calendarId: string, course: SyncCourse, token: any, user: any, results: SyncResult[]) {
    const scheduleInfo = parseSchedule(course.class_schedule);
    if (!scheduleInfo) {
        results.push({ course: course.code, type: "Schedule", success: false, status: "skipped", error: "No valid class time set" });
        return;
    }

    try {
        const semesterObj = course.semester_object;
        const { start, end, untilStr } = calculateScheduleDates(scheduleInfo, semesterObj);

        const dayMap: Record<string, string> = { "Sun": "SU", "Mon": "MO", "Tue": "TU", "Wed": "WE", "Thu": "TH", "Fri": "FR", "Sat": "SA" };
        const rruleDays = scheduleInfo.days.map(d => dayMap[d]).filter(Boolean).join(",");

        const eventData = {
            summary: `${course.name} (Class)`,
            location: course.location || undefined,
            description: `Weekly class schedule for ${course.name}. Automatically synced from HTUAI.`,
            start: { dateTime: formatAmmanTime(start), timeZone: "Asia/Amman" },
            end: { dateTime: formatAmmanTime(end), timeZone: "Asia/Amman" },
            recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${rruleDays};UNTIL=${untilStr}`],
            reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
            colorId: "1"
        };

        const existingEvent = await prisma.calendarEvent.findFirst({ 
            where: { course_id: course.id, type: "Schedule", user_id: user.id } 
        });
        
        const method = existingEvent?.google_event_id ? "PATCH" : "POST";
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events${existingEvent?.google_event_id ? `/${existingEvent.google_event_id}` : ""}`;

        const googleRes = await upsertGoogleEvent(calendarId, url, method, token, eventData);
        if (!googleRes.ok) {
            const errText = await googleRes.text();
            results.push({ course: course.code, type: "Schedule", success: false, status: "failed", error: `Google API Error: ${errText}` });
            return;
        }

        const gEventId = (await googleRes.json()).id;
        await prisma.calendarEvent.upsert({
            where: { id: existingEvent?.id || -1 },
            update: { google_event_id: gEventId, start_datetime: start, end_datetime: end, updated_at: new Date() },
            create: { user_id: user.id, course_id: course.id, type: "Schedule", google_event_id: gEventId, title: `${course.name} (Class)`, start_datetime: start, end_datetime: end }
        });

        results.push({ course: course.code, type: "Schedule", success: true, status: "synced", eventId: gEventId });
    } catch (err: unknown) {
        results.push({ course: course.code, type: "Schedule", success: false, status: "failed", error: String(err) });
    }
}

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = (session.user as Record<string, unknown>).student_id as string || session.user.email || session.user.name;
    if (!studentId) return NextResponse.json({ error: "No student ID" }, { status: 400 });

    const token = await getIntegrationToken(studentId, "google_calendar");
    if (!token) {
        return NextResponse.json({ error: "Unauthorized: Google Calendar disconnected" }, { status: 401 });
    }

    let googleAccountEmail = "unknown";
    try {
        const checkRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${token.accessToken}` }
        });
        if (checkRes.ok) {
            const userData = await checkRes.json();
            googleAccountEmail = userData.email;
        } else {
            return NextResponse.json({ error: "Unauthorized: Google connection expired. Please reconnect in settings." }, { status: 401 });
        }
    } catch (e) {
        return NextResponse.json({ error: "Connection to Google failed." }, { status: 503 });
    }

    const htuCalendarId = await getOrCreateHtuCalendar(token, studentId);

    try {
        const user = await prisma.user.findFirst({
            where: { OR: [{ email: session.user.email || undefined }, { student_id: studentId || undefined }] }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const activeSemesters = await prisma.semester.findMany({
            where: { user_id: user.id },
            include: { courses: true }
        });

        const results: SyncResult[] = [];
        const upcomingClasses = activeSemesters.flatMap(sem => sem.courses.map(c => ({ ...c, semester_object: sem })));

        for (const course of upcomingClasses) {
            await syncCourseExams(htuCalendarId, course as SyncCourse, token, user, results);
            await syncCourseSchedule(htuCalendarId, course as SyncCourse, token, user, results);
        }

        const successCount = results.filter(r => r.success).length;
        const skipCount = results.filter(r => r.status === "skipped").length;
        const failCount = results.filter(r => r.status === "failed").length;

        let statusMessage = "";
        if (successCount > 0) {
            statusMessage = `Successfully synced ${successCount} items to your '${htuCalendarId === 'primary' ? 'Primary' : 'HTU Smart Advisor'}' calendar on ${googleAccountEmail}.`;
        } else if (failCount > 0) {
            statusMessage = `Failed to sync. Google API returned errors for ${failCount} items.`;
        } else {
            statusMessage = `Nothing synced. Found ${skipCount} courses with missing dates or class times.`;
        }

        return NextResponse.json({ 
            success: true, 
            message: statusMessage,
            syncedItems: successCount,
            googleAccount: googleAccountEmail,
            details: results 
        });

    } catch (e: unknown) {
        console.error("Calendar Sync Error:", e instanceof Error ? e.message : String(e));
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}
