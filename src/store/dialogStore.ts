import { create } from 'zustand';

interface DialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogState extends DialogOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

interface DialogStore extends DialogState {
  request: (options: DialogOptions) => Promise<boolean>;
  settle: (value: boolean) => void;
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  open: false,
  title: '',
  message: undefined,
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
  resolve: null,
  request: (options) =>
    new Promise<boolean>((resolve) => {
      // If a dialog is already showing, resolve it as cancelled before replacing it.
      get().resolve?.(false);
      set({
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        danger: options.danger ?? false,
        resolve,
      });
    }),
  settle: (value) => {
    get().resolve?.(value);
    set({ open: false, resolve: null });
  },
}));

/** Themed replacement for window.confirm(). Resolves true if the user confirmed. */
export function confirmDialog(options: DialogOptions): Promise<boolean> {
  return useDialogStore.getState().request(options);
}
