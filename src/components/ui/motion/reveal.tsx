"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";

interface RevealProps {
  children: ReactNode;
  /** Delay in milliseconds. */
  delay?: number;
  /** How far it slides up while fading in (px). Set 0 for fade-only. */
  distance?: number;
  /** Animation duration (ms). */
  duration?: number;
  /** Extra className passthrough. */
  className?: string;
  /** Inline style merged after transform/opacity rules. */
  style?: CSSProperties;
  /** Render element. Defaults to `div`. */
  as?: "div" | "section" | "article" | "li";
}

/**
 * Mount-triggered fade + slide reveal. Fires on component mount, using the
 * delay prop to create stagger effects. Works correctly regardless of whether
 * the scroll container is the document or an inner overflow div.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 12,
  duration = 500,
  className,
  style,
  as = "div",
}: RevealProps) {
  const [visible, setVisible] = useState(false);
  const Tag = as as "div";

  useEffect(() => {
    // requestAnimationFrame ensures the initial opacity:0 frame is painted
    // before the transition starts, so the animation always fires.
    const id = requestAnimationFrame(() => {
      const timer = window.setTimeout(() => setVisible(true), delay);
      return () => window.clearTimeout(timer);
    });
    return () => cancelAnimationFrame(id);
  }, [delay]);

  return (
    <Tag
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${distance}px)`,
        transition: `opacity ${duration}ms var(--ease-out-expo), transform ${duration}ms var(--ease-out-expo)`,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

interface StaggerProps {
  children: ReactNode;
  /** Per-child delay (ms). */
  step?: number;
  /** Initial delay before the first child (ms). */
  initialDelay?: number;
  distance?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Wraps an array of children and reveals them sequentially as the parent
 * scrolls into view. Each child is individually wrapped — they each get
 * their own IntersectionObserver so very long lists still feel alive on
 * deep scroll.
 */
export function Stagger({
  children,
  step = 60,
  initialDelay = 0,
  distance = 10,
  duration = 460,
  className,
  style,
}: StaggerProps) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className={className} style={style}>
      {items.map((child, i) => (
        <Reveal
          key={i}
          delay={initialDelay + i * step}
          distance={distance}
          duration={duration}
        >
          {child}
        </Reveal>
      ))}
    </div>
  );
}
