
import React from 'react';
import type { Adversary } from '../types';

interface Props {
    adversary: Adversary;
    onClick: () => void;
}

const roleStyles: Record<string, string> = {
    STANDARD: 'border-slate-500 bg-slate-900/50 text-slate-300',
    BRUISER: 'border-blue-900 bg-blue-900/20 text-blue-200',
    HORDE: 'border-red-900 bg-red-900/20 text-red-200',
    LEADER: 'border-purple-900 bg-purple-900/20 text-purple-200',
    SNIPER: 'border-green-900 bg-green-900/20 text-green-200',
    SKIRMISHER: 'border-yellow-900 bg-yellow-900/20 text-yellow-200',
    ELITE: 'border-indigo-900 bg-indigo-900/20 text-indigo-200',
    LEGENDARY: 'border-dagger-gold bg-dagger-gold/10 text-dagger-gold',
    SOLO: 'border-gray-600 bg-gray-800 text-gray-300',
};

const RoleBadge = ({ role }: { role: string }) => {
    const style = roleStyles[role] || roleStyles.STANDARD;
    // Extract color for the dot
    const dotColor = style.includes('text-slate') ? 'bg-slate-500' :
        style.includes('text-blue') ? 'bg-blue-400' :
            style.includes('text-red') ? 'bg-red-400' :
                style.includes('text-purple') ? 'bg-purple-400' :
                    style.includes('text-green') ? 'bg-green-400' :
                        style.includes('text-yellow') ? 'bg-yellow-400' :
                            style.includes('text-indigo') ? 'bg-indigo-400' :
                                style.includes('text-dagger-gold') ? 'bg-dagger-gold' : 'bg-gray-400';

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 border ${style.split(' ')[0]} ${style.split(' ')[2]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-[0_0_5px_currentColor]`}></span>
            {role}
        </span>
    );
};

export const AdversaryCard: React.FC<Props> = ({ adversary, onClick }) => {
    return (
        <div
            className="group relative h-full bg-dagger-panel border border-dagger-gold/20 rounded-xl overflow-hidden hover:border-dagger-gold/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-glow hover:-translate-y-1 flex flex-col"
            onClick={onClick}
        >
            {/* Top Bar Decoration */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-dagger-gold/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>

            <div className="p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-2">
                        <h3 className="font-serif font-bold text-lg leading-tight text-dagger-light group-hover:text-dagger-gold transition-colors">
                            {adversary.name}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wide truncate">
                            {adversary.category} • {adversary.biome}
                        </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="w-8 h-8 flex items-center justify-center bg-dagger-dark border border-dagger-gold text-dagger-gold font-serif font-bold rounded shadow-inner" title="Tier">
                            {adversary.tier}
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <RoleBadge role={adversary.role} />
                </div>

                <div className="mt-auto space-y-3">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-t border-white/5">
                        <div className="text-center">
                            <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Diff</div>
                            <div className="font-mono font-bold text-dagger-light">{adversary.stats.difficulty}</div>
                        </div>
                        <div className="text-center border-l border-white/5">
                            <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">HP</div>
                            <div className="font-mono font-bold text-green-400">{adversary.stats.hp}</div>
                        </div>
                        <div className="text-center border-l border-white/5">
                            <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Atk</div>
                            <div className="font-mono font-bold text-red-400">+{adversary.stats.attack_mod}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
