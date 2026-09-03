"use client";

import React from "react";
import { useRouter } from "next/navigation";

export function BackButton({ fallback = "/", label = "← Back" }: { fallback?: string; label?: string }) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button type="button" onClick={handleBack} className="backLink backButtonInteractive">
      {label}
    </button>
  );
}
