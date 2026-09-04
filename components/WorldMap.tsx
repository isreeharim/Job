"use client";

import { useMemo, useState } from "react";
import { getCountryGeo } from "@/lib/country-coords";

export interface VisitorCountry {
  country: string;
  count: number;
}

export interface VisitorLocation {
  city?: string;
  region?: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
  count: number;
}

interface WorldMapProps {
  countries: VisitorCountry[];
  locations?: VisitorLocation[];
  activeCount?: number;
}

// Convert latitude and longitude to Equirectangular SVG coordinates (1000 x 500)
function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return {
    x: Math.max(12, Math.min(988, x)),
    y: Math.max(12, Math.min(488, y)),
  };
}

export function WorldMap({ countries, locations, activeCount = 0 }: WorldMapProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const totalVisitors = useMemo(() => {
    const sum = countries.reduce((acc, c) => acc + c.count, 0);
    return Math.max(sum, activeCount, 1);
  }, [countries, activeCount]);

  // Compute unified location pins (exact city coordinates when available, country fallback otherwise)
  const mapPins = useMemo(() => {
    if (locations && locations.length > 0) {
      return locations.map((loc, idx) => {
        const geo = getCountryGeo(loc.country);
        const hasCoords = typeof loc.lat === "number" && typeof loc.lng === "number" && (loc.lat !== 0 || loc.lng !== 0);
        const lat = hasCoords ? loc.lat! : geo.lat;
        const lng = hasCoords ? loc.lng! : geo.lng;
        const pos = geoToSvg(lat, lng);
        const id = `loc_${loc.country}_${loc.city || ""}_${idx}`;
        return {
          id,
          country: loc.country,
          city: loc.city || null,
          region: loc.region || null,
          geo,
          lat,
          lng,
          count: loc.count,
          pos,
        };
      });
    }

    return countries.map((c, idx) => {
      const geo = getCountryGeo(c.country);
      const pos = geoToSvg(geo.lat, geo.lng);
      const id = `country_${c.country}_${idx}`;
      return {
        id,
        country: c.country,
        city: null,
        region: null,
        geo,
        lat: geo.lat,
        lng: geo.lng,
        count: c.count,
        pos,
      };
    });
  }, [locations, countries]);

  // Sort countries by visitor count descending
  const sortedCountries = useMemo(() => {
    return [...countries].sort((a, b) => b.count - a.count);
  }, [countries]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return sortedCountries;
    const q = searchQuery.toLowerCase().trim();
    return sortedCountries.filter((c) => {
      const geo = getCountryGeo(c.country);
      return (
        c.country.toLowerCase().includes(q) ||
        geo.name.toLowerCase().includes(q)
      );
    });
  }, [sortedCountries, searchQuery]);

  // Active pin details for popup
  const activeDetail = useMemo(() => {
    const key = selectedKey || hoveredKey;
    if (!key) return null;
    const pin = mapPins.find((p) => p.id === key || p.country === key);
    if (!pin) return null;
    const pct = Math.round((pin.count / totalVisitors) * 100);
    return { ...pin, pct };
  }, [selectedKey, hoveredKey, mapPins, totalVisitors]);

  return (
    <div className="worldMapContainer">
      {/* ── Main Map Display Area ── */}
      <div className="worldMapCanvasWrapper">
        {/* Top Floating Badge */}
        <div className="worldMapOverlayBadge">
          <span className="liveDot" style={{ width: 7, height: 7 }} />
          <span>
            {activeCount || totalVisitors} Active Viewers Across {countries.length}{" "}
            {countries.length === 1 ? "Country" : "Countries"}
          </span>
        </div>

        {/* Interactive SVG World Map */}
        <div className="worldMapSvgContainer">
          <svg
            viewBox="0 0 1000 500"
            className="worldMapSvg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Radial glow filter for active pins */}
              <filter id="mapGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Gradient for landmasses */}
              <linearGradient id="landGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e2732" />
                <stop offset="100%" stopColor="#171f28" />
              </linearGradient>

              {/* Ocean pattern dots */}
              <pattern id="oceanGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="0.8" fill="rgba(255,255,255,0.04)" />
              </pattern>
            </defs>

            {/* Ocean background */}
            <rect width="1000" height="500" fill="#0e1319" rx="8" />
            <rect width="1000" height="500" fill="url(#oceanGrid)" rx="8" />

            {/* ── Graticule Grid Lines (Latitudes & Longitudes) ── */}
            <g className="mapGraticules" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" strokeDasharray="3,4">
              {/* Latitude lines */}
              <line x1="0" y1="83" x2="1000" y2="83" />   {/* 60° N */}
              <line x1="0" y1="166" x2="1000" y2="166" /> {/* 30° N */}
              <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(244,185,66,0.18)" strokeDasharray="4,6" /> {/* Equator */}
              <line x1="0" y1="333" x2="1000" y2="333" /> {/* 30° S */}
              <line x1="0" y1="416" x2="1000" y2="416" /> {/* 60° S */}

              {/* Longitude lines */}
              <line x1="166" y1="0" x2="166" y2="500" /> {/* -120° */}
              <line x1="333" y1="0" x2="333" y2="500" /> {/* -60° */}
              <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(63,168,143,0.2)" /> {/* Prime Meridian 0° */}
              <line x1="666" y1="0" x2="666" y2="500" /> {/* +60° */}
              <line x1="833" y1="0" x2="833" y2="500" /> {/* +120° */}
            </g>

            {/* ── World Continents (Equirectangular Vector Paths) ── */}
            <g className="mapContinents" fill="url(#landGradient)" stroke="#2b3744" strokeWidth="1">
              {/* North America */}
              <path
                d="M 160 55 Q 185 40 210 40 L 250 42 Q 295 50 320 70 L 325 95 L 305 110 L 275 115 L 260 140 L 285 160 L 270 185 L 250 205 L 235 210 L 225 190 L 205 175 L 180 160 L 160 135 L 140 100 L 145 70 Z"
                className="continentPath"
              />
              {/* Alaska */}
              <path
                d="M 65 70 L 95 60 L 130 65 L 140 85 L 115 100 L 75 95 Z"
                className="continentPath"
              />
              {/* Greenland */}
              <path
                d="M 330 30 Q 390 15 440 25 L 420 55 L 380 75 L 340 70 Z"
                className="continentPath"
              />
              {/* South America */}
              <path
                d="M 275 220 Q 310 210 340 230 L 380 250 L 395 285 L 375 330 L 340 380 L 320 420 L 310 425 L 300 395 L 305 340 L 285 295 L 270 255 L 265 235 Z"
                className="continentPath"
              />
              {/* Europe */}
              <path
                d="M 470 120 L 485 105 L 515 95 L 550 90 L 575 80 L 585 100 L 570 115 L 590 125 L 565 145 L 540 140 L 515 155 L 485 150 L 465 140 Z"
                className="continentPath"
              />
              {/* British Isles */}
              <path
                d="M 480 85 L 500 80 L 505 95 L 490 105 L 475 98 Z"
                className="continentPath"
              />
              {/* Scandinavia */}
              <path
                d="M 515 65 Q 545 45 570 55 L 560 85 L 535 90 L 520 80 Z"
                className="continentPath"
              />
              {/* Africa */}
              <path
                d="M 465 155 Q 525 145 580 160 L 610 185 L 635 225 L 620 270 L 590 325 L 560 365 L 540 365 L 520 315 L 490 260 L 460 220 L 450 185 Z"
                className="continentPath"
              />
              {/* Madagascar */}
              <path
                d="M 620 285 L 635 290 L 630 330 L 615 325 Z"
                className="continentPath"
              />
              {/* Asia Mainland & Russia */}
              <path
                d="M 585 95 Q 650 70 730 65 L 820 60 L 890 65 L 940 75 L 960 95 L 930 115 L 880 115 L 850 145 L 860 175 L 820 190 L 800 230 L 775 225 L 755 195 L 740 235 L 720 230 L 690 185 L 650 180 L 625 210 L 600 210 L 600 165 L 630 145 L 610 120 Z"
                className="continentPath"
              />
              {/* Japan */}
              <path
                d="M 875 130 L 895 125 L 890 150 L 870 160 L 865 145 Z"
                className="continentPath"
              />
              {/* Southeast Asia Islands & Indonesia */}
              <path
                d="M 770 235 L 795 230 L 825 250 L 805 270 L 775 255 Z"
                className="continentPath"
              />
              <path
                d="M 840 225 L 855 220 L 860 250 L 845 255 Z"
                className="continentPath"
              />
              <path
                d="M 815 275 L 870 275 L 880 295 L 820 295 Z"
                className="continentPath"
              />
              {/* Australia */}
              <path
                d="M 825 295 Q 875 280 915 305 L 910 350 L 875 365 L 840 355 L 820 325 Z"
                className="continentPath"
              />
              {/* Tasmania */}
              <path
                d="M 870 375 L 885 375 L 880 390 L 865 388 Z"
                className="continentPath"
              />
              {/* New Zealand */}
              <path
                d="M 965 350 L 980 355 L 965 385 L 950 375 Z"
                className="continentPath"
              />
            </g>

            {/* ── Active Visitor Geo Markers (Radar Beacons) ── */}
            <g className="mapMarkers">
              {mapPins.map((pin) => {
                const isSelected = selectedKey === pin.id || selectedKey === pin.country;
                const isHovered = hoveredKey === pin.id || hoveredKey === pin.country;
                const active = isSelected || isHovered;

                const labelText = pin.city
                  ? `${pin.geo.flag} ${pin.city} (${pin.count})`
                  : `${pin.geo.flag} ${pin.country} (${pin.count})`;
                const pillWidth = Math.max(38, labelText.length * 6 + 14);

                return (
                  <g
                    key={pin.id}
                    className={`mapPinGroup ${active ? "activePin" : ""}`}
                    transform={`translate(${pin.pos.x}, ${pin.pos.y})`}
                    onClick={() =>
                      setSelectedKey(selectedKey === pin.id ? null : pin.id)
                    }
                    onMouseEnter={() => setHoveredKey(pin.id)}
                    onMouseLeave={() => setHoveredKey(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Outer animated radar pulse wave */}
                    <circle
                      r="16"
                      className="radarPulseCircle"
                      fill="none"
                      stroke={active ? "var(--amber)" : "var(--teal)"}
                      strokeWidth="1.5"
                    />

                    {/* Secondary expanding pulse ring */}
                    <circle
                      r="9"
                      className="radarPulseSecondary"
                      fill="none"
                      stroke={active ? "var(--amber)" : "var(--teal)"}
                      strokeWidth="1"
                    />

                    {/* Glowing beacon core */}
                    <circle
                      r={active ? 5.5 : 4}
                      fill={active ? "var(--amber)" : "#3fa88f"}
                      stroke="#fff"
                      strokeWidth="1.2"
                      filter="url(#mapGlow)"
                    />

                    {/* Country Badge Pill (Flag + City/Country + Count) */}
                    <g transform="translate(0, -14)">
                      <rect
                        x={-pillWidth / 2}
                        y="-10"
                        width={pillWidth}
                        height="14"
                        rx="4"
                        fill={active ? "rgba(244, 185, 66, 0.95)" : "rgba(16, 21, 28, 0.88)"}
                        stroke={active ? "var(--amber)" : "rgba(63, 168, 143, 0.5)"}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="700"
                        fill={active ? "#10151c" : "var(--ink)"}
                        style={{ userSelect: "none" }}
                      >
                        {labelText}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* ── Floating Tooltip / Detail Card over Selected or Hovered Pin ── */}
          {activeDetail && (
            <div
              className="worldMapTooltipCard"
              style={{
                left: `${(activeDetail.pos.x / 1000) * 100}%`,
                top: `${(activeDetail.pos.y / 500) * 100}%`,
              }}
            >
              <div className="tooltipHeader">
                <span className="tooltipFlag">{activeDetail.geo.flag}</span>
                <strong>
                  {activeDetail.city ? `${activeDetail.city}, ` : ""}
                  {activeDetail.region ? `${activeDetail.region}, ` : ""}
                  {activeDetail.geo.name}
                </strong>
              </div>
              <div className="tooltipMeta">
                <span className="tooltipLiveCount">
                  <span className="liveDot" style={{ width: 5, height: 5 }} />
                  {activeDetail.count} {activeDetail.count === 1 ? "viewer" : "viewers"}
                </span>
                <span className="tooltipShare">
                  {activeDetail.pct}% of live traffic
                </span>
              </div>
              <div className="tooltipCoords">
                📍 {Math.abs(activeDetail.lat).toFixed(2)}°
                {activeDetail.lat >= 0 ? "N" : "S"},{" "}
                {Math.abs(activeDetail.lng).toFixed(2)}°
                {activeDetail.lng >= 0 ? "E" : "W"}
              </div>
              <a
                href={`https://www.google.com/maps?q=${activeDetail.lat},${activeDetail.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="worldMapTooltipMapLink"
                onClick={(e) => e.stopPropagation()}
                title="Open exact location in Google Maps"
              >
                🗺️ Open in Google Maps ↗
              </a>
            </div>
          )}
        </div>

        {/* Bottom Hint Bar */}
        <div className="worldMapHintText">
          <span>Click any location beacon on the map or select a country to inspect</span>
          {selectedKey && (
            <button
              type="button"
              className="worldMapClearBtn"
              onClick={() => setSelectedKey(null)}
            >
              Clear selection ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Right Country Sidebar & Hotspots ── */}
      <div className="worldMapCountrySidebar">
        <div className="worldMapCountryHeader">
          <span className="eyebrow" style={{ color: "var(--amber)", margin: 0 }}>
            GLOBAL REACH
          </span>
          <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
            {countries.length} Active {countries.length === 1 ? "Region" : "Regions"}
          </span>
        </div>

        {/* Search filter for countries */}
        <div className="worldMapSearchWrap">
          <input
            type="text"
            placeholder="Filter countries…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="worldMapSearchInput"
          />
          {searchQuery && (
            <button
              type="button"
              className="worldMapSearchClear"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        {filteredCountries.length > 0 ? (
          <div className="worldMapCountryList">
            {filteredCountries.map((c, index) => {
              const geo = getCountryGeo(c.country);
              const isSelected = selectedKey === c.country;
              const maxCount = sortedCountries[0]?.count || 1;
              const barWidth = Math.max(12, Math.round((c.count / maxCount) * 100));

              return (
                <button
                  key={c.country}
                  type="button"
                  className={`worldMapCountryItem ${isSelected ? "selected" : ""}`}
                  onClick={() =>
                    setSelectedKey(selectedKey === c.country ? null : c.country)
                  }
                  onMouseEnter={() => setHoveredKey(c.country)}
                  onMouseLeave={() => setHoveredKey(null)}
                  title={`Center ${geo.name} on the map`}
                >
                  <div className="worldMapItemTop">
                    <div className="worldMapItemLeft">
                      <span className="worldMapItemRank">#{index + 1}</span>
                      <span className="worldMapItemFlag">{geo.flag}</span>
                      <span className="worldMapItemName">{geo.name}</span>
                    </div>
                    <span className="worldMapItemCount">
                      {c.count} {c.count === 1 ? "viewer" : "viewers"}
                    </span>
                  </div>

                  {/* Relative volume bar */}
                  <div className="worldMapItemBarBg">
                    <div
                      className="worldMapItemBarFill"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "32px 12px", textAlign: "center", color: "var(--ink-dim)", fontSize: 12 }}>
            {countries.length === 0
              ? "Waiting for live visitor pings… Browse the website in another tab to see your location pin."
              : `No country matches "${searchQuery}".`}
          </div>
        )}
      </div>
    </div>
  );
}
