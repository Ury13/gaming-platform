"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  nativeW: number;
  nativeH: number;
  children: React.ReactNode;
};

/**
 * Scales its children (a fixed-pixel canvas game) to fill the available
 * container without changing the canvas resolution — pure CSS transform.
 * Works on any phone size.
 */
export default function GameScaler({ nativeW, nativeH, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const calc = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect();
      if (!cw || !ch) return;
      const s = Math.min(cw / nativeW, ch / nativeH);
      setScale(s);
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nativeW, nativeH]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full"
    >
      <div
        style={{
          width: nativeW,
          height: nativeH,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          // Prevent layout jank from a scaled element
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
