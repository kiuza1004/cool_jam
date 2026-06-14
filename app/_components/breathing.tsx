"use client";

import { useEffect, useRef, useState } from "react";

const PHASES = [
  { key: "in", label: "들이쉬기", duration: 4000, scale: 1.35 },
  { key: "hold", label: "멈추기", duration: 7000, scale: 1.35 },
  { key: "out", label: "내쉬기", duration: 8000, scale: 0.7 },
] as const;

export function Breathing() {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const phaseTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      setPhaseIdx(0);
      setCountdown(4);
      return;
    }
    let cancelled = false;
    let idx = 0;

    const runPhase = () => {
      if (cancelled) return;
      setPhaseIdx(idx);
      const phase = PHASES[idx];
      let remaining = phase.duration;
      setCountdown(Math.ceil(remaining / 1000));
      tickTimer.current = window.setInterval(() => {
        remaining -= 1000;
        setCountdown(Math.max(1, Math.ceil(remaining / 1000)));
      }, 1000);
      phaseTimer.current = window.setTimeout(() => {
        if (tickTimer.current) window.clearInterval(tickTimer.current);
        idx = (idx + 1) % PHASES.length;
        runPhase();
      }, phase.duration);
    };
    runPhase();

    return () => {
      cancelled = true;
      if (phaseTimer.current) window.clearTimeout(phaseTimer.current);
      if (tickTimer.current) window.clearInterval(tickTimer.current);
    };
  }, [running]);

  const phase = PHASES[phaseIdx];
  const displayScale = running ? phase.scale : 0.85;
  const transitionMs = running ? phase.duration : 600;

  return (
    <section className="glass rounded-3xl p-5 sm:p-7 flex flex-col">
      <header>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
          4-7-8 호흡
        </h2>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          4초 들이쉬고, 7초 멈추고, 8초 내쉬어요
        </p>
      </header>

      <div className="flex-1 flex items-center justify-center py-10">
        <div className="relative w-60 h-60 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, var(--accent) 0%, transparent 60%)",
              transition: `transform ${transitionMs}ms cubic-bezier(0.45, 0, 0.55, 1)`,
              transform: `scale(${displayScale})`,
            }}
          />
          <div
            className="relative w-40 h-40 rounded-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-2))",
              transition: `transform ${transitionMs}ms cubic-bezier(0.45, 0, 0.55, 1)`,
              transform: `scale(${displayScale})`,
              boxShadow: "0 20px 60px -15px rgba(199, 155, 255, 0.6)",
            }}
          >
            <div className="text-center text-white">
              <div className="text-[11px] uppercase tracking-[0.25em] opacity-80">
                {running ? phase.label : "준비"}
              </div>
              <div className="text-4xl font-light mt-1 tabular-nums">
                {running ? countdown : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setRunning((r) => !r)}
        className="mx-auto px-6 py-2.5 rounded-full glass-strong text-sm font-medium hover:bg-white/15 transition"
      >
        {running ? "멈추기" : "시작하기"}
      </button>
    </section>
  );
}
