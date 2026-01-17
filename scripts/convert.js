
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

// ============================================================================
// Constants
// ============================================================================
const csvPath = path.resolve('./Bestiary.csv');
const outputPath = path.resolve('./src/data/adversaries.json');

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
// Motives & Tactics Generation
// ============================================================================

function generateMotivesAndTactics(row, role, type) {
    const motives = [];
    const nameLower = row.Name ? row.Name.toLowerCase() : "";
    const typeLower = type ? type.toLowerCase() : "";
    const actions = row.Actions ? row.Actions.toLowerCase() : "";
    const traits = row.Traits ? row.Traits.toLowerCase() : "";
    const roleUpper = role.toUpperCase();
    const hpRaw = parseHP(row.HP);
    
    // Dragon-specific patterns
    if (nameLower.includes("dragon") || typeLower.includes("dragon")) {
        if (nameLower.includes("red") || actions.includes("fire") || actions.includes("burn")) {
            motives.push("Burn enemies");
        }
        if (nameLower.includes("gold") || nameLower.includes("silver")) {
            motives.push("Protect territory");
        } else {
            motives.push("Hoard treasure");
        }
        motives.push("Dominate by force");
    }
    
    // Troll-specific patterns
    if (nameLower.includes("troll") || traits.includes("regeneration")) {
        motives.push("Devour");
        motives.push("Pursue");
        motives.push("Crush");
        if (traits.includes("regeneration")) {
            motives.push("Regenerate");
        }
    }
    
    // Goblin/orc/small humanoid patterns
    if (nameLower.includes("goblin") || nameLower.includes("kobold") || 
        (typeLower.includes("humanoid") && roleUpper === "MINION")) {
        motives.push("Ambush");
        motives.push("Steal");
        motives.push("Flee when outnumbered");
        if (roleUpper === "HORDE" || roleUpper === "MINION") {
            motives.push("Attack in groups");
        }
    }
    
    // Leader patterns
    if (roleUpper === "LEADER" || nameLower.includes("commander") || 
        nameLower.includes("captain") || nameLower.includes("general")) {
        motives.push("Command allies");
        motives.push("Coordinate attacks");
        if (!motives.includes("Dominate by force")) {
            motives.push("Maintain authority");
        }
    }
    
    // Bruiser patterns
    if (roleUpper === "BRUISER" || hpRaw > 100) {
        if (!motives.includes("Crush")) motives.push("Crush");
        motives.push("Overwhelm");
        motives.push("Intimidate");
    }
    
    // Support patterns
    if (roleUpper === "SUPPORT" || actions.includes("heal") || actions.includes("bless")) {
        motives.push("Aid allies");
        motives.push("Disrupt enemies");
        if (actions.includes("heal")) {
            motives.push("Protect allies");
        }
    }
    
    // Skulk patterns
    if (roleUpper === "SKULK" || nameLower.includes("rogue") || nameLower.includes("assassin")) {
        motives.push("Ambush");
        motives.push("Strike from shadows");
        motives.push("Escape when threatened");
    }
    
    // Beast/animal patterns
    if (typeLower.includes("beast") || typeLower.includes("animal")) {
        motives.push("Hunt");
        motives.push("Defend territory");
        if (traits.includes("pack") || nameLower.includes("pack")) {
            motives.push("Work in pack");
        }
    }
    
    // Undead patterns
    if (typeLower.includes("undead") || nameLower.includes("zombie") || nameLower.includes("skeleton")) {
        motives.push("Destroy life");
        motives.push("Spread corruption");
        if (nameLower.includes("lich") || nameLower.includes("vampire")) {
            motives.push("Dominate by force");
        }
    }
    
    // Fiend/demon patterns
    if (typeLower.includes("fiend") || typeLower.includes("demon") || typeLower.includes("devil")) {
        motives.push("Corrupt");
        motives.push("Destroy");
        motives.push("Dominate by force");
    }
    
    // Default motives if nothing matched
    if (motives.length === 0) {
        motives.push("Survive");
        motives.push("Protect territory");
        if (actions.includes("attack") || actions.includes("damage")) {
            motives.push("Fight enemies");
        }
    }
    
    // Return 2-4 motives as comma-separated string
    const selectedMotives = motives.slice(0, 4);
    return selectedMotives.join(", ");
}

// ============================================================================
// Experiences Conversion
// ============================================================================

function convertExperiences(row) {
    const experiences = [];
    const skills = row.Skills || "";
    
    if (!skills) return experiences;
    
    // Skill to Experience mapping
    const skillExperienceMap = {
        'stealth': { name: 'Thief', pattern: /stealth/gi },
        'sleight of hand': { name: 'Thief', pattern: /sleight\s+of\s+hand/gi },
        'arcana': { name: 'Scholar', pattern: /arcana/gi },
        'history': { name: 'Scholar', pattern: /history/gi },
        'religion': { name: 'Scholar', pattern: /religion/gi },
        'nature': { name: 'Wilderness', pattern: /nature/gi },
        'animal handling': { name: 'Wilderness', pattern: /animal\s+handling/gi },
        'survival': { name: 'Wilderness', pattern: /survival/gi },
        'athletics': { name: 'Athlete', pattern: /athletics/gi },
        'acrobatics': { name: 'Athlete', pattern: /acrobatics/gi },
        'persuasion': { name: 'Diplomat', pattern: /persuasion/gi },
        'deception': { name: 'Diplomat', pattern: /deception/gi },
        'intimidation': { name: 'Diplomat', pattern: /intimidation/gi }
    };
    
    // Parse skills like "Stealth +6, Perception +2" or "Perception +13, Stealth +6"
    const skillEntries = {};
    
    // Match skill patterns: "Skill Name +X" or "Skill Name +X (bonus)"
    const skillPattern = /([A-Za-z\s]+?)\s*\+(\d+)/g;
    let match;
    
    while ((match = skillPattern.exec(skills)) !== null) {
        const skillName = match[1].trim().toLowerCase();
        const bonus = parseInt(match[2], 10);
        
        // Find matching experience
        for (const [key, value] of Object.entries(skillExperienceMap)) {
            if (value.pattern.test(skillName)) {
                // Convert D&D bonus to Daggerheart value (+1 to +3)
                // +0-2 -> +1, +3-5 -> +2, +6+ -> +3
                let dhValue = 1;
                if (bonus >= 6) dhValue = 3;
                else if (bonus >= 3) dhValue = 2;
                
                // Store highest value if same experience appears multiple times
                const existing = skillEntries[value.name];
                if (!existing || existing.value < dhValue) {
                    skillEntries[value.name] = { name: value.name, value: dhValue };
                }
                break;
            }
        }
    }
    
    // Convert to array
    return Object.values(skillEntries);
}

// ============================================================================
// Feature Classification and Enhancement
// ============================================================================

function classifyFeature(description) {
    if (!description) return "Passive";
    
    const descLower = description.toLowerCase();
    
    // Reaction keywords - highest priority (check first)
    if (descLower.includes("when ") || descLower.includes("in response to") ||
        descLower.includes("after being") || descLower.includes("reaction") ||
        descLower.includes("if ") && descLower.includes("attacked") ||
        descLower.includes("as a reaction")) {
        return "Reaction";
    }
    
    // Action keywords
    if (descLower.includes("can make") || descLower.includes("make an attack") ||
        descLower.includes("spend") || descLower.includes("force") ||
        descLower.includes("exhale") || descLower.includes("multiattack") ||
        descLower.includes("action:") || descLower.includes("uses") ||
        descLower.includes("may")) {
        return "Action";
    }
    
    // Passive keywords (default)
    if (descLower.includes("always") || descLower.includes("resistant") ||
        descLower.includes("immune") || descLower.includes("can be") ||
        descLower.includes("passive") || descLower.includes("regeneration") ||
        descLower.includes("minion") || descLower.includes("has") ||
        descLower.includes("is") || descLower.includes("at the start")) {
        return "Passive";
    }
    
    // Default to Passive for traits/abilities that are always active
    return "Passive";
}

function convertDnDTerminology(text) {
    if (!text) return "";
    
    let newText = text;
    
    // Convert "saving throw" / "save" to "Reaction Roll" (but not if already converted)
    newText = newText.replace(/\bsaving throw\b/gi, "Reaction Roll");
    newText = newText.replace(/\b(?<!reaction\s)save\b/gi, "Reaction Roll");
    
    // Remove or simplify advantage/disadvantage references
    newText = newText.replace(/\bhas advantage\b/gi, "has a bonus");
    newText = newText.replace(/\bwith advantage\b/gi, "with a bonus");
    newText = newText.replace(/\badvantage on\b/gi, "bonus on");
    newText = newText.replace(/\bdisadvantage\b/gi, "penalty");
    
    // Convert "hit points" / "HP" terminology (keep HP but clarify context)
    newText = newText.replace(/\bhit points\b/gi, "HP");
    
    // Convert common D&D damage types to Daggerheart format
    // (Daggerheart uses: physical, magic, fire, cold, etc.)
    // Most are already compatible, but we can ensure consistency
    
    // Convert "nonmagical" to "non-magical" for consistency
    newText = newText.replace(/\bnonmagical\b/gi, "non-magical");
    
    // Remove or convert "creature" to more narrative language when appropriate
    // (Keep it for clarity in some contexts)
    
    // Convert "target" to more narrative language in some contexts
    // But keep for mechanical clarity
    
    return newText;
}

// Convert markdown bold syntax to HTML bold tags
function convertMarkdownToHTML(text) {
    if (!text) return "";
    
    // Convert **text** to <strong>text</strong>
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function addRoleSpecificFeatures(features, role, cr, tier) {
    const roleUpper = role.toUpperCase();
    const newFeatures = [];
    
    // Check existing feature names (case-insensitive)
    const existingFeatureNames = new Set();
    features.forEach(featGroup => {
        featGroup.entries.forEach(entry => {
            existingFeatureNames.add(entry.name.toLowerCase());
        });
    });
    
    const hasFeature = (name) => {
        const nameLower = name.toLowerCase();
        for (const existing of existingFeatureNames) {
            if (existing.includes(nameLower) || nameLower.includes(existing)) {
                return true;
            }
        }
        return false;
    };
    
    // BRUISER: Add Momentum or Ramp Up if missing
    if (roleUpper === "BRUISER") {
        if (!hasFeature("momentum")) {
            newFeatures.push({
                name: "Momentum",
                description: convertMarkdownToHTML("**Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.")
            });
        }
        if (cr >= 5 && !hasFeature("ramp up") && !hasFeature("heavy hitter")) {
            newFeatures.push({
                name: "Heavy Hitter",
                description: convertMarkdownToHTML("**Reaction:** When this adversary deals damage with a standard attack, you can spend a Fear to gain a +2 bonus to the damage roll.")
            });
        }
    }
    
    // LEADER: Add Momentum and Tactician
    if (roleUpper === "LEADER") {
        if (!hasFeature("momentum")) {
            newFeatures.push({
                name: "Momentum",
                description: convertMarkdownToHTML("**Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.")
            });
        }
        if (!hasFeature("tactician")) {
            newFeatures.push({
                name: "Tactician",
                description: convertMarkdownToHTML("**Action:** Mark a Stress to spotlight this adversary and two allies within Close range.")
            });
        }
    }
    
    // MINION: Ensure Minion(X) passive exists
    if (roleUpper === "MINION") {
        if (!hasFeature("minion")) {
            // Determine X based on tier
            const minionValue = tier === 1 ? 3 : tier === 2 ? 5 : tier === 3 ? 7 : 9;
            newFeatures.push({
                name: `Minion (${minionValue})`,
                description: convertMarkdownToHTML(`**Passive:** This adversary is defeated when it takes any damage. For every ${minionValue} damage a PC deals to this adversary, defeat an additional Minion within range that the attack would hit.`)
            });
        }
    }
    
    // SUPPORT: Add features that mark Stress or cause PCs to lose Hope
    if (roleUpper === "SUPPORT") {
        if (!hasFeature("disrupt") && !hasFeature("harry")) {
            newFeatures.push({
                name: "Harass",
                description: convertMarkdownToHTML("**Action:** Mark a Stress to force a PC within Close range to make a test against this adversary's Difficulty or mark a Stress.")
            });
        }
    }
    
    // SOLO/LEGENDARY: Add Relentless(X) for high-CR
    if ((roleUpper === "SOLO" || roleUpper === "LEGENDARY") && cr >= 15) {
        if (!hasFeature("relentless")) {
            const relentlessValue = cr >= 20 ? 3 : 2;
            newFeatures.push({
                name: `Relentless (${relentlessValue})`,
                description: convertMarkdownToHTML(`**Passive:** This adversary can be spotlighted up to ${relentlessValue} times per conflict. Spend Fear as usual to spotlight them.`)
            });
        }
    }
    
    // Add new features to Actions section if it exists, otherwise create it
    if (newFeatures.length > 0) {
        let actionsSection = features.find(f => f.name === "Actions");
        if (!actionsSection) {
            actionsSection = { name: "Actions", entries: [] };
            features.push(actionsSection);
        }
        // Also add to Traits if they're passives
        newFeatures.forEach(feat => {
            if (feat.description.includes("<strong>Passive:</strong>")) {
                let traitsSection = features.find(f => f.name === "Traits");
                if (!traitsSection) {
                    traitsSection = { name: "Traits", entries: [] };
                    features.unshift(traitsSection);
                }
                traitsSection.entries.push(feat);
            } else {
                actionsSection.entries.push(feat);
            }
        });
    }
    
    return features;
}

// ============================================================================
// Enhanced Action Conversion to Daggerheart Format
// ============================================================================

function convertActionsToDaggerheart(text, role, cr, tier) {
    if (!text) return [];
    
    // Split by newlines - actions in CSV are typically on separate lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const convertedActions = [];
    const actionGroups = [];
    
    // First pass: parse and group related actions
    let currentGroup = null;
    for (const line of lines) {
        const firstPeriodIndex = line.indexOf('.');
        if (firstPeriodIndex === -1) continue;
        
        const name = line.substring(0, firstPeriodIndex).trim();
        const description = line.substring(firstPeriodIndex + 1).trim();
        const descLower = description.toLowerCase();
        
        // Check if this is a multiattack that groups other actions
        if (name.toLowerCase().includes('multiattack') || (descLower.includes('makes') && descLower.includes('attacks'))) {
            currentGroup = { type: 'multiattack', name, description: description, actions: [] };
            actionGroups.push(currentGroup);
        } else if (currentGroup && currentGroup.type === 'multiattack') {
            // Add to current multiattack group only if it looks like an attack description
            // Stop grouping if we hit a non-attack action (like a special ability)
            if (descLower.includes('attack') || descLower.includes('hit:') || descLower.includes('melee') || descLower.includes('ranged')) {
                currentGroup.actions.push({ name, description: description });
            } else {
                // Not part of multiattack, start new standalone action
                actionGroups.push({ type: 'standalone', name, description: description });
                currentGroup = null;
            }
        } else {
            // Standalone action
            actionGroups.push({ type: 'standalone', name, description: description });
            currentGroup = null;
        }
    }
    
    // Second pass: convert each action/group to Daggerheart format
    for (const group of actionGroups) {
        if (group.type === 'multiattack') {
            // Convert multiattack to a single Daggerheart action
            const converted = convertMultiattack(group, role, cr, tier);
            if (converted) convertedActions.push(converted);
        } else {
            // Convert standalone action
            const converted = convertSingleAction(group.name, group.description, role, cr, tier);
            if (converted) convertedActions.push(converted);
        }
    }
    
    return convertedActions;
}

function convertMultiattack(group, role, cr, tier) {
    // Multiattack becomes a Stress action that allows multiple attacks
    const attackCount = group.actions.length || 2;
    const name = group.name || "Multiattack";
    
    let description = `Mark a Stress to make ${attackCount} standard attacks.`;
    
    // Add special effects if the attacks have different properties
    const hasDifferentAttacks = group.actions.some(a => {
        const desc = a.description.toLowerCase();
        return desc.includes('piercing') || desc.includes('slashing') || desc.includes('bludgeoning') ||
               desc.includes('fire') || desc.includes('cold') || desc.includes('lightning');
    });
    
    if (hasDifferentAttacks && group.actions.length > 0) {
        const firstAction = group.actions[0];
        const damageType = extractDamageType(firstAction.description);
        if (damageType) {
            description += ` Each attack deals the standard damage${damageType !== 'physical' ? ` (${damageType})` : ''}.`;
        }
    }
    
    return {
        name,
        description: convertMarkdownToHTML(`**Action:** ${description}`)
    };
}

function convertSingleAction(name, description, role, cr, tier) {
    const descLower = description.toLowerCase();
    let converted = description;
    
    // Convert D&D terminology first
    converted = convertDnDTerminology(converted);
    converted = convertRangeText(converted);
    
    // Detect action type and convert accordingly
    let needsFear = false;
    let needsStress = false;
    let actionType = "Action";
    
    // Movement/shock wave effects -> Stress or Fear actions
    if ((name.toLowerCase().includes('movement') || name.toLowerCase().includes('stomp') || 
         name.toLowerCase().includes('shake') || descLower.includes('shock wave') || 
         descLower.includes('emanation')) && descLower.includes('move')) {
        needsStress = true;
        const range = extractRange(descLower);
        const conditions = [];
        if (descLower.includes('prone')) conditions.push('Prone');
        if (descLower.includes('concentration')) {
            converted = `Mark a Stress to move up to this adversary's Speed. At the end of this movement, create a shock wave in a ${range || '60-foot emanation'} originating from this adversary. Creatures in that area lose Concentration${conditions.length > 0 ? ` and, if Medium or smaller, have the ${conditions.join(' and ')} condition` : ''}.`;
        } else {
            converted = `Mark a Stress to move up to this adversary's Speed. At the end of this movement, create a shock wave in a ${range || '60-foot emanation'} originating from this adversary. Creatures in that area${conditions.length > 0 ? ` have the ${conditions.join(' and ')} condition` : ' are affected'}.`;
        }
    }
    // Breath weapons and area effects -> Fear actions
    // Check for cone/line/area effects first, including those with saving throws
    else if (descLower.includes('breath') || descLower.includes('exhale') || 
        descLower.includes('cone') || descLower.includes('line') ||
        (descLower.includes('each creature') && (descLower.includes('cone') || descLower.includes('emanation') || descLower.includes('radius'))) ||
        (descLower.includes('all') && descLower.includes('within') && descLower.includes('range'))) {
        needsFear = true;
        const range = extractRange(descLower);
        const damage = extractDamage(description);
        const damageType = extractDamageType(description);
        const saveInfo = extractSaveInfo(description);
        
        // Extract conditions from description (like Deafened, Frightened)
        const conditions = [];
        if (descLower.includes('deafened')) conditions.push('Deafened');
        if (descLower.includes('frightened')) conditions.push('Frightened');
        if (descLower.includes('prone')) conditions.push('Prone');
        if (descLower.includes('restrained')) conditions.push('Restrained');
        if (descLower.includes('blinded')) conditions.push('Blinded');
        
        // Determine area type
        let areaType = 'area';
        if (descLower.includes('cone')) areaType = 'cone';
        else if (descLower.includes('line')) areaType = 'line';
        else if (descLower.includes('emanation') || descLower.includes('radius')) areaType = 'emanation';
        
        // Build the conversion
        const actionName = name.toLowerCase();
        let actionVerb = 'use this ability';
        if (actionName.includes('breath') || actionName.includes('bellow') || actionName.includes('roar')) {
            actionVerb = getBreathVerb(name);
        } else if (actionName.includes('movement') || actionName.includes('stomp') || actionName.includes('shake')) {
            actionVerb = 'create a shock wave';
        }
        
        const fearCost = (damage && (damage.includes('d10') || damage.includes('d12'))) || 
                        (damage && parseInt(damage.match(/\d+/)?.[0]) > 30) ? 2 : 1;
        
        converted = `Spend ${fearCost === 2 ? 'two' : 'a'} Fear to ${actionVerb} in a ${range ? range + ' ' + areaType : areaType + ' of Medium range'}. `;
        converted += `All targets within that area must make ${saveInfo || 'a Reaction Roll against this adversary\'s Difficulty'}. `;
        
        if (damage) {
            converted += `Targets who fail take ${damage}${damageType && damageType !== 'physical' ? ' ' + damageType : ''} damage`;
            if (conditions.length > 0) {
                converted += ` and have the ${conditions.join(' and ')} condition${conditions.length > 1 ? 's' : ''} until the end of their next turn`;
            }
            converted += '.';
            if (saveInfo || descLower.includes('success') || descLower.includes('half')) {
                converted += ` Targets who succeed take half damage${conditions.length > 0 ? ' only' : ''}.`;
            }
        } else {
            converted += `Targets who fail take damage equal to this adversary's standard attack damage${damageType && damageType !== 'physical' ? ' (' + damageType + ')' : ''}`;
            if (conditions.length > 0) {
                converted += ` and have the ${conditions.join(' and ')} condition${conditions.length > 1 ? 's' : ''} until the end of their next turn`;
            }
            converted += '.';
        }
    }
    
    // Summoning -> Fear action (but not if it's a movement/shock wave)
    else if ((descLower.includes('summon') || descLower.includes('conjure')) && 
             !descLower.includes('shock wave') && !descLower.includes('emanation')) {
        needsFear = true;
        const summonCount = extractNumber(description, /(\d+)\s+(?:creature|ally|minion)/i) || 1;
        const range = extractRange(descLower) || 'Far range';
        converted = `Spend a Fear to summon ${summonCount} ${getSummonType(name, description)}${summonCount > 1 ? 's' : ''}, who appear at ${range}.`;
    }
    
    // Multi-target attacks -> Stress action (but not if already handled as area effect)
    else if ((descLower.includes('all targets') || descLower.includes('each creature')) && 
             !descLower.includes('cone') && !descLower.includes('emanation') && !descLower.includes('radius') &&
             !descLower.includes('saving throw')) {
        needsStress = true;
        const range = extractRange(descLower) || 'Close range';
        converted = `Mark a Stress to make a standard attack against all targets within ${range}. `;
        converted += `Targets this adversary succeeds against take the standard attack damage.`;
    }
    
    // Single target weapon attacks -> can be standard or Stress-enhanced
    else if (descLower.includes('melee weapon attack') || descLower.includes('ranged weapon attack') ||
             descLower.includes('melee spell attack') || descLower.includes('ranged spell attack') ||
             descLower.includes('melee attack roll') || descLower.includes('ranged attack roll')) {
        // If it's a special attack (poison, grapple, swallow, etc.), make it a Stress action
        if (descLower.includes('poison') || descLower.includes('grapple') || descLower.includes('restrain') ||
            descLower.includes('frighten') || descLower.includes('charm') || descLower.includes('swallow') ||
            descLower.includes('prone') || descLower.includes('blinded')) {
            needsStress = true;
            const effect = extractEffect(description);
            const damage = extractDamage(description);
            const damageType = extractDamageType(description);
            converted = `Mark a Stress to make a standard attack against a target. On a success, the target takes ${damage || 'the standard attack'}${damageType && damageType !== 'physical' ? ' ' + damageType : ''} damage${effect ? ' and ' + effect : ''}.`;
        } else {
            // Regular attack - keep it but mark as optional/standard
            const damage = extractDamage(description);
            const damageType = extractDamageType(description);
            if (damage && damage !== 'standard') {
                converted = `Make a standard attack against a target. On a success, the target takes ${damage}${damageType && damageType !== 'physical' ? ' ' + damageType : ''} damage.`;
            } else {
                // This is a standard attack - still include it but note it's the basic attack
                converted = `Make a standard attack against a target.`;
            }
        }
    }
    
    // Spell-like effects -> Fear or Stress depending on power
    else if (descLower.includes('spell') || descLower.includes('magic') || descLower.includes('cast')) {
        const isPowerful = descLower.includes('damage') && (descLower.includes('d10') || descLower.includes('d12'));
        if (isPowerful || descLower.includes('all') || descLower.includes('area')) {
            needsFear = true;
            converted = `Spend a Fear to ${getSpellAction(description)}. ${converted}`;
        } else {
            needsStress = true;
            converted = `Mark a Stress to ${getSpellAction(description)}. ${converted}`;
        }
    }
    
    // Recharge abilities -> add recharge note (may already be a Fear action from above)
    if (descLower.includes('recharge') && !converted.includes('Recharge')) {
        const recharge = extractRecharge(description);
        if (recharge) {
            // If not already a Fear action, make it one
            if (!needsFear && !needsStress) {
                needsFear = true;
                if (!converted.startsWith('Spend')) {
                    converted = `Spend a Fear to ${converted.toLowerCase()}`;
                }
            }
            converted += ` (Recharge ${recharge})`;
        }
    }
    
    // If no special conversion happened, check if it needs Fear/Stress
    if (!needsFear && !needsStress && !converted.startsWith('*')) {
        // Check if it's a powerful ability that should cost Fear
        if (descLower.includes('frightful') || descLower.includes('fear') || descLower.includes('terror') ||
            descLower.includes('legendary') || descLower.includes('lair') ||
            (descLower.includes('damage') && (descLower.includes('d10') || descLower.includes('d12')))) {
            needsFear = true;
            converted = `Spend a Fear to ${converted.toLowerCase()}`;
        }
        // Otherwise, if it's an active ability, it might need Stress
        else if (!descLower.includes('passive') && !descLower.includes('always') && 
                 (descLower.includes('force') || descLower.includes('make') || descLower.includes('target') ||
                  descLower.includes('move') || descLower.includes('creates') || descLower.includes('causes'))) {
            needsStress = true;
            converted = `Mark a Stress to ${converted.toLowerCase()}`;
        }
        // If it's still not converted and looks like an action, make it a Stress action by default
        else if (!descLower.includes('passive') && !descLower.includes('always') && 
                 description.length > 10) {
            needsStress = true;
            converted = `Mark a Stress to ${converted.toLowerCase()}`;
        }
    }
    
    // Add action type prefix if not present
    if (!converted.startsWith('**')) {
        if (needsFear || needsStress) {
            actionType = "Action";
        } else {
            actionType = classifyFeature(converted);
        }
        converted = `**${actionType}:** ${converted}`;
    }
    
    // Never return null - always return a converted action
    return {
        name,
        description: convertMarkdownToHTML(converted)
    };
}

// Helper functions for action conversion
function extractRange(text) {
    const rangeMatch = text.match(/(\d+)\s*ft|feet/);
    if (rangeMatch) {
        const feet = parseInt(rangeMatch[1]);
        if (feet <= 5) return 'Melee';
        if (feet <= 30) return 'Very Close range';
        if (feet <= 60) return 'Close range';
        if (feet <= 120) return 'Medium range';
        return 'Far range';
    }
    if (text.includes('melee')) return 'Melee';
    if (text.includes('close')) return 'Close range';
    if (text.includes('medium')) return 'Medium range';
    if (text.includes('far') || text.includes('long')) return 'Far range';
    return null;
}

function extractDamage(text) {
    // Look for damage dice like "2d6+4" or "1d8" or "78 (12d12)"
    // First try to find dice notation (preferred)
    const damageMatch = text.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
    if (damageMatch) {
        const dice = damageMatch[1];
        const die = damageMatch[2];
        const mod = damageMatch[3] || '';
        return `${dice}d${die}${mod ? '+' + mod : ''}`;
    }
    // Look for average damage in format "78 (12d12)" - extract the dice part
    const avgWithDiceMatch = text.match(/(\d+)\s*\((\d+)d(\d+)(?:\s*\+\s*(\d+))?\)/);
    if (avgWithDiceMatch) {
        const dice = avgWithDiceMatch[2];
        const die = avgWithDiceMatch[3];
        const mod = avgWithDiceMatch[4] || '';
        return `${dice}d${die}${mod ? '+' + mod : ''}`;
    }
    // Look for just average damage number if no dice found
    const avgMatch = text.match(/(\d+)\s+damage/);
    if (avgMatch && parseInt(avgMatch[1]) > 5) {
        return avgMatch[1];
    }
    return null;
}

function extractDamageType(text) {
    const textLower = text.toLowerCase();
    if (textLower.includes('fire')) return 'fire';
    if (textLower.includes('cold') || textLower.includes('frost')) return 'cold';
    if (textLower.includes('lightning') || textLower.includes('thunder')) return 'lightning';
    if (textLower.includes('poison')) return 'poison';
    if (textLower.includes('acid')) return 'acid';
    if (textLower.includes('necrotic')) return 'necrotic';
    if (textLower.includes('radiant')) return 'radiant';
    if (textLower.includes('psychic')) return 'psychic';
    if (textLower.includes('force') || textLower.includes('magic')) return 'magic';
    return 'physical';
}

function extractSaveInfo(text) {
    const abilityMap = {
        'strength': 'Strength',
        'dexterity': 'Agility',
        'constitution': 'Finesse',
        'intelligence': 'Instinct',
        'wisdom': 'Presence',
        'charisma': 'Presence'
    };
    
    // Pattern 1: "Constitution Saving Throw: DC 27" (with colon)
    let saveMatch = text.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+Saving Throw:\s+DC\s+(\d+)/i);
    if (saveMatch) {
        const ability = abilityMap[saveMatch[1].toLowerCase()];
        const dc = saveMatch[2];
        return `${ability} Reaction Roll (${dc})`;
    }
    
    // Pattern 2: "DC 27 Constitution saving throw" or "DC 27, Constitution saving throw"
    saveMatch = text.match(/DC\s+(\d+)[,\s]+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s*(?:saving throw|save)/i);
    if (saveMatch) {
        const dc = saveMatch[1];
        const ability = abilityMap[saveMatch[2].toLowerCase()];
        return `${ability} Reaction Roll (${dc})`;
    }
    
    // Pattern 3: "Constitution saving throw: DC 27" (alternative format)
    saveMatch = text.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s*(?:saving throw|save):\s*DC\s+(\d+)/i);
    if (saveMatch) {
        const ability = abilityMap[saveMatch[1].toLowerCase()];
        const dc = saveMatch[2];
        return `${ability} Reaction Roll (${dc})`;
    }
    
    // Pattern 4: "Ability saving throw" without DC
    saveMatch = text.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s*(?:saving throw|save)/i);
    if (saveMatch) {
        const ability = abilityMap[saveMatch[1].toLowerCase()];
        return `${ability} Reaction Roll`;
    }
    
    return null;
}

function extractEffect(text) {
    const textLower = text.toLowerCase();
    if (textLower.includes('poisoned')) return 'becomes *Poisoned*';
    if (textLower.includes('frightened')) return 'becomes *Frightened*';
    if (textLower.includes('restrained')) return 'becomes *Restrained*';
    if (textLower.includes('charmed')) return 'becomes *Charmed*';
    if (textLower.includes('stunned')) return 'becomes *Stunned*';
    return null;
}

function extractRecharge(text) {
    const rechargeMatch = text.match(/recharge\s*(\d+)[-\s]*(\d+)/i);
    if (rechargeMatch) {
        return `${rechargeMatch[1]}-${rechargeMatch[2]}`;
    }
    return null;
}

function extractNumber(text, pattern) {
    const match = text.match(pattern);
    return match ? parseInt(match[1]) : null;
}

function getBreathVerb(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('fire')) return 'exhale fire';
    if (nameLower.includes('frost') || nameLower.includes('cold')) return 'exhale frost';
    if (nameLower.includes('lightning') || nameLower.includes('thunder') || nameLower.includes('bellow')) return 'exhale thunder';
    if (nameLower.includes('poison')) return 'exhale poison';
    if (nameLower.includes('acid')) return 'exhale acid';
    if (nameLower.includes('bellow') || nameLower.includes('roar')) return 'release a thunderous bellow';
    return 'exhale destructive energy';
}

function getSummonType(name, description) {
    const descLower = description.toLowerCase();
    if (descLower.includes('skeleton') || descLower.includes('zombie')) return 'undead minion';
    if (descLower.includes('demon') || descLower.includes('devil')) return 'fiend';
    if (descLower.includes('elemental')) return 'elemental';
    if (descLower.includes('beast') || descLower.includes('animal')) return 'beast';
    return 'ally';
}

function getSpellAction(description) {
    const descLower = description.toLowerCase();
    if (descLower.includes('cast')) {
        return description.match(/cast\s+([^.]+)/i)?.[1] || 'use this ability';
    }
    return 'use this ability';
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
    
    // Collect all actions from Actions, Bonus Actions, and Legendary Actions columns
    const allActions = [];
    if (row.Actions) {
        const actions = convertActionsToDaggerheart(row.Actions, role, cr, tier);
        allActions.push(...actions);
    }
    if (row["Bonus Actions"]) {
        const bonusActions = convertActionsToDaggerheart(row["Bonus Actions"], role, cr, tier);
        allActions.push(...bonusActions);
    }
    if (row["Legendary Actions"]) {
        const legendaryActions = convertActionsToDaggerheart(row["Legendary Actions"], role, cr, tier);
        allActions.push(...legendaryActions);
    }
    
    if (allActions.length > 0) {
        features.push({ name: "Actions", entries: allActions });
    }
    
    // Add role-specific features
    const enhancedFeatures = addRoleSpecificFeatures(features, role, cr, tier);

    // Generate Motives & Tactics
    const motivesTactics = generateMotivesAndTactics(row, role, row.Type ? row.Type.split(' ')[0] : "");

    // Convert Experiences from Skills
    const experiences = convertExperiences(row);

    return {
        id: row.Name + "_" + Math.random().toString(36).substr(2, 9),
        name: row.Name,
        tier,
        role: role.toUpperCase(), // e.g. BRUISER, STANDARD, RANGED, SKULK, SOLO
        category: row.Type ? row.Type.split(' ')[0] : "Unknown",
        biome: biome,
        stats,
        features: enhancedFeatures,
        motives_tactics: motivesTactics,
        experiences: experiences,
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
            let description = line.substring(firstPeriodIndex + 1).trim();
            
            // Convert D&D terminology first, then range text
            description = convertDnDTerminology(description);
            description = convertRangeText(description);
            
            // Classify feature and add proper tag if not already present
            const featureType = classifyFeature(description);
            if (!description.startsWith("**Passive:**") && 
                !description.startsWith("**Action:**") && 
                !description.startsWith("**Reaction:**")) {
                description = `**${featureType}:** ${description}`;
            }
            
            return { name, description: convertMarkdownToHTML(description) };
        } else {
            // Fallback for lines without a period
            let description = line.trim();
            description = convertDnDTerminology(description);
            description = convertRangeText(description);
            
            // Classify feature and add proper tag if not already present
            const featureType = classifyFeature(description);
            if (!description.startsWith("**Passive:**") && 
                !description.startsWith("**Action:**") && 
                !description.startsWith("**Reaction:**")) {
                description = `**${featureType}:** ${description}`;
            }
            
            return { name: "", description: convertMarkdownToHTML(description) };
        }
    });
}

function convertRangeText(text) {
    if (!text) return "";

    let newText = text;

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
