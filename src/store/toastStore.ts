import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastStore {
  toast: Toast | null;
  show: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set, get) => ({
  toast: null,
  show: (message, kind = 'info') => {
    const id = nextId++;
    set({ toast: { id, message, kind } });
  },
  dismiss: (id) => {
    if (get().toast?.id === id) set({ toast: null });
  },
}));

/** Themed replacement for window.alert() — a transient toast instead of a blocking dialog. */
export function showToast(message: string, kind: ToastKind = 'info') {
  useToastStore.getState().show(message, kind);
}
