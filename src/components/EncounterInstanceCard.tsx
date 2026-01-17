import React from 'react';
import type { EncounterInstance, Adversary } from '../types';
import { calculateScaledStats, getEffectiveTier, calculateStatAdjustments } from '../utils/scalingUtils';
import { HPStressTracker } from './HPStressTracker';

interface Props {
    instance: EncounterInstance;
    adversary: Adversary;
    onUpdateHP: (instanceId: string, delta: number) => void;
    onUpdateStress: (instanceId: string, delta: number) => void;
    onEdit?: (instanceId: string) => void;
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

export const EncounterInstanceCard: React.FC<Props> = ({
    instance,
    adversary,
    onUpdateHP,
    onUpdateStress,
    onEdit,
}) => {
    const displayName = instance.customName || adversary.name;
    const scaledStats = calculateScaledStats(adversary, instance.upscaling);
    const effectiveTier = getEffectiveTier(adversary.tier, instance.upscaling);
    const adjustments = instance.upscaling !== 0 ? calculateStatAdjustments(adversary.stats, scaledStats) : null;

    return (
        <div className="bg-dagger-panel border border-dagger-gold/20 rounded-lg p-4 flex flex-col h-full min-w-[300px] max-w-[400px]">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="font-serif font-bold text-lg text-dagger-gold uppercase tracking-wide mb-1">
                        {displayName}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-300">
                            Difficulty: {scaledStats.difficulty}
                            {adjustments && adjustments.difficulty !== 0 && (
                                <span className={`text-xs font-bold ml-1 ${adjustments.difficulty > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({adjustments.difficulty > 0 ? '+' : ''}{adjustments.difficulty})
                                </span>
                            )}
                            {instance.upscaling !== 0 && (
                                <span className="text-xs text-dagger-gold ml-1">
                                    (T{effectiveTier}{adversary.tier !== effectiveTier ? ` from T${adversary.tier}` : ''})
                                </span>
                            )}
                        </span>
                        <RoleBadge role={adversary.role} />
                    </div>
                </div>
                {onEdit && (
                    <button
                        onClick={() => onEdit(instance.instanceId)}
                        className="px-3 py-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-600/30 rounded uppercase tracking-wider font-bold transition-colors"
                    >
                        EDIT
                    </button>
                )}
            </div>

            {/* Attack Info */}
            <div className="mb-3 text-sm">
                <span className="text-gray-400">Attack: </span>
                <span className="text-gray-200 font-mono">+{scaledStats.attack_mod}</span>
                {adjustments && adjustments.attack_mod !== 0 && (
                    <span className={`text-xs font-bold ml-1 ${adjustments.attack_mod > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ({adjustments.attack_mod > 0 ? '+' : ''}{adjustments.attack_mod})
                    </span>
                )}
                {scaledStats.damage_dice && (
                    <>
                        <span className="text-gray-500 mx-1">•</span>
                        <span className="text-gray-200">{scaledStats.damage_dice}</span>
                        {adjustments && adjustments.damage_dice_changed && adversary.stats.damage_dice !== scaledStats.damage_dice && (
                            <span className="text-xs text-dagger-gold ml-1">
                                (was {adversary.stats.damage_dice})
                            </span>
                        )}
                    </>
                )}
            </div>

            {/* Experiences */}
            {adversary.experiences && adversary.experiences.length > 0 && (
                <div className="mb-3 text-sm">
                    <span className="text-gray-400">Experience: </span>
                    {adversary.experiences.map((exp, idx) => (
                        <span key={idx} className="text-gray-200">
                            {exp.name} +{exp.value}
                            {idx < adversary.experiences!.length - 1 && ', '}
                        </span>
                    ))}
                </div>
            )}

            {/* Motives & Tactics */}
            {adversary.motives_tactics && (
                <div className="mb-3 text-xs text-gray-300 italic">
                    <span className="text-gray-400 font-bold">Motives & Tactics: </span>
                    {adversary.motives_tactics}
                </div>
            )}

            {/* Features */}
            <div className="mb-4 flex-1 overflow-y-auto custom-scrollbar">
                {adversary.features.map((feat, idx) => (
                    <div key={idx} className="mb-2 text-xs">
                        <div className="font-bold text-dagger-gold mb-1">{feat.name}</div>
                        {feat.entries && feat.entries.map((entry, entryIdx) => (
                            <div key={entryIdx} className="text-gray-300 mb-1 pl-2">
                                <span className="font-semibold text-dagger-light">{entry.name}: </span>
                                <span dangerouslySetInnerHTML={{ __html: entry.description.replace(/\n/g, '<br/>') }} />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* HP & Stress Section */}
            <div className="border-t border-dagger-gold/20 pt-3">
                <HPStressTracker
                    currentHP={instance.currentHP}
                    maxHP={instance.maxHP}
                    currentStress={instance.currentStress}
                    maxStress={instance.maxStress}
                    thresholdMajor={instance.thresholdMajor}
                    thresholdSevere={instance.thresholdSevere}
                    hpThreshold={instance.hpThreshold}
                    onUpdateHP={(delta) => onUpdateHP(instance.instanceId, delta)}
                    onUpdateStress={(delta) => onUpdateStress(instance.instanceId, delta)}
                />
            </div>
        </div>
    );
};
