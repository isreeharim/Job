"use client";

import React, { useRef, useState } from "react";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  borderHoverColor?: string;
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(244, 185, 66, 0.08)",
  borderHoverColor = "rgba(244, 185, 66, 0.35)",
  style,
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const isTouchDevice = () => {
    return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  };

  // High performance: update CSS custom properties directly on the DOM element.
  // This bypasses React re-rendering completely during pointer movement for 120fps smoothness.
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice() || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        if (!isTouchDevice()) setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (!isTouchDevice()) setIsHovered(false);
      }}
      className={`spotlight-card ${className}`}
      style={
        {
          "--mouse-x": "0px",
          "--mouse-y": "0px",
          "--spotlight-color": spotlightColor,
          "--border-hover": borderHoverColor,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        className="spotlight-overlay"
        style={{
          opacity: isHovered ? 1 : 0,
        }}
      />
      {children}
    </div>
  );
}
