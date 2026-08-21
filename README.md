# Gym Tracker

A fast, installable workout tracker for logging sets, reps, and weights at the gym, with a built-in rest timer and progress charts.

Built as a React + TypeScript PWA so it can be deployed to the web (Vercel) today, and wrapped with [Capacitor](https://capacitorjs.com/) into a native iOS app later without a rewrite.

## Features

- **Routines** — organize exercises by category (Chest, Back, Legs, ...), seeded from your existing routines
- **Active workout logging** — tap an exercise, log weight × reps per set, see your last performance inline
- **Rest timer** — auto-starts after each set, adjustable in ±15s increments, with a sound + vibration when done
- **Dashboard** — streak, weekly volume trend, recent PRs
- **Per-exercise progress** — personal record, estimated 1RM, top-set weight trend chart, full set history
- **Works offline** — all data lives on-device (IndexedDB via Dexie); installable to your phone's home screen as a PWA

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Dexie (IndexedDB) for local storage
- Zustand for lightweight app state (active session, rest timer)
- React Router, Recharts, Framer Motion, lucide-react

## Getting started

```bash
npm install
npm run dev
```

## Deploying

Push to GitHub, then import the repo in [Vercel](https://vercel.com/new) — no configuration needed, it auto-detects the Vite build.

## Path to iOS

This app is already structured to make a native iOS build straightforward:

1. `npm install @capacitor/core @capacitor/ios`
2. `npx cap init` then `npx cap add ios`
3. `npm run build && npx cap sync ios`
4. Open the generated Xcode project and run on a simulator/device

All business logic (data model, calculations, storage) lives outside the UI components in `src/data` and `src/lib`, so it carries over unchanged.
