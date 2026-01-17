
export interface AdversaryStats {
    difficulty: number;
    threshold_major: number;
    threshold_severe: number;
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
    original_cr: string;
    source: string;
}
