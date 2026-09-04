"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import createGlobe, { Globe, Marker } from "cobe";
import { getCountryGeo } from "@/lib/country-coords";

export interface VisitorCountry {
  country: string;
  count: number;
}

interface DottedGlobeProps {
  countries: VisitorCountry[];
  activeCount?: number;
}

export function DottedGlobe({ countries, activeCount = 0 }: DottedGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef<number>(0);
  const phiRef = useRef<number>(0);
  const targetPhiRef = useRef<number | null>(null);
  const globeRef = useRef<Globe | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  // Compute markers based on countries
  const markers: Marker[] = useMemo(() => {
    if (!countries || countries.length === 0) {
      // Default sample marker (e.g., India or US)
      return [{ location: [20.5937, 78.9629], size: 0.06, color: [0.96, 0.73, 0.26] }];
    }

    return countries.map((c) => {
      const geo = getCountryGeo(c.country);
      const scaledSize = Math.min(0.12, 0.04 + Math.min(c.count, 10) * 0.012);
      return {
        location: [geo.lat, geo.lng] as [number, number],
        size: scaledSize,
        color: [0.96, 0.73, 0.26] as [number, number, number],
        id: c.country,
      };
    });
  }, [countries]);

  // Handle focusing a specific country
  const handleFocusCountry = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const geo = getCountryGeo(countryCode);
    // Convert longitude to phi (radians)
    // Longitude goes from -180 to 180. Center facing camera is roughly -lng in radians + offset
    const rad = (-geo.lng * Math.PI) / 180 + Math.PI / 2;
    targetPhiRef.current = rad;
  };

  useEffect(() => {
    let width = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onResize = () => {
      if (canvas) {
        width = canvas.offsetWidth;
      }
    };
    window.addEventListener("resize", onResize);
    onResize();

    let animId: number;

    try {
      const globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 2, 2),
        width: (width || 380) * 2,
        height: (width || 380) * 2,
        phi: 0,
        theta: 0.25,
        dark: 1,
        diffuse: 1.3,
        mapSamples: 16000,
        mapBrightness: 6,
        baseColor: [0.2, 0.22, 0.26],
        markerColor: [0.96, 0.73, 0.26],
        glowColor: [0.15, 0.55, 0.45],
        opacity: 0.9,
        offset: [0, 0],
        markers: markers,
      });

      globeRef.current = globe;

      const render = () => {
        if (targetPhiRef.current !== null && pointerInteracting.current === null) {
          const diff = targetPhiRef.current - phiRef.current;
          phiRef.current += diff * 0.06;
          if (Math.abs(diff) < 0.002) {
            targetPhiRef.current = null;
          }
        } else if (pointerInteracting.current === null) {
          phiRef.current += 0.004;
        }

        if (globeRef.current) {
          globeRef.current.update({
            phi: phiRef.current + pointerInteractionMovement.current,
          });
        }

        animId = requestAnimationFrame(render);
      };

      animId = requestAnimationFrame(render);
    } catch (err) {
      console.error("WebGL 3D Globe initialization error:", err);
      setWebglSupported(false);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (animId) cancelAnimationFrame(animId);
      if (globeRef.current) {
        globeRef.current.destroy();
        globeRef.current = null;
      }
    };
  }, []);

  // Update markers on the live globe when prop updates
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.update({ markers });
    }
  }, [markers]);

  return (
    <div className="dottedGlobeContainer">
      {/* Globe Canvas Area */}
      <div className="globeCanvasWrapper">
        {webglSupported ? (
          <canvas
            ref={canvasRef}
            className="globeCanvas"
            onPointerDown={(e) => {
              pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
              if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
            }}
            onPointerUp={() => {
              pointerInteracting.current = null;
              if (canvasRef.current) canvasRef.current.style.cursor = "grab";
            }}
            onPointerOut={() => {
              pointerInteracting.current = null;
              if (canvasRef.current) canvasRef.current.style.cursor = "grab";
            }}
            onMouseMove={(e) => {
              if (pointerInteracting.current !== null) {
                const delta = e.clientX - pointerInteracting.current;
                pointerInteractionMovement.current = delta * 0.006;
              }
            }}
            onTouchMove={(e) => {
              if (pointerInteracting.current !== null && e.touches[0]) {
                const delta = e.touches[0].clientX - pointerInteracting.current;
                pointerInteractionMovement.current = delta * 0.006;
              }
            }}
          />
        ) : (
          <div className="globeFallback">
            <span>🌐 3D WebGL Globe not available on current device</span>
          </div>
        )}

        {/* Floating live counter badge on globe */}
        <div className="globeOverlayBadge">
          <span className="liveDot" style={{ width: 6, height: 6 }} />
          <span>{activeCount} Active Edge Nodes</span>
        </div>

        <div className="globeHintText">
          <span>Drag to rotate · Click country to inspect</span>
        </div>
      </div>

      {/* Country List & Hotspots */}
      <div className="globeCountrySidebar">
        <div className="globeCountryHeader">
          <span className="eyebrow" style={{ color: "var(--amber)", margin: 0 }}>
            LIVE AUDIENCE GEO
          </span>
          <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
            {countries.length} active {countries.length === 1 ? "country" : "countries"}
          </span>
        </div>

        {countries && countries.length > 0 ? (
          <div className="globeCountryList">
            {countries.map((c) => {
              const geo = getCountryGeo(c.country);
              const isSelected = selectedCountry === c.country;
              return (
                <button
                  key={c.country}
                  type="button"
                  className={`globeCountryItem ${isSelected ? "selected" : ""}`}
                  onClick={() => handleFocusCountry(c.country)}
                  title={`Focus ${geo.name} on 3D globe`}
                >
                  <div className="globeCountryLeft">
                    <span className="globeCountryFlag">{geo.flag}</span>
                    <span className="globeCountryName">{geo.name}</span>
                  </div>
                  <span className="globeCountryCount">
                    {c.count} {c.count === 1 ? "visitor" : "visitors"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--ink-dim)", fontSize: 12 }}>
            Waiting for live geolocation telemetry…
          </div>
        )}
      </div>
    </div>
  );
}
