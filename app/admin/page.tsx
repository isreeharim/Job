"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";

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

type HealthData = {
  ok: boolean;
  status: string;
  jobs: number;
  lastRefresh?: {
    started_at: string;
    completed_at: string;
    status: string;
    jobs_found: number;
    error: string | null;
  };
  checkedAt: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>("");

  // Login form state
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Admin dashboard state
  const [live, setLive] = useState<LiveData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [refreshingScraper, setRefreshingScraper] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // 1. Check session on mount
  useEffect(() => {
    fetch("/api/admin/session")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Unauthorized");
      })
      .then((data) => {
        setAuthenticated(true);
        setAdminEmail(data.email || "");
      })
      .catch(() => {
        setAuthenticated(false);
      });
  }, []);

  // 2. Poll live telemetry when authenticated
  useEffect(() => {
    if (!authenticated) return;

    const fetchLive = () => {
      fetch("/api/track/live")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setLive(data);
        })
        .catch(() => {});
    };

    const fetchHealth = () => {
      fetch("/api/health")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setHealth(data);
        })
        .catch(() => {});
    };

    fetchLive();
    fetchHealth();

    const interval = setInterval(fetchLive, 6000); // 6-second live polling
    return () => clearInterval(interval);
  }, [authenticated]);

  // Handle Login
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      setAuthenticated(true);
      setAdminEmail(data.email);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoggingIn(false);
    }
  }

  // Handle Logout
  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      setAdminEmail("");
      setLive(null);
    }
  }

  // Trigger manual scraper refresh
  async function handleManualRefresh() {
    setRefreshingScraper(true);
    setRefreshMessage(null);

    try {
      const res = await fetch("/api/admin/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh failed");

      setRefreshMessage(`Refreshed successfully: ${data.totalProcessed} jobs processed!`);
      // Update health status
      const hRes = await fetch("/api/health");
      if (hRes.ok) setHealth(await hRes.json());
    } catch (err) {
      setRefreshMessage(err instanceof Error ? err.message : "Failed to refresh scrapers");
    } finally {
      setRefreshingScraper(false);
    }
  }

  // ── LOADING STATE ──
  if (authenticated === null) {
    return (
      <main className="adminShell">
        <div className="adminAuthBox">
          <p className="eyebrow">SECURITY CHECK</p>
          <h2>Verifying credentials…</h2>
        </div>
      </main>
    );
  }

  // ── UNAUTHENTICATED LOGIN CARD ──
  if (!authenticated) {
    return (
      <main className="adminShell">
        <div className="adminAuthBox">
          <SpotlightCard
            className="authCard"
            spotlightColor="rgba(244, 185, 66, 0.08)"
            borderHoverColor="var(--amber)"
          >
            <div className="authHeader">
              <span className="kicker">RESTRICTED ACCESS</span>
              <h1>Mission Control</h1>
              <p className="authSubtitle">Authorized administration & telemetry access only.</p>
            </div>

            {loginError && <div className="authBanner authBannerError">{loginError}</div>}

            <form onSubmit={handleLogin} className="authForm">
              <div className="field">
                <label htmlFor="admin-email">Admin Email</label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  placeholder="admin@remoteflow.site"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={loggingIn}
                  autoComplete="username"
                />
              </div>

              <div className="field">
                <label htmlFor="admin-password">Admin Password</label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  disabled={loggingIn}
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="authSubmitBtn" disabled={loggingIn}>
                {loggingIn ? "Authenticating…" : "Authorize Session →"}
              </button>

              <div style={{ textAlign: "center", marginTop: 14 }}>
                <Link href="/" className="authFooterBtn" style={{ color: "var(--ink-dim)" }}>
                  ← Return to public board
                </Link>
              </div>
            </form>
          </SpotlightCard>
        </div>
      </main>
    );
  }

  // ── AUTHENTICATED ADMIN DASHBOARD ──
  const totalDevices = live
    ? (live.devices.desktop || 0) + (live.devices.mobile || 0) + (live.devices.tablet || 0)
    : 0;
  const desktopPct = totalDevices
    ? Math.round(((live?.devices.desktop || 0) / totalDevices) * 100)
    : 0;
  const mobilePct = totalDevices
    ? Math.round(((live?.devices.mobile || 0) / totalDevices) * 100)
    : 0;

  return (
    <main className="adminShell">
      <div className="adminDashboard">
        {/* Top Bar */}
        <header className="adminHeader">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="eyebrow" style={{ color: "var(--teal)", margin: 0 }}>
                MISSION CONTROL
              </span>
              <span className="adminPill">SUPERUSER</span>
            </div>
            <h1 className="adminTitle">RemoteFlow Telemetry</h1>
          </div>

          <div className="adminUserGroup">
            <span className="adminEmailLabel">{adminEmail}</span>
            <button onClick={handleLogout} className="adminLogoutBtn">
              Sign out
            </button>
          </div>
        </header>

        {/* ── SECTION 1: LIVE TRAFFIC TELEMETRY ── */}
        <section className="adminSection">
          <div className="adminSectionHead">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="liveDot" />
              <h2 className="adminSectionTitle">Live Real-Time Traffic</h2>
            </div>
            <span className="liveAutoRefresh">Live socket pinging every 6s</span>
          </div>

          <div className="liveStatsGrid">
            <div className="liveCard liveCardPrimary">
              <span className="liveCardTitle">Active Visitors Now</span>
              <b className="liveCardBigNumber">{live ? live.liveVisitors : "…"}</b>
              <small className="liveCardSub">Active in last 2 minutes</small>
            </div>

            <div className="liveCard">
              <span className="liveCardTitle">24-Hour Verified Views</span>
              <b className="liveCardBigNumber">{live ? live.totalViews24h : "…"}</b>
              <small className="liveCardSub">Total recorded pageviews</small>
            </div>

            <div className="liveCard">
              <span className="liveCardTitle">Device Share</span>
              <b className="liveCardBigNumber">
                {totalDevices ? `${desktopPct}% / ${mobilePct}%` : "100%"}
              </b>
              <small className="liveCardSub">Desktop / Mobile</small>
            </div>

            <div className="liveCard">
              <span className="liveCardTitle">Active Routes</span>
              <b className="liveCardBigNumber">{live ? live.topActivePages.length : "…"}</b>
              <small className="liveCardSub">Live concurrent paths</small>
            </div>
          </div>

          {live && (
            <div className="liveDetailsGrid">
              {/* Active Pages */}
              <div className="analyticsCard">
                <h2>Active Routes Right Now</h2>
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
                  <p className="muted">Waiting for visitor pings…</p>
                )}
              </div>

              {/* Geographic Distribution */}
              <div className="analyticsCard">
                <h2>Top Visitor Countries (Live)</h2>
                {live.topCountries.length ? (
                  live.topCountries.map((c) => (
                    <div className="liveRow" key={c.country}>
                      <span className="liveRowPath">Country code: {c.country}</span>
                      <span className="liveRowBadge">{c.count} sessions</span>
                    </div>
                  ))
                ) : (
                  <p className="muted">Waiting for edge IP geolocation…</p>
                )}
              </div>
            </div>
          )}

          {/* Activity Stream */}
          {live && (
            <div className="analyticsCard" style={{ marginTop: 16 }}>
              <h2>Recent Visitor Activity Stream</h2>
              {live.recentEvents.length ? (
                <div className="activityStream">
                  {live.recentEvents.map((e) => (
                    <div className="activityRow" key={e.id}>
                      <span className="activityDot" />
                      <span className="activityPath" title={e.pathname}>
                        {e.pathname}
                      </span>
                      <span className="activityMeta">
                        {e.country !== "Unknown" ? `[${e.country}] ` : ""}
                        {e.device} · {timeAgo(e.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No recent pageviews recorded yet.</p>
              )}
            </div>
          )}
        </section>

        {/* ── SECTION 2: SCRAPER OPERATIONS & SYSTEM STATUS ── */}
        <section className="adminSection" style={{ marginTop: 28 }}>
          <div className="adminSectionHead">
            <h2 className="adminSectionTitle">Scraper Operations & Ingestion</h2>
            <button
              onClick={handleManualRefresh}
              disabled={refreshingScraper}
              className="adminActionBtn"
            >
              {refreshingScraper ? "Running Scrapers…" : "Trigger Manual Ingestion ↻"}
            </button>
          </div>

          {refreshMessage && (
            <div
              className="authBanner"
              style={{
                marginBottom: 16,
                borderColor: refreshMessage.includes("success") ? "var(--teal)" : "var(--amber)",
                color: refreshMessage.includes("success") ? "var(--teal)" : "var(--amber)",
              }}
            >
              {refreshMessage}
            </div>
          )}

          <div className="liveStatsGrid">
            <div className="liveCard">
              <span className="liveCardTitle">Database Status</span>
              <b className="liveCardBigNumber" style={{ color: "var(--teal)" }}>
                {health?.status?.toUpperCase() || "ONLINE"}
              </b>
              <small className="liveCardSub">PostgreSQL cluster connected</small>
            </div>

            <div className="liveCard">
              <span className="liveCardTitle">Active Verified Jobs</span>
              <b className="liveCardBigNumber">{health?.jobs || "…"}</b>
              <small className="liveCardSub">Indexed & searchable</small>
            </div>

            <div className="liveCard">
              <span className="liveCardTitle">Last Automated Run</span>
              <b className="liveCardBigNumber">
                {health?.lastRefresh?.status === "success" ? "HEALTHY" : "PENDING"}
              </b>
              <small className="liveCardSub">
                {health?.lastRefresh?.completed_at
                  ? timeAgo(health.lastRefresh.completed_at)
                  : "Recently"}
              </small>
            </div>

            <div className="liveCard">
              <span className="liveCardTitle">Last Ingest Count</span>
              <b className="liveCardBigNumber">{health?.lastRefresh?.jobs_found ?? "…"}</b>
              <small className="liveCardSub">Jobs ingested last cycle</small>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
