"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY_STATE = "rf_loc_permission_status";
const STORAGE_KEY_DISMISSED = "rf_loc_permission_dismissed_at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type ExactLocationData = {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  isGps: boolean;
  mapUrl: string;
};

async function saveAndBroadcastLocation(lat: number, lng: number, accuracy?: number): Promise<ExactLocationData> {
  let city: string | undefined;
  let region: string | undefined;
  let country: string | undefined;
  let countryCode: string | undefined;

  // Fast reverse geocoding via free client-side API
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const geo = await res.json();
      city = geo.city || geo.locality || undefined;
      region = geo.principalSubdivision || undefined;
      country = geo.countryName || undefined;
      countryCode = geo.countryCode || undefined;
    }
  } catch {}

  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const locData: ExactLocationData = {
    city,
    region,
    country,
    countryCode,
    latitude: lat,
    longitude: lng,
    accuracy,
    isGps: true,
    mapUrl,
  };

  // 1. Cache in localStorage & sessionStorage
  try {
    localStorage.setItem("rf_geo_location", JSON.stringify(locData));
    localStorage.setItem("rf_device_location", JSON.stringify(locData));
    localStorage.setItem(STORAGE_KEY_STATE, "granted");
    sessionStorage.setItem("rf_geo_location", JSON.stringify(locData));
  } catch {}

  // 2. Broadcast to LiveSiteTracker via custom window event
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rf_location_updated", { detail: locData }));
  }

  // 3. Send immediate telemetry ping to record into Supabase
  try {
    const sid =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("rf_visitor_id") || "guest"
        : "guest";

    fetch("/api/track/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sid,
        pathname: typeof window !== "undefined" ? window.location.pathname : "/",
        isPing: true,
        location: locData,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {}

  return locData;
}

export function LocationPermissionPrompt() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "requesting" | "success" | "denied">("idle");
  const [savedLocation, setSavedLocation] = useState<ExactLocationData | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY_STATE, "dismissed");
      localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()));
    } catch {}
  }, []);

  // Check if we should prompt the user
  useEffect(() => {
    // Never show on admin or account pages
    if (pathname.startsWith("/admin") || pathname === "/account") {
      return;
    }

    try {
      const storedState = localStorage.getItem(STORAGE_KEY_STATE);
      if (storedState === "granted") {
        // User already granted in a previous session, silently refresh GPS if allowed
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              saveAndBroadcastLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
          );
        }
        return;
      }

      if (storedState === "denied") {
        return;
      }

      if (storedState === "dismissed") {
        const dismissedAt = localStorage.getItem(STORAGE_KEY_DISMISSED);
        if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_COOLDOWN_MS) {
          return;
        }
      }
    } catch {}

    // Check modern browser permission status if query API is available
    if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((perm) => {
          if (perm.state === "granted") {
            try {
              localStorage.setItem(STORAGE_KEY_STATE, "granted");
            } catch {}
            return;
          }
          if (perm.state === "denied") {
            try {
              localStorage.setItem(STORAGE_KEY_STATE, "denied");
            } catch {}
            return;
          }
          // perm.state === "prompt" -> show mini popup after gentle delay
          const timer = setTimeout(() => {
            setIsVisible(true);
          }, 1800);
          return () => clearTimeout(timer);
        })
        .catch(() => {
          const timer = setTimeout(() => {
            setIsVisible(true);
          }, 1800);
          return () => clearTimeout(timer);
        });
    } else {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);



  const handleRequestPermission = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      handleDismiss();
      return;
    }

    setStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        const loc = await saveAndBroadcastLocation(lat, lng, accuracy);
        setSavedLocation(loc);
        setStatus("success");

        // Automatically close the mini pop after 4.5s so user can click the saved link
        autoCloseTimerRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 4500);
      },
      (err) => {
        console.warn("Geolocation permission denied or timed out:", err.message);
        setStatus("denied");
        try {
          localStorage.setItem(STORAGE_KEY_STATE, "denied");
        } catch {}
        autoCloseTimerRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 2200);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  if (!isVisible || pathname.startsWith("/admin") || pathname === "/account") {
    return null;
  }

  return (
    <aside
      className="locationPromptWrapper"
      role="region"
      aria-label="Location permission request"
    >
      <div className="locationPromptCard">
        {/* Top Dismiss Button */}
        <button
          type="button"
          className="locationPromptClose"
          onClick={handleDismiss}
          aria-label="Dismiss location request"
        >
          ✕
        </button>

        {status === "idle" && (
          <>
            <div className="locationPromptHeader">
              <div className="locationPromptIconWrap">
                <span className="locationPromptPin">📍</span>
                <span className="locationPromptPulse" />
              </div>
              <div>
                <h3 className="locationPromptTitle">
                  Find jobs near your location
                </h3>
                <span className="locationPromptBadge">BETTER ACCURACY</span>
              </div>
            </div>

            <p className="locationPromptDesc">
              Allow location access to match high-priority remote and hybrid roles with your exact timezone, local commute range, and region.
            </p>

            <div className="locationPromptActions">
              <button
                type="button"
                className="locationPromptBtnPrimary"
                onClick={handleRequestPermission}
              >
                <span>Allow Location</span>
                <span style={{ fontSize: 13 }}>→</span>
              </button>
              <button
                type="button"
                className="locationPromptBtnSecondary"
                onClick={handleDismiss}
              >
                Not now
              </button>
            </div>
          </>
        )}

        {status === "requesting" && (
          <div className="locationPromptLoadingState">
            <div className="locationPromptSpinner" />
            <div>
              <strong>Requesting browser permission…</strong>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-dim)" }}>
                Please tap <em>&quot;Allow&quot;</em> in your browser prompt to enable live matching.
              </p>
            </div>
          </div>
        )}

        {status === "success" && savedLocation && (
          <div className="locationPromptSuccessState">
            <div className="locationSuccessIcon">✓</div>
            <div style={{ flex: 1 }}>
              <strong style={{ color: "var(--teal)", display: "block", fontSize: 13 }}>
                Live Location Saved!
              </strong>
              <p style={{ margin: "3px 0 6px", fontSize: 12, color: "var(--ink)" }}>
                {savedLocation.city ? `${savedLocation.city}, ` : ""}
                {savedLocation.region ? `${savedLocation.region}, ` : ""}
                {savedLocation.country || "Detected"}
              </p>
              {/* Clickable link to view exact saved location on Google Maps */}
              <a
                href={savedLocation.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="locationSavedClickableLink"
                title="View your saved GPS position on Google Maps"
              >
                🗺️ View saved location on Google Maps ↗
              </a>
            </div>
          </div>
        )}

        {status === "denied" && (
          <div className="locationPromptDeniedState">
            <span style={{ fontSize: 18 }}>ℹ️</span>
            <div>
              <strong style={{ fontSize: 12.5, color: "var(--ink)" }}>
                Location access was not enabled
              </strong>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ink-dim)" }}>
                Defaulting to country-level matching. You can enable it anytime in browser settings.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
