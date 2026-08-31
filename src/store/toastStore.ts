import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastStore {
  queue: Toast[];
  show: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

// A queue rather than a single slot: showing a second toast while the first is still up (e.g. a
// PR toast immediately followed by another action's message) no longer silently drops the first.
export const useToastStore = create<ToastStore>((set) => ({
  queue: [],
  show: (message, kind = 'info') => {
    const id = nextId++;
    set((s) => ({ queue: [...s.queue, { id, message, kind }] }));
  },
  dismiss: (id) => {
    set((s) => ({ queue: s.queue.filter((t) => t.id !== id) }));
  },
}));

/** Themed replacement for window.alert() — a transient toast instead of a blocking dialog. */
export function showToast(message: string, kind: ToastKind = 'info') {
  useToastStore.getState().show(message, kind);
}
