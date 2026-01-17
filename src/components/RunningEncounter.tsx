import React, { useState } from 'react';
import type { RunningEncounter, EncounterInstance, Adversary } from '../types';
import { EncounterInstanceCard } from './EncounterInstanceCard';
import { updateInstanceHP, updateInstanceStress } from '../utils/runningEncounterUtils';

interface Props {
    runningEncounter: RunningEncounter;
    allAdversaries: Adversary[];
    onClose: () => void;
    onEditInstance?: (instanceId: string) => void;
}

export const RunningEncounterView: React.FC<Props> = ({
    runningEncounter,
    allAdversaries,
    onClose,
    onEditInstance,
}) => {
    const [instances, setInstances] = useState<EncounterInstance[]>(runningEncounter.instances);

    const handleUpdateHP = (instanceId: string, delta: number) => {
        setInstances(prev => updateInstanceHP(prev, instanceId, delta));
    };

    const handleUpdateStress = (instanceId: string, delta: number) => {
        setInstances(prev => updateInstanceStress(prev, instanceId, delta));
    };

    const getAdversaryForInstance = (instance: EncounterInstance): Adversary | null => {
        return allAdversaries.find(a => a.id === instance.adversaryId) || null;
    };

    return (
        <div className="min-h-screen bg-dagger-dark">
            {/* Header Navigation */}
            <div className="bg-dagger-panel border-b border-dagger-gold/20 sticky top-0 z-20 shadow-lg backdrop-blur-md bg-opacity-95">
                <div className="max-w-7xl mx-auto p-6">
                    <div className="flex items-center justify-between">
                        <div className="text-lg font-serif font-bold text-dagger-gold uppercase tracking-widest">
                            {runningEncounter.name}
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-serif font-bold tracking-widest uppercase text-dagger-gold hover:text-white border border-dagger-gold/30 hover:border-dagger-gold rounded transition-colors"
                            >
                                MANAGE
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-serif font-bold tracking-widest uppercase bg-dagger-gold/20 text-dagger-gold border border-dagger-gold/50 rounded hover:bg-dagger-gold/30 transition-colors"
                            >
                                EDIT ENCOUNTER
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Encounter Cards */}
            <div className="p-6">
                <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                    {instances.map(instance => {
                        const adversary = getAdversaryForInstance(instance);
                        if (!adversary) return null;

                        return (
                            <EncounterInstanceCard
                                key={instance.instanceId}
                                instance={instance}
                                adversary={adversary}
                                onUpdateHP={handleUpdateHP}
                                onUpdateStress={handleUpdateStress}
                                onEdit={onEditInstance}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
