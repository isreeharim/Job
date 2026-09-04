"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function getVisitorId(): string {
  if (typeof window === "undefined") return "guest";
  try {
    // 1. Check localStorage for persistent visitor identity
    let id = localStorage.getItem("rf_visitor_id");
    if (!id) {
      // 2. Check cookie fallback
      const match = document.cookie.match(/(?:^|;\s*)rf_vid=([^;]+)/);
      if (match && match[1]) {
        id = match[1];
      }
    }
    if (!id) {
      // 3. Check sessionStorage
      id = sessionStorage.getItem("rf_session_id");
    }
    if (!id) {
      // 4. Generate new stable ID
      id = "rf_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
    }

    // Sync across all storages
    localStorage.setItem("rf_visitor_id", id);
    sessionStorage.setItem("rf_session_id", id);
    document.cookie = `rf_vid=${id}; path=/; max-age=31536000; SameSite=Lax`;
    return id;
  } catch {
    return "guest_" + Math.random().toString(36).slice(2, 10);
  }
}

function TrackerInternal() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    sessionIdRef.current = getVisitorId();
  }, []);

  useEffect(() => {
    const sid = sessionIdRef.current || getVisitorId();
    const query = searchParams?.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    const referrer = typeof document !== "undefined" ? document.referrer : "";

    const sendPing = (isPing: boolean) => {
      try {
        const payload = JSON.stringify({
          sessionId: sid,
          pathname: fullPath,
          referrer: isPing ? undefined : referrer,
          isPing,
        });

        if (typeof navigator !== "undefined" && navigator.sendBeacon && isPing) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/track/ping", blob);
        } else {
          fetch("/api/track/ping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {}
    };

    // Initial pageview
    sendPing(false);

    // Heartbeat every 25 seconds to maintain active presence
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        sendPing(true);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [pathname, searchParams]);

  return null;
}

export function LiveSiteTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInternal />
    </Suspense>
  );
}
