import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
  }

  const client = supabaseAdmin || supabase;
  if (!client) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Current live visitors (active within last 2 minutes)
    const { data: liveData, error: liveError } = await client
      .from("live_sessions")
      .select("session_id, ip_address, city, pathname, country, device, last_ping_at")
      .gte("last_ping_at", twoMinutesAgo)
      .order("last_ping_at", { ascending: false });

    if (liveError) throw liveError;

    const liveSessions = liveData || [];

    // Deduplicate by IP address so page refreshes or multiple tabs never count as multiple viewers
    const uniqueVisitorsMap = new Map<string, (typeof liveSessions)[0]>();
    for (const s of liveSessions) {
      const key = s.ip_address && s.ip_address !== "127.0.0.1" ? s.ip_address : s.session_id;
      if (!uniqueVisitorsMap.has(key)) {
        uniqueVisitorsMap.set(key, s);
      }
    }

    const deduplicatedSessions = Array.from(uniqueVisitorsMap.values());
    const liveVisitors = Math.max(1, deduplicatedSessions.length);

    // Format live IP addresses list for admin tab
    const now = Date.now();
    const liveIps = deduplicatedSessions.map((s) => {
      const pingTime = new Date(s.last_ping_at).getTime();
      const secondsAgo = Math.max(0, Math.floor((now - pingTime) / 1000));
      return {
        sessionId: s.session_id,
        ipAddress: s.ip_address || "Hidden/Proxy",
        country: s.country || "Unknown",
        city: s.city || null,
        pathname: s.pathname,
        device: s.device || "desktop",
        lastPingAt: s.last_ping_at,
        secondsAgo,
      };
    });

    // 2. Active pages breakdown (deduplicated per viewer)
    const pageCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };

    for (const s of deduplicatedSessions) {
      pageCounts[s.pathname] = (pageCounts[s.pathname] || 0) + 1;
      if (s.country && s.country !== "Unknown") {
        countryCounts[s.country] = (countryCounts[s.country] || 0) + 1;
      }
      const d = s.device || "desktop";
      deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    }

    const topActivePages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([pathname, count]) => ({ pathname, count }));

    // 3. 24h pageviews from site_telemetry
    const { count: totalViews24h } = await client
      .from("site_telemetry")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo);

    // 4. Recent activity stream (last 12 events)
    const { data: recentEvents } = await client
      .from("site_telemetry")
      .select("id, pathname, country, city, ip_address, device, created_at")
      .order("created_at", { ascending: false })
      .limit(12);

    // 5. Query permanently saved visitor IPs from visitor_ips registry
    const { data: savedIpsData } = await client
      .from("visitor_ips")
      .select("ip_address, country, city, device, last_pathname, first_seen, last_seen, total_views")
      .order("last_seen", { ascending: false })
      .limit(150);

    const savedIps = (savedIpsData || []).map((s) => ({
      ipAddress: s.ip_address,
      country: s.country || "Unknown",
      city: s.city || null,
      device: s.device || "desktop",
      lastPathname: s.last_pathname || "/",
      firstSeen: s.first_seen,
      lastSeen: s.last_seen,
      totalViews: s.total_views || 1,
    }));

    return NextResponse.json(
      {
        liveVisitors,
        activeSessions: liveSessions.length,
        liveIps,
        savedIps,
        totalSavedIps: savedIps.length,
        totalViews24h: totalViews24h || 0,
        topActivePages,
        devices: deviceCounts,
        topCountries: Object.entries(countryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([country, count]) => ({ country, count })),
        recentEvents: (recentEvents || []).map((e) => ({
          id: e.id,
          pathname: e.pathname,
          country: e.country,
          city: e.city || null,
          ipAddress: e.ip_address || null,
          device: e.device,
          createdAt: e.created_at,
        })),
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load live tracking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
