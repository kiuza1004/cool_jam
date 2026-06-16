"use client";

import { useMemo } from "react";

interface Star {
  id: number;
  top: string;
  left: string;
  size: number;
  duration: string;
  delay: string;
}

function generateStars(count: number): Star[] {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: `${rand() * 100}%`,
    left: `${rand() * 100}%`,
    size: 1 + Math.floor(rand() * 2),
    duration: `${3 + rand() * 5}s`,
    delay: `${rand() * 5}s`,
  }));
}

export function Stars({ count = 60 }: { count?: number }) {
  const stars = useMemo<Star[]>(() => generateStars(count), [count]);

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {stars.map((s) => (
        <span
          key={s.id}
          className="star"
          style={
            {
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              ["--dur" as string]: s.duration,
              ["--delay" as string]: s.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
