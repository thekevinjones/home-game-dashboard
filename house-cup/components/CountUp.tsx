"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tweens the displayed number toward `value` with an easeOutCubic curve.
 *
 * - Counts up from 0 when it first appears, and re-animates from the current
 *   number to the new `value` whenever it changes — so live (realtime) updates
 *   are reflected, never frozen at the first value.
 * - Guarantees it lands on the exact `value` via a timeout safety-net, even if
 *   requestAnimationFrame is throttled (e.g. a background tab runs no frames),
 *   so a number never sticks at a stale/zero value.
 * - Respects prefers-reduced-motion (snaps to the value with no animation).
 */
export function CountUp({
  value,
  suffix = "",
  duration = 1100,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0); // number we're animating from (the last one shown)

  useEffect(() => {
    const set = (v: number) => {
      fromRef.current = v;
      setDisplay(v);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      set(value);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      set(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Safety-net: if frames never run (throttled/background tab), still land on
    // the exact value. A no-op when the tween already reached it.
    const settle = setTimeout(() => set(value), duration + 300);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}
