import React from 'react';
import type { EncounterInstance, Adversary } from '../types';
import { calculateScaledStats, getEffectiveTier, calculateStatAdjustments } from '../utils/scalingUtils';

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
    const thresholdMajor = instance.thresholdMajor;
    const thresholdSevere = instance.thresholdSevere;
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
            <div className="border-t border-dagger-gold/20 pt-3 space-y-3">
                {/* HP Tracking */}
                <div>
                    <div className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">HP & Stress</div>
                    <div className="space-y-1 mb-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className={`font-bold ${instance.hpThreshold === 'minor' ? 'text-dagger-gold' : 'text-gray-500'}`}>
                                MINOR 1 HP
                            </span>
                        </div>
                        {thresholdMajor !== null && (
                            <div className="flex items-center justify-between text-xs">
                                <span className={`font-bold ${instance.hpThreshold === 'major' ? 'text-dagger-gold' : 'text-gray-500'}`}>
                                    MAJOR 2 HP ({thresholdMajor})
                                    {adjustments && adjustments.threshold_major !== null && adjustments.threshold_major !== 0 && (
                                        <span className={`ml-1 font-normal ${adjustments.threshold_major > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ({adjustments.threshold_major > 0 ? '+' : ''}{adjustments.threshold_major})
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                        {thresholdSevere !== null && (
                            <div className="flex items-center justify-between text-xs">
                                <span className={`font-bold ${instance.hpThreshold === 'severe' ? 'text-dagger-gold' : 'text-gray-500'}`}>
                                    SEVERE 3 HP ({thresholdSevere})
                                    {adjustments && adjustments.threshold_severe !== null && adjustments.threshold_severe !== 0 && (
                                        <span className={`ml-1 font-normal ${adjustments.threshold_severe > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ({adjustments.threshold_severe > 0 ? '+' : ''}{adjustments.threshold_severe})
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onUpdateHP(instance.instanceId, -1)}
                            className="w-8 h-8 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <div className="flex-1 text-center">
                            <span className="text-sm text-gray-400">HP: </span>
                            <span className="font-mono font-bold text-green-400">{instance.currentHP}</span>
                            {adjustments && adjustments.hp !== 0 && (
                                <span className={`text-xs font-bold ml-1 ${adjustments.hp > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({adjustments.hp > 0 ? '+' : ''}{adjustments.hp} from base {adversary.stats.hp})
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => onUpdateHP(instance.instanceId, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Stress Tracking */}
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Stress: </span>
                        <span className="font-mono font-bold text-purple-400">({instance.maxStress})</span>
                        {adjustments && adjustments.stress !== 0 && (
                            <span className={`text-xs font-bold ml-1 ${adjustments.stress > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ({adjustments.stress > 0 ? '+' : ''}{adjustments.stress})
                            </span>
                        )}
                        <div className="flex-1"></div>
                        <button
                            onClick={() => onUpdateStress(instance.instanceId, -1)}
                            className="w-8 h-8 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onUpdateStress(instance.instanceId, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-dagger-dark border border-dagger-gold/20 rounded text-gray-400 hover:text-dagger-gold hover:border-dagger-gold/60 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex gap-1 mt-2">
                        {Array.from({ length: instance.maxStress }).map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-6 h-6 border-2 rounded flex items-center justify-center ${
                                    idx < instance.currentStress
                                        ? 'bg-dagger-gold border-dagger-gold'
                                        : 'border-dagger-gold/30 bg-dagger-dark'
                                }`}
                            >
                                {idx < instance.currentStress && (
                                    <svg className="w-4 h-4 text-dagger-dark" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
