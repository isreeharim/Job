import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function getDevice(ua: string | null): string {
  if (!ua) return "desktop";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

function getClientIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((s) => s.trim());
    const publicIp = ips.find(
      (ip) =>
        ip &&
        ip !== "127.0.0.1" &&
        ip !== "::1" &&
        !ip.startsWith("10.") &&
        !ip.startsWith("192.168.")
    );
    if (publicIp) return publicIp;
    if (ips[0]) return ips[0];
  }
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const rawReq = req as unknown as { ip?: string };
  return rawReq.ip || "127.0.0.1";
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

    const ip = getClientIp(req);

    const country =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      "Unknown";

    let city: string | null =
      req.headers.get("x-vercel-ip-city") ||
      req.headers.get("cf-ipcity") ||
      null;

    if (city) {
      try {
        city = decodeURIComponent(city);
      } catch {}
    }

    const userAgent = req.headers.get("user-agent");
    const device = getDevice(userAgent);
    const now = new Date().toISOString();

    // 1. Upsert live session with IP address and city
    await client.from("live_sessions").upsert(
      {
        session_id: sessionId,
        ip_address: ip,
        city,
        pathname,
        country,
        device,
        last_ping_at: now,
      },
      { onConflict: "session_id" }
    );

    // Clean up any stale sessions for the same IP (e.g. from an old tab or refreshed window)
    if (ip && ip !== "127.0.0.1") {
      await client
        .from("live_sessions")
        .delete()
        .eq("ip_address", ip)
        .neq("session_id", sessionId);
    }

    // 2. Record pageview only if not a refresh/reload on the same route within 60s
    if (!isPing) {
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const filterConditions = [`session_id.eq.${sessionId}`];
      if (ip && ip !== "127.0.0.1") {
        filterConditions.push(`ip_address.eq.${ip}`);
      }

      const { data: recentHits } = await client
        .from("site_telemetry")
        .select("id")
        .eq("pathname", pathname)
        .or(filterConditions.join(","))
        .gte("created_at", sixtySecondsAgo)
        .limit(1);

      // If already logged recently on this route for this viewer/IP, do not duplicate
      if (!recentHits || recentHits.length === 0) {
        await client.from("site_telemetry").insert({
          session_id: sessionId,
          ip_address: ip,
          city,
          pathname,
          referrer,
          country,
          device,
          created_at: now,
        });
      }
    }

    // 3. Save / update permanent visitor IP registry so all IPs are permanently recorded
    if (ip && ip !== "127.0.0.1") {
      try {
        await client.rpc("upsert_visitor_ip", {
          p_ip: ip,
          p_country: country,
          p_city: city,
          p_device: device,
          p_pathname: pathname,
          p_now: now,
        });
      } catch {}
    }

    // 4. Purge inactive live sessions older than 3 minutes (visitor_ips remains permanent)
    if (Math.random() < 0.15) {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      await client.from("live_sessions").delete().lt("last_ping_at", threeMinutesAgo);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record telemetry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
