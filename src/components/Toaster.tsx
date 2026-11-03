import { useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ToastContext, type Toast, type ToastOptions } from '../hooks/useToast';

let nextId = 1;

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = nextId++;
      setToasts((all) => [...all.slice(-2), { id, message, ...options }]);
      setTimeout(() => dismiss(id), options.duration ?? (options.action ? 6000 : 4000));
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1000000] flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom)]">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-lg border bg-panel px-3.5 py-2 text-sm shadow-lg ${t.tone === 'error' ? 'border-danger text-danger' : 'border-line text-fg'}`}
            >
              <span className="tabular-nums">{t.message}</span>
              {t.action && (
                <button
                  className="font-medium text-accent-text"
                  onClick={() => {
                    t.action!.run();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
