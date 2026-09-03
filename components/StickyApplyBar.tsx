"use client";

import React, { useEffect, useState } from "react";
import { SaveJobButton } from "@/components/SaveJobButton";
import { CloudJob } from "@/lib/cloud";

interface StickyApplyBarProps {
  job: CloudJob;
}

export function StickyApplyBar({ job }: StickyApplyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show sticky bar after scrolling past initial header/hero actions
    const handleScroll = () => {
      if (window.scrollY > 160) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`stickyApplyBar ${visible ? "stickyApplyBarVisible" : ""}`}>
      <div className="stickyApplyInfo">
        <span className="stickyRole">{job.title}</span>
        <span className="stickyCompany">{job.company}</span>
      </div>
      <div className="stickyApplyActions">
        <SaveJobButton job={job} />
        <a
          className="stickyApplyBtn"
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Apply ↗
        </a>
      </div>
    </div>
  );
}
