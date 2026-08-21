import { create } from 'zustand';

interface RestTimerState {
  endsAt: number | null;
  duration: number;
  label: string | null;
  start: (seconds: number, label?: string) => void;
  addSeconds: (delta: number) => void;
  stop: () => void;
}

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
  endsAt: null,
  duration: 90,
  label: null,
  start: (seconds, label) => set({ endsAt: Date.now() + seconds * 1000, duration: seconds, label: label ?? null }),
  addSeconds: (delta) => {
    const { endsAt } = get();
    if (endsAt == null) return;
    set({ endsAt: Math.max(Date.now(), endsAt + delta * 1000) });
  },
  stop: () => set({ endsAt: null, label: null }),
}));

let audioCtx: AudioContext | null = null;

export function playRestDoneChime() {
  try {
    audioCtx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.32);
    });
  } catch {
    // audio not available; ignore
  }
  if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
}
