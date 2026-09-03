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
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const isTouchDevice = () => {
    return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice() || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
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
          "--mouse-x": `${position.x}px`,
          "--mouse-y": `${position.y}px`,
          "--spotlight-color": spotlightColor,
          "--border-hover": borderHoverColor,
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
