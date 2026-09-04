"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function LiveVisitorBadge() {
  const [liveCount, setLiveCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchLive = async () => {
      try {
        const res = await fetch("/api/track/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && typeof data.liveVisitors === "number") {
          setLiveCount(data.liveVisitors);
        }
      } catch {}
    };

    fetchLive();
    const interval = setInterval(fetchLive, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/analytics"
      className="liveVisitorBadge"
      title="Real-time visitors currently active on RemoteFlow. Click for live analytics."
      aria-label={liveCount === null ? "Live visitor count loading" : `${liveCount} live visitors on RemoteFlow`}
    >
      <span className="liveDot" />
      <span className="liveLabel">
        {liveCount === null ? "…" : `${liveCount} live`}
      </span>
    </Link>
  );
}
