"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import "leaflet/dist/leaflet.css";
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

type MapPin = {
  id: string;
  country: string;
  city: string | null;
  region: string | null;
  geo: { name: string; flag: string };
  lat: number;
  lng: number;
  count: number;
};

const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY || "cb1_2woz_1_dfd3d3195b6bfb7c4d536fdd";

export function WorldMap({ countries, locations, activeCount = 0 }: WorldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayersRef = useRef<{ dark: any; satellite: any; street: any } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersMapRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);

  const [activeLayer, setActiveLayer] = useState<"dark" | "satellite" | "street">("dark");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  const totalVisitors = useMemo(() => {
    const sum = countries.reduce((acc, c) => acc + c.count, 0);
    return Math.max(sum, activeCount, 1);
  }, [countries, activeCount]);

  // Compute unified location pins (exact city coordinates when available, country fallback otherwise)
  const mapPins: MapPin[] = useMemo(() => {
    if (locations && locations.length > 0) {
      return locations.map((loc, idx) => {
        const geo = getCountryGeo(loc.country);
        const hasCoords = typeof loc.lat === "number" && typeof loc.lng === "number" && (loc.lat !== 0 || loc.lng !== 0);
        const lat = hasCoords ? loc.lat! : geo.lat;
        const lng = hasCoords ? loc.lng! : geo.lng;
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
        };
      });
    }

    return countries.map((c, idx) => {
      const geo = getCountryGeo(c.country);
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
      };
    });
  }, [locations, countries]);

  // Sort countries for right-side list
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

  // Update markers on map
  const updateMarkers = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pins: MapPin[], L: any) => {
      const map = mapInstanceRef.current;
      const layer = markerLayerRef.current;
      if (!map || !layer || !L) return;

      layer.clearLayers();
      markersMapRef.current.clear();

      pins.forEach((pin) => {
        const labelText = pin.city
          ? `${pin.geo.flag} ${pin.city} (${pin.count})`
          : `${pin.geo.flag} ${pin.geo.name} (${pin.count})`;

        const customIcon = L.divIcon({
          className: "realMapMarkerIcon",
          html: `
            <div class="realMapBeacon" data-pin-id="${pin.id}">
              <div class="beaconWave"></div>
              <div class="beaconWaveSec"></div>
              <div class="beaconCore"></div>
              <div class="beaconPill">${labelText}</div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          popupAnchor: [0, -22],
        });

        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon });

        // Build interactive popup card
        const popupDiv = document.createElement("div");
        popupDiv.className = "realMapPopupCard";
        popupDiv.innerHTML = `
          <div class="realMapPopupHeader">
            <span class="realMapPopupFlag">${pin.geo.flag}</span>
            <div class="realMapPopupTitleWrap">
              <strong class="realMapPopupTitle">
                ${pin.city ? `${pin.city}, ` : ""}
                ${pin.region ? `${pin.region}, ` : ""}
                ${pin.geo.name}
              </strong>
              <span class="realMapPopupPct">${Math.round((pin.count / totalVisitors) * 100)}% of live traffic</span>
            </div>
          </div>
          <div class="realMapPopupMeta">
            <span class="realMapPopupLive">
              <span class="liveDot" style="width:6px;height:6px;"></span>
              ${pin.count} ${pin.count === 1 ? "active viewer" : "active viewers"}
            </span>
          </div>
          <div class="realMapPopupCoords">
            📍 ${Math.abs(pin.lat).toFixed(4)}°${pin.lat >= 0 ? "N" : "S"}, ${Math.abs(pin.lng).toFixed(4)}°${pin.lng >= 0 ? "E" : "W"}
          </div>
          <div class="realMapPopupActions">
            <a href="https://www.google.com/maps?q=${pin.lat},${pin.lng}" target="_blank" rel="noopener noreferrer" class="realMapPopupGmapsBtn">
              🗺️ Open in Google Maps ↗
            </a>
            <button type="button" class="realMapPopupZoomBtn">
              🔍 Zoom Closer
            </button>
          </div>
        `;

        const zoomBtn = popupDiv.querySelector(".realMapPopupZoomBtn");
        if (zoomBtn) {
          zoomBtn.addEventListener("click", () => {
            map.flyTo([pin.lat, pin.lng], 13, { duration: 1.2 });
          });
        }

        marker.bindPopup(popupDiv, {
          closeButton: true,
          className: "realMapCustomPopup",
          maxWidth: 290,
          autoPan: true,
          autoPanPadding: [12, 12],
        });

        marker.on("click", () => {
          setSelectedPinId(pin.id);
        });

        layer.addLayer(marker);
        markersMapRef.current.set(pin.id, marker);
        markersMapRef.current.set(pin.country, marker);
      });
    },
    [totalVisitors]
  );

  // Initialize Leaflet Map once DOM is ready
  useEffect(() => {
    let isCancelled = false;

    import("leaflet").then((leafletModule) => {
      if (isCancelled || !mapContainerRef.current) return;
      const L = leafletModule.default || leafletModule;
      LRef.current = L;

      if (mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 1.5,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true,
        touchZoom: true,
        dragging: true,
      });

      mapInstanceRef.current = map;

      // Layer 1: CartoDB Dark Matter
      const darkLayer = L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
        {
          subdomains: "abcd",
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
        }
      );

      // Layer 2: Esri World Imagery (Satellite)
      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>, USGS, NOAA',
        }
      );

      // Layer 3: CartoDB Voyager (Street)
      const streetLayer = L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
        {
          subdomains: "abcd",
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
        }
      );

      darkLayer.addTo(map);

      tileLayersRef.current = {
        dark: darkLayer,
        satellite: satelliteLayer,
        street: streetLayer,
      };

      const markerGroup = L.layerGroup().addTo(map);
      markerLayerRef.current = markerGroup;

      // Track mouse coordinates for HUD
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("mousemove", (e: any) => {
        setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      map.on("mouseout", () => {
        setCursorCoords(null);
      });

      map.on("zoomend", () => {
        setZoomLevel(map.getZoom());
      });

      updateMarkers(mapPins, L);
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers whenever mapPins or totalVisitors update
  useEffect(() => {
    if (LRef.current) {
      updateMarkers(mapPins, LRef.current);
    }
  }, [mapPins, updateMarkers]);

  // Keep map properly rendered and sized during viewport resize / orientation change
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Mobile segmented view switcher handler
  const handleMobileTabChange = (tab: "map" | "list") => {
    setMobileTab(tab);
    if (tab === "map") {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    }
  };

  // Layer switcher handler
  const handleLayerSwitch = (layerName: "dark" | "satellite" | "street") => {
    const map = mapInstanceRef.current;
    const layers = tileLayersRef.current;
    if (!map || !layers) return;

    map.removeLayer(layers.dark);
    map.removeLayer(layers.satellite);
    map.removeLayer(layers.street);

    if (layerName === "dark") layers.dark.addTo(map);
    else if (layerName === "satellite") layers.satellite.addTo(map);
    else if (layerName === "street") layers.street.addTo(map);

    setActiveLayer(layerName);
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  // Reset to global overview
  const handleResetWorldView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([20, 0], 2, { duration: 1.2 });
    }
    setSelectedPinId(null);
  };

  // Toggle fullscreen mode
  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setShowMobileDrawer(false);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);
  };

  // Fly to country/location on sidebar click
  const handleSidebarItemClick = (countryCode: string) => {
    setSelectedPinId(countryCode);
    const pin = mapPins.find((p) => p.country === countryCode || p.id === countryCode);
    const map = mapInstanceRef.current;
    if (!pin || !map) return;

    // Switch to map view if currently viewing the list tab on mobile
    if (mobileTab === "list") {
      setMobileTab("map");
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    }
    setShowMobileDrawer(false);

    // Smoothly scroll map container into view on mobile
    if (wrapperRef.current && typeof window !== "undefined" && window.innerWidth <= 768) {
      wrapperRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    map.flyTo([pin.lat, pin.lng], 7, { duration: 1.4 });

    const marker = markersMapRef.current.get(countryCode) || markersMapRef.current.get(pin.id);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 1000);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`realMapContainer ${isFullscreen ? "realMapFullscreen" : ""} ${
        showMobileDrawer ? "drawerOpen" : ""
      }`}
      data-mobile-view={mobileTab}
    >
      {/* ── Mobile-Only Segmented Navigation Bar ── */}
      <div className="realMapMobileNav">
        <button
          type="button"
          className={`realMapMobileTab ${mobileTab === "map" ? "active" : ""}`}
          onClick={() => handleMobileTabChange("map")}
        >
          <span>🗺️ Live Map</span>
        </button>
        <button
          type="button"
          className={`realMapMobileTab ${mobileTab === "list" ? "active" : ""}`}
          onClick={() => handleMobileTabChange("list")}
        >
          <span>📋 Hotspots ({countries.length})</span>
        </button>
      </div>

      {/* ── Main Real Map Display Canvas ── */}
      <div className="realMapCanvasWrapper">
        {/* Leaflet Map Div */}
        <div ref={mapContainerRef} className="realMapElement" />

        {/* Unified Top Control Overlay (Badge + Tactical Bar) */}
        <div className="realMapTopBar">
          {/* Telemetry Header Badge */}
          <div className="realMapOverlayBadge">
            <span className="liveDot" style={{ width: 7, height: 7 }} />
            <span className="badgeDesktopText">
              {activeCount || totalVisitors} Active Viewers Across {countries.length}{" "}
              {countries.length === 1 ? "Country" : "Countries"}
            </span>
            <span className="badgeMobileText">
              {activeCount || totalVisitors} Live · {countries.length} {countries.length === 1 ? "Region" : "Regions"}
            </span>
          </div>

          {/* Tactical Controls Bar */}
          <div className="realMapTacticalBar">
            {/* Layer switcher */}
            <div className="realMapLayerToggle">
              <button
                type="button"
                className={`realMapLayerBtn ${activeLayer === "dark" ? "active" : ""}`}
                onClick={() => handleLayerSwitch("dark")}
                title="Tactical Dark Basemap"
                aria-label="Dark Basemap"
              >
                <span className="layerBtnIcon">🌙</span>
                <span className="layerBtnText">Dark</span>
              </button>
              <button
                type="button"
                className={`realMapLayerBtn ${activeLayer === "satellite" ? "active" : ""}`}
                onClick={() => handleLayerSwitch("satellite")}
                title="Esri Satellite Imagery"
                aria-label="Satellite Imagery"
              >
                <span className="layerBtnIcon">🛰️</span>
                <span className="layerBtnText">Sat</span>
              </button>
              <button
                type="button"
                className={`realMapLayerBtn ${activeLayer === "street" ? "active" : ""}`}
                onClick={() => handleLayerSwitch("street")}
                title="Detailed Street &amp; Physical Map"
                aria-label="Street Map"
              >
                <span className="layerBtnIcon">🗺️</span>
                <span className="layerBtnText">Street</span>
              </button>
            </div>

            {/* Reset World button */}
            <button
              type="button"
              className="realMapActionBtn"
              onClick={handleResetWorldView}
              title="Reset to global world view"
              aria-label="Reset to global world view"
            >
              <span>🌍</span>
              <span className="actionBtnText">Reset</span>
            </button>

            {/* Fullscreen button */}
            <button
              type="button"
              className="realMapActionBtn"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
            >
              <span>{isFullscreen ? "✕" : "⛶"}</span>
              <span className="actionBtnText">{isFullscreen ? "Exit" : "Expand"}</span>
            </button>
          </div>
        </div>

        {/* Custom Zoom Controls (bottom-right) */}
        <div className="realMapZoomControls">
          <button
            type="button"
            className="realMapZoomBtn"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className="realMapZoomBtn"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            −
          </button>
        </div>

        {/* Tactical Coordinates HUD (bottom-left) */}
        <div className="realMapHud">
          <span className="hudItem hudLat">
            <strong>LAT:</strong>{" "}
            {cursorCoords ? `${Math.abs(cursorCoords.lat).toFixed(4)}°${cursorCoords.lat >= 0 ? "N" : "S"}` : "––––"}
          </span>
          <span className="hudDivider hudDividerLat">|</span>
          <span className="hudItem hudLng">
            <strong>LNG:</strong>{" "}
            {cursorCoords ? `${Math.abs(cursorCoords.lng).toFixed(4)}°${cursorCoords.lng >= 0 ? "E" : "W"}` : "––––"}
          </span>
          <span className="hudDivider hudDividerLng">|</span>
          <span className="hudItem">
            <strong>ZOOM:</strong> {zoomLevel}x
          </span>
          <span className="hudDivider">|</span>
          <span className="hudItem hudLive">
            <span className="liveDot" style={{ width: 5, height: 5 }} />
            GPS REAL-TIME GIS
          </span>
        </div>

        {/* Floating Mobile Drawer Trigger in Fullscreen Mode */}
        {isFullscreen && (
          <button
            type="button"
            className="realMapFullscreenMobileDrawerBtn"
            onClick={() => setShowMobileDrawer((prev) => !prev)}
            aria-label="Toggle Hotspots List"
          >
            {showMobileDrawer ? "✕ Close List" : `📋 Hotspots (${countries.length})`}
          </button>
        )}
      </div>

      {/* ── Right-Side Live Hotspot Sidebar ── */}
      <div className="realMapSidebar">
        <div className="realMapSidebarHeader">
          <div>
            <span className="eyebrow" style={{ color: "var(--amber)", margin: 0 }}>
              GLOBAL REACH
            </span>
            <h4 style={{ fontSize: 13, fontWeight: 700, margin: "2px 0 0", color: "var(--ink)" }}>
              Active Telemetry Hotspots
            </h4>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--teal)", fontWeight: 700 }}>
              {countries.length} {countries.length === 1 ? "Region" : "Regions"}
            </span>
            {isFullscreen && showMobileDrawer && (
              <button
                type="button"
                className="realMapDrawerCloseBtn"
                onClick={() => setShowMobileDrawer(false)}
                aria-label="Close regions drawer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search filter for countries/cities */}
        <div className="realMapSearchWrap">
          <input
            type="text"
            placeholder="Search country or region…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="realMapSearchInput"
          />
          {searchQuery && (
            <button
              type="button"
              className="realMapSearchClear"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        {filteredCountries.length > 0 ? (
          <div className="realMapCountryList">
            {filteredCountries.map((c, index) => {
              const geo = getCountryGeo(c.country);
              const isSelected = selectedPinId === c.country;
              const maxCount = sortedCountries[0]?.count || 1;
              const barWidth = Math.max(10, Math.round((c.count / maxCount) * 100));

              const loc = mapPins.find((p) => p.country === c.country && p.city);

              return (
                <button
                  key={c.country}
                  type="button"
                  className={`realMapCountryItem ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSidebarItemClick(c.country)}
                  title={`Fly to ${geo.name} on the map`}
                >
                  <div className="realMapItemTop">
                    <div className="realMapItemLeft">
                      <span className="realMapItemRank">#{index + 1}</span>
                      <span className="realMapItemFlag">{geo.flag}</span>
                      <div style={{ textAlign: "left" }}>
                        <span className="realMapItemName">{geo.name}</span>
                        {loc && loc.city && (
                          <span className="realMapItemCity">· {loc.city}</span>
                        )}
                      </div>
                    </div>
                    <span className="realMapItemCount">
                      {c.count} {c.count === 1 ? "viewer" : "viewers"}
                    </span>
                  </div>

                  {/* Relative volume bar */}
                  <div className="realMapItemBarBg">
                    <div
                      className="realMapItemBarFill"
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
              ? "Waiting for live visitor pings… Browse the website in another tab or device to see your real-time location."
              : `No region matches "${searchQuery}".`}
          </div>
        )}
      </div>
    </div>
  );
}