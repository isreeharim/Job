"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { WorldMap } from "@/components/WorldMap";
import { getCountryGeo } from "@/lib/country-coords";

export type LiveSessionItem = {
  sessionId: string;
  ipAddress: string;
  country: string;
  city: string | null;
  pathname: string;
  device: string;
  lastPingAt: string;
  secondsAgo: number;
};

export type SavedIpItem = {
  ipAddress: string;
  country: string;
  city: string | null;
  device: string;
  lastPathname: string;
  firstSeen: string;
  lastSeen: string;
  totalViews: number;
};

type LiveData = {
  liveVisitors: number;
  activeSessions: number;
  liveIps: LiveSessionItem[];
  savedIps?: SavedIpItem[];
  totalSavedIps?: number;
  totalViews24h: number;
  topActivePages: { pathname: string; count: number }[];
  devices: { mobile: number; desktop: number; tablet: number };
  topCountries: { country: string; count: number }[];
  recentEvents: {
    id: number;
    pathname: string;
    country: string;
    city?: string | null;
    ipAddress?: string | null;
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
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Admin dashboard state
  const [live, setLive] = useState<LiveData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [refreshingScraper, setRefreshingScraper] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // Telemetry Tab state
  const [telemetryTab, setTelemetryTab] = useState<"ips" | "map" | "stream">("ips");
  const [ipViewMode, setIpViewMode] = useState<"all" | "live">("all");
  const [ipSearch, setIpSearch] = useState("");
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const liveIps = live?.liveIps;
  const savedIps = live?.savedIps;

  const displayedIps = useMemo(() => {
    const q = ipSearch.toLowerCase().trim();
    if (ipViewMode === "live") {
      if (!liveIps) return [];
      if (!q) return liveIps;
      return liveIps.filter(
        (item) =>
          item.ipAddress.toLowerCase().includes(q) ||
          item.pathname.toLowerCase().includes(q) ||
          item.country.toLowerCase().includes(q) ||
          (item.city && item.city.toLowerCase().includes(q)) ||
          item.device.toLowerCase().includes(q)
      );
    } else {
      if (!savedIps) return [];
      if (!q) return savedIps;
      return savedIps.filter(
        (item) =>
          item.ipAddress.toLowerCase().includes(q) ||
          item.lastPathname.toLowerCase().includes(q) ||
          item.country.toLowerCase().includes(q) ||
          (item.city && item.city.toLowerCase().includes(q)) ||
          item.device.toLowerCase().includes(q)
      );
    }
  }, [liveIps, savedIps, ipViewMode, ipSearch]);

  const handleCopyIp = (ip: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ip);
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 2000);
    }
  };

  const exportIpsToCsv = () => {
    const list = savedIps && savedIps.length ? savedIps : liveIps || [];
    if (!list.length) return;
    const headers = ["IP Address", "Country", "City", "Device", "Total Views", "First Seen", "Last Seen", "Last Path"];
    const rows = list.map((item) => {
      const isSaved = "firstSeen" in item;
      return [
        `"${item.ipAddress}"`,
        `"${item.country}"`,
        `"${item.city || ""}"`,
        `"${item.device}"`,
        isSaved ? (item as SavedIpItem).totalViews : 1,
        `"${isSaved ? (item as SavedIpItem).firstSeen : (item as LiveSessionItem).lastPingAt}"`,
        `"${isSaved ? (item as SavedIpItem).lastSeen : (item as LiveSessionItem).lastPingAt}"`,
        `"${isSaved ? (item as SavedIpItem).lastPathname : (item as LiveSessionItem).pathname}"`,
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `remoteflow-all-saved-ips-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid authentication credentials");
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

      setRefreshMessage(`Refreshed successfully: ${data.totalProcessed} jobs processed (${data.newJobs ?? 0} new)!`);
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
        <div className="adminLoginWrap">
          <div className="adminLoginBackdropGlow" />
          <div className="adminAuthCard" style={{ textAlign: "center" }}>
            <div className="adminLoadingCard">
              <div className="adminRadarPulse">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <p className="eyebrow" style={{ margin: "0 0 6px", color: "var(--amber)" }}>
                  INITIALIZING GATEWAY
                </p>
                <h2 style={{ fontSize: 18, margin: 0, color: "var(--ink)", fontWeight: 700 }}>
                  Verifying Session Security…
                </h2>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── UNAUTHENTICATED LOGIN CARD ──
  if (!authenticated) {
    return (
      <main className="adminShell">
        <div className="adminLoginWrap">
          <div className="adminLoginBackdropGlow" />

          <SpotlightCard
            className="adminAuthCard"
            spotlightColor="rgba(244, 185, 66, 0.12)"
            borderHoverColor="rgba(244, 185, 66, 0.4)"
          >
            {/* Header Icon & Security Pill */}
            <div className="adminShieldIconWrap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>

            <div className="adminBadgeRow">
              <span className="adminStatusPill">
                <span className="adminStatusDot" />
                Mission Control Gateway
              </span>
            </div>

            <div className="adminAuthHeader">
              <h1 className="adminAuthTitle">Superuser Console</h1>
              <p className="adminAuthSubtitle">
                Restricted access for telemetry analytics and platform operations.
              </p>
            </div>

            {loginError && (
              <div className="adminErrorBanner" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} autoComplete="on">
              {/* Email Field */}
              <div className="adminInputGroup">
                <label className="adminLabel" htmlFor="admin-email">
                  <span>Admin Identity</span>
                  <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>Authorized email</span>
                </label>
                <div className="adminInputWrap">
                  <span className="adminInputIcon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    autoFocus
                    className="adminInput"
                    placeholder="sreehari... @gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    disabled={loggingIn}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="adminInputGroup">
                <label className="adminLabel" htmlFor="admin-password">
                  <span>Security Passcode</span>
                  <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>HMAC Protected</span>
                </label>
                <div className="adminInputWrap">
                  <span className="adminInputIcon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="adminInput"
                    placeholder="Enter admin passcode"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    disabled={loggingIn}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="adminPasswordToggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Action */}
              <button type="submit" className="adminSubmitBtn" disabled={loggingIn}>
                {loggingIn ? (
                  <>
                    <svg className="adminSpinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeLinecap="round" />
                    </svg>
                    <span>Authenticating…</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Mission Control</span>
                    <span style={{ fontSize: 16 }}>→</span>
                  </>
                )}
              </button>

              {/* Footer navigation */}
              <div className="adminFooterLinks">
                <Link href="/" className="adminBackLink">
                  <span>←</span>
                  <span>Return to RemoteFlow Job Board</span>
                </Link>
                <div className="adminSecurityNotice">
                  TLS 1.3 · 256-BIT ENCRYPTION · DIRECT ACCESS ONLY
                </div>
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
              <small className="liveCardSub">Deduplicated unique viewers</small>
            </div>

            <div className="liveCard">
              <span className="liveCardTitle">24-Hour Verified Views</span>
              <b className="liveCardBigNumber">{live ? live.totalViews24h : "…"}</b>
              <small className="liveCardSub">Refreshes deduplicated</small>
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

          {/* ── TELEMETRY VIEW TABS ── */}
          <div className="telemetryNavWrapper">
            <div className="telemetryTabs">
              <button
                type="button"
                className={`telemetryTabBtn ${telemetryTab === "ips" ? "active" : ""}`}
                onClick={() => setTelemetryTab("ips")}
              >
                <span className="liveDot" style={{ width: 6, height: 6 }} />
                <span>Live IP Addresses</span>
                <span className="telemetryTabBadge">{live?.liveIps?.length || 0}</span>
              </button>

              <button
                type="button"
                className={`telemetryTabBtn ${telemetryTab === "map" ? "active" : ""}`}
                onClick={() => setTelemetryTab("map")}
              >
                <span>🗺️ Live World Map</span>
              </button>

              <button
                type="button"
                className={`telemetryTabBtn ${telemetryTab === "stream" ? "active" : ""}`}
                onClick={() => setTelemetryTab("stream")}
              >
                <span>Activity & Routes</span>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>
                Auto-sync 6s · Deduplicated (reload-safe)
              </span>
            </div>
          </div>

          {/* ── TAB 1: VISITOR IP REGISTRY & LIVE TELEMETRY ── */}
          {telemetryTab === "ips" && (
            <div className="ipTableCard">
              <div className="ipTableHeader">
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--ink)", letterSpacing: 0.6, textTransform: "uppercase", fontFamily: "var(--font-display), sans-serif" }}>
                    {ipViewMode === "all"
                      ? `All Saved IP Registry (${displayedIps.length})`
                      : `Connected Live IP Addresses (${displayedIps.length})`}
                  </h3>
                  <span style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>
                    {ipViewMode === "all"
                      ? "Permanent database record of all visitor IPs · Never deleted"
                      : "Real-time edge visitors active within last 2 minutes"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div className="ipModeToggle">
                    <button
                      type="button"
                      className={`ipModeBtn ${ipViewMode === "all" ? "active" : ""}`}
                      onClick={() => setIpViewMode("all")}
                    >
                      📁 All Saved IPs ({savedIps?.length || 0})
                    </button>
                    <button
                      type="button"
                      className={`ipModeBtn ${ipViewMode === "live" ? "active" : ""}`}
                      onClick={() => setIpViewMode("live")}
                    >
                      🟢 Active Live ({liveIps?.length || 0})
                    </button>
                  </div>

                  <button
                    type="button"
                    className="ipExportBtn"
                    onClick={exportIpsToCsv}
                    title="Download all permanently saved IPs to a CSV file"
                  >
                    📥 Export CSV
                  </button>

                  <div className="ipTableSearch">
                    <span>🔍</span>
                    <input
                      type="text"
                      placeholder="Search IP, country, city, route…"
                      value={ipSearch}
                      onChange={(e) => setIpSearch(e.target.value)}
                    />
                    {ipSearch && (
                      <button
                        type="button"
                        onClick={() => setIpSearch("")}
                        style={{ background: "none", border: "none", color: "var(--ink-dim)", cursor: "pointer", fontSize: 11 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="ipTableContainer">
                <table className="ipTable">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>IP Address</th>
                      <th>Location / City</th>
                      {ipViewMode === "all" ? <th>Total Hits</th> : null}
                      <th>{ipViewMode === "all" ? "Last Route" : "Current Route"}</th>
                      <th>Device</th>
                      <th>{ipViewMode === "all" ? "Last Seen" : "Active Latency"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedIps.length > 0 ? (
                      displayedIps.map((raw) => {
                        const isSaved = "firstSeen" in raw;
                        const v = raw as (SavedIpItem & LiveSessionItem);
                        const geo = getCountryGeo(v.country);
                        const isLiveNow = liveIps?.some((l) => l.ipAddress === v.ipAddress);
                        const targetPath = isSaved ? v.lastPathname : v.pathname;

                        return (
                          <tr key={v.ipAddress + (v.sessionId || "")}>
                            <td data-label="Status">
                              {isLiveNow ? (
                                <span className="ipStatusActive">
                                  <span className="liveDot" style={{ width: 6, height: 6 }} />
                                  Active now
                                </span>
                              ) : (
                                <span style={{ color: "var(--ink-dim)", fontSize: 11 }}>
                                  {isSaved ? timeAgo(v.lastSeen) : `${v.secondsAgo}s ago`}
                                </span>
                              )}
                            </td>
                            <td data-label="IP Address">
                              <div className="ipCell">
                                <span>{v.ipAddress}</span>
                                <button
                                  type="button"
                                  className="ipCopyBtn"
                                  onClick={() => handleCopyIp(v.ipAddress)}
                                  title="Copy IP Address"
                                >
                                  {copiedIp === v.ipAddress ? "Copied!" : "Copy"}
                                </button>
                              </div>
                            </td>
                            <td data-label="Location">
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 15 }}>{geo.flag}</span>
                                <span style={{ fontWeight: 600 }}>{geo.name}</span>
                                {v.city && (
                                  <span style={{ color: "var(--ink-dim)", fontSize: 11.5 }}>
                                    · {v.city}
                                  </span>
                                )}
                              </div>
                            </td>
                            {ipViewMode === "all" ? (
                              <td data-label="Total Hits">
                                <span style={{ background: "rgba(244, 185, 66, 0.1)", color: "var(--amber)", padding: "2px 7px", borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                                  {v.totalViews || 1} hits
                                </span>
                              </td>
                            ) : null}
                            <td data-label={ipViewMode === "all" ? "Last Route" : "Current Route"}>
                              <Link
                                href={targetPath || "/"}
                                target="_blank"
                                className="ipRouteBadge"
                                title={`Open ${targetPath}`}
                              >
                                {targetPath || "/"}
                              </Link>
                            </td>
                            <td data-label="Device">
                              <span className="ipDeviceBadge">
                                {v.device === "mobile" ? "📱 Mobile" : v.device === "tablet" ? "📟 Tablet" : "💻 Desktop"}
                              </span>
                            </td>
                            <td data-label={ipViewMode === "all" ? "Last Seen" : "Active"} style={{ color: "var(--ink-dim)", fontSize: 11.5, whiteSpace: "nowrap" }}>
                              {isSaved ? timeAgo(v.lastSeen) : timeAgo(v.lastPingAt)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={ipViewMode === "all" ? 7 : 6} className="ipEmptyState">
                          {ipSearch
                            ? `No IP addresses matching "${ipSearch}".`
                            : ipViewMode === "all"
                            ? "No saved IP addresses recorded in the registry yet."
                            : "Waiting for live visitor pings… Open the website in another window or device."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB 2: LIVE WORLD MAP ── */}
          {telemetryTab === "map" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="liveDot" style={{ background: "var(--amber)", boxShadow: "0 0 8px var(--amber)" }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--ink)", letterSpacing: 0.6, textTransform: "uppercase", fontFamily: "var(--font-display), sans-serif" }}>
                    Global Audience Telemetry (Live Interactive World Map)
                  </h3>
                </div>
                <span style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>
                  Real-time edge visitor locations · Pulsing radar beacons across all continents
                </span>
              </div>

              <WorldMap
                countries={live?.topCountries || []}
                activeCount={live?.liveVisitors || 0}
              />
            </div>
          )}

          {/* ── TAB 3: ACTIVE ROUTES & ACTIVITY STREAM ── */}
          {telemetryTab === "stream" && live && (
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

              {/* Activity Stream */}
              <div className="analyticsCard">
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
                          {e.ipAddress ? `${e.ipAddress} · ` : ""}
                          {e.device} · {timeAgo(e.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No recent pageviews recorded yet.</p>
                )}
              </div>
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
              className={
                refreshMessage.includes("success") || refreshMessage.includes("Refreshed")
                  ? "authAlert success"
                  : "adminErrorBanner"
              }
              style={{ marginBottom: 16 }}
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
