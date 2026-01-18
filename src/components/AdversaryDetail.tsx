
import React, { useEffect, useRef } from 'react';
import type { Adversary } from '../types';
import { trapFocus } from '../utils/focusTrap';
import { calculateScaledStats, calculateStatAdjustments } from '../utils/scalingUtils';
import type { ToastType } from '../hooks/useToast';
import { formatDiceRoll, rollD20WithModifier, rollDiceExpression, wrapDiceExpressions } from '../utils/diceRoller';

interface Props {
    adversary: Adversary | null;
    onClose: () => void;
    isEncounterBuilderActive?: boolean;
    onAddToEncounter?: () => void;
    sideBySideMode?: boolean;
    upscaling?: number; // optional upscaling value to show scaled stats and adjustments
    showToast: (message: string, type?: ToastType, duration?: number) => string;
}

export const AdversaryDetail: React.FC<Props> = ({ adversary, onClose, isEncounterBuilderActive = false, onAddToEncounter, sideBySideMode = false, upscaling = 0, showToast }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

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

    // Side-by-side mode layout
    if (sideBySideMode) {
        return (
            <div
                ref={modalRef}
                className="relative bg-dagger-panel flex-[2] h-full max-h-[90vh] overflow-hidden rounded-2xl border border-dagger-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="adversary-detail-title"
            >
                {/* Header */}
                <div className="relative p-6 border-b border-dagger-gold/20 bg-gradient-to-r from-dagger-surface to-dagger-panel">
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Close adversary details"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pr-8">
                        <div>
                            <h2 id="adversary-detail-title" className="text-3xl md:text-4xl font-serif font-black text-dagger-gold tracking-tight uppercase drop-shadow-md">
                                {adversary.name}
                            </h2>
                            <div className="flex items-center gap-3 mt-2 text-sm md:text-base text-gray-400 font-medium">
                                <span className="bg-dagger-gold/10 text-dagger-gold px-2 py-0.5 rounded border border-dagger-gold/20 uppercase tracking-wider text-xs font-bold">
                                    Tier {adversary.tier}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="uppercase tracking-wider text-xs font-bold text-gray-300">{adversary.role}</span>
                                <span className="text-gray-500">•</span>
                                <span className="italic text-gray-500">{adversary.category} / {adversary.biome}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {renderContent(adversary, upscaling, showToast)}
                </div>

                {/* Footer Actions - hidden in side-by-side mode as customize panel replaces it */}
            </div>
        );
    }

    // Original centered modal layout
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-dagger-dark/90 backdrop-blur-sm transition-opacity"></div>

            {/* Modal */}
            <div
                ref={modalRef}
                className="relative bg-dagger-panel w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-dagger-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-fade-in-zoom"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="adversary-detail-title"
            >
                {/* Header */}
                <div className="relative p-6 border-b border-dagger-gold/20 bg-gradient-to-r from-dagger-surface to-dagger-panel">
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Close adversary details"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pr-8">
                        <div>
                            <h2 id="adversary-detail-title" className="text-3xl md:text-4xl font-serif font-black text-dagger-gold tracking-tight uppercase drop-shadow-md">
                                {adversary.name}
                            </h2>
                            <div className="flex items-center gap-3 mt-2 text-sm md:text-base text-gray-400 font-medium">
                                <span className="bg-dagger-gold/10 text-dagger-gold px-2 py-0.5 rounded border border-dagger-gold/20 uppercase tracking-wider text-xs font-bold">
                                    Tier {adversary.tier}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span className="uppercase tracking-wider text-xs font-bold text-gray-300">{adversary.role}</span>
                                <span className="text-gray-500">•</span>
                                <span className="italic text-gray-500">{adversary.category} / {adversary.biome}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {renderContent(adversary, upscaling, showToast)}
                </div>

                {/* Footer Actions */}
                {isEncounterBuilderActive && onAddToEncounter && (
                    <div className="p-6 border-t border-dagger-gold/20 bg-dagger-surface flex justify-end">
                        <button
                            onClick={onAddToEncounter}
                            className="px-6 py-2 bg-dagger-gold text-dagger-dark font-serif font-bold tracking-widest uppercase rounded hover:bg-dagger-gold-light transition-colors"
                        >
                            Add to Encounter
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Extract content rendering to avoid duplication
const renderContent = (adversary: Adversary, upscaling: number = 0, showToast: (message: string, type?: ToastType, duration?: number) => string) => {
    const scaledStats = upscaling !== 0 ? calculateScaledStats(adversary, upscaling) : adversary.stats;
    const adjustments = upscaling !== 0 ? calculateStatAdjustments(adversary.stats, scaledStats) : null;
    const displayStats = upscaling !== 0 ? scaledStats : adversary.stats;
    const signedModifier = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

    const handleAttackRoll = (event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        const result = rollD20WithModifier(displayStats.attack_mod);
        showToast(`Attack ${signedModifier(displayStats.attack_mod)}: ${formatDiceRoll(result)}`, 'info', 6000);
    };

    const handleDamageRoll = (event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        const result = rollDiceExpression(displayStats.damage_dice);
        if (!result) {
            showToast(`Invalid damage dice: ${displayStats.damage_dice}`, 'error');
            return;
        }
        showToast(`Damage ${displayStats.damage_dice}: ${formatDiceRoll(result)}`, 'info', 6000);
    };

    const handleDescriptionClick = (event: React.MouseEvent) => {
        const target = (event.target as HTMLElement).closest('[data-dice]') as HTMLElement | null;
        if (!target) return;
        const expression = target.dataset.dice;
        if (!expression) return;
        const result = rollDiceExpression(expression);
        if (!result) {
            showToast(`Invalid dice: ${expression}`, 'error');
            return;
        }
        showToast(`Roll ${expression}: ${formatDiceRoll(result)}`, 'info', 6000);
    };

    const formatDescriptionHtml = (description: string) => {
        const normalized = description.replace(/\n\n+/g, '\n\n');
        return wrapDiceExpressions(normalized).replace(/\n/g, '<br/>');
    };

    return (
    <>
        {/* Primary Stats Row */}
        <div className={`grid ${displayStats.threshold_major !== null && displayStats.threshold_severe !== null ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'} gap-4`}>
            <StatBox 
                label="Difficulty" 
                value={displayStats.difficulty} 
                color="text-white"
                adjustment={adjustments?.difficulty}
            />
            {displayStats.threshold_major !== null && displayStats.threshold_severe !== null && (
                <StatBox 
                    label="Major / Severe" 
                    value={`${displayStats.threshold_major} / ${displayStats.threshold_severe}`} 
                    color="text-yellow-100"
                    adjustment={adjustments && adjustments.threshold_major !== null && adjustments.threshold_severe !== null 
                        ? `${adjustments.threshold_major > 0 ? '+' : ''}${adjustments.threshold_major} / ${adjustments.threshold_severe > 0 ? '+' : ''}${adjustments.threshold_severe}`
                        : undefined}
                />
            )}
            <StatBox 
                label="HP" 
                value={displayStats.hp} 
                color="text-green-400"
                adjustment={adjustments?.hp}
            />
            <StatBox 
                label="Stress" 
                value={displayStats.stress} 
                color="text-purple-400"
                adjustment={adjustments?.stress}
            />
        </div>

        {/* Motives & Tactics Section */}
        {adversary.motives_tactics && (
            <div className="bg-black/20 rounded-xl border border-white/5 p-5 relative overflow-hidden group hover:border-dagger-gold/30 transition-colors">
                <div className="absolute top-0 left-0 w-1 h-full bg-dagger-gold/50"></div>
                <h3 className="text-xs uppercase tracking-widest text-dagger-gold font-bold mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Motives & Tactics
                </h3>
                <p className="text-gray-200 leading-relaxed font-serif">{adversary.motives_tactics}</p>
            </div>
        )}

        {/* Experiences Section */}
        {adversary.experiences && adversary.experiences.length > 0 && (
            <div className="bg-black/20 rounded-xl border border-white/5 p-5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50"></div>
                <h3 className="text-xs uppercase tracking-widest text-purple-400 font-bold mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    Experiences
                </h3>
                <div className="flex flex-wrap gap-3">
                    {adversary.experiences.map((exp, idx) => (
                        <div key={idx} className="bg-purple-900/20 border border-purple-500/30 px-3 py-1.5 rounded-md flex items-center gap-2">
                            <span className="text-purple-300 font-bold text-sm">{exp.name}</span>
                            <span className="text-purple-400 font-mono font-bold">+{exp.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Attack Section */}
        <div className="bg-black/20 rounded-xl border border-white/5 p-5 relative overflow-hidden group hover:border-red-500/30 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
            <h3 className="text-xs uppercase tracking-widest text-red-400 font-bold mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Attack
            </h3>
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                <div className="flex flex-col">
                    <span className="text-sm text-gray-500 uppercase font-bold">Modifier</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleAttackRoll}
                            className="text-2xl font-mono font-bold text-red-200 underline decoration-dotted underline-offset-4 hover:text-dagger-gold cursor-pointer"
                            aria-label={`Roll attack ${signedModifier(displayStats.attack_mod)}`}
                            title={`Roll attack ${signedModifier(displayStats.attack_mod)}`}
                        >
                            {signedModifier(displayStats.attack_mod)}
                        </button>
                        {adjustments && adjustments.attack_mod !== 0 && (
                            <span className={`text-sm font-bold ${adjustments.attack_mod > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ({adjustments.attack_mod > 0 ? '+' : ''}{adjustments.attack_mod})
                            </span>
                        )}
                    </div>
                </div>
                <div className="w-px h-10 bg-white/10 hidden md:block"></div>
                <div className="flex flex-col">
                    <span className="text-sm text-gray-500 uppercase font-bold">Standard Damage</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDamageRoll}
                            className="text-xl font-serif text-gray-200 underline decoration-dotted underline-offset-4 hover:text-dagger-gold cursor-pointer"
                            aria-label={`Roll damage ${displayStats.damage_dice}`}
                            title={`Roll damage ${displayStats.damage_dice}`}
                        >
                            {displayStats.damage_dice}{' '}
                            <span className="text-sm text-gray-500 font-sans font-normal">(Physical)</span>
                        </button>
                        {adjustments && adjustments.damage_dice_changed && adversary.stats.damage_dice !== displayStats.damage_dice && (
                            <span className="text-xs text-dagger-gold">
                                (was {adversary.stats.damage_dice})
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Features Section */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-dagger-gold uppercase tracking-widest border-b border-dagger-gold/20 pb-2">
                Features & Traits
            </h3>

            {adversary.features.length > 0 ? (
                <div className="grid gap-4">
                    {adversary.features.map((feat, idx) => (
                        <div key={idx} className="bg-dagger-surface p-4 rounded-lg border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                {/* Subtle icon based on type could go here */}
                            </div>
                            <div className="font-bold text-lg text-dagger-gold font-serif mb-3 border-b border-white/10 pb-2 tracking-wide flex items-center gap-2">
                                {feat.name === 'Actions' && (
                                    <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                )}
                                {feat.name === 'Traits' && (
                                    <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                )}
                                {feat.name}
                            </div>
                            <div className="space-y-3">
                                {feat.entries ? (
                                    feat.entries.map((entry, entryIdx) => (
                                        <div key={entryIdx} className="text-sm leading-relaxed text-gray-300">
                                            {entry.name && (
                                                <span className="font-bold text-dagger-light mr-1.5 font-serif tracking-wide">{entry.name}.</span>
                                            )}
                                            <div 
                                                className="whitespace-pre-line spell-description"
                                                onClick={handleDescriptionClick}
                                                dangerouslySetInnerHTML={{ 
                                                    __html: formatDescriptionHtml(entry.description)
                                                }} 
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm leading-relaxed text-gray-300">
                                        <div 
                                            className="whitespace-pre-line spell-description"
                                            onClick={handleDescriptionClick}
                                            dangerouslySetInnerHTML={{ __html: formatDescriptionHtml((feat as any).description || '') }} 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 italic">No special features listed for this adversary.</p>
            )}
        </div>

        {/* Footer Info */}
        <div className="pt-6 mt-6 border-t border-white/5 text-xs text-gray-600 flex justify-between items-center">
            <span>Source: {adversary.source}</span>
            <span>Original 5e CR: {adversary.original_cr}</span>
        </div>
    </>
    );
};

const StatBox = ({ 
    label, 
    value, 
    color, 
    adjustment 
}: { 
    label: string, 
    value: string | number, 
    color: string,
    adjustment?: number | string | null
}) => (
    <div className="bg-dagger-surface p-3 rounded-lg border border-white/5 flex flex-col items-center justify-center shadow-inner min-h-[90px]">
        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">{label}</div>
        <div className={`text-2xl md:text-3xl font-black font-mono ${color} drop-shadow-sm`}>{value}</div>
        {adjustment !== undefined && adjustment !== null && adjustment !== 0 && adjustment !== '0 / 0' && adjustment !== '0/0' && (
            <div className={`text-xs font-bold mt-1 ${typeof adjustment === 'string' || (typeof adjustment === 'number' && adjustment > 0) ? 'text-green-400' : 'text-red-400'}`}>
                {typeof adjustment === 'string' ? adjustment : (adjustment > 0 ? '+' : '') + adjustment}
            </div>
        )}
    </div>
);
