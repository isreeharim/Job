"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentUser, loadCloudSaved, toggleCloudSaved, CloudJob } from "@/lib/cloud";
import { AppHeader } from "@/components/AppHeader";
import { SpotlightCard } from "@/components/reactbits";

const KEY = "remoteflow-saved-jobs";

export default function SavedPage() {
  const [jobs, setJobs] = useState<CloudJob[]>([]);
  const [cloud, setCloud] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const u = await currentUser();
      setCloud(!!u);
      if (u) {
        const data = await loadCloudSaved();
        setJobs(data || []);
      } else {
        try {
          setJobs(JSON.parse(localStorage.getItem(KEY) || "[]"));
        } catch {}
      }
      setLoading(false);
    })();
  }, []);

  async function handleRemove(e: React.MouseEvent, job: CloudJob) {
    e.preventDefault();
    e.stopPropagation();
    if (removingId) return;
    setRemovingId(job.id);
    setJobs(prev => prev.filter(j => j.id !== job.id));

    if (cloud) {
      await toggleCloudSaved(job);
    }
    try {
      const stored: CloudJob[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      localStorage.setItem(KEY, JSON.stringify(stored.filter(j => j.id !== job.id)));
    } catch {}
    setRemovingId(null);
  }

  return (
    <main className="detailPage">
      <AppHeader />

      <section className="savedPage">
        <p className="eyebrow">YOUR SHORTLIST</p>
        <div className="savedHeaderRow">
          <h1>Saved jobs</h1>
          {jobs.length > 0 && (
            <span className="savedCountBadge">{jobs.length} saved</span>
          )}
        </div>
        <p className="savedIntro">
          {cloud
            ? "Synced securely to your RemoteFlow account across devices."
            : "Saved on this device. Sign in to sync your shortlist anywhere."}
        </p>

        {loading ? (
          <div className="empty"><h3>Loading your shortlist…</h3></div>
        ) : jobs.length === 0 ? (
          <div className="empty">
            <h3>Your shortlist is empty.</h3>
            <p>Bookmark high-conviction roles from the board so you can review and apply to them later.</p>
            <Link className="applyButton" href="/">Explore opportunities</Link>
          </div>
        ) : (
          <div className="savedList">
            {jobs.map(job => (
              <SpotlightCard
                key={job.id}
                className="savedCardWrap"
                spotlightColor="rgba(244, 185, 66, 0.06)"
                borderHoverColor="var(--amber)"
              >
                <div className="savedCardInner">
                  <div className="savedCardTop">
                    <Link className="savedTitleLink" href={"/jobs/" + encodeURIComponent(job.id)}>
                      <strong>{job.title}</strong>
                    </Link>
                    <button
                      type="button"
                      className="savedRemoveBtn"
                      onClick={e => handleRemove(e, job)}
                      title="Remove from saved"
                      aria-label="Remove job from shortlist"
                      disabled={removingId === job.id}
                      aria-busy={removingId === job.id}
                    >
                      {removingId === job.id ? "Removing…" : "✕ Remove"}
                    </button>
                  </div>
                  <div className="savedCardMeta">
                    <span>{job.company}</span>
                    <span>{job.location || "Worldwide"}</span>
                    <span>{job.source}</span>
                  </div>
                  <div className="savedCardActions">
                    <Link className="savedViewLink" href={"/jobs/" + encodeURIComponent(job.id)}>
                      View details →
                    </Link>
                    <a
                      className="savedApplyLink"
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Apply on {job.source} ↗
                    </a>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}