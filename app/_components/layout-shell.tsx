"use client";

import { useEffect, useState } from "react";
import { Breathing } from "./breathing";
import { Presets } from "./presets";
import { SleepTimer } from "./sleep-timer";
import { SoundMixer } from "./sound-mixer";
import { Stars } from "./stars";

export function LayoutShell() {
  const [dim, setDim] = useState(false);

  useEffect(() => {
    if (!dim) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDim(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dim]);

  return (
    <>
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: dim ? 0.2 : 1 }}
      >
        <Stars />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-5 py-10 sm:py-16">
        <header
          className={`text-center transition-all duration-500 overflow-hidden ${
            dim
              ? "opacity-0 max-h-0 mb-0 pointer-events-none"
              : "opacity-100 max-h-60 mb-10 sm:mb-14"
          }`}
        >
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-[var(--fg-muted)] glass rounded-full px-3 py-1">
            <span aria-hidden>🌙</span>
            <span>Cool Jam</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
            오늘 밤,
            <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] bg-clip-text text-transparent">
              {" "}
              더 깊은 잠으로
            </span>
          </h1>
          <p className="mt-4 text-[var(--fg-muted)] text-sm sm:text-base max-w-xl mx-auto">
            잔잔한 소리, 호흡 가이드, 그리고 슬립 타이머. 잠들기까지의 길을
            부드럽게 안내해요.
          </p>
        </header>

        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setDim((d) => !d)}
            aria-pressed={dim}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              dim
                ? "border-[color:var(--accent)]/60 bg-white/10 text-white"
                : "border-white/15 text-[var(--fg-muted)] hover:text-white hover:border-white/30"
            }`}
          >
            {dim ? "🌙 야간 모드 해제 (Esc)" : "🌙 야간 모드"}
          </button>
        </div>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
          <div
            className={`lg:col-span-2 transition-all duration-500 ${
              dim ? "opacity-30 max-h-32 overflow-hidden" : "opacity-100"
            }`}
          >
            <SoundMixer />
          </div>
          <Breathing />
          <SleepTimer />
          <div
            className={`lg:col-span-2 transition-all duration-500 overflow-hidden ${
              dim
                ? "opacity-0 max-h-0 pointer-events-none"
                : "opacity-100 max-h-[600px]"
            }`}
          >
            <Presets />
          </div>
        </div>

        <footer
          className={`text-center text-xs text-[var(--fg-muted)] transition-opacity duration-500 ${
            dim ? "opacity-0 mt-6" : "opacity-100 mt-14"
          }`}
        >
          편안한 밤 보내세요 · 화면을 어둡게 두고 사용해보세요
        </footer>
      </main>
    </>
  );
}
