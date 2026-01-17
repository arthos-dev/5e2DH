import React, { useEffect, useRef } from 'react';
import { trapFocus } from '../utils/focusTrap';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Trap focus within dialog
    const cleanup = trapFocus(dialogRef.current);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      cleanup();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmButtonClasses = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    info: 'bg-dagger-gold hover:bg-dagger-gold-light text-dagger-dark',
  }[type];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"></div>

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative bg-dagger-panel w-full max-w-md rounded-2xl border border-dagger-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-fade-in-zoom"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        {/* Header */}
        <div className="p-6 border-b border-dagger-gold/20">
          <h3 id="confirm-dialog-title" className="text-lg font-serif font-bold text-dagger-gold uppercase tracking-widest">
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <p id="confirm-dialog-message" className="text-gray-200 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-dagger-gold/20 bg-dagger-surface rounded-b-2xl flex gap-3 justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-dagger-gold font-serif font-bold tracking-widest uppercase hover:text-white border border-dagger-gold/30 hover:border-dagger-gold rounded transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={`px-6 py-2 font-serif font-bold tracking-widest uppercase rounded transition-colors ${confirmButtonClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
