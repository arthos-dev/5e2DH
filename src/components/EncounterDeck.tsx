import React, { useState } from 'react';
import type { Encounter, Adversary } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { calculateAvailableBattlePoints, calculateSpentBattlePoints, getDifficultyLevel } from '../utils/encounterUtils';
import { calculateScaledStats } from '../utils/scalingUtils';

interface Props {
    encounter: Encounter;
    allAdversaries: Adversary[];
    onClose: () => void;
    onUpdateEncounterName: (name: string) => void;
    onUpdatePlayerCount: (count: number) => void;
    onDeleteAdversary: (id: string) => void;
    onEditAdversary?: (id: string) => void;
    onSaveEncounter?: () => void;
    onRunEncounter?: () => void;
    savedEncounters?: Encounter[];
    onLoadEncounter?: (id: string) => void;
    onDeleteSavedEncounter?: (id: string) => void;
    onShareEncounter?: () => void;
}

const roleStyles: Record<string, string> = {
    STANDARD: 'border-slate-500 bg-slate-900/50 text-slate-300',
    BRUISER: 'border-blue-900 bg-blue-900/20 text-blue-200',
    HORDE: 'border-red-900 bg-red-900/20 text-red-200',
    LEADER: 'border-purple-900 bg-purple-900/20 text-purple-200',
    RANGED: 'border-green-900 bg-green-900/20 text-green-200',
    SKULK: 'border-yellow-900 bg-yellow-900/20 text-yellow-200',
    MINION: 'border-gray-600 bg-gray-800 text-gray-300',
    SUPPORT: 'border-cyan-900 bg-cyan-900/20 text-cyan-200',
    SOCIAL: 'border-pink-900 bg-pink-900/20 text-pink-200',
    SOLO: 'border-gray-600 bg-gray-800 text-gray-300',
    LEGENDARY: 'border-dagger-gold bg-dagger-gold/10 text-dagger-gold',
};

const RoleBadge = ({ role }: { role: string }) => {
    const style = roleStyles[role] || roleStyles.STANDARD;
    const dotColor = style.includes('text-slate') ? 'bg-slate-500' :
        style.includes('text-blue') ? 'bg-blue-400' :
            style.includes('text-red') ? 'bg-red-400' :
                style.includes('text-purple') ? 'bg-purple-400' :
                    style.includes('text-green') ? 'bg-green-400' :
                        style.includes('text-yellow') ? 'bg-yellow-400' :
                            style.includes('text-gray') ? 'bg-gray-400' :
                                style.includes('text-cyan') ? 'bg-cyan-400' :
                                    style.includes('text-pink') ? 'bg-pink-400' :
                                        style.includes('text-dagger-gold') ? 'bg-dagger-gold' : 'bg-gray-400';

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 border ${style.split(' ')[0]} ${style.split(' ')[2]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-[0_0_5px_currentColor]`}></span>
            {role}
        </span>
    );
};

export const EncounterDeck: React.FC<Props> = ({
    encounter,
    allAdversaries,
    onClose,
    onUpdateEncounterName,
    onUpdatePlayerCount,
    onDeleteAdversary,
    onEditAdversary,
    onSaveEncounter,
    onRunEncounter,
    savedEncounters = [],
    onLoadEncounter,
    onDeleteSavedEncounter,
    onShareEncounter,
}) => {
    const [showSavedEncounters, setShowSavedEncounters] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'deleteEncounter' | 'deleteAdversary';
        id?: string;
        name?: string;
    }>({ isOpen: false, type: 'deleteAdversary' });
    const availableBP = calculateAvailableBattlePoints(encounter.playerCount, encounter.battlePointModifier);
    const spentBP = calculateSpentBattlePoints(encounter.adversaries, allAdversaries);
    const difficultyLevel = getDifficultyLevel(spentBP, availableBP);

    const handleDeleteAdversaryClick = (id: string) => {
        const encAdv = encounter.adversaries.find(a => a.id === id);
        const adv = allAdversaries.find(a => a.id === encAdv?.adversaryId);
        const name = encAdv?.customName || adv?.name || 'this adversary';
        setConfirmDialog({
            isOpen: true,
            type: 'deleteAdversary',
            id,
            name,
        });
    };

    const handleDeleteSavedEncounterClick = (id: string) => {
        const saved = savedEncounters.find(e => e.savedEncounterId === id);
        setConfirmDialog({
            isOpen: true,
            type: 'deleteEncounter',
            id,
            name: saved?.name,
        });
    };

    const handleConfirm = () => {
        if (confirmDialog.type === 'deleteAdversary' && confirmDialog.id) {
            onDeleteAdversary(confirmDialog.id);
        } else if (confirmDialog.type === 'deleteEncounter' && confirmDialog.id && onDeleteSavedEncounter) {
            onDeleteSavedEncounter(confirmDialog.id);
        }
        setConfirmDialog({ isOpen: false, type: 'deleteAdversary' });
    };

    return (
        <div className="fixed right-0 top-0 h-full w-80 max-md:w-full max-md:max-h-[90vh] max-md:top-auto max-md:bottom-0 max-md:rounded-t-2xl max-md:border-l-0 max-md:border-t bg-dagger-panel border-l border-dagger-gold/20 shadow-xl z-40 flex flex-col transition-transform max-md:duration-300">
            {/* Header */}
            <div className="p-4 border-b border-dagger-gold/20 bg-dagger-surface flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold text-dagger-gold uppercase tracking-wide">
                    ENCOUNTER DECK
                </h2>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {/* Saved Encounters Section */}
                {savedEncounters.length > 0 && (
                    <div className="mb-4">
                        <button
                            onClick={() => setShowSavedEncounters(!showSavedEncounters)}
                            className="w-full flex items-center justify-between p-2 bg-dagger-surface border border-dagger-gold/20 rounded text-sm text-dagger-gold hover:bg-dagger-gold/10 transition-colors"
                        >
                            <span className="font-bold uppercase tracking-wider">Saved Encounters ({savedEncounters.length})</span>
                            <svg
                                className={`w-4 h-4 transition-transform ${showSavedEncounters ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showSavedEncounters && (
                            <div className="mt-2 space-y-2">
                                {savedEncounters.map((saved) => (
                                    <div
                                        key={saved.savedEncounterId}
                                        className="bg-dagger-dark border border-dagger-gold/20 rounded p-2 flex items-center justify-between"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-dagger-light truncate">{saved.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {saved.adversaries.length} adversary{saved.adversaries.length !== 1 ? 'ies' : ''}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                            {onLoadEncounter && (
                                                <button
                                                    onClick={() => onLoadEncounter(saved.savedEncounterId!)}
                                                    className="w-6 h-6 flex items-center justify-center rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors"
                                                    title="Load"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                </button>
                                            )}
                                            {onDeleteSavedEncounter && (
                                        <button
                                            onClick={() => handleDeleteSavedEncounterClick(saved.savedEncounterId!)}
                                            className="w-6 h-6 flex items-center justify-center rounded bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-colors"
                                            title="Delete"
                                        >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Current Encounter Adversaries */}
                {encounter.adversaries.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-sm">No adversaries added yet</p>
                        <p className="text-xs mt-2">Browse and select adversaries to add to your encounter</p>
                    </div>
                ) : (
                    encounter.adversaries.map((encAdv) => {
                        const baseAdv = allAdversaries.find(a => a.id === encAdv.adversaryId);
                        if (!baseAdv) return null;

                        const displayName = encAdv.customName || baseAdv.name;
                        const effectiveTier = Math.max(1, Math.min(4, baseAdv.tier + encAdv.upscaling));
                        const scaledStats = calculateScaledStats(baseAdv, encAdv.upscaling);

                        return (
                            <div
                                key={encAdv.id}
                                className="bg-dagger-surface border border-dagger-gold/20 rounded-lg p-3 hover:border-dagger-gold/40 transition-colors"
                            >
                                <div className="flex items-start gap-2 mb-2">
                                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-dagger-gold/20 text-dagger-gold text-xs font-bold rounded-full border border-dagger-gold/30">
                                        x{encAdv.quantity}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-serif font-bold text-sm text-dagger-light truncate">
                                            {displayName}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-6 h-6 flex items-center justify-center bg-dagger-dark border border-dagger-gold text-dagger-gold font-serif font-bold rounded text-xs" title="Tier">
                                                {effectiveTier}
                                            </div>
                                            <RoleBadge role={baseAdv.role} />
                                        </div>
                                        {encAdv.upscaling !== 0 && (
                                            <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                                                <div className="flex gap-3">
                                                    <span>Diff: <span className="text-dagger-light font-mono">{scaledStats.difficulty}</span></span>
                                                    <span>HP: <span className="text-green-400 font-mono">{scaledStats.hp}</span></span>
                                                    <span>Atk: <span className="text-red-400 font-mono">+{scaledStats.attack_mod}</span></span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        {onEditAdversary && (
                                            <button
                                                onClick={() => onEditAdversary(encAdv.id)}
                                                className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteAdversaryClick(encAdv.id)}
                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-colors"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Section */}
            <div className="p-4 border-t border-dagger-gold/20 bg-dagger-surface space-y-4">
                {/* Encounter Name */}
                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                        Encounter Name
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={encounter.name}
                            onChange={(e) => onUpdateEncounterName(e.target.value)}
                            className="flex-1 h-9 px-3 bg-dagger-dark border border-dagger-gold/20 rounded text-gray-200 focus:outline-none focus:border-dagger-gold/60 transition-colors"
                            placeholder="Enter encounter name"
                        />
                        <button
                            onClick={onShareEncounter}
                            className="w-9 h-9 flex items-center justify-center rounded bg-dagger-dark border border-dagger-gold/20 text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                            title="Share Encounter"
                            disabled={!onShareEncounter}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* # of players */}
                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                        # of players
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onUpdatePlayerCount(Math.max(1, encounter.playerCount - 1))}
                            className="w-9 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <div className="flex-1 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-dagger-gold font-serif font-bold text-lg">
                            {encounter.playerCount}
                        </div>
                        <button
                            type="button"
                            onClick={() => onUpdatePlayerCount(encounter.playerCount + 1)}
                            className="w-9 h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Difficulty */}
                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                        Difficulty
                    </label>
                    <div className="h-9 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-200 font-mono font-bold">
                        {spentBP} / {availableBP} ({difficultyLevel})
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                    {onSaveEncounter && (
                        <button
                            onClick={onSaveEncounter}
                            className="w-full h-9 px-4 bg-dagger-gold/20 text-dagger-gold border border-dagger-gold/50 rounded hover:bg-dagger-gold/30 font-serif font-bold tracking-widest uppercase text-sm transition-colors"
                        >
                            Save Encounter
                        </button>
                    )}
                    {onRunEncounter && encounter.adversaries.length > 0 && (
                        <button
                            onClick={onRunEncounter}
                            className="w-full h-9 px-4 bg-dagger-gold text-dagger-dark border border-dagger-gold rounded hover:bg-dagger-gold-light font-serif font-bold tracking-widest uppercase text-sm transition-colors"
                        >
                            Run Encounter
                        </button>
                    )}
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={
                    confirmDialog.type === 'deleteEncounter'
                        ? 'Delete Encounter'
                        : 'Remove Adversary'
                }
                message={
                    confirmDialog.type === 'deleteEncounter'
                        ? `Are you sure you want to delete "${confirmDialog.name}"? This action cannot be undone.`
                        : `Are you sure you want to remove "${confirmDialog.name}" from this encounter?`
                }
                confirmLabel={confirmDialog.type === 'deleteEncounter' ? 'Delete' : 'Remove'}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmDialog({ isOpen: false, type: 'deleteAdversary' })}
                type="danger"
            />
        </div>
    );
};
