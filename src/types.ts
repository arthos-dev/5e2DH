
export interface AdversaryStats {
    difficulty: number;
    threshold_major: number | null;
    threshold_severe: number | null;
    hp: number;
    stress: number;
    attack_mod: number;
    damage_dice: string;
}

export interface AdversaryFeature {
    name: string;
    entries: {
        name: string;
        description: string;
    }[];
}

export interface Adversary {
    id: string;
    name: string;
    tier: number;
    role: string;
    category: string;
    biome: string;
    stats: AdversaryStats;
    features: AdversaryFeature[];
    motives_tactics?: string;
    experiences?: Array<{name: string, value: number}>;
    original_cr: string;
    source: string;
}

export interface EncounterAdversary {
    id: string; // unique ID for this encounter entry
    adversaryId: string; // reference to base Adversary
    customName?: string; // optional custom name
    quantity: number; // number of instances
    upscaling: number; // tier upscaling (0 = base tier, 1 = +1 tier, etc.)
}

export interface Encounter {
    id: string;
    name: string;
    playerCount: number;
    adversaries: EncounterAdversary[];
    battlePointModifier: number; // applied modifier (-2, -1, 0, +1, +2, etc.)
    savedAt?: number; // timestamp when saved
    savedEncounterId?: string; // unique ID for saved encounters
}

export interface EncounterInstance {
    instanceId: string; // unique ID for this instance
    encounterAdversaryId: string; // reference to EncounterAdversary
    adversaryId: string; // reference to base Adversary
    customName?: string;
    upscaling: number;
    currentHP: number;
    currentStress: number; // number of stress boxes marked
    maxHP: number;
    maxStress: number;
    thresholdMajor: number | null; // scaled threshold for major damage
    thresholdSevere: number | null; // scaled threshold for severe damage
    hpThreshold: 'minor' | 'major' | 'severe'; // current threshold based on HP
}

export interface RunningEncounter {
    id: string;
    name: string;
    playerCount: number;
    battlePointModifier: number;
    instances: EncounterInstance[]; // expanded instances from adversaries
}
