"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioEngine } from "../_lib/use-engine";

const OPTIONS = [5, 10, 15, 30, 45, 60] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function SleepTimer() {
  const engine = useAudioEngine();
  const [minutes, setMinutes] = useState<number>(15);
  const [remaining, setRemaining] = useState<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const fadeStartedRef = useRef(false);

  useEffect(() => {
    if (remaining === null) return;
    if (!fadeStartedRef.current && remaining <= 20 && engine) {
      engine.fadeOutAndStop(Math.max(5, remaining));
      fadeStartedRef.current = true;
    }
  }, [remaining, engine]);

  const start = () => {
    if (!engine) return;
    engine.cancelFade();
    if (tickRef.current) window.clearInterval(tickRef.current);
    fadeStartedRef.current = false;
    setRemaining(minutes * 60);
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r === null) return null;
        if (r <= 1) {
          if (tickRef.current) window.clearInterval(tickRef.current);
          fadeStartedRef.current = false;
          return null;
        }
        return r - 1;
      });
    }, 1000);
  };

  const cancel = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    setRemaining(null);
    fadeStartedRef.current = false;
    if (engine) engine.cancelFade();
  };

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  const isRunning = remaining !== null;

  return (
    <section className="glass rounded-3xl p-5 sm:p-7 flex flex-col">
      <header>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
          슬립 타이머
        </h2>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          지정한 시간 후 소리가 서서히 사라져요
        </p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center py-10">
        <div className="text-6xl sm:text-7xl font-light tabular-nums tracking-tight">
          {isRunning ? formatTime(remaining!) : `${minutes}분`}
        </div>
        <p className="mt-3 text-xs text-[var(--fg-muted)] uppercase tracking-[0.25em]">
          {isRunning ? "잠들 때까지" : "타이머 길이"}
        </p>
      </div>

      {!isRunning ? (
        <>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setMinutes(opt)}
                className={`py-2.5 rounded-xl text-sm transition border ${
                  opt === minutes
                    ? "border-[color:var(--accent)]/60 bg-white/10 text-white"
                    : "border-white/10 bg-white/5 text-[var(--fg-muted)] hover:bg-white/10 hover:text-white"
                }`}
              >
                {opt}분
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={start}
            className="mx-auto px-7 py-2.5 rounded-full text-sm font-medium bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-white hover:opacity-90 transition"
          >
            타이머 시작
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={cancel}
          className="mx-auto px-7 py-2.5 rounded-full text-sm font-medium glass-strong hover:bg-white/15 transition"
        >
          타이머 취소
        </button>
      )}
    </section>
  );
}
