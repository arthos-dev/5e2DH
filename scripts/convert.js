
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

// ============================================================================
// Constants
// ============================================================================
const csvPath = path.resolve('./Bestiary.csv');
const daggerheartCsvPath = path.resolve('./adversaries-extracted.csv');
const spellsPath = path.resolve('./Spells.csv');
const outputPath = path.resolve('./src/data/adversaries.json');

// ============================================================================
// Spell Database
// ============================================================================
let spellDatabase = new Map(); // Key: normalized spell name (lowercase), Value: spell data object

// Load spells database
function loadSpellsDatabase() {
    if (!fs.existsSync(spellsPath)) {
        console.warn(`Spells.csv not found at ${spellsPath}`);
        return;
    }
    
    const spellsContent = fs.readFileSync(spellsPath, 'utf8');
    const spellsResult = Papa.parse(spellsContent, { header: true });
    
    for (const spell of spellsResult.data) {
        if (spell.Name && spell.Name.trim()) {
            const normalizedName = spell.Name.toLowerCase().trim();
            spellDatabase.set(normalizedName, {
                name: spell.Name,
                level: spell.Level || '',
                castingTime: spell['Casting Time'] || '',
                duration: spell.Duration || '',
                school: spell.School || '',
                range: spell.Range || '',
                components: spell.Components || '',
                text: spell.Text || '',
                atHigherLevels: spell['At Higher Levels'] || ''
            });
        }
    }
    
    console.log(`Loaded ${spellDatabase.size} spells from Spells.csv`);
}

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

// Format Randomized Tactics feature to split moves onto separate lines
function formatRandomizedTactics(text) {
    if (!text) return text;
    
    // Check if this looks like Randomized Tactics
    if (!text.includes("Mark a Stress and roll a d6") || !text.includes("corresponding move:")) {
        return text;
    }
    
    // Find the intro text and the moves section
    const moveIndex = text.indexOf("corresponding move:");
    if (moveIndex === -1) return text;
    
    const intro = text.substring(0, moveIndex + "corresponding move:".length).trim();
    const movesText = text.substring(moveIndex + "corresponding move:".length).trim();
    
    // List of known move names (capitalized, followed by colon)
    const moveNames = [
        "Mana Beam",
        "Fire Jets", 
        "Trample",
        "Shocking Gas",
        "Stunning Clap",
        "Psionic Whine"
    ];
    
    // Build regex to match any of these move names followed by colon
    // Escape special regex characters in move names
    const escapedMoveNames = moveNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const movePattern = new RegExp(`(${escapedMoveNames.join('|')}):\\s*`, 'g');
    
    // Split the text by move names - simpler approach
    // Replace each move name with a marker, then split
    let processedText = movesText;
    const movePositions = [];
    
    // Find all move positions
    let match;
    while ((match = movePattern.exec(movesText)) !== null) {
        movePositions.push({
            name: match[1],
            index: match.index,
            fullMatch: match[0]
        });
    }
    
    // Process moves in reverse order to preserve indices
    const parts = [];
    for (let i = movePositions.length - 1; i >= 0; i--) {
        const currentMove = movePositions[i];
        const nextMove = i < movePositions.length - 1 ? movePositions[i + 1] : null;
        
        // Extract description: from after this move's colon to before next move's name
        const descStart = currentMove.index + currentMove.fullMatch.length;
        const descEnd = nextMove ? nextMove.index : movesText.length;
        const description = movesText.substring(descStart, descEnd).trim();
        
        // Remove any trailing move name that might have been included
        let cleanDesc = description;
        for (const moveName of moveNames) {
            const trailingPattern = new RegExp(`\\s*${moveName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*$`);
            cleanDesc = cleanDesc.replace(trailingPattern, '');
        }
        
        if (cleanDesc) {
            parts.unshift({
                type: 'move',
                name: currentMove.name,
                description: cleanDesc
            });
        }
    }
    
    // Add any text before the first move
    if (movePositions.length > 0 && movePositions[0].index > 0) {
        const beforeText = movesText.substring(0, movePositions[0].index).trim();
        if (beforeText) {
            parts.unshift({ type: 'text', content: beforeText });
        }
    }
    
    // If we didn't find any moves with the pattern, try a more general approach
    if (parts.length === 0) {
        // Try to split by finding move name patterns: "MoveName: description"
        // Look for capitalized words followed by colon that are likely move names
        // Use a safer approach: find all potential move names first
        const moveMatches = [];
        const moveNamePattern = /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*?):\s*/g;
        let moveMatch;
        let lastIndex = 0;
        
        // Collect all potential move matches
        while ((moveMatch = moveNamePattern.exec(movesText)) !== null) {
            // Avoid infinite loop by checking we're making progress
            if (moveMatch.index <= lastIndex && moveMatches.length > 0) {
                break;
            }
            lastIndex = moveMatch.index;
            
            const moveName = moveMatch[1].trim();
            // Only consider short names as potential moves (2-25 chars)
            if (moveName.length >= 2 && moveName.length <= 25) {
                moveMatches.push({
                    name: moveName,
                    index: moveMatch.index,
                    fullMatch: moveMatch[0],
                    fullMatchLength: moveMatch[0].length
                });
            }
        }
        
        // Process each move match
        if (moveMatches.length > 0) {
            for (let i = 0; i < moveMatches.length; i++) {
                const currentMove = moveMatches[i];
                const moveStart = currentMove.index + currentMove.fullMatchLength;
                const moveEnd = i < moveMatches.length - 1 
                    ? moveMatches[i + 1].index 
                    : movesText.length;
                
                const moveDescription = movesText.substring(moveStart, moveEnd).trim();
                
                // Add text before first move if any
                if (i === 0 && currentMove.index > 0) {
                    const beforeText = movesText.substring(0, currentMove.index).trim();
                    if (beforeText) {
                        parts.push({ type: 'text', content: beforeText });
                    }
                }
                
                // Only add as a move if description exists
                if (moveDescription) {
                    parts.push({ 
                        type: 'move', 
                        name: currentMove.name, 
                        description: moveDescription 
                    });
                }
            }
        }
    }
    
    // Build formatted text
    const formattedParts = [intro];
    
    for (const part of parts) {
        if (part.type === 'move') {
            // Format move as: **Move Name:** description
            formattedParts.push(`**${part.name}:** ${part.description}`);
        } else {
            formattedParts.push(part.content);
        }
    }
    
    // Join with newlines (which will be converted to <br/> by the UI)
    return formattedParts.join('\n');
}

// Convert markdown bold syntax to HTML bold tags
// Also handles bullet points and multi-line formatting for spell descriptions
function convertMarkdownToHTML(text) {
    if (!text) return "";
    
    // First, convert **text** to <strong>text</strong>
    let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert markdown bullet points (-) to HTML lists
    // Split by lines to process bullet points
    const lines = html.split('\n');
    const result = [];
    let inList = false;
    let listItems = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Check if this line is a bullet point (starts with - after optional whitespace)
        const bulletMatch = line.match(/^(\s*)(-)\s+(.+)$/);
        
        if (bulletMatch) {
            // If we weren't in a list, start one
            if (!inList) {
                inList = true;
                listItems = [];
            }
            
            const indent = bulletMatch[1].length;
            const content = bulletMatch[3];
            
            // Handle indented content (spell descriptions) - collect following indented lines
            let itemContent = content;
            let j = i + 1;
            const itemLines = [content];
            
            // Collect following indented lines that are part of this bullet item
            while (j < lines.length) {
                const nextLine = lines[j];
                const nextTrimmed = nextLine.trim();
                
                // Stop if we hit another bullet at same or less indent
                const nextBullet = nextLine.match(/^(\s*)(-)\s+/);
                if (nextBullet) {
                    const nextIndent = nextBullet[1].length;
                    if (nextIndent <= indent) break;
                } else if (nextTrimmed && !nextLine.match(/^\s{2,}/)) {
                    // Stop if we hit a non-indented non-empty line (unless it's a header like "**At will:**")
                    // Headers with bold text are okay
                    if (nextTrimmed.length > 0 && !nextTrimmed.startsWith('<strong>')) break;
                }
                
                // Include indented lines or empty lines as part of this item
                if (!nextTrimmed || nextLine.match(/^\s{2,}/)) {
                    itemLines.push(nextTrimmed || '');
                    j++;
                } else {
                    break;
                }
            }
            
            // Join item content, preserving structure for UI to convert \n to <br/>
            // The UI component will convert \n to <br/>, so we keep newlines for now
            itemContent = itemLines.join('\n');
            
            listItems.push(`<li>${itemContent}</li>`);
            
            // Skip lines we've processed (they're already included in the list item)
            // j is the first line we didn't process, so skip to j-1 and let the loop increment to j
            if (j > i + 1) {
                i = j - 1; // Next iteration will be j, which is correct
            }
        } else {
            // Not a bullet point
            // Check if this is an empty line that might be followed by another bullet
            // If so, don't close the list yet - let empty lines pass through as list separators
            if (!trimmed) {
                // Empty line - check if next non-empty line is a bullet
                let nextNonEmptyIsBullet = false;
                for (let k = i + 1; k < lines.length; k++) {
                    const nextLine = lines[k];
                    const nextTrimmed = nextLine.trim();
                    if (nextTrimmed) {
                        nextNonEmptyIsBullet = /^\s*(-)\s+/.test(nextLine);
                        break;
                    }
                }
                
                // If next non-empty line is a bullet and we're in a list, keep the list open
                if (nextNonEmptyIsBullet && inList) {
                    // Add empty line as-is (it will be inside list items via newlines)
                    result.push(line);
                    continue;
                }
            }
            
            // If we were in a list and this is not an empty line that continues the list, close it
            if (inList && trimmed) {
                result.push(`<ul>${listItems.join('')}</ul>`);
                listItems = [];
                inList = false;
            }
            
            // Add the line as-is (UI will handle \n to <br/> conversion)
            result.push(line);
        }
    }
    
    // Close any open list
    if (inList && listItems.length > 0) {
        result.push(`<ul>${listItems.join('')}</ul>`);
    }
    
    // Join result - preserve newlines for UI to convert
    return result.join('\n');
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
    const attackCount = Math.max(group.actions.length || 2, 2);
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
    
    // Check if this is a Spellcasting action (handles both "Spellcasting" and "Innate Spellcasting")
    // and enhance it with spell details
    if (isSpellcastingAction(name)) {
        converted = enhanceSpellcastingAction(name, converted, description);
    }
    
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
// Spell Parsing and Enhancement Functions
// ============================================================================

// Extract functional/mechanical text from spell description, excluding narrative
function extractFunctionalSpellText(spellText) {
    if (!spellText) return '';
    
    let text = spellText;
    
    // Split into sentences and filter for mechanical content
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const functionalSentences = [];
    
    for (let sentence of sentences) {
        const sLower = sentence.toLowerCase();
        
        // Skip purely narrative sentences
        if (sLower.startsWith('you ') && !sLower.includes('damage') && !sLower.includes('saving throw') && 
            !sLower.includes('condition') && !/\d+d\d+/.test(sentence) && !/\d+\s+foot/.test(sentence)) {
            // Check if it has mechanical content later in the sentence
            if (!sLower.includes('must') && !sLower.includes('makes') && !sLower.includes('takes')) {
                continue; // Skip narrative-only sentences
            }
        }
        
        // Keep sentences with mechanical content
        if (sLower.includes('damage') || 
            sLower.includes('saving throw') || 
            sLower.includes('condition') ||
            sLower.includes('range') ||
            sLower.includes('radius') ||
            sLower.includes('cube') ||
            sLower.includes('line') ||
            sLower.includes('cone') ||
            sLower.includes('sphere') ||
            sLower.includes('emanation') ||
            /\d+d\d+/.test(sentence) ||
            /\d+\s+foot/.test(sentence) ||
            /\d+\s+feet/.test(sentence) ||
            sLower.includes('must') ||
            sLower.includes('makes') ||
            sLower.includes('takes') ||
            sLower.includes('fails') ||
            sLower.includes('succeeds') ||
            sLower.includes('half')) {
            
            // Clean up sentence - remove narrative openings
            sentence = sentence.replace(/^(You|A|An|The|This spell|Choose|Target)\s+/i, '');
            functionalSentences.push(sentence);
        }
    }
    
    if (functionalSentences.length > 0) {
        return functionalSentences.join('. ').trim();
    }
    
    // Fallback: return cleaned version of text, removing obvious narrative
    text = text.replace(/^(You|A|An|The|This spell)\s+/i, '');
    return text.trim();
}

// Clean spell description while preserving full text content
// Only removes leading narrative pronouns for better readability in stat blocks
function cleanSpellDescription(spellText) {
    if (!spellText) return '';
    
    let text = spellText.trim();
    
    // Remove leading narrative pronouns at the start of the text for better flow in stat blocks
    // This makes "You create..." become "create..." which reads better in adversary descriptions
    text = text.replace(/^(You|A|An|The|This spell)\s+/i, '');
    
    // Capitalize the first letter if it's lowercase
    if (text.length > 0 && text[0] === text[0].toLowerCase()) {
        text = text[0].toUpperCase() + text.slice(1);
    }
    
    // Preserve all other content including full descriptions, mechanics, and narrative
    return text;
}

// Clean spell name by removing damage annotations and other parenthetical notes
// Removes patterns like "(2d8 damage)", "(8d6 damage)", "(level 2 version)", etc.
// Also removes trailing digits that might be part of frequency markers (e.g., "prestidigitation2" -> "prestidigitation")
function cleanSpellName(spellName) {
    if (!spellName) return '';
    
    // Remove parenthetical damage expressions like "(2d8 damage)", "(8d6 damage)", "(XdY damage)"
    // Pattern matches: ( followed by optional digits, then d, then digits, then optional +modifier, then "damage")
    let cleaned = spellName.replace(/\s*\(\d+d\d+(?:\s*\+\s*\d+)?\s+damage\)/gi, '');
    
    // Also remove any other parenthetical expressions that look like damage (e.g., "(2d8)", "(8d6)")
    // This catches cases where "damage" might be missing
    cleaned = cleaned.replace(/\s*\(\d+d\d+(?:\s*\+\s*\d+)?\)/gi, '');
    
    // Remove all other parenthetical expressions (e.g., "(level 2 version)", "(Beast or Humanoid form only...)")
    // This handles cases like "Guiding Bolt (level 2 version)" -> "Guiding Bolt"
    // and "Shapechange (Beast or Humanoid form only...)" -> "Shapechange"
    // We match parentheses and their contents, but be careful not to remove parentheses that are part of the spell name
    // We'll remove any parenthetical that comes after the spell name
    cleaned = cleaned.replace(/\s*\([^)]+\)/g, '');
    
    // Remove trailing digits that might be part of frequency markers
    // Pattern: word followed by digits at the end (e.g., "prestidigitation2" -> "prestidigitation")
    // But only if followed by "/day" pattern (handled by preprocessing, but be safe)
    cleaned = cleaned.replace(/([a-z])(\d+)$/i, '$1');
    
    // Trim whitespace
    return cleaned.trim();
}

// Look up a spell in the database (case-insensitive)
function lookupSpell(spellName) {
    if (!spellName || !spellName.trim()) return null;
    
    // Clean the spell name first (removes damage annotations, etc.) as a fallback
    const cleaned = cleanSpellName(spellName);
    const normalized = cleaned.toLowerCase().trim();
    
    // Try exact match first
    if (spellDatabase.has(normalized)) {
        return spellDatabase.get(normalized);
    }
    
    // Try fuzzy matching - handle common variations
    for (const [key, spell] of spellDatabase.entries()) {
        // Check if the key contains the normalized name or vice versa
        if (key.includes(normalized) || normalized.includes(key)) {
            return spell;
        }
    }
    
    return null;
}

// Split a spell list string by commas, but don't split on commas inside parentheses
// This handles cases like "Shapechange (Beast or Humanoid form only, no Temporary Hit Points...)"
function splitSpellList(spellListText) {
    if (!spellListText) return [];
    
    const spells = [];
    let current = '';
    let depth = 0; // Track nesting level of parentheses
    
    for (let i = 0; i < spellListText.length; i++) {
        const char = spellListText[i];
        
        if (char === '(') {
            depth++;
            current += char;
        } else if (char === ')') {
            depth--;
            current += char;
        } else if (char === ',' && depth === 0) {
            // Only split on commas that are not inside parentheses
            const trimmed = current.trim();
            if (trimmed) {
                spells.push(trimmed);
            }
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last spell
    const trimmed = current.trim();
    if (trimmed) {
        spells.push(trimmed);
    }
    
    // Filter out obvious non-spell names (phrases that don't look like spell names)
    return spells.filter(spell => {
        const lower = spell.toLowerCase().trim();
        // Filter out phrases that start with common non-spell words
        if (lower.startsWith('no ') || 
            lower.startsWith('and ') || 
            lower.startsWith('or ') ||
            lower.length < 2 ||
            /^(the|a|an)\s+/i.test(spell)) {
            return false;
        }
        return true;
    });
}

// Parse spell names from Spellcasting text
// Works for both regular "Spellcasting" and "Innate Spellcasting" - both use the same spell list format
function parseSpellNames(spellcastingText) {
    if (!spellcastingText) return [];
    
    const spells = [];
    let text = spellcastingText;
    
    // Preprocessing: Normalize text by adding spaces before frequency markers when missing
    // This handles cases like "prestidigitation2/day each:" -> "prestidigitation 2/day each:"
    // Match a letter (not just lowercase, and handle word boundaries) followed by a digit and "/day" pattern
    // This handles both single words ("prestidigitation2/day") and multi-word spells ("mage armor1/day")
    // Use word boundary to ensure we're matching at the end of a word
    text = text.replace(/([a-zA-Z])(\d+\/day)/g, '$1 $2');
    
    // Add space before "At will:" when it appears immediately after text without proper spacing
    // Handle cases like "):At will:" -> "): At will:"
    text = text.replace(/(\):)(at\s+will)/gi, '): at will');
    // Also handle cases where it comes after other non-whitespace characters
    text = text.replace(/([^:\s])(at\s+will)/gi, '$1 at will');
    
    // Add space before frequency markers when they appear immediately after closing parentheses
    // This handles cases like ")1/day each:" -> ") 1/day each:"
    text = text.replace(/(\))(\d+\/day(?:\s+each)?)/gi, (match, p1, p2) => p1 + ' ' + p2);
    
    // Also handle cases where frequency markers appear after letters/words (e.g., "spell1/day" -> "spell 1/day")
    // But only if not already handled by the previous pattern
    text = text.replace(/([a-zA-Z])(\d+\/day(?:\s+each)?)/gi, '$1 $2');
    
    // Pattern 1: "At will: Spell1, Spell2, Spell3"
    // Updated to use lookahead to properly stop at frequency markers even without spaces
    // The pattern should match until we see a frequency marker (X/day or Xst level) or end of string
    // But we need to be careful not to stop at digits inside parenthetical notes
    const atWillMatch = text.match(/at\s+will[:\s]+(.+?)(?=\s*\d+\/day(?:\s+each)?[:\s]|\s*\d+(?:st|nd|rd|th)\s+level[:\s]|$)/i);
    if (atWillMatch) {
        // Split by comma, but be smart about commas inside parentheses
        const spellList = splitSpellList(atWillMatch[1]);
        spells.push(...spellList.map(name => ({ name: cleanSpellName(name), frequency: 'At will' })));
    }
    
    // Pattern 2: "Cantrips (at will): spell1, spell2"
    const cantripsMatch = text.match(/cantrips?\s*\([^)]*at will[^)]*\)[:\s]+([^0-9\n]+?)(?:\d+\/day|\d+st level|$)/i);
    if (cantripsMatch) {
        // Split by comma, but be smart about commas inside parentheses
        const spellList = splitSpellList(cantripsMatch[1]);
        spells.push(...spellList.map(name => ({ name: cleanSpellName(name), frequency: 'At will' })));
    }
    
    // Pattern 3: "1/day: Spell1, Spell2" or "1/day each: Spell1, Spell2"
    // Updated pattern to handle damage annotations in parentheses like "thunderwave (2d8 damage)"
    // Match until we see another frequency marker or end of string
    const dailyMatches = text.matchAll(/(\d+)\/day(?:\s+each)?[:\s]+(.+?)(?=\s*\d+\/day(?:\s+each)?[:\s]|\s*\d+(?:st|nd|rd|th)\s+level[:\s]|\s*at\s+will[:\s]|$)/gis);
    for (const match of dailyMatches) {
        const count = match[1];
        // Split by comma, but be smart about commas inside parentheses
        const spellList = splitSpellList(match[2].trim());
        spells.push(...spellList.map(name => ({ name: cleanSpellName(name), frequency: `${count}/day` })));
    }
    
    // Pattern 4: "1st level (4 slots): spell1, spell2"
    const levelMatches = text.matchAll(/(\d+)(?:st|nd|rd|th)\s+level\s*\([^)]*\)[:\s]+([^0-9\n]+?)(?:\d+st level|$)/gi);
    for (const match of levelMatches) {
        const level = match[1];
        // Split by comma, but be smart about commas inside parentheses
        const spellList = splitSpellList(match[2]);
        spells.push(...spellList.map(name => ({ name: cleanSpellName(name), frequency: `${level}st level` })));
    }
    
    // Pattern 5: Standalone spell names (for reactions, etc.)
    // This is a fallback for spells mentioned individually
    const standaloneSpells = text.match(/(?:casts?|cast)\s+([A-Z][a-zA-Z\s]+?)(?:\s+in response|\s+as|\s+using|$)/i);
    if (standaloneSpells && spells.length === 0) {
        spells.push({ name: cleanSpellName(standaloneSpells[1].trim()), frequency: '1/day' });
    }
    
    return spells;
}

// Check if an action/trait name is a Spellcasting action (handles both "Spellcasting" and "Innate Spellcasting")
function isSpellcastingAction(name) {
    if (!name) return false;
    const nameLower = name.toLowerCase();
    // Matches both "Spellcasting" and "Innate Spellcasting"
    return nameLower.includes('spellcasting');
}

// Enhance Spellcasting action description with spell details
// Handles both regular "Spellcasting" and "Innate Spellcasting" - both types are enhanced the same way
function enhanceSpellcastingAction(actionName, actionDescription, spellcastingText) {
    // Use spellcastingText if provided, otherwise use actionDescription
    const textToParse = spellcastingText || actionDescription;
    
    if (!textToParse || !textToParse.toLowerCase().includes('spell')) {
        return actionDescription; // Not a spellcasting action
    }
    
    const parsedSpells = parseSpellNames(textToParse);
    if (parsedSpells.length === 0) {
        return actionDescription; // No spells found
    }
    
    // Group spells by frequency
    const spellsByFrequency = {};
    for (const spellInfo of parsedSpells) {
        if (!spellsByFrequency[spellInfo.frequency]) {
            spellsByFrequency[spellInfo.frequency] = [];
        }
        spellsByFrequency[spellInfo.frequency].push(spellInfo.name);
    }
    
    // Look up each spell and format details
    // First, clean up the original description by removing the raw spell list text
    // This prevents duplication when we add the enhanced spell details
    let enhancedDescription = actionDescription;
    
    // Remove the raw spell list from the description if it exists
    // This handles cases where the description includes "At will: Spell1, Spell2" etc.
    // We'll replace it with just the introductory text
    // Match from the first frequency marker (at will, cantrips, X/day, or Xst level) to the end
    const spellListPattern = /(at will|cantrips?\s*\([^)]*at will[^)]*\)|(?:\d+\/day(?:\s+each)?)|(?:\d+(?:st|nd|rd|th)\s+level\s*\([^)]*\)))[:\s]+.*$/i;
    if (spellListPattern.test(enhancedDescription)) {
        // Find where the spell list starts and remove it
        // Keep everything up to (but not including) the first frequency marker
        // Use a more careful pattern that handles cases with or without spaces
        enhancedDescription = enhancedDescription.replace(/(.*?)(?:at will|cantrips?\s*\([^)]*at will[^)]*\)|(?:\d+\/day(?:\s+each)?)|(?:\d+(?:st|nd|rd|th)\s+level\s*\([^)]*\)))[:\s]+.*$/i, '$1').trim();
        // Remove trailing punctuation that might be left (like colons or closing parens followed by colons)
        enhancedDescription = enhancedDescription.replace(/[:;]\s*$/, '');
        enhancedDescription = enhancedDescription.replace(/\)\s*:\s*$/, ')');
    }
    
    // Ensure the description ends properly
    enhancedDescription = enhancedDescription.trim();
    
    // Build spell details section
    const spellDetails = [];
    for (const [frequency, spellNames] of Object.entries(spellsByFrequency)) {
        const frequencyHeader = `**${frequency}:**`;
        const spellEntries = [];
        
        for (const spellName of spellNames) {
            const spell = lookupSpell(spellName);
            if (spell) {
                // Use full spell description with minimal cleaning
                const spellDescription = cleanSpellDescription(spell.text);
                const spellEntry = `- **${spell.name}** (${spell.level}, ${spell.castingTime}, ${spell.duration}, ${spell.school}, ${spell.range})`;
                
                // Always include the spell description when found
                if (spellDescription) {
                    // Format with proper indentation and preserve newlines for UI rendering
                    // Normalize whitespace but keep newlines so UI can convert them to <br/> tags
                    let formattedDescription = spellDescription
                        .replace(/\n\n+/g, '\n\n')  // Normalize multiple newlines to double newlines
                        .replace(/[ \t]+/g, ' ')     // Normalize spaces and tabs (but keep newlines)
                        .trim();
                    
                    // Ensure description starts with a capital letter
                    if (formattedDescription.length > 0 && formattedDescription[0] === formattedDescription[0].toLowerCase()) {
                        formattedDescription = formattedDescription[0].toUpperCase() + formattedDescription.slice(1);
                    }
                    
                    // Add a line break and proper spacing for readability
                    // Use single newline after spell entry header, then indented description
                    spellEntries.push(`${spellEntry}\n  ${formattedDescription}`);
                } else {
                    // Fallback if description is empty (shouldn't happen, but be safe)
                    spellEntries.push(spellEntry);
                }
            } else {
                // Spell not found in database, just include the name
                console.warn(`Spell not found in database: ${spellName}`);
                spellEntries.push(`- **${spellName}**`);
            }
        }
        
        spellDetails.push(`${frequencyHeader}\n${spellEntries.join('\n\n')}`);
    }
    
    // Append spell details to the action description with proper spacing
    if (spellDetails.length > 0) {
        // Add double newline for clear separation between description and spell list
        enhancedDescription += '\n\n' + spellDetails.join('\n\n');
    }
    
    return enhancedDescription;
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

// Convert Daggerheart CSV rows (already in Daggerheart format)
function convertDaggerheartAdversaries(rows) {
    const converted = [];
    for (const row of rows) {
        if (!row.Name) continue;

        try {
            const adv = convertDaggerheartRow(row);
            converted.push(adv);
        } catch (e) {
            console.warn(`Failed to convert Daggerheart adversary ${row.Name}:`, e.message);
        }
    }
    return converted;
}

// Convert a single Daggerheart CSV row to JSON format
function convertDaggerheartRow(row) {
    // Parse tier
    const tier = parseInt(row.Tier) || 1;
    
    // Parse role (Type column) - uppercase it
    const role = row.Type ? row.Type.toUpperCase() : "STANDARD";
    
    // Parse stats
    const stats = {
        difficulty: parseInt(row.Difficulty) || 10,
        threshold_major: row.Major_Threshold && row.Major_Threshold.trim() ? parseInt(row.Major_Threshold) : null,
        threshold_severe: row.Severe_Threshold && row.Severe_Threshold.trim() ? parseInt(row.Severe_Threshold) : null,
        hp: parseInt(row.HP) || 1,
        stress: parseInt(row.Stress) || 3,
        attack_mod: parseInt(row.Attack_Modifier) || 0,
        damage_dice: row.Damage_Dice || "1d6+1"
    };
    
    // Parse experiences (JSON string)
    let experiences = [];
    if (row.Experiences && row.Experiences.trim()) {
        try {
            experiences = JSON.parse(row.Experiences);
        } catch (e) {
            console.warn(`Failed to parse experiences for ${row.Name}:`, e.message);
        }
    }
    
    // Parse features (JSON string) and restructure to match format
    let features = [];
    if (row.Features && row.Features.trim()) {
        try {
            const parsedFeatures = JSON.parse(row.Features);
            // Group all features into Actions section for simplicity
            // Features are already in the correct format with name and description
            // Format Randomized Tactics and convert descriptions to HTML format for consistency
            if (Array.isArray(parsedFeatures) && parsedFeatures.length > 0) {
                const formattedEntries = parsedFeatures.map(feat => {
                    let description = feat.description || "";
                    // Format Randomized Tactics if this is that feature
                    if (feat.name === "Randomized Tactics") {
                        description = formatRandomizedTactics(description);
                    }
                    return {
                        name: feat.name,
                        description: convertMarkdownToHTML(description)
                    };
                });
                features.push({
                    name: "Actions",
                    entries: formattedEntries
                });
            }
        } catch (e) {
            console.warn(`Failed to parse features for ${row.Name}:`, e.message);
        }
    }
    
    // Parse motives_tactics
    const motives_tactics = row.Motives_Tactics || "";
    
    // Category is not available in Daggerheart CSV, default to Unknown
    const category = "Unknown";
    
    // Biome defaults to Unknown (could be extracted from description if needed)
    const biome = "Unknown";
    
    return {
        id: row.Name + "_" + Math.random().toString(36).substr(2, 9),
        name: row.Name,
        tier,
        role,
        category,
        biome,
        stats,
        features,
        motives_tactics,
        experiences,
        source: "Daggerheart"
    };
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
        source: "DND5e"
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
            
            // Check if this is a Spellcasting trait (handles both "Spellcasting" and "Innate Spellcasting")
            // and enhance it with spell details
            if (isSpellcastingAction(name)) {
                description = enhanceSpellcastingAction(name, description, line);
            }
            
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

// Load spells database first
loadSpellsDatabase();

// Process both CSV files
const allAdversaries = [];

// Process Bestiary.csv (D&D 5e format)
console.log(`Reading D&D 5e CSV from ${csvPath}...`);
if (fs.existsSync(csvPath)) {
    const bestiaryContent = fs.readFileSync(csvPath, 'utf8');
    const bestiaryResults = Papa.parse(bestiaryContent, { header: true });
    console.log(`Parsed ${bestiaryResults.data.length} rows from Bestiary.csv`);
    const dndAdversaries = convertAdversaries(bestiaryResults.data);
    console.log(`Converted ${dndAdversaries.length} D&D 5e adversaries`);
    allAdversaries.push(...dndAdversaries);
} else {
    console.warn(`Bestiary.csv not found at ${csvPath}`);
}

// Process adversaries-extracted.csv (Daggerheart format)
console.log(`Reading Daggerheart CSV from ${daggerheartCsvPath}...`);
if (fs.existsSync(daggerheartCsvPath)) {
    const daggerheartContent = fs.readFileSync(daggerheartCsvPath, 'utf8');
    const daggerheartResults = Papa.parse(daggerheartContent, { header: true });
    console.log(`Parsed ${daggerheartResults.data.length} rows from adversaries-extracted.csv`);
    const daggerheartAdversaries = convertDaggerheartAdversaries(daggerheartResults.data);
    console.log(`Converted ${daggerheartAdversaries.length} Daggerheart adversaries`);
    allAdversaries.push(...daggerheartAdversaries);
} else {
    console.warn(`adversaries-extracted.csv not found at ${daggerheartCsvPath}`);
}

// Write combined output
fs.writeFileSync(outputPath, JSON.stringify(allAdversaries, null, 2));
console.log(`Wrote ${allAdversaries.length} total adversaries to ${outputPath}`);
