import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_COOKIE_NAME,
  generateAdminToken,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json().catch(() => ({}));

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);

    if (cleanEmail !== ADMIN_EMAIL.toLowerCase() || cleanPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin email or password" }, { status: 401 });
    }

    const token = generateAdminToken();
    const response = NextResponse.json({ ok: true, email: ADMIN_EMAIL });

    // Set secure httpOnly cookie
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 14 * 24 * 60 * 60, // 14 days
      path: "/",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to authenticate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
