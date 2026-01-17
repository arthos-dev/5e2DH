import React from 'react';

interface Props {
    isActive: boolean;
    onToggle: () => void;
}

export const EncounterBuilder: React.FC<Props> = ({ isActive, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className={`px-4 py-2 rounded border font-serif font-bold tracking-widest uppercase text-sm transition-all duration-300 ${
                isActive
                    ? 'bg-dagger-gold text-dagger-dark border-dagger-gold hover:bg-dagger-gold-light'
                    : 'bg-dagger-panel text-dagger-gold border-dagger-gold/30 hover:border-dagger-gold hover:bg-dagger-surface'
            }`}
            aria-label={isActive ? 'Exit encounter builder' : 'Open encounter builder'}
            aria-expanded={isActive}
        >
            {isActive ? 'Exit Builder' : 'Build Encounter'}
        </button>
    );
};
