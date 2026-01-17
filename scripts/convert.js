
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

// ============================================================================
// Constants
// ============================================================================
const csvPath = path.resolve('./Bestiary.csv');
const outputPath = path.resolve('./converter/src/data/adversaries.json');

// ============================================================================
// Role-specific stat tables based on "Making Custom Adversaries" guide
// ============================================================================
const ROLE_STAT_TABLES = {
    BRUISER: {
        1: { difficulty: [12, 14], major: [7, 9], severe: [13, 15], hp: [5, 7], stress: [3, 4], atk: [0, 2], damage: ["1d12+2", "1d10+4", "1d8+6"] },
        2: { difficulty: [14, 16], major: [12, 14], severe: [23, 26], hp: [5, 7], stress: [4, 6], atk: [2, 4], damage: ["2d12+3", "2d10+2", "2d8+6"] },
        3: { difficulty: [16, 18], major: [19, 22], severe: [35, 40], hp: [6, 8], stress: [4, 6], atk: [3, 5], damage: ["3d12+1", "3d10+4", "3d8+8"] },
        4: { difficulty: [18, 20], major: [30, 37], severe: [63, 70], hp: [7, 9], stress: [4, 6], atk: [5, 8], damage: ["4d12+15", "4d10+10", "4d8+12"] }
    },
    HORDE: {
        1: { difficulty: [10, 12], major: [5, 10], severe: [8, 12], hp: [4, 6], stress: [2, 3], atk: [-2, 0], damage: ["1d10+2", "1d8+3", "1d6+4"] },
        2: { difficulty: [12, 14], major: [10, 15], severe: [16, 20], hp: [5, 6], stress: [2, 3], atk: [-1, 1], damage: ["2d10+2", "2d8+6", "2d6+3"] },
        3: { difficulty: [14, 16], major: [15, 25], severe: [26, 32], hp: [6, 7], stress: [3, 4], atk: [0, 2], damage: ["3d10+2", "3d8+4", "3d6+6"] },
        4: { difficulty: [16, 18], major: [20, 30], severe: [35, 45], hp: [7, 8], stress: [4, 5], atk: [1, 3], damage: ["4d10+4", "4d8+8", "4d6+10"] }
    },
    LEADER: {
        1: { difficulty: [12, 14], major: [7, 9], severe: [13, 15], hp: [5, 7], stress: [3, 4], atk: [2, 4], damage: ["1d12+1", "1d10+3", "1d8+5"] },
        2: { difficulty: [14, 16], major: [12, 14], severe: [23, 26], hp: [5, 7], stress: [4, 5], atk: [3, 5], damage: ["2d12+1", "2d10+3", "2d8+6"] },
        3: { difficulty: [17, 19], major: [19, 22], severe: [35, 40], hp: [6, 8], stress: [5, 6], atk: [5, 7], damage: ["3d10+1", "3d8+8"] },
        4: { difficulty: [19, 21], major: [30, 37], severe: [63, 70], hp: [7, 9], stress: [6, 8], atk: [8, 10], damage: ["4d12+6", "4d10+8", "4d8+10"] }
    },
    MINION: {
        1: { difficulty: [10, 12], major: null, severe: null, hp: [1, 1], stress: [1, 1], atk: [-2, 0], damage: ["1-3"] },
        2: { difficulty: [12, 14], major: null, severe: null, hp: [1, 1], stress: [1, 1], atk: [-1, 1], damage: ["2-4"] },
        3: { difficulty: [14, 16], major: null, severe: null, hp: [1, 1], stress: [1, 2], atk: [0, 2], damage: ["5-8"] },
        4: { difficulty: [16, 18], major: null, severe: null, hp: [1, 1], stress: [1, 2], atk: [1, 3], damage: ["10-12"] }
    },
    RANGED: {
        1: { difficulty: [10, 12], major: [3, 5], severe: [6, 9], hp: [3, 4], stress: [2, 3], atk: [1, 2], damage: ["1d12+1", "1d10+3", "1d8+5"] },
        2: { difficulty: [13, 15], major: [5, 8], severe: [13, 18], hp: [3, 5], stress: [2, 3], atk: [2, 5], damage: ["2d12+1", "2d10+3", "2d8+6"] },
        3: { difficulty: [15, 17], major: [12, 15], severe: [25, 30], hp: [4, 6], stress: [3, 4], atk: [3, 4], damage: ["3d10+1", "3d8+8"] },
        4: { difficulty: [17, 19], major: [18, 25], severe: [30, 40], hp: [4, 6], stress: [4, 5], atk: [4, 6], damage: ["4d12+6", "4d10+8", "4d8+10"] }
    },
    SKULK: {
        1: { difficulty: [10, 12], major: [5, 7], severe: [8, 12], hp: [3, 4], stress: [2, 3], atk: [1, 2], damage: ["1d8+3", "1d6+2", "1d4+4"] },
        2: { difficulty: [12, 14], major: [7, 9], severe: [16, 20], hp: [3, 5], stress: [3, 4], atk: [2, 5], damage: ["2d8+3", "2d6+3", "2d4+6"] },
        3: { difficulty: [14, 16], major: [15, 20], severe: [27, 32], hp: [4, 6], stress: [4, 5], atk: [3, 7], damage: ["3d8+4", "3d6+5", "3d4+10"] },
        4: { difficulty: [16, 18], major: [20, 30], severe: [35, 45], hp: [4, 6], stress: [4, 6], atk: [4, 8], damage: ["4d12+10", "4d10+4", "4d6+10"] }
    },
    SOLO: {
        1: { difficulty: [12, 14], major: [7, 9], severe: [13, 15], hp: [8, 10], stress: [3, 4], atk: [3, 3], damage: ["1d20", "1d12+2", "1d10+4"] },
        2: { difficulty: [14, 16], major: [12, 14], severe: [23, 26], hp: [8, 10], stress: [4, 5], atk: [3, 4], damage: ["2d20+3", "2d10+2", "2d8+6"] },
        3: { difficulty: [17, 19], major: [19, 22], severe: [35, 40], hp: [10, 12], stress: [5, 6], atk: [4, 7], damage: ["3d20", "3d12+6", "3d10+8"] },
        4: { difficulty: [19, 21], major: [30, 37], severe: [63, 70], hp: [10, 12], stress: [6, 8], atk: [7, 10], damage: ["4d12+15", "4d10+10", "4d8+12"] }
    },
    LEGENDARY: {
        1: { difficulty: [12, 14], major: [7, 9], severe: [13, 15], hp: [8, 10], stress: [3, 4], atk: [3, 3], damage: ["1d20", "1d12+2", "1d10+4"] },
        2: { difficulty: [14, 16], major: [12, 14], severe: [23, 26], hp: [8, 10], stress: [4, 5], atk: [3, 4], damage: ["2d20+3", "2d10+2", "2d8+6"] },
        3: { difficulty: [17, 19], major: [19, 22], severe: [35, 40], hp: [10, 12], stress: [5, 6], atk: [4, 7], damage: ["3d20", "3d12+6", "3d10+8"] },
        4: { difficulty: [19, 21], major: [30, 37], severe: [63, 70], hp: [10, 12], stress: [6, 8], atk: [7, 10], damage: ["4d12+15", "4d10+10", "4d8+12"] }
    },
    STANDARD: {
        1: { difficulty: [11, 13], major: [5, 8], severe: [8, 12], hp: [4, 5], stress: [3, 4], atk: [0, 2], damage: ["1d8+1", "1d6+2", "1d4+4"] },
        2: { difficulty: [13, 15], major: [8, 12], severe: [16, 20], hp: [5, 6], stress: [3, 4], atk: [1, 3], damage: ["2d8+2", "2d6+3", "2d4+4"] },
        3: { difficulty: [15, 17], major: [15, 20], severe: [27, 32], hp: [5, 6], stress: [4, 5], atk: [2, 4], damage: ["3d8+2", "3d6+3", "2d12+2"] },
        4: { difficulty: [17, 19], major: [25, 35], severe: [35, 55], hp: [5, 6], stress: [4, 5], atk: [3, 5], damage: ["4d10+2", "4d8+4", "4d6+10"] }
    },
    SUPPORT: {
        1: { difficulty: [12, 14], major: [5, 8], severe: [9, 12], hp: [3, 4], stress: [4, 5], atk: [0, 2], damage: ["1d8", "1d6+2", "1d4+4"] },
        2: { difficulty: [13, 15], major: [8, 12], severe: [16, 20], hp: [3, 5], stress: [4, 6], atk: [1, 3], damage: ["2d8+1", "2d6+2", "2d4+3"] },
        3: { difficulty: [15, 17], major: [15, 20], severe: [28, 35], hp: [4, 6], stress: [5, 6], atk: [2, 4], damage: ["3d8", "3d6+3", "2d12+1"] },
        4: { difficulty: [17, 19], major: [20, 30], severe: [35, 45], hp: [4, 6], stress: [5, 6], atk: [3, 5], damage: ["3d10+3", "4d8+4", "4d6+8"] }
    },
    COLOSSAL: {
        // Colossal uses framework thresholds and segment stats
        // For simplicity, we'll use average segment stats as base
        1: { difficulty: [13, 14], major: [8, 13], severe: [18, 22], hp: [3, 4], stress: [5, 6], atk: [1, 3], damage: ["1d6+3", "1d10+1"] },
        2: { difficulty: [14, 15], major: [15, 20], severe: [24, 32], hp: [3, 4], stress: [5, 6], atk: [2, 4], damage: ["2d8+6", "2d10+4"] },
        3: { difficulty: [15, 16], major: [25, 35], severe: [44, 54], hp: [4, 5], stress: [6, 7], atk: [2, 4], damage: ["3d6+10", "3d8+6"] },
        4: { difficulty: [16, 17], major: [30, 40], severe: [60, 70], hp: [4, 5], stress: [6, 8], atk: [3, 5], damage: ["4d10+6", "4d8+12"] }
    },
    SOCIAL: {
        1: { difficulty: [10, 12], major: [3, 5], severe: [6, 9], hp: [3, 3], stress: [2, 3], atk: [-4, -1], damage: ["1d6+1", "1d4+1"] },
        2: { difficulty: [13, 15], major: [5, 8], severe: [13, 18], hp: [3, 3], stress: [2, 3], atk: [-3, 0], damage: ["2d6+2", "1d4+3"] },
        3: { difficulty: [15, 17], major: [15, 20], severe: [27, 32], hp: [4, 4], stress: [2, 3], atk: [-2, 2], damage: ["3d6+3", "3d4+6"] },
        4: { difficulty: [17, 19], major: [25, 35], severe: [35, 50], hp: [4, 4], stress: [2, 3], atk: [2, 6], damage: ["4d8+5", "4d6+4", "4d4+8"] }
    }
};

// ============================================================================
// Helper Functions
// ============================================================================

// Helper function to get a value within a range, optionally based on CR
function getValueInRange(range, cr, tier) {
    if (!range || range.length !== 2) return range;
    const [min, max] = range;
    if (min === max) return min;
    // Use CR to determine position in range (normalize CR to 0-1 within tier)
    const crInTier = getCRPositionInTier(cr, tier);
    return Math.round(min + (max - min) * crInTier);
}

// Helper to get CR position within tier (0.0 to 1.0)
function getCRPositionInTier(cr, tier) {
    let tierMin, tierMax;
    if (tier === 1) { tierMin = 0; tierMax = 2; }
    else if (tier === 2) { tierMin = 3; tierMax = 7; }
    else if (tier === 3) { tierMin = 8; tierMax = 14; }
    else { tierMin = 15; tierMax = 30; }
    
    const clampedCR = Math.max(tierMin, Math.min(tierMax, cr));
    return (clampedCR - tierMin) / (tierMax - tierMin);
}

// Helper to select damage dice from options
function selectDamageDice(damageOptions, role, tier) {
    if (!damageOptions || damageOptions.length === 0) return "1d6+1";
    // For now, select middle option, can be enhanced later
    const index = Math.floor(damageOptions.length / 2);
    return damageOptions[index];
}

// ============================================================================
// Parsing Functions
// ============================================================================

function parseCR(crStr) {
    if (!crStr) return 0;
    // Handle "1/4 (XP...)" or "1/4"
    const clean = crStr.split('(')[0].trim();
    if (clean.includes('/')) {
        const [num, den] = clean.split('/');
        return parseFloat(num) / parseFloat(den);
    }
    return parseFloat(clean);
}

function parseHP(hpStr) {
    if (!hpStr) return 10;
    // "66 (12d8 + 12)" -> 66
    const match = hpStr.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 10;
}

function parseAC(acStr) {
    if (!acStr) return 10;
    // "16 (natural armor)" -> 16
    const match = acStr.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 10;
}

// ============================================================================
// Role Detection and Stat Calculation
// ============================================================================

// Enhanced role detection based on guide
function detectRole(row, cr, tier, hpRaw, int, acRaw, daggerHP, divisor) {
    const typeLower = row.Type ? row.Type.toLowerCase() : "";
    const nameLower = row.Name.toLowerCase();
    const actions = row.Actions ? row.Actions.toLowerCase() : "";
    const traits = row.Traits ? row.Traits.toLowerCase() : "";
    
    // Legendary (CR 20+) - highest priority
    if (cr >= 20) return "LEGENDARY";
    
    // Colossal (Gargantuan size, very large creatures with multiple segments)
    if (typeLower.includes("gargantuan") || nameLower.includes("colossal") || 
        nameLower.includes("titan") || (hpRaw > 300 && cr >= 10)) {
        return "COLOSSAL";
    }
    
    // Social (nobles, merchants, diplomats - non-combat focused)
    if (nameLower.includes("noble") || nameLower.includes("merchant") || 
        nameLower.includes("diplomat") || nameLower.includes("bard") ||
        nameLower.includes("courtier") || nameLower.includes("aristocrat") ||
        nameLower.includes("exchequer") || nameLower.includes("mogul") ||
        (typeLower.includes("humanoid") && cr < 3 && int >= 10 && 
         (nameLower.includes("commoner") || nameLower.includes("peasant") || 
          nameLower.includes("villager") || nameLower.includes("citizen")))) {
        return "SOCIAL";
    }
    
    // Solo (has Legendary Actions, or high CR with complex abilities - these are unique powerful monsters)
    // "Elite" from old system maps to Solo
    if (row["Legendary Actions"] || 
        (cr >= 15 && !typeLower.includes("swarm") && 
         (actions.includes("multiattack") || actions.includes("breath") || 
          actions.includes("recharge") || traits.includes("legendary")))) {
        return "SOLO";
    }
    
    // Minion (very low CR, weak stats)
    if (cr < 0.5 && hpRaw < 10) {
        return "MINION";
    }
    
    // Horde (swarm type or name)
    if (typeLower.includes("swarm") || nameLower.includes("swarm")) {
        return "HORDE";
    }
    
    // Ranged (has ranged attacks, archer/sniper in name)
    if (nameLower.includes("archer") || nameLower.includes("sniper") || 
        actions.includes("ranged weapon attack") || actions.includes("ranged spell attack")) {
        return "RANGED";
    }
    
    // Support (has buff/debuff abilities, lower damage focus, spellcasters that aid)
    if (actions.includes("heal") || actions.includes("bless") || actions.includes("curse") ||
        actions.includes("aid") || actions.includes("shield") || actions.includes("protection") ||
        traits.includes("aura") || actions.includes("buff") || actions.includes("debuff") ||
        nameLower.includes("cleric") || nameLower.includes("priest") || nameLower.includes("druid") ||
        nameLower.includes("bard") || nameLower.includes("wizard") || nameLower.includes("sorcerer") ||
        (int >= 12 && (actions.includes("spell") || traits.includes("spellcasting") || 
         actions.includes("magic") || traits.includes("magic")))) {
        return "SUPPORT";
    }
    
    // Leader (high intelligence + humanoid/fiend, or has command abilities)
    if ((int > 15 && (typeLower.includes("humanoid") || typeLower.includes("fiend"))) ||
        actions.includes("command") || actions.includes("lead") || nameLower.includes("commander") ||
        nameLower.includes("captain") || nameLower.includes("leader") || nameLower.includes("warlord") ||
        nameLower.includes("general") || nameLower.includes("chieftain")) {
        return "LEADER";
    }
    
    // Bruiser (high HP relative to CR, high damage, melee focus)
    if (hpRaw > daggerHP * divisor * 1.5 || 
        (hpRaw > 100 && cr < 10) ||
        (acRaw >= 18 && cr < 10)) {
        return "BRUISER";
    }
    
    // Skulk (mobile, stealthy, ambush-focused - harries party in close quarters)
    if ((tier <= 2 && (row.Speed && (row.Speed.includes("Fly") || row.Speed.includes("Climb")))) ||
        nameLower.includes("rogue") || nameLower.includes("assassin") || nameLower.includes("thief") ||
        nameLower.includes("skulk") || nameLower.includes("stalker") || nameLower.includes("shadow") ||
        nameLower.includes("ninja") || nameLower.includes("sneak") ||
        traits.includes("stealth") || traits.includes("sneak attack") || traits.includes("cunning action") ||
        actions.includes("ambush") || actions.includes("backstab") || actions.includes("sneak")) {
        return "SKULK";
    }
    
    // Default to Standard
    return "STANDARD";
}

// Calculate role-based stats
function calculateRoleStats(role, tier, cr, hpRaw, acRaw, int, isBeastOrPlant, hasPsychicResist) {
    const roleUpper = role.toUpperCase();
    const table = ROLE_STAT_TABLES[roleUpper];
    
    if (!table || !table[tier]) {
        // Fallback to STANDARD if role not found
        const fallbackTable = ROLE_STAT_TABLES.STANDARD[tier] || ROLE_STAT_TABLES.STANDARD[1];
        return calculateStatsFromTable(fallbackTable, tier, cr, hpRaw, acRaw, int, isBeastOrPlant, hasPsychicResist, "STANDARD");
    }
    
    return calculateStatsFromTable(table[tier], tier, cr, hpRaw, acRaw, int, isBeastOrPlant, hasPsychicResist, roleUpper);
}

function calculateStatsFromTable(table, tier, cr, hpRaw, acRaw, int, isBeastOrPlant, hasPsychicResist, role) {
    // Difficulty - start with role base, adjust for AC
    let difficulty = getValueInRange(table.difficulty, cr, tier);
    
    // Adjust Difficulty based on AC relative to baseline 5e AC
    let baselineAC = 13;
    if (cr >= 12) baselineAC = 17;
    else if (cr >= 8) baselineAC = 16;
    else if (cr >= 4) baselineAC = 15;
    
    if (acRaw > baselineAC) difficulty = Math.min(difficulty + 1, table.difficulty[1]);
    if (acRaw < baselineAC - 2) difficulty = Math.max(difficulty - 1, table.difficulty[0]);
    difficulty = Math.max(table.difficulty[0], Math.min(table.difficulty[1], difficulty));
    
    // Thresholds
    let major = null, severe = null;
    if (table.major !== null) {
        major = getValueInRange(table.major, cr, tier);
        severe = getValueInRange(table.severe, cr, tier);
    }
    
    // HP - convert from D&D HP using role-specific ranges
    let divisor = 7;
    if (cr >= 15) divisor = 37;
    else if (cr >= 8) divisor = 27;
    else if (cr >= 3) divisor = 17;
    else if (cr >= 0.5) divisor = 11;
    
    let daggerHP = Math.round(hpRaw / divisor);
    
    // Clamp HP to role-specific range
    if (table.hp) {
        daggerHP = Math.max(table.hp[0], Math.min(table.hp[1], daggerHP));
        // Ensure minimum of 1 for non-minions
        if (role !== "MINION") daggerHP = Math.max(1, daggerHP);
    }
    
    // Stress - base on intelligence and role
    let stress = 4;
    if (isBeastOrPlant) stress = 2;
    else if (int < 6) stress = 3;
    else if (int < 10) stress = 4;
    else if (int < 14) stress = 6;
    else if (int >= 14) stress = 8;
    
    // Role-specific stress adjustments
    if (role === "SUPPORT") stress = Math.max(stress, 4);
    if (role === "LEADER") stress = Math.max(stress, 5);
    
    if (hasPsychicResist) stress += 2;
    
    // Clamp stress to role-specific range
    if (table.stress) {
        stress = Math.max(table.stress[0], Math.min(table.stress[1], stress));
    }
    
    // Attack Modifier
    let atkMod = getValueInRange(table.atk, cr, tier);
    
    // Damage Dice
    let damage = selectDamageDice(table.damage, role, tier);
    
    return {
        difficulty,
        threshold_major: major,
        threshold_severe: severe,
        hp: daggerHP,
        stress,
        attack_mod: atkMod,
        damage_dice: damage
    };
}

// ============================================================================
// Main Conversion Functions
// ============================================================================

function convertAdversaries(rows) {
    const converted = [];
    for (const row of rows) {
        if (!row.Name || !row.CR) continue;

        try {
            const adv = convertRow(row);
            converted.push(adv);
        } catch (e) {
            console.warn(`Failed to convert ${row.Name}:`, e.message);
        }
    }
    return converted;
}

function convertRow(row) {
    const cr = parseCR(row.CR);
    const hpRaw = parseHP(row.HP);
    const acRaw = parseAC(row.AC);
    const int = parseInt(row.Intelligence) || 10;

    // Tier
    let tier = 1;
    if (cr >= 15) tier = 4;
    else if (cr >= 8) tier = 3;
    else if (cr >= 3) tier = 2;
    else tier = 1;

    // Calculate HP divisor for role detection
    let divisor = 7;
    if (cr >= 15) divisor = 37;
    else if (cr >= 8) divisor = 27;
    else if (cr >= 3) divisor = 17;
    else if (cr >= 0.5) divisor = 11;
    const daggerHP = Math.round(hpRaw / divisor);

    // Detect role using enhanced heuristics
    const isBeastOrPlant = row.Type && (row.Type.toLowerCase().includes('beast') || row.Type.toLowerCase().includes('plant'));
    const hasPsychicResist = row["Damage Resistances"] && row["Damage Resistances"].toLowerCase().includes('psychic');
    const role = detectRole(row, cr, tier, hpRaw, int, acRaw, daggerHP, divisor);

    // Calculate role-based stats
    const stats = calculateRoleStats(role, tier, cr, hpRaw, acRaw, int, isBeastOrPlant, hasPsychicResist);

    // Biome/Environment
    let biome = "Unknown";
    if (row.Environment) {
        biome = row.Environment.split(',')[0].trim();
    }

    // Features parsing
    const features = [];
    if (row.Traits) features.push({ name: "Traits", entries: parseFeatureText(row.Traits) });
    if (row.Actions) features.push({ name: "Actions", entries: parseFeatureText(row.Actions) });

    return {
        id: row.Name + "_" + Math.random().toString(36).substr(2, 9),
        name: row.Name,
        tier,
        role: role.toUpperCase(), // e.g. BRUISER, STANDARD, RANGED, SKULK, SOLO
        category: row.Type ? row.Type.split(' ')[0] : "Unknown",
        biome: biome,
        stats,
        features,
        original_cr: row.CR,
        source: row.Source
    };
}

function parseFeatureText(text) {
    if (!text) return [];

    // Split by newlines, filtering out empty lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    return lines.map(line => {
        // Find the first period which usually separates Name from Description
        const firstPeriodIndex = line.indexOf('.');

        if (firstPeriodIndex !== -1) {
            const name = line.substring(0, firstPeriodIndex).trim();
            const description = convertRangeText(line.substring(firstPeriodIndex + 1).trim());
            return { name, description };
        } else {
            // Fallback for lines without a period
            return { name: "", description: convertRangeText(line.trim()) };
        }
    });
}

function convertRangeText(text) {
    if (!text) return "";

    const mapRange = (val) => {
        const d = parseInt(val);
        if (isNaN(d)) return val;
        // Melee < 5, Very Close 5-10, Close 10-30, Far 30-100, Very Far 100-300, Out > 300
        if (d < 5) return "Melee";
        if (d <= 10) return "Very Close";
        if (d <= 30) return "Close";
        if (d <= 100) return "Far";
        if (d <= 300) return "Very Far";
        return "Out of Range";
    };

    let newText = text.replace(/Range:\s*Touch/gi, "Range: Melee");

    const replacer = (match, p1, offset, string) => {
        let replacement = mapRange(p1);

        // Handle logic for preserving sentence structure if 'ft.' was used and consumed
        if (match.trim().endsWith('.')) {
            // Look ahead to decide if we need a period
            // If followed by Capital letter (likely new sentence), keep period.
            // If followed by lowercase (likely continuation like "or"), drop period.
            const followIndex = offset + match.length;
            const remaining = string.slice(followIndex);
            const trimmedFollow = remaining.trim();

            // If end of string or followed by Uppercase, add period
            if (trimmedFollow.length === 0 || /^[A-Z]/.test(trimmedFollow)) {
                replacement += ".";
            }
        }
        return replacement;
    };

    // Replace X/Y ft (e.g. 20/60 ft) -> use first value
    newText = newText.replace(/\b(\d+)\s*\/\s*\d+\s*(?:ft\.?|feet|foot)/gi, replacer);

    // Replace X ft / X-foot
    newText = newText.replace(/\b(\d+)\s*-?\s*(?:ft\.?|feet|foot)/gi, replacer);

    // Map D&D abilities to Daggerheart abilities
    const abilityMap = {
        'strength': 'Strength',
        'dexterity': 'Agility',
        'constitution': 'Finesse',
        'intelligence': 'Instinct',
        'wisdom': 'Presence',
        'charisma': 'Presence'
    };

    // Convert DC with ability to Daggerheart format
    // Pattern 1: "DC X Ability saving throw" -> "Ability Reaction Roll (X)"
    // Examples: "DC 15 Wisdom saving throw" -> "Presence Reaction Roll (15)"
    newText = newText.replace(/\bDC\s+(\d+)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s*(?:saving throw|save)\b/gi,
        (match, dc, ability) => {
            const dhAbility = abilityMap[ability.toLowerCase()];
            return `${dhAbility} Reaction Roll (${dc})`;
        });

    // Pattern 2: "Ability Saving Throw: DC X" -> "Ability Reaction Roll (X)"
    // Examples: "Wisdom Saving Throw: DC 15" -> "Presence Reaction Roll (15)"
    newText = newText.replace(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+Saving Throw:\s+DC\s+(\d+)\b/gi,
        (match, ability, dc) => {
            const dhAbility = abilityMap[ability.toLowerCase()];
            return `${dhAbility} Reaction Roll (${dc})`;
        });

    // Handle standalone "DC X" without ability - keep as generic "Difficulty (X)"
    newText = newText.replace(/\bDC\s+(\d+)\b/gi, (match, dc) => `Difficulty (${dc})`);

    return newText;
}

// ============================================================================
// Main Execution
// ============================================================================

// Ensure output dir exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Reading CSV from ${csvPath}...`);
const fileContent = fs.readFileSync(csvPath, 'utf8');

Papa.parse(fileContent, {
    header: true,
    complete: (results) => {
        console.log(`Parsed ${results.data.length} rows.`);
        const adversaries = convertAdversaries(results.data);
        fs.writeFileSync(outputPath, JSON.stringify(adversaries, null, 2));
        console.log(`Wrote ${adversaries.length} adversaries to ${outputPath}`);
    },
    error: (err) => {
        console.error("Error parsing CSV:", err);
    }
});
