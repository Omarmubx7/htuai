import { prisma } from './prisma';

/**
 * Drop all tables and recreate them. (Nuclear Reset)
 */
export async function resetDB() {
    // Drop in correct order of dependencies
    // Prisma does not provide raw DROP efficiently cross-platform without raw execution
    await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE user_badges, badges, quests, gamification_profiles, calendar_events, 
        integration_tokens, admin_logs, study_sessions, gpa_history, course_notes, 
        courses, semesters, accounts, users, visitor_logs, student_profile, student_progress RESTART IDENTITY CASCADE;
    `);
}

/**
 * Visitor log data structure
 */
export interface VisitorLog {
    ip_address: string;
    user_agent: string;
    device_vendor: string | undefined;
    device_model: string | undefined;
    os_name: string | undefined;
    os_version: string | undefined;
    browser_name: string | undefined;
    student_id?: string;
}

/**
 * Checks database health and connection.
 * Table structure is managed by Prisma db push/migrations.
 */
export async function initDB() {
    try {
        await prisma.$connect();
        console.log("[DB] Connection initialized and healthy.");
    } catch (e) {
        console.error("[DB] Initialization failed:", e);
        throw e;
    }
}

/** Helper to resolve a user by whatever ID next-auth currently has for them */
export async function resolveUserByString(identity: string) {
    if (!identity) return null;
    let user = await prisma.user.findUnique({ where: { student_id: identity } });
    user ??= await prisma.user.findUnique({ where: { email: identity } });
    user ??= await prisma.user.findFirst({ where: { name: identity } });
    if (!user) {
        // As a deep fallback, try parsing to an int in case they passed the user_id
        const num = Number.parseInt(identity, 10);
        if (!Number.isNaN(num)) user = await prisma.user.findUnique({ where: { id: num } });
    }
    return user;
}

/** Log visitor information */
export async function logVisitor(data: VisitorLog): Promise<void> {
    try {
        await prisma.visitorLog.create({
            data: {
                student_id: data.student_id || null,
                ip_address: data.ip_address || null,
                user_agent: data.user_agent || null,
                device_vendor: data.device_vendor || null,
                device_model: data.device_model || null,
                os_name: data.os_name || null,
                os_version: data.os_version || null,
                browser_name: data.browser_name || null,
            }
        });
    } catch (e) { console.error('Failed to log visitor', e); }
}

/** Get recent visitor logs */
export async function getVisitorLogs(limit = 100) {
    try {
        const logs = await prisma.visitorLog.findMany({
            take: limit,
            orderBy: { visited_at: 'desc' },
        });
        return logs;
    } catch (e) {
        console.warn("Visitor log fetch error:", e);
        return [];
    }
}

/** Load a student's completed courses for a specific major */
export async function loadProgress(studentId: string, major: string): Promise<string[]> {
    try {
        const record = await prisma.studentProgress.findUnique({
            where: {
                student_id_major: {
                    student_id: studentId,
                    major: major
                }
            }
        });
        if (!record) return [];
        return JSON.parse(record.completed) as string[];
    } catch (e) {
        console.error("Progress fetch error:", e);
        return [];
    }
}

/** Save a student's completed courses for a specific major */
export async function saveProgress(studentId: string, major: string, completed: string[]): Promise<void> {
    const jsonStr = JSON.stringify(completed);
    const time = BigInt(Math.floor(Date.now() / 1000));
    
    const user = await resolveUserByString(studentId);
    if (!user) return;
    
    await prisma.studentProgress.upsert({
        where: { student_id_major: { student_id: studentId, major: major } },
        update: { completed: jsonStr, updated_at: time },
        create: {
            student_id: studentId,
            major: major,
            completed: jsonStr,
            updated_at: time,
            user_id: user.id
        }
    });
}

/** Get a summary of all students */
export async function getAllStudents(): Promise<{ student_id: string; major: string; count: number }[]> {
    // using raw since JSON length isn't straightforward in prisma strictly
    const res = await prisma.$queryRaw<{ student_id: string, major: string, count: number }[]>`
        SELECT student_id, major, json_array_length(completed::json) as count
        FROM student_progress
        ORDER BY updated_at DESC
    `;
    // convert any BigInts safely if needed, but count is usually Int / BigInt -> Number
    return res.map(r => ({ ...r, count: Number(r.count) }));
}

/** Load the major a student previously chose (null = first-time user) */
export async function loadMajor(studentId: string): Promise<string | null> {
    try {
        const rec = await prisma.studentProfile.findUnique({
            where: { student_id: studentId }
        });
        return rec?.major || null;
    } catch (e) { console.error("Major load error:", e); return null; }
}

/** Save / update the student's chosen major */
export async function saveMajor(studentId: string, major: string): Promise<void> {
    const time = BigInt(Math.floor(Date.now() / 1000));
    const user = await resolveUserByString(studentId);
    if (!user) return;
    await prisma.studentProfile.upsert({
        where: { student_id: studentId },
        update: { major, updated_at: time },
        create: { student_id: studentId, major, updated_at: time, user_id: user.id }
    });
}

// ─── User Authentication Methods ─────────────────────────────────────────────

export interface DBUser {
    id: number;
    student_id: string | null;
    email: string | null;
    password_hash: string | null;
    name: string | null;
    image: string | null;
    role: string;
}

export async function getUserById(id: number): Promise<DBUser | null> {
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return null;
    return { ...u, role: u.role || 'student' };
}

export async function getUserByStudentId(studentId: string): Promise<DBUser | null> {
    const u = await prisma.user.findUnique({ where: { student_id: studentId } });
    if (!u) return null;
    return { ...u, role: u.role || 'student' };
}

export async function getUserByEmail(email: string): Promise<DBUser | null> {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return null;
    return { ...u, role: u.role || 'student' };
}

export async function createUser(data: Partial<DBUser>): Promise<DBUser> {
    try {
        if (data.student_id) {
            const u = await prisma.user.upsert({
                where: { student_id: data.student_id },
                update: {
                    password_hash: data.password_hash || undefined,
                    email: data.email || undefined,
                    name: data.name || undefined,
                    image: data.image || undefined,
                    role: data.role || undefined,
                    updated_at: new Date()
                },
                create: {
                    student_id: data.student_id,
                    email: data.email || null,
                    password_hash: data.password_hash || null,
                    name: data.name || null,
                    image: data.image || null,
                    role: data.role || 'student',
                }
            });
            return { ...u, role: u.role || 'student' };
        } else if (data.email) {
            const u = await prisma.user.upsert({
                where: { email: data.email },
                update: {
                    student_id: data.student_id || undefined,
                    password_hash: data.password_hash || undefined,
                    name: data.name || undefined,
                    image: data.image || undefined,
                    role: data.role || undefined,
                    updated_at: new Date()
                },
                create: {
                    student_id: data.student_id || null,
                    email: data.email,
                    password_hash: data.password_hash || null,
                    name: data.name || null,
                    image: data.image || null,
                    role: data.role || 'student',
                }
            });
            return { ...u, role: u.role || 'student' };
        } else {
            const u = await prisma.user.create({
                data: {
                    student_id: data.student_id || null,
                    email: data.email || null,
                    password_hash: data.password_hash || null,
                    name: data.name || null,
                    image: data.image || null,
                    role: data.role || 'student',
                }
            });
            return { ...u, role: u.role || 'student' };
        }
    } catch (e) {
        console.error("DB Error in createUser:", e);
        throw e;
    }
}

export async function linkAccount(userId: number, provider: string, providerAccountId: string) {
    try {
        await prisma.account.upsert({
            where: {
                provider_provider_account_id: {
                    provider,
                    provider_account_id: providerAccountId
                }
            },
            update: {}, // DO NOTHING ON CONFLICT
            create: { user_id: userId, provider, provider_account_id: providerAccountId }
        });
    } catch (e) { console.error("Account link error:", e); }
}

export interface SaveIntegrationTokenOptions {
    studentId: string;
    provider: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    providerAccountId?: string;
    accountEmail?: string;
    studentName?: string;
    metadata?: Record<string, any>;
}

export async function saveIntegrationToken({
    studentId, provider, accessToken,
    refreshToken, expiresAt, providerAccountId, accountEmail, studentName, metadata
}: SaveIntegrationTokenOptions) {
    const user = await resolveUserByString(studentId);
    if (!user) return;
    
    // Use a real Prisma upsert to be robust against race conditions
    try {
        const finalMetadata = metadata ? { ...metadata } : {};
        if (studentName) (finalMetadata as any).student_name = studentName;
        if (accountEmail) (finalMetadata as any).account_email = accountEmail;

        await prisma.integrationToken.upsert({
            where: {
                user_id_provider: {
                    user_id: user.id,
                    provider: provider
                }
            },
            update: {
                student_id: studentId,
                access_token: accessToken,
                refresh_token: refreshToken ?? undefined,
                expires_at: expiresAt ? BigInt(Math.floor(expiresAt)) : null,
                provider_account_id: providerAccountId ?? undefined,
                account_email: accountEmail ?? undefined,
                metadata: finalMetadata,
                updated_at: new Date()
            },
            create: {
                user_id: user.id,
                student_id: studentId,
                provider,
                access_token: accessToken,
                refresh_token: refreshToken || null,
                expires_at: expiresAt ? BigInt(Math.floor(expiresAt)) : null,
                provider_account_id: providerAccountId || null,
                account_email: accountEmail || null,
                metadata: finalMetadata,
                updated_at: new Date()
            }
        });
    } catch (error) {
        console.error("[saveIntegrationToken] Prisma UPSERT failed:", error);
        throw error;
    }
}

export async function getIntegrationToken(studentId: string, provider: string) {
    const user = await resolveUserByString(studentId);
    if (!user) return null;
    let token = await prisma.integrationToken.findFirst({
        where: { user_id: user.id, provider }
    });
    if (!token) return null;

    let accessToken = token.access_token;
    let expiresAt = token.expires_at ? Number(token.expires_at) : null;

    // Check if token is expired or expires in less than 5 minutes (300 seconds)
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt && (expiresAt - now < 300) && token.refresh_token && provider === 'google_calendar') {
        try {
            const res = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    refresh_token: token.refresh_token,
                    grant_type: "refresh_token",
                }),
            });

            if (res.ok) {
                const data = await res.json();
                accessToken = data.access_token;
                expiresAt = now + data.expires_in;

                // Update in database
                token = await prisma.integrationToken.update({
                    where: { id: token.id },
                    data: {
                        access_token: accessToken,
                        expires_at: BigInt(expiresAt || 0),
                        updated_at: new Date()
                    }
                });
            } else {
                console.error("Failed to refresh Google token:", await res.text());
            }
        } catch (error) {
            console.error("Error refreshing token:", error);
        }
    }

    return {
        accessToken: accessToken,
        refreshToken: token.refresh_token,
        expiresAt: expiresAt,
        accountEmail: token.account_email,
        metadata: token.metadata ? structuredClone(token.metadata) : {},
    };
}

export async function deleteIntegrationToken(studentId: string, provider: string) {
    try {
        const user = await resolveUserByString(studentId);
        if (!user) return;
        const token = await prisma.integrationToken.findFirst({
            where: { user_id: user.id, provider }
        });
        if (token) {
            await prisma.integrationToken.delete({
                where: { id: token.id }
            });
        }
    } catch (e) { console.error("Token delete error:", e); }
}

export async function getCourseNotes(studentId: string, courseId: string): Promise<string | null> {
    try {
        const note = await prisma.courseNote.findFirst({
            where: { student_id: studentId, course_id: courseId }
        });
        return note?.notes || null;
    } catch (e) {
        console.error("Notes load error:", e);
        return null;
    }
}

export async function saveCourseNotes(studentId: string, courseId: string, notes: string): Promise<void> {
    try {
        const user = await resolveUserByString(studentId);
        if (!user) return;
        
        const row = await prisma.courseNote.findFirst({
            where: { student_id: studentId, course_id: courseId }
        });

        if (row) {
            await prisma.courseNote.update({
                where: { id: row.id },
                data: { notes, updated_at: new Date() }
            });
        } else {
            await prisma.courseNote.create({
                data: { student_id: studentId, course_id: courseId, notes, updated_at: new Date(), user_id: user.id }
            });
        }
    } catch (e) { console.error("Notes save error:", e); }
}
