import { createContext, useContext } from 'react';

export interface ToastOptions {
  tone?: 'error';
  duration?: number;
  action?: { label: string; run: () => void };
}

export interface Toast extends ToastOptions {
  id: number;
  message: string;
}

export type ShowToast = (message: string, options?: ToastOptions) => void;

export const ToastContext = createContext<ShowToast>(() => {});

/** Show a short message at the bottom of the screen. Rendered by <Toaster>. */
export const useToast = () => useContext(ToastContext);
