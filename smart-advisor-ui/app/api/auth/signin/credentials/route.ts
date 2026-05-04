import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByStudentId, createAdminLog } from "@/lib/database";
import { encode } from "next-auth/jwt";
import { requireEnv } from "@/lib/env";
import { authCredentialsSchema } from "@/lib/schemas/api";
import { validationErrorResponse } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = authCredentialsSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }
    const { student_id, password } = validation.data;

    const user = await getUserByStudentId(student_id);
    if (!user || !user.password_hash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await encode({
      token: {
        sub: user.id.toString(),
        name: user.student_id,
        student_id: user.student_id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
      secret: requireEnv("AUTH_SECRET"),
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, student_id: user.student_id },
    });

    const isSecure = process.env.NODE_ENV === "production";
    const cookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    createAdminLog({
      type: 'login',
      message: `Student ${user.student_id} logged in via credentials`,
      details: { student_id: user.student_id, email: user.email, name: user.name },
      event_kind: 'login',
      target_id: user.student_id || String(user.id),
    }).catch(() => {});

    return response;
  } catch (e) {
    console.error("Signin error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
