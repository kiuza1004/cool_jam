"use client";

import { useEffect, useState } from "react";
import { AudioEngine, getAudioEngine } from "./audio-engine";

export function useAudioEngine(): AudioEngine | null {
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  useEffect(() => {
    setEngine(getAudioEngine());
  }, []);
  return engine;
}

export function useEngineTick(engine: AudioEngine | null): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!engine) return;
    return engine.subscribe(() => setTick((t) => t + 1));
  }, [engine]);
  return tick;
}
