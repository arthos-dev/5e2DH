import type { Encounter, RunningEncounter, EncounterInstance, Adversary } from '../types';
import { calculateScaledStats } from './scalingUtils';

export function initializeRunningEncounter(
    encounter: Encounter,
    allAdversaries: Adversary[]
): RunningEncounter {
    const instances: EncounterInstance[] = [];
    
    for (const encAdv of encounter.adversaries) {
        const baseAdv = allAdversaries.find(a => a.id === encAdv.adversaryId);
        if (!baseAdv) continue;
        
        // Calculate scaled stats for this adversary
        const scaledStats = calculateScaledStats(baseAdv, encAdv.upscaling);
        
        // Create an instance for each quantity
        for (let i = 0; i < encAdv.quantity; i++) {
            const instanceId = `${encAdv.id}-instance-${i}`;
            const maxHP = scaledStats.hp;
            const maxStress = scaledStats.stress;
            
            const instance: EncounterInstance = {
                instanceId,
                encounterAdversaryId: encAdv.id,
                adversaryId: baseAdv.id,
                customName: encAdv.customName,
                upscaling: encAdv.upscaling,
                currentHP: 0,
                currentStress: 0,
                maxHP,
                maxStress,
                thresholdMajor: scaledStats.threshold_major,
                thresholdSevere: scaledStats.threshold_severe,
                hpThreshold: getHPThreshold(0, maxHP, {
                    major: scaledStats.threshold_major,
                    severe: scaledStats.threshold_severe,
                }),
            };
            
            instances.push(instance);
        }
    }
    
    return {
        id: encounter.id,
        name: encounter.name,
        playerCount: encounter.playerCount,
        battlePointModifier: encounter.battlePointModifier,
        instances,
    };
}

export function getHPThreshold(
    currentHP: number,
    _maxHP: number,
    thresholds: { major: number | null; severe: number | null }
): 'minor' | 'major' | 'severe' {
    // If thresholds are null (minions), always return 'minor'
    if (thresholds.major === null || thresholds.severe === null) {
        return 'minor';
    }
    if (currentHP <= thresholds.severe) return 'severe';
    if (currentHP <= thresholds.major) return 'major';
    return 'minor';
}

export function updateInstanceHP(
    instances: EncounterInstance[],
    instanceId: string,
    delta: number
): EncounterInstance[] {
    return instances.map(instance => {
        if (instance.instanceId !== instanceId) return instance;
        
        const newHP = Math.max(0, Math.min(instance.maxHP, instance.currentHP + delta));
        const newThreshold = getHPThreshold(newHP, instance.maxHP, {
            major: instance.thresholdMajor,
            severe: instance.thresholdSevere,
        });
        
        return {
            ...instance,
            currentHP: newHP,
            hpThreshold: newThreshold,
        };
    });
}

export function updateInstanceStress(
    instances: EncounterInstance[],
    instanceId: string,
    delta: number
): EncounterInstance[] {
    return instances.map(instance => {
        if (instance.instanceId !== instanceId) return instance;
        
        const newStress = Math.max(0, Math.min(instance.maxStress, instance.currentStress + delta));
        
        return {
            ...instance,
            currentStress: newStress,
        };
    });
}
