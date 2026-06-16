"use client";

import { useState } from "react";
import type { AudioSnapshot } from "../_lib/audio-engine";
import { useAudioEngine, useEngineTick } from "../_lib/use-engine";

interface SavedPreset {
  id: string;
  name: string;
  snapshot: AudioSnapshot;
  createdAt: number;
}

const STORAGE_KEY = "cool-jam:presets:v1";

function readPresets(): SavedPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedPreset[];
  } catch {
    return [];
  }
}

function writePresets(presets: SavedPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function Presets() {
  const engine = useAudioEngine();
  useEngineTick(engine);
  const [presets, setPresets] = useState<SavedPreset[]>(() => readPresets());
  const [name, setName] = useState("");

  const activeCount = engine?.getSnapshot().active.length ?? 0;
  const canSave = !!engine && activeCount > 0 && name.trim().length > 0;

  const save = () => {
    if (!engine || !canSave) return;
    const snapshot = engine.getSnapshot();
    const next: SavedPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      snapshot,
      createdAt: Date.now(),
    };
    const updated = [next, ...presets].slice(0, 12);
    setPresets(updated);
    writePresets(updated);
    setName("");
  };

  const apply = async (preset: SavedPreset) => {
    if (!engine) return;
    await engine.applySnapshot(preset.snapshot);
  };

  const remove = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    writePresets(updated);
  };

  return (
    <section className="glass rounded-3xl p-5 sm:p-7">
      <header className="mb-4">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
          프리셋
        </h2>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          자주 듣는 조합을 저장하고 한 번에 불러와요
        </p>
      </header>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSave) save();
          }}
          placeholder={
            activeCount > 0
              ? `이름 입력 (${activeCount}개 사운드)`
              : "먼저 사운드를 켜주세요"
          }
          disabled={activeCount === 0}
          maxLength={24}
          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[color:var(--accent)]/50 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-white hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          저장
        </button>
      </div>

      {presets.length === 0 ? (
        <p className="text-xs text-[var(--fg-muted)] text-center py-6">
          아직 저장된 프리셋이 없어요
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <li
              key={p.id}
              className="group flex items-center gap-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition pl-1 pr-1"
            >
              <button
                type="button"
                onClick={() => apply(p)}
                className="px-3 py-1.5 text-xs text-white"
                title={`${p.snapshot.active.length}개 사운드`}
              >
                <span className="mr-1.5 opacity-60">▶</span>
                {p.name}
                <span className="ml-1.5 text-[10px] text-[var(--fg-muted)]">
                  · {p.snapshot.active.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`${p.name} 삭제`}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--fg-muted)] hover:text-white hover:bg-white/10 transition text-xs"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
