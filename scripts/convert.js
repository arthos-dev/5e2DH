
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { assignStableIds } from './lib/stable-id.js';
import {
    toDaggerheartText, feetToRange, formatDamage, parseAttack, extractDamages, isPhysicalType,
    stripUsageTag, usageTagCostsFear,
} from './lib/dh-text.js';

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
        // Flat damage like the official minions (median of the core-rulebook minions per tier: 2, 5, 5-8, 11);
        // the guide's "1-3"/"2-4" ranges were not rollable and ran low at Tier 2.
        1: { difficulty: [10, 12], major: null, severe: null, hp: [1, 1], stress: [1, 1], atk: [-2, 0], damage: ["2"] },
        2: { difficulty: [12, 14], major: null, severe: null, hp: [1, 1], stress: [1, 1], atk: [-1, 1], damage: ["5"] },
        3: { difficulty: [14, 16], major: null, severe: null, hp: [1, 1], stress: [1, 2], atk: [0, 2], damage: ["7"] },
        4: { difficulty: [16, 18], major: null, severe: null, hp: [1, 1], stress: [1, 2], atk: [1, 3], damage: ["11"] }
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
    const result = Math.round(min + (max - min) * crInTier);
    // If calculation results in NaN, return middle value of the range
    return isNaN(result) ? Math.round((min + max) / 2) : result;
}

// Helper to get CR position within tier (0.0 to 1.0)
function getCRPositionInTier(cr, tier) {
    // If CR is invalid (NaN), return 0.5 (middle of tier range)
    if (isNaN(cr)) return 0.5;
    
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
    // Handle "None" CR values (e.g., "None (XP 0; PB equals your Proficiency Bonus)")
    if (clean.toLowerCase() === 'none') return 0;
    if (clean.includes('/')) {
        const [num, den] = clean.split('/');
        return parseFloat(num) / parseFloat(den);
    }
    const parsed = parseFloat(clean);
    // If parsing fails (NaN), default to 0
    return isNaN(parsed) ? 0 : parsed;
}

// Median 5e HP per CR in Bestiary.csv; used to place stat blocks whose CR is "None" (adventure NPCs, summons).
const MEDIAN_HP_BY_CR = [[0, 4], [0.125, 9], [0.25, 13], [0.5, 19], [1, 27], [2, 39], [3, 58], [4, 66], [5, 85], [7, 105],
    [8, 111], [9, 139], [10, 153], [11, 168], [13, 189], [14, 195], [16, 212], [17, 241], [18, 250], [20, 323], [22, 333],
    [23, 350], [24, 444], [25, 472], [26, 507], [27, 533], [28, 565], [30, 615]];
function averageDice(dice) {
    const m = String(dice).match(/^(\d+)d(\d+)(?:([+-])(\d+))?/);
    if (!m) return parseInt(dice, 10) || 0;
    return parseInt(m[1], 10) * (parseInt(m[2], 10) + 1) / 2 + (m[3] === "-" ? -1 : 1) * (parseInt(m[4] || "0", 10));
}

function estimateCRFromHP(hp) {
    let best = MEDIAN_HP_BY_CR[0];
    for (const entry of MEDIAN_HP_BY_CR) {
        if (Math.abs(Math.log(entry[1]) - Math.log(hp)) < Math.abs(Math.log(best[1]) - Math.log(hp))) best = entry;
    }
    return best[0];
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
    
    const sizeLower = row.Size ? row.Size.toLowerCase() : "";
    // Attack lines in both the 2014 ("Melee Weapon Attack") and 2024 ("Melee Attack Roll") formats
    // Best average damage of the melee-only and the ranged-only attacks
    let bestMelee = -1, bestRanged = -1;
    for (const line of (row.Actions || "").split("\n")) {
        const dot = line.indexOf(".");
        const atk = dot === -1 ? null : parseAttack(line.substring(dot + 1).trim());
        if (!atk) continue;
        const avg = atk.damages.reduce((sum, d) => sum + averageDice(d.dice), 0);
        if (atk.kind === "ranged") bestRanged = Math.max(bestRanged, avg);
        else bestMelee = Math.max(bestMelee, avg);
    }

    // CR 20+ and the colossal ones (Gargantuan, titans, 300+ HP at CR 10+) are bosses: Solo.
    // (They used to get LEGENDARY / COLOSSAL, which are not Daggerheart roles, cost 2 Battle Points and,
    // for COLOSSAL, used segment stats: e.g. King Hekaton had 5 HP and Difficulty 16.)
    if (cr >= 20) return "SOLO";
    if ((sizeLower === "gargantuan" && cr >= 10) || nameLower.includes("colossal") ||
        /\btitan\b/.test(nameLower) || (hpRaw > 300 && cr >= 10)) {
        return "SOLO";
    }
    
    // Solo (has Legendary Actions, or high CR with complex abilities - these are unique powerful monsters)
    // "Elite" from old system maps to Solo
    if (row["Legendary Actions"] || 
        (cr >= 15 && !typeLower.includes("swarm") && 
         (actions.includes("multiattack") || actions.includes("breath") || 
          actions.includes("recharge") || traits.includes("legendary")))) {
        return "SOLO";
    }

    // Giants (ogres, trolls, ettins, cyclopes, fomorians, the true giants...): big bodies, so Bruisers,
    // and Leaders when they hold a rank in the Ordning or a war band. Tier still comes from CR.
    if (typeLower.includes("giant") && /^(large|huge|gargantuan)/.test(sizeLower)) {
        if (/\b(king|queen|jarl|thane|chief|chieftain|subchief|duke|duchess|count|countess|imperator|lord|lady|warlord|captain|sergeant|boss|leader)\b/.test(nameLower)) {
            return "LEADER";
        }
        return "BRUISER";
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
    
    // Minion (very low CR, weak stats)
    if (cr < 0.5 && hpRaw < 10) {
        return "MINION";
    }
    
    // Horde (swarm type or name)
    if (typeLower.includes("swarm") || nameLower.includes("swarm")) {
        return "HORDE";
    }
    
    // Named leaders (captains, commanders, warlords...) lead even when their best attack is a pistol or a bow
    if (/\b(commander|captain|leader|warlord|general|chieftain)\b/.test(nameLower)) {
        return "LEADER";
    }

    // Ranged (has ranged attacks, archer/sniper in name)
    // Only creatures whose ranged attack is their best one: almost every 5e creature has *a* ranged option
    // (javelins, crossbows, rocks), which used to make 28% of the bestiary Ranged (official Daggerheart: 7%)
    // and the SKT giants into snipers.
    if (/\b(archer|sniper|sharpshooter|marksman|arbalester)\b/.test(nameLower) || bestRanged > bestMelee) {
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
    if (typeLower.includes("fiend") || typeLower.includes("demon") || typeLower.includes("devil") ||
        nameLower.includes("demon") || nameLower.includes("fiend") || nameLower.includes("devil")) {
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
    
    // Reaction keywords - highest priority (check first). "Reaction Roll" (converted saving throws) is not a trigger.
    const triggerText = descLower.replace(/reaction rolls?/g, "");
    if (triggerText.includes("when ") || triggerText.includes("in response to") ||
        triggerText.includes("after being") || triggerText.includes("its reaction") ||
        (triggerText.includes("if ") && triggerText.includes("attacked")) ||
        triggerText.includes("as a reaction")) {
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

function addRoleSpecificFeatures(features, role, cr, tier, opts = {}) {
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
    
    // MINION: Ensure Minion(X) passive exists, plus the shared Group Attack every core minion has
    if (roleUpper === "MINION") {
        if (!hasFeature("group attack")) {
            const flat = String(opts.damage || "").replace(/\s*(phy|mag)$/, "");
            const kind = /mag$/.test(opts.damage || "") ? "magic" : "physical";
            newFeatures.push({
                name: "Group Attack",
                description: convertMarkdownToHTML(`**Action:** Spend a Fear to choose a target and spotlight all of these Minions within Close range of them. Those Minions move into Melee range of the target and make one shared attack roll. On a success, they deal ${flat} ${kind} damage each. Combine this damage.`)
            });
        }
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
    
    // HORDE: Horde (X) - the core hordes deal reduced damage once half their HP is marked
    if (roleUpper === "HORDE" && !hasFeature("horde")) {
        const hordeDamage = { 1: "1d4+2", 2: "2d4+3", 3: "3d4+2", 4: "4d4+4" }[tier];
        newFeatures.push({
            name: `Horde (${hordeDamage})`,
            description: convertMarkdownToHTML(`**Passive:** When this Horde has marked half or more of their HP, their standard attack deals ${hordeDamage} damage instead.`)
        });
    }

    // SOLO: Relentless (X) for high-CR solos and for any solo with 5e Legendary Actions (its extra turns)
    if (roleUpper === "SOLO" && (cr >= 15 || opts.legendary)) {
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

// Riders that make an attack worth a Stress (conditions, forced movement, swallowing...).
const RIDER_COSTS_STRESS = /\b(poison|grappl|restrain|frighten|charm|swallow|prone|blind|stun|paraly|deafen|incapacitat|petrif|vulnerable|pushed|pulled|knocked|drained|reduc)/i;

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const toNumber = (w) => NUMBER_WORDS[w.toLowerCase()] ?? parseInt(w, 10);

// "makes two attacks" -> 2; "makes one Bite attack and two Claw attacks" -> 3.
function parseAttackCount(description) {
    const direct = description.match(/\bmakes (one|two|three|four|five|six|seven|eight|\d+) (?:\w+ )?attacks\b/i);
    if (direct) return toNumber(direct[1]);
    let total = 0;
    const re = /\b(one|two|three|four|five|six|seven|eight|\d+)\s+(?:[\w'-]+\s+){0,3}?attacks?\b/gi;
    let m;
    while ((m = re.exec(description)) !== null) total += toNumber(m[1]);
    return total >= 2 ? total : 2;
}

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lowerFirst = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);

// Legendary actions that only repeat another action or a skill check are covered by Relentless (X).
function isTrivialLegendaryAction(description) {
    return /^(?:the \w+|[A-Z][\w']+) (?:makes (?:one|a|an) [^.]*?(?:attack|check)|uses (?:its )?(?:Spellcasting|Multiattack)\b(?! to cast)|moves up to)/i.test(description.trim())
        && description.trim().split(/\.\s/).length <= 2;
}

// 2024 save layout "Agility Reaction Roll: each creature in a Cone (Far range). Failure: ... Success: ..."
// -> "Each creature in a Cone (Far range) must make an Agility Reaction Roll. Targets who fail take ... Targets who succeed take ..."
function rewrite2024Save(text) {
    return text
        .replace(/\b(Strength|Agility|Knowledge|Instinct|Presence)(?: or (Strength|Agility|Knowledge|Instinct|Presence))? Reaction Roll: ([^.]+)\./g,
            (_, a, b, who) => `${capitalize(who.trim())} must make ${/^[AI]/.test(a) ? 'an' : 'a'} ${a}${b ? ` or ${b}` : ''} Reaction Roll.`)
        .replace(/\bFailure or Success:\s*/g, 'Either way, ')
        .replace(/\bFailure:\s*(\d+d\d+(?:[+-]\d+)? (?:physical|magic) damage(?: \(\w+\))?)/g, 'Targets who fail take $1')
        .replace(/\bSuccess:\s*Half damage(?: only)?\.?/gi, 'Targets who succeed take half damage.')
        .replace(/\bFirst Failure:\s*/g, 'On a first failure: ')
        .replace(/\bSecond Failure:\s*/g, 'On a second failure: ')
        .replace(/\bFailure:\s*/g, 'On a failure: ')
        .replace(/\bSuccess:\s*/g, 'On a success: ');
}

// Full text pipeline for a feature body.
function dhText(text) {
    let t = toDaggerheartText(text.replace(/([a-z)])\.([A-Z][a-z])/g, '$1. $2'));
    t = rewrite2024Save(t);
    t = t.replace(/\s*(?:The|the) [\w\s'-]+? can't take this action again until the start of (?:its|his|her|their) next turn\./g, '');
    t = t.replace(/\battack rolls?\b/gi, (m) => (/s$/i.test(m) ? 'attacks' : 'attack'));
    return t.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase()).trim();
}

function convertActionsToDaggerheart(text, role, cr, tier, opts = {}) {
    if (!text) return [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const converted = [];
    for (const line of lines) {
        const firstPeriodIndex = line.indexOf('.');
        if (firstPeriodIndex === -1) continue;
        const name = line.substring(0, firstPeriodIndex).trim();
        const description = line.substring(firstPeriodIndex + 1).trim();
        if (/^legendary action uses/i.test(name)) continue;
        if (opts.legendary && isTrivialLegendaryAction(description)) continue;
        if (/^multiattack/i.test(name)) {
            converted.push(convertMultiattack(name, description));
            continue;
        }
        converted.push(convertSingleAction(name, description, role, cr, tier, opts));
    }
    return converted;
}

function convertMultiattack(name, description) {
    const count = parseAttackCount(description);
    // Keep extra clauses such as "It can replace one attack with a use of Spellcasting..."
    const extra = description.split(/(?<=\.)\s+/).slice(1)
        .filter(sentence => !/\battacks?\b/i.test(sentence) || /\b(replace|instead)\b/i.test(sentence)).join(' ');
    const extraText = extra ? ' ' + dhText(extra) : '';
    return {
        name,
        description: convertMarkdownToHTML(`**Action:** Mark a Stress to make ${count} standard attacks, against one target or split between targets in range.${extraText}`)
    };
}

function convertAttack(name, description, atk, fearFromTag) {
    const band = atk.rangeFt ? feetToRange(atk.rangeFt) : null;
    let where = band ? ` within ${band} range` : '';
    if (atk.kind === 'both') {
        const thrown = description.match(/range (\d+)(?:\/\d+)? ft/i);
        const far = thrown ? feetToRange(thrown[1]) : null;
        where = far && far !== band ? ` within ${band} range (or ${far} range if thrown)` : where;
    }
    const damage = atk.damages.map(d => formatDamage(d, atk.spell)).join(' plus ');
    const rider = atk.rider ? ' ' + dhText(atk.rider) : '';
    const body = `make an attack against a target${where}. On a success, deal ${damage || 'the standard damage'}.${rider}`;
    let text;
    if (fearFromTag) text = `Spend a Fear to ${body}`;
    else if (atk.rider && RIDER_COSTS_STRESS.test(atk.rider)) text = `Mark a Stress to ${body}`;
    else text = capitalize(body);
    return { name, description: convertMarkdownToHTML(`**Action:** ${text}`) };
}

function convertSingleAction(name, description, role, cr, tier, opts = {}) {
    const cleanName = stripUsageTag(name);
    const fearFromTag = usageTagCostsFear(name) || /recharges? after a (short|long) rest/i.test(description);

    if (isSpellcastingAction(name)) {
        return { name: cleanName, description: convertSpellcasting(description, opts.reaction ? 'Reaction' : 'Action') };
    }

    const atk = parseAttack(description);
    if (atk && !opts.reaction) return convertAttack(cleanName, description, atk, fearFromTag);

    const text = dhText(description);
    if (opts.reaction) {
        const tr = description.match(/^Trigger:\s*(.*?)\.\s*Response:\s*(.*)$/s);
        const body = tr ? `When ${lowerFirst(dhText(tr[1]))}, ${lowerFirst(dhText(tr[2]))}` : text;
        return { name: cleanName, description: convertMarkdownToHTML(`**Reaction:** ${body} Mark a Stress to use this reaction.`) };
    }

    const descLower = description.toLowerCase();
    const isArea = /\b(cone|line|cube|sphere|emanation|cylinder|radius)\b/.test(descLower) ||
        (/\beach creature\b/.test(descLower) && /saving throw/.test(descLower));
    const dealsDamage = /\d+d\d+/.test(description) && /damage/.test(descLower);
    const needsFear = fearFromTag || opts.legendary ||
        /\b(breath|exhale|frightful presence|summon|conjure|legendary|lair)\b/.test(descLower) ||
        (isArea && dealsDamage);

    const prefix = needsFear ? 'Spend a Fear to use this ability.' : 'Mark a Stress to use this ability.';
    return { name: cleanName, description: convertMarkdownToHTML(`**Action:** ${prefix} ${text}`) };
}

//
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
            lower.length > 40 ||
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
    if (atWillMatch && !/cantrips?\s*\(at will\)/i.test(text)) {
        // Split by comma, but be smart about commas inside parentheses
        const spellList = splitSpellList(atWillMatch[1]);
        spells.push(...spellList.map(name => ({ name: cleanSpellName(name), frequency: 'At will' })));
    }
    
    // Pattern 2: "Cantrips (at will): spell1, spell2"
    const cantripsMatch = text.match(/cantrips?\s*\([^)]*at will[^)]*\)[:\s]+([^\n]+?)(?=\s*\d+\/day|\s*\d+(?:st|nd|rd|th)\s+level|$)/i);
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
    const levelMatches = text.matchAll(/(\d+)(?:st|nd|rd|th)\s+level\s*\([^)]*\)[:\s]+([^\n]+?)(?=\s*\d+(?:st|nd|rd|th)\s+level|\s*\d+\/day|$)/gi);
    for (const match of levelMatches) {
        const level = match[1];
        // Split by comma, but be smart about commas inside parentheses
        const spellList = splitSpellList(match[2]);
        spells.push(...spellList.map(name => ({ name: cleanSpellName(name), frequency: `${ordinal(level)} level` })));
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

const unknownSpells = new Set(); // spell names not in Spells.csv (listed by name only)

const ordinal = (n) => {
    const v = Number(n);
    if (v % 100 >= 11 && v % 100 <= 13) return `${v}th`;
    return `${v}${{ 1: 'st', 2: 'nd', 3: 'rd' }[v % 10] || 'th'}`;
};

// One-line mechanical summary of a spell for a stat block (the full text lives in the rulebook).
function summarizeSpell(spell) {
    // Utility spells (Detect Magic, Light...) are listed by name only; combat spells get their mechanics
    if (!/\d+d\d+|saving throw|spell attack/i.test(spell.text || '')) return '';
    const functional = extractFunctionalSpellText(spell.text || '').split(/\n/)[0];
    let s = dhText(functional);
    if (s.length > 160) {
        const cut = s.slice(0, 160);
        s = cut.slice(0, Math.max(cut.lastIndexOf('. ') + 1, cut.lastIndexOf(' '))).trim().replace(/[,;:]$/, '') + '…';
    }
    return s;
}

function spellRange(range) {
    if (!range) return '';
    const r = range.trim();
    if (/^touch$/i.test(r)) return 'Melee range';
    if (/^self$/i.test(r)) return 'self';
    if (/^sight$/i.test(r)) return 'Very Far range';
    return dhText(r.replace(/^Self\s*\((.*)\)$/i, '$1')).replace(/^(\d+)\s*(miles?)$/i, '$1 $2');
}

// Spellcasting (and Innate Spellcasting) -> one DH action: Stress for at-will/low-level spells, Fear for daily/high-level ones,
// with each spell as a short line instead of the full 5e spell text.
function convertSpellcasting(description, featureType = 'Action') {
    const parsed = parseSpellNames(description);
    const seen = new Set();
    const spells = parsed.filter(s => {
        const key = `${s.frequency}|${s.name.toLowerCase()}`;
        if (!s.name || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    if (spells.length === 0) {
        return convertMarkdownToHTML(`**${featureType}:** Mark a Stress to use this ability. ${dhText(description)}`);
    }
    const byFrequency = new Map();
    for (const s of spells) {
        if (!byFrequency.has(s.frequency)) byFrequency.set(s.frequency, []);
        byFrequency.get(s.frequency).push(s.name);
    }
    const costOf = (freq) => {
        if (/at will/i.test(freq)) return 'mark a Stress';
        const level = freq.match(/^(\d+)\w* level/i);
        if (level) return parseInt(level[1], 10) >= 4 ? 'spend a Fear' : 'mark a Stress';
        return 'spend a Fear';
    };
    const sections = [];
    for (const [freq, names] of byFrequency) {
        const lines = names.map(n => {
            const spell = lookupSpell(n);
            if (!spell) {
                unknownSpells.add(n);
                return `- **${capitalize(n)}**`;
            }
            const lvl = /cantrip/i.test(spell.level) || spell.level === '0' ? 'cantrip' : `${spell.level} level`;
            const range = spellRange(spell.range);
            const summary = summarizeSpell(spell);
            return `- **${spell.name}** (${[lvl, range].filter(Boolean).join(', ')})${summary ? ': ' + summary : ''}`;
        });
        sections.push(`**${freq} (${costOf(freq)}):**\n${lines.join('\n')}`);
    }
    const intro = `Cast one of the following spells. Spell attacks use this adversary's attack modifier and Reaction Rolls are made against its Difficulty.`;
    return convertMarkdownToHTML(`**${featureType}:** ${intro}\n\n${sections.join('\n\n')}`);
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

// Parse Description column to extract full feature descriptions
// Format: "FeatureName—Type: Full description text." or multiple features
// Also handles continuation text (just the description without feature name)
function parseDescriptionColumn(descriptionText) {
    if (!descriptionText || !descriptionText.trim()) {
        return new Map();
    }
    
    const featureMap = new Map();
    const text = descriptionText.trim();
    
    // Pattern to match: "FeatureName—Type: Description"
    // Handle both em dash (—) and regular dash (-)
    const featurePattern = /([A-Z][A-Za-z\s]+?)\s*[—–-]\s*(?:Passive|Action|Reaction|Fear)[:\s]*([^—–-]+?)(?=\s+[A-Z][A-Za-z\s]{3,}\s*[—–-]|$)/g;
    
    let match;
    while ((match = featurePattern.exec(text)) !== null) {
        const featureName = match[1].trim();
        let fullDescription = match[2].trim();
        
        // Clean up the description - remove trailing periods if they're not part of the sentence
        fullDescription = fullDescription.replace(/\.\s*$/, '');
        
        // Store in map (case-insensitive key for matching)
        if (featureName && fullDescription) {
            featureMap.set(featureName.toLowerCase(), {
                name: featureName,
                description: fullDescription
            });
        }
    }
    
    // Also handle cases where there's just one feature without explicit type
    // Pattern: "FeatureName: Description" or "FeatureName Description"
    if (featureMap.size === 0) {
        const simplePattern = /^([A-Z][A-Za-z\s]+?)[:\s]+(.+)$/;
        const simpleMatch = text.match(simplePattern);
        if (simpleMatch) {
            const featureName = simpleMatch[1].trim();
            let fullDescription = simpleMatch[2].trim();
            fullDescription = fullDescription.replace(/\.\s*$/, '');
            
            if (featureName && fullDescription) {
                featureMap.set(featureName.toLowerCase(), {
                    name: featureName,
                    description: fullDescription
                });
            }
        }
    }
    
    // If no feature name pattern found, store as continuation text (key: "__continuation__")
    // This will be matched to the last truncated feature
    if (featureMap.size === 0 && text.length > 10) {
        let continuationText = text.trim();
        continuationText = continuationText.replace(/\.\s*$/, '');
        featureMap.set("__continuation__", {
            name: "",
            description: continuationText
        });
    }
    
    return featureMap;
}

// Check if a description appears to be truncated
function isTruncated(description) {
    if (!description || !description.trim()) {
        return false;
    }
    
    const trimmed = description.trim();
    
    // Check for common truncation patterns:
    // 1. Ends with "a " or "an " (incomplete sentence)
    // 2. Ends without punctuation
    // 3. Ends with incomplete phrases like "you gain a", "you can mark a", etc.
    const truncationPatterns = [
        /\s+a\s*$/i,           // ends with " a "
        /\s+an\s*$/i,           // ends with " an "
        /\s+the\s*$/i,          // ends with " the "
        /\s+to\s*$/i,           // ends with " to "
        /\s+of\s*$/i,           // ends with " of "
        /\s+in\s*$/i,           // ends with " in "
        /\s+at\s*$/i,           // ends with " at "
        /\s+on\s*$/i,           // ends with " on "
        /\s+for\s*$/i,          // ends with " for "
        /\s+with\s*$/i,         // ends with " with "
        /\s+from\s*$/i,         // ends with " from "
        /\s+within\s*$/i,       // ends with " within "
        /\s+within\s+a\s*$/i,   // ends with " within a "
    ];
    
    // Check if it matches any truncation pattern
    for (const pattern of truncationPatterns) {
        if (pattern.test(trimmed)) {
            return true;
        }
    }
    
    // Also check if it doesn't end with proper punctuation and is reasonably long
    // (short descriptions might legitimately not have punctuation)
    if (trimmed.length > 20 && !/[.!?]$/.test(trimmed)) {
        return true;
    }
    
    return false;
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
            
            // Parse Description column to get full feature descriptions
            const descriptionMap = row.Description ? parseDescriptionColumn(row.Description) : new Map();
            
            if (Array.isArray(parsedFeatures) && parsedFeatures.length > 0) {
                // Check if we have continuation text (no feature name in Description column)
                const continuationText = descriptionMap.get("__continuation__");
                
                const formattedEntries = parsedFeatures.map((feat, index) => {
                    let description = feat.description || "";
                    
                    // Check if description is truncated and try to complete it from Description column
                    if (isTruncated(description) && descriptionMap.size > 0) {
                        const featureNameLower = feat.name.toLowerCase();
                        const fullFeature = descriptionMap.get(featureNameLower);
                        
                        if (fullFeature && fullFeature.description) {
                            // Use the full description from Description column
                            description = fullFeature.description;
                        } else if (continuationText && index === parsedFeatures.length - 1) {
                            // If this is the last feature and we have continuation text, append it
                            // Only append if the description appears truncated
                            const trimmed = description.trim();
                            if (trimmed && isTruncated(trimmed)) {
                                // Append continuation text, ensuring proper spacing
                                const continuation = continuationText.description.trim();
                                
                                // Check if the continuation text starts with words that are already at the end of the description
                                // This handles cases where the CSV has overlapping text
                                const descWords = trimmed.split(/\s+/);
                                const contWords = continuation.split(/\s+/);
                                
                                // Find how many words overlap (check last 5 words of description with first 5 of continuation)
                                let overlapCount = 0;
                                const checkCount = Math.min(5, descWords.length, contWords.length);
                                for (let i = 1; i <= checkCount; i++) {
                                    const descEnd = descWords.slice(-i).map(w => w.toLowerCase().replace(/[.,;:!?]$/, '')).join(' ');
                                    const contStart = contWords.slice(0, i).map(w => w.toLowerCase().replace(/[.,;:!?]$/, '')).join(' ');
                                    if (descEnd === contStart) {
                                        overlapCount = i;
                                    }
                                }
                                
                                // If there's overlap, remove the overlapping words from description before appending
                                if (overlapCount > 0) {
                                    description = descWords.slice(0, -overlapCount).join(' ') + ' ' + continuation;
                                } else {
                                    description = trimmed + ' ' + continuation;
                                }
                            }
                        }
                    }
                    
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
    let motives_tactics = row.Motives_Tactics || "";
    
    // Validate motives_tactics - if it looks like a page reference or is malformed, generate it
    const isPageRef = /(?:^|[a-z]+)Page\s+\d+/i.test(motives_tactics);
    const motivesIsTruncated = motives_tactics.length < 10 && /^[a-z]/.test(motives_tactics);
    const isEmpty = !motives_tactics || motives_tactics.trim().length === 0;
    
    if (isPageRef || motivesIsTruncated || isEmpty) {
        // Generate motives using the same logic as DND5e conversion
        motives_tactics = generateMotivesAndTactics(row, role, row.Type ? row.Type.split(' ')[0] : "");
    }
    
    // Category is not available in Daggerheart CSV, default to Unknown
    const category = "Unknown";
    
    // Biome defaults to Unknown (could be extracted from description if needed)
    const biome = "Unknown";
    
    return {
        id: "", // assigned by assignStableIds()
        name: row.Name,
        tier,
        role,
        category,
        biome,
        stats,
        features,
        motives_tactics,
        experiences,
        source: "Daggerheart",
        book: "Daggerheart"
    };
}

function convertRow(row) {
    const hpRaw = parseHP(row.HP);
    // "None" CR (adventure NPCs such as SKT's Bryn Shander townsfolk, summoned spirits): place by HP instead of CR 0
    const cr = /^\s*none/i.test(row.CR || "") ? estimateCRFromHP(hpRaw) : parseCR(row.CR);
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
    stats.damage_dice = `${stats.damage_dice} ${primaryDamageKind(row.Actions)}`;

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
        const legendaryActions = convertActionsToDaggerheart(row["Legendary Actions"], role, cr, tier, { legendary: true });
        allActions.push(...legendaryActions);
    }
    if (row.Reactions) {
        allActions.push(...convertActionsToDaggerheart(row.Reactions, role, cr, tier, { reaction: true }));
    }
    
    if (allActions.length > 0) {
        features.push({ name: "Actions", entries: allActions });
    }
    
    // Add role-specific features
    const enhancedFeatures = addRoleSpecificFeatures(features, role, cr, tier, {
        legendary: Boolean(row["Legendary Actions"]),
        damage: stats.damage_dice,
    });

    // Generate Motives & Tactics
    const motivesTactics = generateMotivesAndTactics(row, role, row.Type ? row.Type.split(' ')[0] : "");

    // Convert Experiences from Skills
    const experiences = convertExperiences(row);

    return {
        id: "", // assigned by assignStableIds()
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
        source: "DND5e",
        book: row.Source
    };
}

// "phy" or "mag" for the stat-block damage: taken from the creature's first attack
// (spell attacks and attacks whose first damage is not bludgeoning/piercing/slashing are magic).
function primaryDamageKind(actionsText) {
    for (const line of (actionsText || "").split("\n")) {
        const dot = line.indexOf(".");
        if (dot === -1) continue;
        const atk = parseAttack(line.substring(dot + 1).trim());
        if (!atk) continue;
        if (atk.spell) return "mag";
        if (atk.damages.length) return isPhysicalType(atk.damages[0].type) ? "phy" : "mag";
    }
    const anyDamage = extractDamages(actionsText || "")[0];
    return anyDamage && !isPhysicalType(anyDamage.type) ? "mag" : "phy";
}

function parseFeatureText(text) {
    if (!text) return [];

    // Split by newlines, filtering out empty lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    return lines.map(line => {
        // Find the first period which usually separates Name from Description
        const firstPeriodIndex = line.indexOf('.');
        const name = firstPeriodIndex !== -1 ? line.substring(0, firstPeriodIndex).trim() : "";
        const raw = firstPeriodIndex !== -1 ? line.substring(firstPeriodIndex + 1).trim() : line.trim();

        // Spellcasting traits (2014 stat blocks) are actions in Daggerheart
        if (isSpellcastingAction(name)) {
            return { name: stripUsageTag(name), description: convertSpellcasting(raw) };
        }
        // Adventure NPC flavour (SKT etc.): narrative, not a game feature
        if (/^roleplaying information$/i.test(name)) {
            const flavour = raw.replace(/\s*(Ideal|Bond|Flaw):\s*/g, (m, k) => `\n**${k}:** `);
            return { name, description: convertMarkdownToHTML(flavour) };
        }
        // Daggerheart adversaries have no saving throws to auto-succeed; the closest equivalent spends Fear.
        if (/^legendary resistance/i.test(name)) {
            return { name: "Legendary Resistance", description: convertMarkdownToHTML("**Reaction:** When this adversary fails a Reaction Roll, you can spend a Fear to make it succeed instead.") };
        }

        const description = dhText(raw);
        const featureType = classifyFeature(description);
        return { name: stripUsageTag(name), description: convertMarkdownToHTML(`**${featureType}:** ${description}`) };
    });
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

if (unknownSpells.size) console.warn(`Spells not in Spells.csv (listed by name only): ${[...unknownSpells].sort().join(", ")}`);

// Stable ids (name + book), so encounters and the Codex keep pointing at the same adversary after a re-run.
assignStableIds(allAdversaries);

// Write combined output
fs.writeFileSync(outputPath, JSON.stringify(allAdversaries, null, 2));
console.log(`Wrote ${allAdversaries.length} total adversaries to ${outputPath}`);
