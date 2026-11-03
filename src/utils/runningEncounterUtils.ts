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

export function updateInstanceHP(
    instances: EncounterInstance[],
    instanceId: string,
    delta: number
): EncounterInstance[] {
    return instances.map(instance => {
        if (instance.instanceId !== instanceId) return instance;
        
        return {
            ...instance,
            currentHP: Math.max(0, Math.min(instance.maxHP, instance.currentHP + delta)),
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

/** How a hit landed: Daggerheart marks 1 HP below the Major threshold, 2 at Major, 3 at Severe. */
export interface Hit {
    hp: number;
    severity: 'none' | 'minor' | 'major' | 'severe' | 'minion';
}

/** HP a hit of `damage` marks. Adversaries without thresholds (minions) are defeated by any damage. */
export function hitFor(instance: EncounterInstance, damage: number): Hit {
    if (!(damage > 0)) return { hp: 0, severity: 'none' };
    const { thresholdMajor: major, thresholdSevere: severe } = instance;
    if (major === null || severe === null) return { hp: instance.maxHP, severity: 'minion' };
    if (damage >= severe) return { hp: 3, severity: 'severe' };
    if (damage >= major) return { hp: 2, severity: 'major' };
    return { hp: 1, severity: 'minor' };
}

/** The X in a "Minion (X)" feature: for every X damage, another minion in range is defeated. */
export function minionSpill(adversary: Adversary): number | null {
    for (const feature of adversary.features) {
        for (const name of [feature.name, ...(feature.entries ?? []).map((e) => e.name)]) {
            const m = /^Minion \((\d+)\)/i.exec(name ?? '');
            if (m) return Number(m[1]);
        }
    }
    return null;
}

// The fight in progress survives a reload. Cleared when the GM ends it.
const FIGHT_KEY = 'daggerheart-running-fight';

export interface StoredFight {
    encounter: Encounter;
    running: RunningEncounter;
}

export function saveFight(fight: StoredFight | null): void {
    try {
        if (fight) localStorage.setItem(FIGHT_KEY, JSON.stringify(fight));
        else localStorage.removeItem(FIGHT_KEY);
    } catch {
        // Storage full or blocked: the fight still runs, it just won't survive a reload.
    }
}

export function loadFight(): StoredFight | null {
    try {
        const raw = localStorage.getItem(FIGHT_KEY);
        const fight = raw ? (JSON.parse(raw) as StoredFight) : null;
        return fight?.running?.instances?.length ? fight : null;
    } catch {
        return null;
    }
}
