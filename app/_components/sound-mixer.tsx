"use client";

import { SOUNDS, type SoundId } from "../_lib/audio-engine";
import { useAudioEngine, useEngineTick } from "../_lib/use-engine";

export function SoundMixer() {
  const engine = useAudioEngine();
  useEngineTick(engine);

  const onToggle = async (id: SoundId) => {
    if (!engine) return;
    await engine.toggle(id);
  };

  const onVolume = (id: SoundId, value: number) => {
    if (!engine) return;
    engine.setVolume(id, value / 100);
  };

  const onStop = () => {
    if (!engine) return;
    engine.stopAll();
  };

  const anyActive = engine?.anyActive() ?? false;

  return (
    <section className="glass rounded-3xl p-5 sm:p-7">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
            사운드 믹서
          </h2>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            마음에 드는 소리를 골라 자유롭게 섞어보세요
          </p>
        </div>
        <button
          type="button"
          onClick={onStop}
          disabled={!anyActive}
          className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-[var(--fg-muted)] hover:text-white hover:border-white/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          전체 정지
        </button>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SOUNDS.map((s) => {
          const active = engine?.isActive(s.id) ?? false;
          const volume = Math.round((engine?.getVolume(s.id) ?? 0.5) * 100);
          return (
            <div
              key={s.id}
              className={`rounded-2xl border transition p-4 ${
                active
                  ? "border-[color:var(--accent)]/60 bg-white/10 shadow-[0_0_30px_-12px_rgba(138,161,255,0.6)]"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => onToggle(s.id)}
                className="w-full flex items-center gap-3 text-left"
                aria-pressed={active}
              >
                <span
                  className={`flex items-center justify-center w-11 h-11 rounded-xl text-xl transition ${
                    active
                      ? "bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-2)] shadow-lg"
                      : "bg-white/10"
                  }`}
                >
                  {s.emoji}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="block text-xs text-[var(--fg-muted)] mt-0.5">
                    {s.description}
                  </span>
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                    active
                      ? "bg-white/15 text-white"
                      : "bg-white/5 text-[var(--fg-muted)]"
                  }`}
                >
                  {active ? "ON" : "OFF"}
                </span>
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => onVolume(s.id, Number(e.target.value))}
                className="mt-4"
                aria-label={`${s.label} 볼륨`}
                disabled={!active}
                style={{ opacity: active ? 1 : 0.4 }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
