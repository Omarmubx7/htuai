import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getUserByStudentId, initDB, saveIntegrationToken } from "@/lib/database";

export async function POST() {
  try {
    await initDB();

    const studentId = "S12345";
    const password = "secret";

    const existing = await getUserByStudentId(studentId);
    let userId: number;
    if (existing) {
      userId = existing.id;
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await createUser({
        student_id: studentId,
        password_hash: passwordHash,
      });
      userId = user.id;
    }

    // Ensure integration tokens exist for testing
    await saveIntegrationToken(studentId, "notion", "test-notion-token", undefined, undefined, { parentPageId: "test-page-id", semester: "Test" });
    await saveIntegrationToken(studentId, "google_calendar", "test-gcal-token", undefined, undefined, {});

    return NextResponse.json({ message: "Test user created", id: userId });
  } catch (e: any) {
    console.error("Create test user error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
