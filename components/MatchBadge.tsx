"use client";

import { useState } from "react";
import { scoreJob, MatchProfile } from "@/lib/matching";

type JobParam = {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  source?: string;
  publishedAt?: string;
};

const KEY = "remoteflow-match-profile";

let cachedProfile: MatchProfile | null | undefined = undefined;

function getCachedProfile(): MatchProfile | null {
  if (cachedProfile !== undefined) return cachedProfile;
  if (typeof window === "undefined") return null;
  try {
    cachedProfile = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    cachedProfile = null;
  }
  return cachedProfile || null;
}

export function MatchBadge({ job }: { job: JobParam }) {
  // Read profile once lazily; memoized at module-scope so 20 rows don't repeat-parse localStorage
  const [profile] = useState<MatchProfile | null>(() => getCachedProfile() || null);

  if (!profile) return null;
  const m = scoreJob(job, profile);
  if (m.score < 15) return null;

  return <span className="matchBadge">{m.score}% match</span>;
}