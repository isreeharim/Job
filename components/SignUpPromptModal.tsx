"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const STORAGE_KEY = "remoteflow_guest_dismissed_at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function SignUpPromptModal() {
  const { email, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
  }, []);

  const handleSignUpClick = useCallback(() => {
    handleDismiss();
    router.push("/account?mode=signup");
  }, [handleDismiss, router]);

  useEffect(() => {
    // Never show if auth is still loading, user is logged in, or on account / admin pages
    if (loading || email || pathname === "/account" || pathname.startsWith("/admin")) {
      return;
    }

    // Check if previously avoided / dismissed
    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const diff = Date.now() - Number(dismissedAt);
        if (diff < DISMISS_DURATION_MS) {
          return;
        }
      }
    } catch {}

    // Delay prompt appearance so first-time visitors can orient themselves first
    let retryTimer: NodeJS.Timeout | null = null;
    const timer = setTimeout(() => {
      try {
        if (sessionStorage.getItem("rf_loc_modal_open") === "1") {
          retryTimer = setTimeout(() => {
            if (sessionStorage.getItem("rf_loc_modal_open") !== "1") {
              setIsOpen(true);
            }
          }, 6000);
          return;
        }
      } catch {}
      setIsOpen(true);
    }, 2800);

    return () => {
      clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [loading, email, pathname]);

  // Handle Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleDismiss]);

  if (!isOpen || loading || email || pathname === "/account" || pathname.startsWith("/admin")) return null;

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-modal-title"
      onClick={handleDismiss}
    >
      <div
        className="modalCard"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside dialog
      >
        <button
          className="modalCloseBtn"
          onClick={handleDismiss}
          aria-label="Close popup and continue as guest"
        >
          ×
        </button>

        <div className="modalHeader">
          <span className="modalKicker">EARLY-CAREER PLATFORM</span>
          <h2 id="signup-modal-title" className="modalTitle">
            Get the full RemoteFlow experience
          </h2>
          <p className="modalSubtitle">
            Create a free account to unlock continuous tracking, AI match scores, and instant remote job alerts.
          </p>
        </div>

        <div className="modalBenefits">
          <div className="benefitItem">
            <span className="benefitIcon">✦</span>
            <div>
              <strong>Application Tracking Pipeline</strong>
              <p>Organize, bookmark, and track every application status from applied to offer.</p>
            </div>
          </div>
          <div className="benefitItem">
            <span className="benefitIcon">✦</span>
            <div>
              <strong>Instant Telegram & Email Alerts</strong>
              <p>Get notified within seconds when high-relevance fresher roles open worldwide.</p>
            </div>
          </div>
          <div className="benefitItem">
            <span className="benefitIcon">✦</span>
            <div>
              <strong>Role Match Intelligence</strong>
              <p>AI scoring that measures compatibility with your specific skillset and tools.</p>
            </div>
          </div>
        </div>

        <div className="modalActions">
          <button className="modalPrimaryBtn" onClick={handleSignUpClick}>
            Sign up for free →
          </button>
          <button className="modalSecondaryBtn" onClick={handleDismiss}>
            Continue as guest
          </button>
        </div>

        <p className="modalFooterNote">
          Already have an account?{" "}
          <button
            className="modalInlineLink"
            onClick={() => {
              handleDismiss();
              router.push("/account");
            }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
