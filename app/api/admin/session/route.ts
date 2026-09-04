import { NextRequest, NextResponse } from "next/server";
import { ADMIN_EMAIL, verifyAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const isAdmin = verifyAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, email: ADMIN_EMAIL });
}
