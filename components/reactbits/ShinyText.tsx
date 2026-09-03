import React from "react";

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  children?: React.ReactNode;
}

export function ShinyText({
  text,
  disabled = false,
  speed = 5,
  className = "",
  children,
}: ShinyTextProps) {
  const content = children || text;

  if (disabled) {
    return <span className={className}>{content}</span>;
  }

  return (
    <span
      className={`shiny-text ${className}`}
      style={{ animationDuration: `${speed}s` }}
    >
      {content}
    </span>
  );
}
