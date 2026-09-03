import React from "react";

interface StarBorderProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: React.ElementType;
  className?: string;
  color?: string;
  speed?: string;
  children: React.ReactNode;
  href?: string;
  target?: string;
  rel?: string;
}

export function StarBorder({
  as: Component = "button",
  className = "",
  color = "var(--amber)",
  speed = "4s",
  children,
  ...props
}: StarBorderProps) {
  return (
    <Component
      className={`star-border-container ${className}`}
      style={{
        "--star-color": color,
        "--star-speed": speed,
      } as React.CSSProperties}
      {...props}
    >
      <div className="star-border-glow" />
      <div className="star-border-inner">{children}</div>
    </Component>
  );
}
