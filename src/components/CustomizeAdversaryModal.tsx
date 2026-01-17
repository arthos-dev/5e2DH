import React, { useState, useEffect, useRef } from 'react';
import type { Adversary } from '../types';
import { trapFocus } from '../utils/focusTrap';

interface Props {
    adversary: Adversary | null;
    onClose: () => void;
    onAdd: (quantity: number, upscaling: number, customName: string) => void;
    sideBySideMode?: boolean;
    upscaling?: number;
    onUpscalingChange?: (value: number) => void;
}

export const CustomizeAdversaryModal: React.FC<Props> = ({ adversary, onClose, onAdd, sideBySideMode = false, upscaling = 0, onUpscalingChange }) => {
    const [quantity, setQuantity] = useState(1);
    const [customName, setCustomName] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (adversary) {
            setCustomName(adversary.name);
        }
    }, [adversary]);

    useEffect(() => {
        if (!adversary || !modalRef.current) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        // Trap focus within modal
        const cleanup = trapFocus(modalRef.current);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            cleanup();
        };
    }, [adversary, onClose]);

    if (!adversary) return null;

    // Calculate dynamic upscaling limits based on adversary tier
    const maxUpscaling = Math.max(0, 4 - adversary.tier);
    const minDownscaling = Math.min(0, 1 - adversary.tier);

    const handleAdd = () => {
        onAdd(quantity, upscaling, customName);
        onClose();
    };

    // Side-by-side mode layout
    if (sideBySideMode) {
        return (
            <div
                ref={modalRef}
                className="relative bg-dagger-panel flex-[1] h-full max-h-[90vh] overflow-hidden rounded-2xl border border-dagger-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="customize-modal-title"
            >
                {/* Header */}
                <div className="relative p-6 border-b border-dagger-gold/20 bg-gradient-to-r from-dagger-surface to-dagger-panel rounded-t-2xl">
                    <h3 id="customize-modal-title" className="text-lg font-serif font-bold text-dagger-gold uppercase tracking-widest">
                        CUSTOMIZE ADVERSARY
                    </h3>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 bg-dagger-panel overflow-y-auto custom-scrollbar flex-1">
                    {/* Quantity */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                            Quantity:
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-9 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 h-9 text-center bg-dagger-dark border border-dagger-gold/20 rounded text-dagger-light font-serif font-bold focus:outline-none focus:border-dagger-gold/60 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-9 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Upscaling */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                            Upscaling:
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => onUpscalingChange && onUpscalingChange(Math.max(minDownscaling, upscaling - 1))}
                                className="w-9 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <input
                                type="number"
                                min={minDownscaling}
                                max={maxUpscaling}
                                value={upscaling}
                                onChange={(e) => onUpscalingChange && onUpscalingChange(Math.max(minDownscaling, Math.min(maxUpscaling, parseInt(e.target.value) || 0)))}
                                className="w-16 h-9 text-center bg-dagger-dark border border-dagger-gold/20 rounded text-dagger-light font-serif font-bold focus:outline-none focus:border-dagger-gold/60 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => onUpscalingChange && onUpscalingChange(Math.min(maxUpscaling, upscaling + 1))}
                                className="w-9 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Custom Name */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                            Adversary Name:
                        </label>
                        <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="w-full h-9 px-3 bg-dagger-dark border border-dagger-gold/20 rounded text-dagger-light placeholder-dagger-light-dim focus:outline-none focus:border-dagger-gold/60 transition-colors"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-dagger-gold/20 bg-dagger-surface rounded-b-2xl flex gap-3 justify-end">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 text-dagger-gold font-serif font-bold tracking-widest uppercase hover:text-white border border-dagger-gold/30 hover:border-dagger-gold rounded transition-colors"
                    >
                        CANCEL
                    </button>
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="px-6 py-2 bg-dagger-gold text-dagger-dark font-serif font-bold tracking-widest uppercase rounded hover:bg-dagger-gold-light transition-colors"
                    >
                        ADD
                    </button>
                </div>
            </div>
        );
    }

    // Original centered modal layout
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-dagger-dark/90 backdrop-blur-sm transition-opacity"></div>

            {/* Modal */}
            <div
                ref={modalRef}
                className="relative bg-dagger-panel w-full max-w-md rounded-2xl border border-dagger-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-fade-in-zoom"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="customize-modal-title"
            >
                {/* Header */}
                <div className="relative p-6 border-b border-dagger-gold/20 bg-gradient-to-r from-dagger-surface to-dagger-panel rounded-t-2xl">
                    <h3 id="customize-modal-title" className="text-lg font-serif font-bold text-dagger-gold uppercase tracking-widest">
                        CUSTOMIZE ADVERSARY
                    </h3>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 bg-dagger-panel">
                    {/* Quantity */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                            Quantity:
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-9 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 h-9 text-center bg-dagger-dark border border-dagger-gold/20 rounded text-dagger-light font-serif font-bold focus:outline-none focus:border-dagger-gold/60 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-9 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Upscaling */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                            Upscaling:
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => onUpscalingChange && onUpscalingChange(Math.max(minDownscaling, upscaling - 1))}
                                className="w-9 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <input
                                type="number"
                                min={minDownscaling}
                                max={maxUpscaling}
                                value={upscaling}
                                onChange={(e) => onUpscalingChange && onUpscalingChange(Math.max(minDownscaling, Math.min(maxUpscaling, parseInt(e.target.value) || 0)))}
                                className="w-16 h-9 text-center bg-dagger-dark border border-dagger-gold/20 rounded text-dagger-light font-serif font-bold focus:outline-none focus:border-dagger-gold/60 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => onUpscalingChange && onUpscalingChange(Math.min(maxUpscaling, upscaling + 1))}
                                className="w-9 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Custom Name */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                            Adversary Name:
                        </label>
                        <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="w-full h-9 px-3 bg-dagger-dark border border-dagger-gold/20 rounded text-dagger-light placeholder-dagger-light-dim focus:outline-none focus:border-dagger-gold/60 transition-colors"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-dagger-gold/20 bg-dagger-surface rounded-b-2xl flex gap-3 justify-end">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 text-dagger-gold font-serif font-bold tracking-widest uppercase hover:text-white border border-dagger-gold/30 hover:border-dagger-gold rounded transition-colors"
                    >
                        CANCEL
                    </button>
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="px-6 py-2 bg-dagger-gold text-dagger-dark font-serif font-bold tracking-widest uppercase rounded hover:bg-dagger-gold-light transition-colors"
                    >
                        ADD
                    </button>
                </div>
            </div>
        </div>
    );
};
