import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function getDevice(ua: string | null): string {
  if (!ua) return "desktop";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export async function POST(req: NextRequest) {
  const client = supabaseAdmin || supabase;
  if (!client) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
    const pathname = typeof body.pathname === "string" ? body.pathname.slice(0, 255) : "/";
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 255) : null;
    const isPing = Boolean(body.isPing);

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const country =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      "Unknown";

    const userAgent = req.headers.get("user-agent");
    const device = getDevice(userAgent);
    const now = new Date().toISOString();

    // 1. Upsert live session
    await client.from("live_sessions").upsert(
      {
        session_id: sessionId,
        pathname,
        country,
        device,
        last_ping_at: now,
      },
      { onConflict: "session_id" }
    );

    // 2. If it's an initial route view (not a periodic background heartbeat ping), record pageview
    if (!isPing) {
      await client.from("site_telemetry").insert({
        session_id: sessionId,
        pathname,
        referrer,
        country,
        device,
        created_at: now,
      });
    }

    // 3. Opportunistically purge dead sessions older than 5 minutes
    if (Math.random() < 0.1) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await client.from("live_sessions").delete().lt("last_ping_at", fiveMinutesAgo);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record telemetry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
