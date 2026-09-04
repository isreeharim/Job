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

export type ClientLocation = {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timeZone?: string;
};

async function getCachedLocation(): Promise<ClientLocation | null> {
  if (typeof window === "undefined") return null;
  // 1. Check exact GPS location from localStorage
  try {
    const gps = localStorage.getItem("rf_device_location") || localStorage.getItem("rf_geo_location");
    if (gps) {
      return JSON.parse(gps);
    }
  } catch {}

  // 2. Check session cache
  try {
    const cached = sessionStorage.getItem("rf_geo_location");
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  // 3. Fallback to IP geolocation
  try {
    const res = await fetch("https://ipwho.is/", { cache: "force-cache" });
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false) {
        const loc: ClientLocation = {
          city: data.city || undefined,
          region: data.region || undefined,
          country: data.country || undefined,
          countryCode: data.country_code || undefined,
          latitude: typeof data.latitude === "number" ? data.latitude : undefined,
          longitude: typeof data.longitude === "number" ? data.longitude : undefined,
          timeZone: data.timezone?.id || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        try {
          sessionStorage.setItem("rf_geo_location", JSON.stringify(loc));
        } catch {}
        return loc;
      }
    }
  } catch {}

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return { timeZone: tz };
  } catch {
    return null;
  }
}

function TrackerInternal() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionIdRef = useRef<string>("");
  const locationRef = useRef<ClientLocation | null>(null);

  useEffect(() => {
    sessionIdRef.current = getVisitorId();
    getCachedLocation().then((loc) => {
      if (loc) {
        locationRef.current = loc;
      }
    });

    // Listen for live GPS location updates from LocationPermissionPrompt
    const handleLocationUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<ClientLocation>;
      if (customEvent.detail) {
        locationRef.current = customEvent.detail;
      }
    };
    window.addEventListener("rf_location_updated", handleLocationUpdated);
    return () => window.removeEventListener("rf_location_updated", handleLocationUpdated);
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
          location: locationRef.current || undefined,
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

    // If location is not yet ready, wait briefly or send right away
    if (!locationRef.current) {
      getCachedLocation().then((loc) => {
        if (loc) locationRef.current = loc;
        sendPing(false);
      });
    } else {
      sendPing(false);
    }

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
