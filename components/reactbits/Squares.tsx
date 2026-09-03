"use client";

import React, { useRef, useEffect } from "react";

interface SquaresProps {
  direction?: "right" | "left" | "up" | "down" | "diagonal";
  speed?: number;
  borderColor?: string;
  squareSize?: number;
  hoverFillColor?: string;
  className?: string;
}

export function Squares({
  direction = "right",
  speed = 0.5,
  borderColor = "rgba(255, 255, 255, 0.04)",
  squareSize = 44,
  hoverFillColor = "rgba(244, 185, 66, 0.06)",
  className = "",
}: SquaresProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const numSquaresX = useRef(0);
  const numSquaresY = useRef(0);
  const gridOffset = useRef({ x: 0, y: 0 });
  const hoveredSquare = useRef<{ x: number; y: number } | null>(null);
  const isVisible = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Pause when element is not visible on screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    // Disable continuous loop if reduced motion is requested
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect() || canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      numSquaresX.current = Math.ceil(rect.width / squareSize) + 1;
      numSquaresY.current = Math.ceil(rect.height / squareSize) + 1;
    };

    window.addEventListener("resize", resizeCanvas, { passive: true });
    resizeCanvas();

    const draw = () => {
      if (!ctx || !canvas) return;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      const startX = Math.floor(gridOffset.current.x / squareSize);
      const startY = Math.floor(gridOffset.current.y / squareSize);

      for (let x = startX; x < startX + numSquaresX.current; x++) {
        for (let y = startY; y < startY + numSquaresY.current; y++) {
          const squareX = x * squareSize - (gridOffset.current.x % squareSize);
          const squareY = y * squareSize - (gridOffset.current.y % squareSize);

          if (
            hoveredSquare.current &&
            hoveredSquare.current.x === x &&
            hoveredSquare.current.y === y
          ) {
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(squareX, squareY, squareSize, squareSize);
          }

          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(squareX, squareY, squareSize, squareSize);
        }
      }

      // Drift grid slowly
      if (!prefersReducedMotion) {
        switch (direction) {
          case "right":
            gridOffset.current.x -= speed;
            break;
          case "left":
            gridOffset.current.x += speed;
            break;
          case "up":
            gridOffset.current.y += speed;
            break;
          case "down":
            gridOffset.current.y -= speed;
            break;
          case "diagonal":
            gridOffset.current.x -= speed;
            gridOffset.current.y -= speed;
            break;
        }
      }
    };

    const loop = () => {
      if (isVisible.current) {
        draw();
      }
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    const handleMouseMove = (event: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const hoveredX = Math.floor(
        (mouseX + (gridOffset.current.x % squareSize)) / squareSize
      );
      const hoveredY = Math.floor(
        (mouseY + (gridOffset.current.y % squareSize)) / squareSize
      );

      hoveredSquare.current = {
        x: hoveredX + Math.floor(gridOffset.current.x / squareSize),
        y: hoveredY + Math.floor(gridOffset.current.y / squareSize),
      };
    };

    const handleMouseLeave = () => {
      hoveredSquare.current = null;
    };

    // Only listen to mouse move if not a touch device
    if (!window.matchMedia("(pointer: coarse)").matches) {
      canvas.addEventListener("mousemove", handleMouseMove, { passive: true });
      canvas.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (canvas) {
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [direction, speed, borderColor, hoverFillColor, squareSize]);

  return (
    <canvas
      ref={canvasRef}
      className={`squares-canvas ${className}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
        zIndex: 0,
      }}
    />
  );
}
