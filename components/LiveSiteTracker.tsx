"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function getSessionId(): string {
  if (typeof window === "undefined") return "guest";
  try {
    let id = sessionStorage.getItem("rf_session_id");
    if (!id) {
      id = "rf_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
      sessionStorage.setItem("rf_session_id", id);
    }
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
    sessionIdRef.current = getSessionId();
  }, []);

  useEffect(() => {
    const sid = sessionIdRef.current || getSessionId();
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
