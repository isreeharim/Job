"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";

type Item = { label: string; value: number };
type MarketData = {
  totals: { jobs: number; fresh: number; week: number };
  category: Item[];
  companies: Item[];
  locations: Item[];
  sources: Item[];
  trend: Item[];
  updatedAt: string;
};

type LiveData = {
  liveVisitors: number;
  activeSessions: number;
  totalViews24h: number;
  topActivePages: { pathname: string; count: number }[];
  devices: { mobile: number; desktop: number; tablet: number };
  topCountries: { country: string; count: number }[];
  recentEvents: {
    id: number;
    pathname: string;
    country: string;
    device: string;
    createdAt: string;
  }[];
  updatedAt: string;
};

function Bars({ title, items }: { title: string; items: Item[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <section className="analyticsCard">
      <h2>{title}</h2>
      {items.length ? (
        items.map((item) => (
          <div className="barRow" key={item.label}>
            <span>{item.label}</span>
            <div>
              <i style={{ width: (item.value / max) * 100 + "%" }} />
            </div>
            <b>{item.value}</b>
          </div>
        ))
      ) : (
        <p className="muted">Not enough data yet.</p>
      )}
    </section>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export default function Analytics() {
  const [data, setData] = useState<MarketData | null>(null);
  const [live, setLive] = useState<LiveData | null>(null);

  useEffect(() => {
    // 1. Fetch market analytics
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));

    // 2. Fetch live site telemetry
    const fetchLive = () => {
      fetch("/api/track/live")
        .then((r) => r.json())
        .then(setLive)
        .catch(() => {});
    };

    fetchLive();
    const timer = setInterval(fetchLive, 8000); // live polling every 8s
    return () => clearInterval(timer);
  }, []);

  const totalDevices = live ? (live.devices.desktop || 0) + (live.devices.mobile || 0) + (live.devices.tablet || 0) : 0;
  const desktopPct = totalDevices ? Math.round(((live?.devices.desktop || 0) / totalDevices) * 100) : 0;
  const mobilePct = totalDevices ? Math.round(((live?.devices.mobile || 0) / totalDevices) * 100) : 0;

  return (
    <main className="detailPage">
      <AppHeader />

      <section className="savedPage">
        <p className="eyebrow">REAL-TIME MONITORING & MARKET INTELLIGENCE</p>
        <h1>Analytics & Live Tracking</h1>
        <p className="savedIntro">
          Real-time visitor telemetry and market snapshots across RemoteFlow.
        </p>

        {/* ── LIVE SITE TELEMETRY SECTION ── */}
        <div className="liveSectionWrap">
          <div className="liveSectionHeader">
            <div className="liveIndicator">
              <span className="liveDot" />
              <span>LIVE TRAFFIC TELEMETRY</span>
            </div>
            <span className="liveAutoRefresh">Updates every 8s</span>
          </div>

          <div className="liveStatsGrid">
            <div className="liveCard liveCardPrimary">
              <span className="liveCardTitle">Active Visitors Now</span>
              <b className="liveCardBigNumber">{live ? live.liveVisitors : "…"}</b>
              <small className="liveCardSub">Browsing right now</small>
            </div>

            <div className="liveCard">
              <span className="liveCardTitle">24-Hour Views</span>
              <b className="liveCardBigNumber">{live ? live.totalViews24h : "…"}</b>
              <small className="liveCardSub">Total verified views</small>
            </div>

            <div className="liveCard">
              <span className="liveCardTitle">Device Share</span>
              <b className="liveCardBigNumber">
                {totalDevices ? `${desktopPct}% / ${mobilePct}%` : "100%"}
              </b>
              <small className="liveCardSub">Desktop / Mobile</small>
            </div>

            <div className="liveCard">
              <span className="liveCardTitle">Active Pages</span>
              <b className="liveCardBigNumber">{live ? live.topActivePages.length : "…"}</b>
              <small className="liveCardSub">Live concurrent routes</small>
            </div>
          </div>

          {live && (
            <div className="liveDetailsGrid">
              {/* Active Pages */}
              <div className="analyticsCard">
                <h2>Top Active Pages (Live)</h2>
                {live.topActivePages.length ? (
                  live.topActivePages.map((p) => (
                    <div className="liveRow" key={p.pathname}>
                      <span className="liveRowPath" title={p.pathname}>
                        {p.pathname}
                      </span>
                      <span className="liveRowBadge">{p.count} active</span>
                    </div>
                  ))
                ) : (
                  <p className="muted">Waiting for page pings…</p>
                )}
              </div>

              {/* Live Activity Feed */}
              <div className="analyticsCard">
                <h2>Recent Activity Stream</h2>
                {live.recentEvents.length ? (
                  <div className="activityStream">
                    {live.recentEvents.map((e) => (
                      <div className="activityRow" key={e.id}>
                        <span className="activityDot" />
                        <span className="activityPath" title={e.pathname}>
                          {e.pathname}
                        </span>
                        <span className="activityMeta">
                          {e.country !== "Unknown" ? e.country + " · " : ""}
                          {e.device} · {timeAgo(e.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No recent events logged yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── MARKET JOBS INTELLIGENCE SECTION ── */}
        <div style={{ marginTop: 40, borderTop: "1px solid var(--hairline)", paddingTop: 30 }}>
          <p className="eyebrow">OPPORTUNITY INDEX</p>
          <h2 style={{ fontSize: 24, margin: "0 0 16px 0", color: "var(--ink)", fontFamily: "var(--font-display)" }}>
            Market Intelligence
          </h2>

          {!data ? (
            <div className="empty">
              <h3>Loading market analytics…</h3>
            </div>
          ) : (
            <>
              <div className="analyticsStats">
                <div>
                  <b>{data.totals.jobs}</b>
                  <span>Jobs indexed</span>
                </div>
                <div>
                  <b>{data.totals.fresh}</b>
                  <span>Fresh today</span>
                </div>
                <div>
                  <b>{data.totals.week}</b>
                  <span>Last 7 days</span>
                </div>
                <div>
                  <b>{data.companies.length}</b>
                  <span>Top employers</span>
                </div>
              </div>

              <section className="analyticsCard trendCard">
                <h2>7-day arrivals</h2>
                <div className="trend">
                  {data.trend.map((x) => {
                    const max = Math.max(...data.trend.map((v) => v.value), 1);
                    return (
                      <div key={x.label}>
                        <i style={{ height: Math.max(5, (x.value / max) * 100) + "%" }} />
                        <b>{x.value}</b>
                        <span>{x.label}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="analyticsGrid">
                <Bars title="Top categories" items={data.category} />
                <Bars title="Hiring companies" items={data.companies} />
                <Bars title="Locations" items={data.locations} />
                <Bars title="Sources" items={data.sources} />
              </div>

              <p className="analyticsUpdated">
                Market snapshot as of {new Date(data.updatedAt).toLocaleTimeString()}
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}