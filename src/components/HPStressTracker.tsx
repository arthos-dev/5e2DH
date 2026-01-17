import React from 'react';

interface HPStressTrackerProps {
    currentHP: number;
    maxHP: number;
    currentStress: number;
    maxStress: number;
    thresholdMajor: number | null;
    thresholdSevere: number | null;
    hpThreshold: 'minor' | 'major' | 'severe';
    onUpdateHP: (delta: number) => void;
    onUpdateStress: (delta: number) => void;
}

export const HPStressTracker: React.FC<HPStressTrackerProps> = ({
    currentHP,
    maxHP,
    currentStress,
    maxStress,
    thresholdMajor,
    thresholdSevere,
    hpThreshold,
    onUpdateHP,
    onUpdateStress,
}) => {
    const hasThresholds = thresholdMajor !== null && thresholdSevere !== null;

    return (
        <div className="bg-dagger-surface rounded-lg p-4 border border-dagger-gold/20">
            {/* Header */}
            <div className="flex items-center justify-center mb-4">
                <div className="flex-1 border-t border-dashed border-dagger-gold/30"></div>
                <h3 className="px-4 text-sm font-bold text-dagger-gold uppercase tracking-wider font-serif">
                    HP & STRESS
                </h3>
                <div className="flex-1 border-t border-dashed border-dagger-gold/30"></div>
            </div>

            {/* Threshold Progression Bar */}
            {hasThresholds && (
                <div className="flex items-center justify-center mb-4 gap-0 flex-nowrap">
                    {/* MINOR 1 HP */}
                    <div className={`px-1.5 py-1 shrink-0 relative ${
                        hpThreshold === 'minor' ? 'bg-dagger-gold text-dagger-dark' : 'bg-dagger-panel text-dagger-light'
                    }`} style={{
                        clipPath: 'polygon(0 0, calc(50% - 4px) 0, 50% 4px, calc(50% + 4px) 0, 100% 0, 100% 100%, calc(50% + 4px) 100%, 50% calc(100% - 4px), calc(50% - 4px) 100%, 0 100%)'
                    }}>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold leading-tight">MINOR</span>
                            <span className="text-[9px] font-bold leading-tight">1 HP</span>
                        </div>
                    </div>
                    
                    {/* Horizontal line from MINOR to threshold */}
                    <div className="h-[1px] w-3 bg-gray-400 shrink-0"></div>
                    
                    {/* Threshold Major Value */}
                    <div className="bg-white border border-gray-300 px-2 py-1.5 min-w-[32px] text-center shrink-0">
                        <span className="text-sm font-bold text-gray-900">{thresholdMajor}</span>
                    </div>
                    
                    {/* Horizontal line with arrowhead from threshold to MAJOR */}
                    <div className="flex items-center shrink-0">
                        <div className="h-[1px] w-2 bg-gray-400"></div>
                        <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-l-gray-400 border-t-transparent border-b-transparent"></div>
                    </div>
                    
                    {/* MAJOR 2 HP */}
                    <div className={`px-1.5 py-1 shrink-0 relative ${
                        hpThreshold === 'major' ? 'bg-dagger-gold text-dagger-dark' : 'bg-dagger-panel text-dagger-light'
                    }`} style={{
                        clipPath: 'polygon(0 0, calc(50% - 4px) 0, 50% 4px, calc(50% + 4px) 0, 100% 0, 100% 100%, calc(50% + 4px) 100%, 50% calc(100% - 4px), calc(50% - 4px) 100%, 0 100%)'
                    }}>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold leading-tight">MAJOR</span>
                            <span className="text-[9px] font-bold leading-tight">2 HP</span>
                        </div>
                    </div>
                    
                    {/* Horizontal line from MAJOR to threshold */}
                    <div className="h-[1px] w-3 bg-gray-400 shrink-0"></div>
                    
                    {/* Threshold Severe Value */}
                    <div className="bg-white border border-gray-300 px-2 py-1.5 min-w-[32px] text-center shrink-0">
                        <span className="text-sm font-bold text-gray-900">{thresholdSevere}</span>
                    </div>
                    
                    {/* Horizontal line with arrowhead from threshold to SEVERE */}
                    <div className="flex items-center shrink-0">
                        <div className="h-[1px] w-2 bg-gray-400"></div>
                        <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-l-gray-400 border-t-transparent border-b-transparent"></div>
                    </div>
                    
                    {/* SEVERE 3 HP */}
                    <div className={`px-1.5 py-1 shrink-0 relative ${
                        hpThreshold === 'severe' ? 'bg-dagger-gold text-dagger-dark' : 'bg-dagger-panel text-dagger-light'
                    }`} style={{
                        clipPath: 'polygon(0 0, calc(50% - 4px) 0, 50% 4px, calc(50% + 4px) 0, 100% 0, 100% 100%, calc(50% + 4px) 100%, 50% calc(100% - 4px), calc(50% - 4px) 100%, 0 100%)'
                    }}>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold leading-tight">SEVERE</span>
                            <span className="text-[9px] font-bold leading-tight">3 HP</span>
                        </div>
                    </div>
                </div>
            )}

            {/* HP Tracker */}
            <div className="mb-3">
                <div className="flex items-center gap-2 mb-2 min-w-0">
                    <span className="text-sm font-bold text-dagger-light whitespace-nowrap shrink-0">
                        HP ({currentHP})
                    </span>
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                        <button
                            onClick={() => onUpdateHP(-1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-dagger-panel border border-dagger-gold/30 text-dagger-gold hover:bg-dagger-gold/20 hover:border-dagger-gold transition-colors shrink-0"
                            aria-label="Decrease HP"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <div className="flex gap-1 flex-1 min-w-0 overflow-hidden">
                            {Array.from({ length: maxHP }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`flex-1 min-w-[20px] h-6 flex items-center justify-center ${
                                        idx < currentHP
                                            ? 'bg-green-500/60 border border-green-400/50'
                                            : 'bg-dagger-panel border border-dagger-gold/20'
                                    } rounded`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => onUpdateHP(1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-dagger-panel border border-dagger-gold/30 text-dagger-gold hover:bg-dagger-gold/20 hover:border-dagger-gold transition-colors shrink-0"
                            aria-label="Increase HP"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* STRESS Tracker */}
            <div>
                <div className="flex items-center gap-2 mb-2 min-w-0">
                    <span className="text-sm font-bold text-dagger-light whitespace-nowrap shrink-0">
                        STRESS ({currentStress})
                    </span>
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                        <button
                            onClick={() => onUpdateStress(-1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-dagger-panel border border-dagger-gold/30 text-dagger-gold hover:bg-dagger-gold/20 hover:border-dagger-gold transition-colors shrink-0"
                            aria-label="Decrease Stress"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <div className="flex gap-1 flex-1 min-w-0 overflow-hidden">
                            {Array.from({ length: maxStress }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`flex-1 min-w-[20px] h-6 flex items-center justify-center ${
                                        idx < currentStress
                                            ? 'bg-purple-500/60 border border-purple-400/50'
                                            : 'bg-dagger-panel border border-dagger-gold/20'
                                    } rounded`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => onUpdateStress(1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-dagger-panel border border-dagger-gold/30 text-dagger-gold hover:bg-dagger-gold/20 hover:border-dagger-gold transition-colors shrink-0"
                            aria-label="Increase Stress"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
