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

    // 1. Current live visitors
    const { data: liveData, error: liveError } = await client
      .from("live_sessions")
      .select("session_id, pathname, country, device")
      .gte("last_ping_at", twoMinutesAgo);

    if (liveError) throw liveError;

    const liveSessions = liveData || [];
    const liveVisitors = liveSessions.length;

    // 2. Active pages breakdown
    const pageCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };

    for (const s of liveSessions) {
      pageCounts[s.pathname] = (pageCounts[s.pathname] || 0) + 1;
      if (s.country && s.country !== "Unknown") {
        countryCounts[s.country] = (countryCounts[s.country] || 0) + 1;
      }
      const d = s.device || "desktop";
      deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    }

    const topActivePages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([pathname, count]) => ({ pathname, count }));

    // 3. 24h pageviews & unique visitors from site_telemetry
    const { count: totalViews24h } = await client
      .from("site_telemetry")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo);

    // 4. Recent activity stream (last 10 events)
    const { data: recentEvents } = await client
      .from("site_telemetry")
      .select("id, pathname, country, device, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json(
      {
        liveVisitors: Math.max(1, liveVisitors), // Always reflect at least current session
        activeSessions: liveVisitors,
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
