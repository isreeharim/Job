"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [isRequesting, setIsRequesting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setIsRequesting(false);
    try {
      localStorage.setItem(STORAGE_KEY_STATE, "dismissed");
      localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()));
      sessionStorage.removeItem("rf_loc_modal_open");
    } catch {}
  }, []);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, handleDismiss]);

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

    const showModal = () => {
      setIsVisible(true);
      try {
        sessionStorage.setItem("rf_loc_modal_open", "1");
      } catch {}
    };

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
          // perm.state === "prompt" -> show full screen popup after gentle delay
          const timer = setTimeout(showModal, 1800);
          return () => clearTimeout(timer);
        })
        .catch(() => {
          const timer = setTimeout(showModal, 1800);
          return () => clearTimeout(timer);
        });
    } else {
      const timer = setTimeout(showModal, 1800);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const handleRequestPermission = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      handleDismiss();
      return;
    }

    setIsRequesting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;
          await saveAndBroadcastLocation(lat, lng, accuracy);
        } catch {
          // ignore error
        } finally {
          // SILENT EXIT: Zero messages on the user side! Immediately close the popup.
          setIsVisible(false);
          setIsRequesting(false);
          try {
            sessionStorage.removeItem("rf_loc_modal_open");
          } catch {}
        }
      },
      (err) => {
        console.warn("Geolocation permission denied or timed out:", err.message);
        try {
          localStorage.setItem(STORAGE_KEY_STATE, "denied");
          sessionStorage.removeItem("rf_loc_modal_open");
        } catch {}
        // SILENT EXIT: Zero messages on the user side! Immediately close the popup.
        setIsVisible(false);
        setIsRequesting(false);
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
    <div
      className="locationModalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      onClick={handleDismiss}
    >
      <div
        className="locationModalCard"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside dialog
      >
        {/* Top Dismiss Button */}
        <button
          type="button"
          className="locationModalClose"
          onClick={handleDismiss}
          aria-label="Close dialog"
        >
          ✕
        </button>

        <div className="locationModalHeader">
          <div className="locationModalIconWrap">
            <div className="locationModalPin">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="locationModalPulse" />
          </div>
          <div>
            <span className="locationModalKicker">BETTER ACCURACY</span>
            <h2 id="location-modal-title" className="locationModalTitle">
              Find jobs near your location
            </h2>
          </div>
        </div>

        <p className="locationModalDesc">
          Allow location access to match high-priority remote and hybrid roles with your exact timezone, local commute range, and region.
        </p>

        <div className="locationModalBenefits">
          <div className="locationBenefitItem">
            <span className="locationBenefitIcon">✦</span>
            <div>
              <strong>Exact Timezone Alignment</strong>
              <p>Filter remote opportunities actively hiring in your local working hours.</p>
            </div>
          </div>
          <div className="locationBenefitItem">
            <span className="locationBenefitIcon">✦</span>
            <div>
              <strong>Regional &amp; Hybrid Matches</strong>
              <p>Discover localized hubs, salary benchmarks, and nearby verified companies.</p>
            </div>
          </div>
          <div className="locationBenefitItem">
            <span className="locationBenefitIcon">✦</span>
            <div>
              <strong>Privacy Guaranteed</strong>
              <p>Used strictly for location-aware job ranking and verification.</p>
            </div>
          </div>
        </div>

        <div className="locationModalActions">
          <button
            type="button"
            className="locationModalBtnPrimary"
            onClick={handleRequestPermission}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <span className="locationModalSpinner" />
                <span>Waiting for browser permission…</span>
              </>
            ) : (
              <>
                <span>Allow Location</span>
                <span style={{ fontSize: 14 }}>→</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="locationModalBtnSecondary"
            onClick={handleDismiss}
            disabled={isRequesting}
          >
            Not now
          </button>
        </div>

        <p className="locationModalFooterNote">
          You can change or revoke location permission anytime in your browser settings.
        </p>
      </div>
    </div>
  );
}
