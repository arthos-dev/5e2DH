import type { Adversary, AdversaryStats } from '../types';

// Scaling adjustments per tier based on "Making Custom Adversaries.md"
// Format: [difficulty, threshold_major, threshold_severe, hp, stress, attack_mod]
// Note: null for thresholds means no thresholds (MINION)
interface ScalingAdjustment {
    difficulty: number;
    threshold_major: number | null;
    threshold_severe: number | null;
    hp: number;
    stress: number;
    attack_mod: number;
}

type ScalingTable = {
    [tierDelta: number]: ScalingAdjustment;
};

// Role-specific scaling tables
// Each entry represents the adjustment from tier N to tier N+1
// For downscaling, we negate the values
const SCALING_TABLES: Record<string, ScalingTable> = {
    BRUISER: {
        1: { difficulty: 2, threshold_major: 5, threshold_severe: 10, hp: 1, stress: 2, attack_mod: 2 },   // T1→T2
        2: { difficulty: 2, threshold_major: 7, threshold_severe: 15, hp: 1, stress: 0, attack_mod: 2 },   // T2→T3
        3: { difficulty: 2, threshold_major: 12, threshold_severe: 25, hp: 1, stress: 0, attack_mod: 2 },  // T3→T4
    },
    HORDE: {
        1: { difficulty: 2, threshold_major: 5, threshold_severe: 8, hp: 2, stress: 0, attack_mod: 0 },    // T1→T2
        2: { difficulty: 2, threshold_major: 5, threshold_severe: 12, hp: 0, stress: 1, attack_mod: 1 },   // T2→T3
        3: { difficulty: 2, threshold_major: 10, threshold_severe: 15, hp: 2, stress: 0, attack_mod: 0 },  // T3→T4
    },
    LEADER: {
        1: { difficulty: 2, threshold_major: 6, threshold_severe: 10, hp: 0, stress: 0, attack_mod: 1 },   // T1→T2
        2: { difficulty: 2, threshold_major: 6, threshold_severe: 15, hp: 1, stress: 0, attack_mod: 2 },   // T2→T3
        3: { difficulty: 2, threshold_major: 12, threshold_severe: 25, hp: 1, stress: 1, attack_mod: 3 },  // T3→T4
    },
    MINION: {
        1: { difficulty: 2, threshold_major: null, threshold_severe: null, hp: 0, stress: 0, attack_mod: 1 },  // T1→T2
        2: { difficulty: 2, threshold_major: null, threshold_severe: null, hp: 0, stress: 1, attack_mod: 1 },  // T2→T3
        3: { difficulty: 2, threshold_major: null, threshold_severe: null, hp: 0, stress: 0, attack_mod: 1 },  // T3→T4
    },
    RANGED: {
        1: { difficulty: 2, threshold_major: 3, threshold_severe: 6, hp: 1, stress: 0, attack_mod: 1 },    // T1→T2
        2: { difficulty: 2, threshold_major: 7, threshold_severe: 14, hp: 1, stress: 1, attack_mod: 2 },   // T2→T3
        3: { difficulty: 2, threshold_major: 5, threshold_severe: 10, hp: 1, stress: 1, attack_mod: 1 },   // T3→T4
    },
    SKULK: {
        1: { difficulty: 2, threshold_major: 3, threshold_severe: 8, hp: 1, stress: 1, attack_mod: 1 },    // T1→T2
        2: { difficulty: 2, threshold_major: 8, threshold_severe: 12, hp: 1, stress: 1, attack_mod: 1 },   // T2→T3
        3: { difficulty: 2, threshold_major: 8, threshold_severe: 10, hp: 1, stress: 1, attack_mod: 1 },   // T3→T4
    },
    SOLO: {
        1: { difficulty: 2, threshold_major: 5, threshold_severe: 10, hp: 0, stress: 1, attack_mod: 2 },   // T1→T2
        2: { difficulty: 2, threshold_major: 7, threshold_severe: 15, hp: 2, stress: 1, attack_mod: 2 },   // T2→T3
        3: { difficulty: 2, threshold_major: 12, threshold_severe: 25, hp: 0, stress: 1, attack_mod: 3 },  // T3→T4
    },
    STANDARD: {
        1: { difficulty: 2, threshold_major: 3, threshold_severe: 8, hp: 0, stress: 0, attack_mod: 1 },    // T1→T2
        2: { difficulty: 2, threshold_major: 7, threshold_severe: 15, hp: 1, stress: 1, attack_mod: 1 },   // T2→T3
        3: { difficulty: 2, threshold_major: 10, threshold_severe: 15, hp: 0, stress: 1, attack_mod: 1 },  // T3→T4
    },
    SUPPORT: {
        1: { difficulty: 2, threshold_major: 3, threshold_severe: 8, hp: 1, stress: 1, attack_mod: 1 },    // T1→T2
        2: { difficulty: 2, threshold_major: 7, threshold_severe: 12, hp: 0, stress: 0, attack_mod: 1 },   // T2→T3
        3: { difficulty: 2, threshold_major: 8, threshold_severe: 10, hp: 1, stress: 1, attack_mod: 1 },   // T3→T4
    },
};

/**
 * Clamps tier to valid range (1-4)
 */
export function getEffectiveTier(baseTier: number, upscaling: number): number {
    return Math.max(1, Math.min(4, baseTier + upscaling));
}

/**
 * Parses damage dice string and returns components
 * Handles formats like "2d6+3", "1d10+4", "1-3", etc.
 */
function parseDamageDice(damageDice: string): { dice: number; dieType: number; modifier: number } | null {
    // Handle special case like "1-3" or non-standard formats
    if (!damageDice.includes('d')) {
        return null; // Can't parse, return null to skip scaling
    }

    // Match patterns like "2d6+3", "1d10+4", "3d12", etc.
    const match = damageDice.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) {
        return null;
    }

    const dice = parseInt(match[1], 10);
    const dieType = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    return { dice, dieType, modifier };
}

/**
 * Scales damage dice based on tier delta
 * Rule: add tierDelta dice and tierDelta * 2 to modifier
 * Note: For T3, the modifier calculation might be high per the guide
 */
export function scaleDamageDice(damageDice: string, tierDelta: number, _role: string): string {
    if (tierDelta === 0) {
        return damageDice;
    }

    const parsed = parseDamageDice(damageDice);
    if (!parsed) {
        // If we can't parse it, return as-is (edge cases like "1-3")
        return damageDice;
    }

    const newDice = parsed.dice + tierDelta;
    // Use tierDelta * 2 for modifier, but note this might be high for T3
    const newModifier = parsed.modifier + (tierDelta * 2);

    // Handle negative modifiers
    const modifierStr = newModifier >= 0 ? `+${newModifier}` : `${newModifier}`;
    return `${newDice}d${parsed.dieType}${modifierStr}`;
}

/**
 * Gets cumulative scaling adjustments for a given tier delta
 * For multi-tier scaling, accumulates adjustments from consecutive tiers
 */
function getCumulativeAdjustments(
    role: string,
    fromTier: number,
    toTier: number
): ScalingAdjustment {
    const roleUpper = role.toUpperCase();
    const table = SCALING_TABLES[roleUpper] || SCALING_TABLES['STANDARD'];
    
    const adjustments: ScalingAdjustment = {
        difficulty: 0,
        threshold_major: 0,
        threshold_severe: 0,
        hp: 0,
        stress: 0,
        attack_mod: 0,
    };

    const direction = toTier > fromTier ? 1 : -1;
    const start = direction === 1 ? fromTier : toTier;
    const end = direction === 1 ? toTier : fromTier;

    // Accumulate adjustments from each tier step
    for (let tier = start; tier < end; tier++) {
        const tierDelta = tier;
        const adjustment = table[tierDelta];
        if (!adjustment) continue;

        adjustments.difficulty += adjustment.difficulty * direction;
        adjustments.hp += adjustment.hp * direction;
        adjustments.stress += adjustment.stress * direction;
        adjustments.attack_mod += adjustment.attack_mod * direction;

        // Handle thresholds - preserve null for MINION
        if (adjustment.threshold_major !== null) {
            if (adjustments.threshold_major === null) {
                adjustments.threshold_major = 0;
            }
            adjustments.threshold_major += adjustment.threshold_major * direction;
        }
        if (adjustment.threshold_severe !== null) {
            if (adjustments.threshold_severe === null) {
                adjustments.threshold_severe = 0;
            }
            adjustments.threshold_severe += adjustment.threshold_severe * direction;
        }
    }

    return adjustments;
}

/**
 * Calculates scaled stats for an adversary based on upscaling value
 * Returns a new AdversaryStats object with scaled values
 */
export function calculateScaledStats(
    baseAdversary: Adversary,
    upscaling: number
): AdversaryStats {
    if (upscaling === 0) {
        return { ...baseAdversary.stats };
    }

    const baseTier = baseAdversary.tier;
    const effectiveTier = getEffectiveTier(baseTier, upscaling);
    const tierDelta = effectiveTier - baseTier;

    if (tierDelta === 0) {
        return { ...baseAdversary.stats };
    }

    // Get cumulative adjustments
    const adjustments = getCumulativeAdjustments(baseAdversary.role, baseTier, effectiveTier);

    // Apply adjustments to base stats
    const scaledStats: AdversaryStats = {
        difficulty: Math.max(1, baseAdversary.stats.difficulty + adjustments.difficulty),
        threshold_major: baseAdversary.stats.threshold_major === null
            ? null
            : (baseAdversary.stats.threshold_major + (adjustments.threshold_major ?? 0)),
        threshold_severe: baseAdversary.stats.threshold_severe === null
            ? null
            : (baseAdversary.stats.threshold_severe + (adjustments.threshold_severe ?? 0)),
        hp: Math.max(1, baseAdversary.stats.hp + adjustments.hp),
        stress: Math.max(0, baseAdversary.stats.stress + adjustments.stress),
        attack_mod: baseAdversary.stats.attack_mod + adjustments.attack_mod,
        damage_dice: scaleDamageDice(baseAdversary.stats.damage_dice, tierDelta, baseAdversary.role),
    };

    // Ensure thresholds remain null for MINION
    if (baseAdversary.role.toUpperCase() === 'MINION') {
        scaledStats.threshold_major = null;
        scaledStats.threshold_severe = null;
    }

    return scaledStats;
}

/**
 * Calculates the adjustment values between base and scaled stats
 * Returns an object with the differences for each stat
 */
export function calculateStatAdjustments(
    baseStats: AdversaryStats,
    scaledStats: AdversaryStats
): {
    difficulty: number;
    threshold_major: number | null;
    threshold_severe: number | null;
    hp: number;
    stress: number;
    attack_mod: number;
    damage_dice_changed: boolean;
} {
    return {
        difficulty: scaledStats.difficulty - baseStats.difficulty,
        threshold_major: baseStats.threshold_major === null || scaledStats.threshold_major === null
            ? null
            : scaledStats.threshold_major - baseStats.threshold_major,
        threshold_severe: baseStats.threshold_severe === null || scaledStats.threshold_severe === null
            ? null
            : scaledStats.threshold_severe - baseStats.threshold_severe,
        hp: scaledStats.hp - baseStats.hp,
        stress: scaledStats.stress - baseStats.stress,
        attack_mod: scaledStats.attack_mod - baseStats.attack_mod,
        damage_dice_changed: scaledStats.damage_dice !== baseStats.damage_dice,
    };
}
