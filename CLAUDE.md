# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — Next.js dev server (Turbopack). Port may shift to 3001/3002 if 3000 is busy.
- `npm run build` — production build. Use this to verify TS + Next compile.
- `npm run lint` — ESLint (flat config, extends `next/core-web-vitals` + `next/typescript`).
- `npx tsc --noEmit` — fast type-check without bundling.
- `vercel --prod --yes` — deploy to production. The project is already linked (`.vercel/`); free plan has a **100 deploys/day** rate limit that frequently blocks rapid iteration. Local `npm run dev` is the primary verification path.

There is no test runner configured.

## Architecture

This is a single-page sleep-aid web app (Next.js 16 App Router, React 19, Tailwind 4). Everything renders from `app/page.tsx` — there is one route.

The page composes three interactive panels plus a background:

- `_components/sound-mixer.tsx` — sound grid with per-track toggle + volume.
- `_components/breathing.tsx` — animated 4-7-8 breathing guide (4s inhale, 7s hold, 8s exhale).
- `_components/sleep-timer.tsx` — countdown that fades audio out over its final ~20s.
- `_components/stars.tsx` — decorative starfield backdrop (no audio coupling).

### Audio engine is the load-bearing module

**All sounds are synthesized in-browser via the Web Audio API.** There are no audio files in the repo, and none should be added — every sound (rain, waves, fireplace, church bell, etc.) is built from oscillators, noise buffers (white/pink/brown via Paul Kellett pink filter and integrated brown), filters, and scheduled events.

`app/_lib/audio-engine.ts` exports a singleton `AudioEngine` (`getAudioEngine()`). The engine:

- Owns one `AudioContext` and one master `GainNode`.
- Holds a `Map<SoundId, Track>` of currently-built tracks. A `Track` is `{ gain, start, stop, volume, active }`.
- Builds tracks lazily on first toggle via `buildTrack(id)` — a switch over `SoundId`. **This is the only place to add a new sound:** extend the `SoundId` union, add a `SoundMeta` entry to `SOUNDS`, and add a branch to `buildTrack` returning a `Track`.
- Toggle-off **ramps gain to 0 but keeps the source running** (cheap; avoids restart cost). Only `stopAll()` actually stops and disconnects nodes. `fadeOutAndStop(seconds)` is used by the sleep timer — ramps the master gain, then tears down.
- Tracks that schedule events over time (chimes, fireplace crackle, thunder booms, hail taps, stream burbles, bell strikes) use `setTimeout` recursion with a `stopped` flag captured in closure. Stopping must clear the timer **and** flip the flag — both.

### React ↔ engine bridge

React does **not** own audio state. The engine is the source of truth and exposes a tiny pub/sub (`subscribe`). Components use two hooks from `app/_lib/use-engine.ts`:

- `useAudioEngine()` — returns the singleton (or `null` on first server-side render).
- `useEngineTick(engine)` — re-renders the component on every `engine.notify()`.

The engine calls `notify()` after every state change (toggle, volume, fade), and components read fresh state imperatively (`engine.isActive(id)`, `engine.getVolume(id)`).

### File layout conventions

- `app/_components/`, `app/_lib/` — the leading underscore tells App Router these are **not** routes. Use it for any non-route files under `app/`.
- `app/page.tsx` is a server component. The interactive UI lives in client components under `_components/` (each starts with `"use client"`). The audio engine module is browser-only and throws if imported during SSR.

### Theme tokens and glass utilities

`app/globals.css` defines the design system in CSS custom properties — `--bg-1/2/3`, `--fg`, `--fg-muted`, `--accent`, `--accent-2`, `--surface`, `--surface-strong`, `--border` — plus two utility classes `.glass` and `.glass-strong` (translucent surface + blur). Components reference these (e.g. `text-[var(--fg-muted)]`, `bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)]`, `className="glass rounded-3xl"`). When adding or restyling UI, reuse these tokens rather than hardcoding hex colors or rebuilding the frosted-glass look.

### Sleep timer ↔ audio engine coupling

`SleepTimer` calls `engine.fadeOutAndStop(seconds)` when the visible countdown reaches ~20s, so the last 20 seconds of the countdown _are_ the audio fade. Cancelling the timer calls `engine.cancelFade()` to restore master gain. This coupling is intentional — keep it.

## Working notes

- Korean UI copy is intentional (target user is Korean-speaking). Keep labels/descriptions in Korean.
- The Vercel project's `Deployment Protection` is **disabled** so direct `*-projects.vercel.app` URLs are public. The canonical URL is `https://cooljam.vercel.app`.
- An empty directory `잠 안올 때 수면을 돕는 앱/` exists at the repo root from initial scaffolding — ignore it; it's not part of the build.
