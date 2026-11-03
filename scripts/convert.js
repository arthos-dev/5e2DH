
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
// Official Daggerheart adversaries: snapshot of the Daggerheart SRD 2.0 written by scripts/import-srd.js
const srdAdversariesPath = path.resolve('./data/srd/adversaries.json');
const srdTypesPath = path.resolve('./data/srd/adversary-types.json');
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
// Role-specific stat tables, calibrated against the 264 official adversaries of the Daggerheart SRD 2.0
// (data/srd/adversaries.json; see CONVERTER-REVIEW.md, Round 2). Ranges are roughly the 20th–80th percentile
// of the official stat blocks of that tier and type, widened where the SRD has fewer than four examples
// (T4 Ranged/Skulk/Social/Standard, T3 Horde/Minion, T1 Support), and kept monotonic across tiers.
// Damage dice are the SRD's own per-type, per-tier arrays (data/srd/adversary-types.json); minions deal flat damage.
// ============================================================================
const ROLE_STAT_TABLES = {
    BRUISER: {
        1: { difficulty: [12, 14], major: [7, 9], severe: [13, 15], hp: [5, 7], stress: [2, 4], atk: [0, 2] },
        2: { difficulty: [14, 16], major: [13, 15], severe: [25, 29], hp: [6, 8], stress: [3, 5], atk: [2, 3] },
        3: { difficulty: [16, 18], major: [20, 22], severe: [36, 40], hp: [6, 8], stress: [3, 5], atk: [2, 5] },
        4: { difficulty: [19, 21], major: [35, 42], severe: [66, 71], hp: [7, 9], stress: [4, 5], atk: [3, 5] }
    },
    HORDE: {
        1: { difficulty: [10, 12], major: [4, 6], severe: [8, 11], hp: [4, 6], stress: [2, 3], atk: [-2, 0] },
        2: { difficulty: [13, 15], major: [8, 11], severe: [18, 21], hp: [4, 6], stress: [3, 3], atk: [-1, 1] },
        3: { difficulty: [15, 16], major: [15, 18], severe: [30, 32], hp: [6, 8], stress: [3, 4], atk: [0, 2] },
        4: { difficulty: [17, 18], major: [24, 26], severe: [45, 48], hp: [7, 8], stress: [5, 6], atk: [2, 3] }
    },
    LEADER: {
        1: { difficulty: [12, 14], major: [6, 8], severe: [12, 14], hp: [6, 7], stress: [3, 4], atk: [1, 3] },
        2: { difficulty: [15, 16], major: [12, 14], severe: [24, 27], hp: [6, 7], stress: [4, 5], atk: [2, 4] },
        3: { difficulty: [17, 19], major: [20, 24], severe: [36, 42], hp: [6, 8], stress: [5, 6], atk: [4, 5] },
        4: { difficulty: [19, 21], major: [33, 37], severe: [66, 70], hp: [7, 9], stress: [5, 8], atk: [6, 8] }
    },
    MINION: {
        // Flat damage like the official minions (SRD medians 2, 5, 5–8, 11), no thresholds.
        1: { difficulty: [9, 11], major: null, severe: null, hp: [1, 1], stress: [1, 1], atk: [-2, 0], damage: ["2"] },
        2: { difficulty: [12, 14], major: null, severe: null, hp: [1, 1], stress: [1, 1], atk: [0, 1], damage: ["5"] },
        3: { difficulty: [14, 15], major: null, severe: null, hp: [1, 1], stress: [1, 1], atk: [0, 1], damage: ["7"] },
        4: { difficulty: [17, 18], major: null, severe: null, hp: [1, 1], stress: [1, 2], atk: [2, 3], damage: ["11"] }
    },
    RANGED: {
        1: { difficulty: [9, 12], major: [3, 5], severe: [6, 8], hp: [3, 3], stress: [2, 3], atk: [-1, 2] },
        2: { difficulty: [14, 15], major: [7, 10], severe: [15, 20], hp: [4, 5], stress: [3, 5], atk: [2, 4] },
        3: { difficulty: [16, 18], major: [17, 20], severe: [30, 32], hp: [5, 6], stress: [4, 6], atk: [3, 4] },
        4: { difficulty: [18, 20], major: [22, 30], severe: [45, 55], hp: [4, 6], stress: [3, 5], atk: [4, 6] }
    },
    SKULK: {
        1: { difficulty: [11, 13], major: [4, 6], severe: [8, 10], hp: [3, 4], stress: [2, 3], atk: [0, 2] },
        2: { difficulty: [13, 15], major: [8, 10], severe: [16, 20], hp: [4, 5], stress: [3, 5], atk: [2, 3] },
        3: { difficulty: [14, 16], major: [16, 18], severe: [30, 33], hp: [5, 6], stress: [3, 5], atk: [2, 4] },
        4: { difficulty: [17, 19], major: [26, 32], severe: [50, 58], hp: [5, 6], stress: [4, 6], atk: [4, 8] }
    },
    SOLO: {
        1: { difficulty: [13, 14], major: [7, 8], severe: [14, 15], hp: [8, 9], stress: [3, 4], atk: [2, 4] },
        2: { difficulty: [14, 16], major: [12, 14], severe: [22, 27], hp: [7, 10], stress: [4, 5], atk: [2, 4] },
        3: { difficulty: [17, 19], major: [19, 23], severe: [35, 43], hp: [10, 12], stress: [6, 8], atk: [3, 7] },
        4: { difficulty: [19, 20], major: [33, 38], severe: [60, 70], hp: [9, 12], stress: [6, 8], atk: [7, 9] }
    },
    STANDARD: {
        1: { difficulty: [11, 13], major: [5, 7], severe: [9, 12], hp: [4, 5], stress: [2, 3], atk: [0, 1] },
        2: { difficulty: [13, 15], major: [8, 11], severe: [17, 22], hp: [4, 5], stress: [3, 4], atk: [1, 2] },
        3: { difficulty: [16, 17], major: [17, 19], severe: [33, 36], hp: [5, 7], stress: [4, 5], atk: [2, 3] },
        4: { difficulty: [18, 19], major: [28, 32], severe: [45, 50], hp: [5, 7], stress: [4, 5], atk: [4, 5] }
    },
    SUPPORT: {
        1: { difficulty: [12, 13], major: [5, 7], severe: [9, 11], hp: [3, 4], stress: [4, 5], atk: [1, 2] },
        2: { difficulty: [13, 14], major: [8, 9], severe: [16, 18], hp: [3, 4], stress: [5, 7], atk: [1, 2] },
        3: { difficulty: [15, 17], major: [16, 21], severe: [31, 36], hp: [5, 6], stress: [4, 5], atk: [2, 3] },
        4: { difficulty: [18, 19], major: [25, 28], severe: [42, 47], hp: [4, 6], stress: [4, 5], atk: [4, 6] }
    },
    SOCIAL: {
        1: { difficulty: [12, 14], major: [4, 6], severe: [8, 10], hp: [3, 3], stress: [3, 5], atk: [-4, -3] },
        2: { difficulty: [13, 15], major: [7, 9], severe: [13, 18], hp: [3, 4], stress: [3, 4], atk: [-3, 0] },
        3: { difficulty: [16, 17], major: [16, 20], severe: [30, 32], hp: [4, 6], stress: [5, 6], atk: [0, 3] },
        4: { difficulty: [17, 19], major: [25, 30], severe: [42, 50], hp: [5, 6], stress: [5, 6], atk: [2, 4] }
    }
};

// Official damage dice per type and tier, sorted by average (low → high).
const SRD_TYPES = JSON.parse(fs.readFileSync(srdTypesPath, 'utf8'));
for (const t of SRD_TYPES) {
    const table = ROLE_STAT_TABLES[t.type];
    if (!table) continue;
    for (const tier of [1, 2, 3, 4]) {
        if (table[tier].damage) continue; // minions: flat damage
        table[tier].damage = [...t.damage[tier]].sort((x, y) => averageDice(x) - averageDice(y));
    }
}

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

// 5e offense of a stat block: the best single attack (all its damage parts) and the attacks per turn from Multiattack.
function fiveEOffense(row) {
    let best = 0;
    for (const line of (row.Actions || "").split("\n")) {
        const dot = line.indexOf(".");
        const atk = dot === -1 ? null : parseAttack(line.substring(dot + 1).trim());
        if (!atk) continue;
        best = Math.max(best, atk.damages.reduce((sum, d) => sum + averageDice(d.dice), 0));
    }
    const multi = (row.Actions || "").split("\n").find((l) => /^multiattack\b/i.test(l.trim()));
    const count = multi ? parseAttackCount(multi.substring(multi.indexOf(".") + 1)) : 1;
    return { best, count, dpr: best * count };
}

// Median 5e damage per round by CR over Bestiary.csv (filled by convertAdversaries before converting).
let MEDIAN_DPR = [];
function buildMedianDPR(rows) {
    const byCR = new Map();
    for (const row of rows) {
        if (!row.Name || !row.CR || /^\s*none/i.test(row.CR)) continue;
        const { dpr } = fiveEOffense(row);
        if (dpr <= 0) continue;
        const cr = parseCR(row.CR);
        byCR.set(cr, [...(byCR.get(cr) ?? []), dpr]);
    }
    const crs = [...byCR.keys()].sort((a, b) => a - b);
    MEDIAN_DPR = crs.map((cr) => {
        // Pool neighbouring CRs until there are at least 15 stat blocks.
        let pool = [...byCR.get(cr)];
        for (let k = 1, i = crs.indexOf(cr); pool.length < 15 && k < crs.length; k++) {
            if (crs[i - k] !== undefined) pool.push(...byCR.get(crs[i - k]));
            if (crs[i + k] !== undefined) pool.push(...byCR.get(crs[i + k]));
        }
        pool.sort((a, b) => a - b);
        return [cr, pool[Math.floor(pool.length / 2)]];
    });
}
function medianDPR(cr) {
    let best = MEDIAN_DPR[0];
    for (const e of MEDIAN_DPR) if (Math.abs(e[0] - cr) < Math.abs(best[0] - cr)) best = e;
    return best ? best[1] : 0;
}

// Pick the damage dice within the official array (sorted low → high) by how hard the 5e creature hits for its CR:
// damage per round at the CR median → the middle of the array; 1.6× (or more) → the top; 1/1.6× (or less) → the bottom.
function selectDamageDice(damageOptions, offense, cr) {
    if (!damageOptions || damageOptions.length === 0) return "1d6+1";
    if (damageOptions.length === 1) return damageOptions[0];
    const median = medianDPR(cr);
    if (!offense || !(offense.dpr > 0) || !(median > 0)) return damageOptions[Math.floor((damageOptions.length - 1) / 2)];
    const position = Math.max(0, Math.min(1, 0.5 + Math.log(offense.dpr / median) / (2 * Math.log(1.6))));
    return damageOptions[Math.round(position * (damageOptions.length - 1))];
}

// Dice with a given average for a tier, written like the SRD's: as many dice as the tier (fewer for small amounts),
// the largest die (d4–d12) that leaves a non-negative modifier, e.g. 40 at Tier 4 -> "4d12+14".
function diceForAverage(target, tier) {
    const t = Math.max(1, Math.round(target));
    const n = Math.max(1, Math.min(tier, Math.floor(t / 3.5)));
    for (const d of [12, 10, 8, 6, 4]) {
        const base = n * (d + 1) / 2;
        if (base <= t) {
            const mod = Math.round(t - base);
            return mod > 0 ? `${n}d${d}+${mod}` : `${n}d${d}`;
        }
    }
    return String(t);
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

// Median 5e HP for a CR (interpolated in MEDIAN_HP_BY_CR).
function medianHPForCR(cr) {
    let best = MEDIAN_HP_BY_CR[0];
    for (const e of MEDIAN_HP_BY_CR) if (Math.abs(e[0] - cr) < Math.abs(best[0] - cr)) best = e;
    return best[1];
}

// Spells that heal, protect or empower allies, or hinder enemies without dealing damage.
const SUPPORT_SPELLS = /\b(cure wounds|healing word|mass cure wounds|mass healing word|prayer of healing|heal|mass heal|aid|bless|bane|beacon of hope|shield of faith|sanctuary|protection from evil and good|warding bond|death ward|haste|slow|heroism|enhance ability|greater invisibility|hold person|hold monster|bestow curse|hex|hypnotic pattern|confusion|mass suggestion|revivify|raise dead|spirit guardians|freedom of movement|lesser restoration|greater restoration|guidance|resistance|spiritual weapon)\b/g;

function isSupportCreature(row, nameLower, actions, traits) {
    if (/\b(cleric|priest|priestess|acolyte|druid|shaman|healer|bard|chaplain|medic|herbalist)\b/.test(nameLower)) return true;
    const text = `${actions}\n${traits}\n${(row["Bonus Actions"] || "").toLowerCase()}\n${(row.Reactions || "").toLowerCase()}`;
    // Heals, shields or empowers others
    if (/\b(?:an ally|allies|another creature|each (?:friendly|allied) creature|one (?:friendly |allied )?creature (?:it|she|he) can see)\b[^.]*\b(?:regains? \d*\s*(?:\(\d+d\d+[^)]*\)\s*)?hit points|temporary hit points|gains? (?:a )?\+\d|has advantage|(?:gains?|have) advantage|bonus to (?:attack|its|their))/.test(text)) return true;
    if (/\b(?:allies|ally)\b[^.]*\b(?:within|that can (?:see|hear))\b[^.]*\b(?:add|gain|has|have)\b/.test(text) && !/\bpack tactics\b/.test(traits)) return true;
    // Casters whose spell list is mostly support/control
    const spellText = text.match(/spellcasting[\s\S]*/)?.[0] ?? "";
    const supportSpells = new Set(spellText.match(SUPPORT_SPELLS) ?? []);
    return supportSpells.size >= 2;
}

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
    
    // Support: creatures whose actions heal or buff allies or hinder the PCs (SRD: "Supports enhance allies or disrupt
    // the PCs"; 5% of the official adversaries). Word-boundary matches only ("aid" used to match "said", "shield"
    // every Shield spell), and being a spellcaster is no longer enough: casters with damage spells stay Ranged/Standard.
    if (isSupportCreature(row, nameLower, actions, traits)) {
        return "SUPPORT";
    }

    // Leader (high intelligence + humanoid/fiend, or has command abilities)
    if ((int > 15 && (typeLower.includes("humanoid") || typeLower.includes("fiend"))) ||
        /\b(leadership|commands? (?:its |their )?(?:allies|followers|troops|minions))\b/.test(actions + " " + traits)) {
        return "LEADER";
    }

    // Bruiser (high HP for its CR, or heavily armored below CR 10)
    // (The old test "hpRaw > daggerHP * divisor * 1.5" could never be true.)
    if (hpRaw > 1.5 * medianHPForCR(cr) ||
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
function calculateRoleStats(role, tier, cr, hpRaw, acRaw, int, isBeastOrPlant, hasPsychicResist, offense) {
    const roleUpper = role.toUpperCase();
    const table = ROLE_STAT_TABLES[roleUpper];
    
    if (!table || !table[tier]) {
        // Fallback to STANDARD if role not found
        const fallbackTable = ROLE_STAT_TABLES.STANDARD[tier] || ROLE_STAT_TABLES.STANDARD[1];
        return calculateStatsFromTable(fallbackTable, tier, cr, hpRaw, acRaw, int, isBeastOrPlant, hasPsychicResist, "STANDARD", offense);
    }
    
    return calculateStatsFromTable(table[tier], tier, cr, hpRaw, acRaw, int, isBeastOrPlant, hasPsychicResist, roleUpper, offense);
}

function calculateStatsFromTable(table, tier, cr, hpRaw, acRaw, int, isBeastOrPlant, hasPsychicResist, role, offense) {
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
    let damage = selectDamageDice(table.damage, offense, cr);
    
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
            const minionValue = tier === 1 ? 4 : tier === 2 ? 6 : tier === 3 ? 8 : 12; // SRD medians
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
        const hordeDamage = diceForAverage(averageDice(String(opts.damage || "")) / 2, tier);
        const kind = /mag$/.test(opts.damage || "") ? "magic" : "physical";
        newFeatures.push({
            name: `Horde (${hordeDamage})`,
            description: convertMarkdownToHTML(`**Passive:** When this Horde has marked half or more of their HP, their standard attack deals ${hordeDamage} ${kind} damage instead.`)
        });
    }

    // SOLO: the SRD says to give every Solo Relentless and Momentum. Relentless (3) for CR 20+ (the 5e legendary
    // bosses), (2) otherwise.
    if (roleUpper === "SOLO") {
        if (!hasFeature("relentless")) {
            const relentlessValue = cr >= 20 ? 3 : 2;
            newFeatures.push({
                name: `Relentless (${relentlessValue})`,
                description: convertMarkdownToHTML(`**Passive:** This adversary can be spotlighted up to ${relentlessValue} times per GM turn. Spend Fear as usual to spotlight them.`)
            });
        }
        if (!hasFeature("momentum")) {
            newFeatures.push({
                name: "Momentum",
                description: convertMarkdownToHTML("**Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.")
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
            converted.push(role.toUpperCase() === "SOLO" ? convertSoloMultiattack(description) : convertMultiattack(name, description));
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

// Solos have Relentless (X): a spotlight that made N attacks could be repeated X times per GM turn (Iymrith:
// 3 × 3 T4 attacks). Official Solos never make several standard attacks against one target; they hit several
// targets at once instead (Kraken "Many Tentacles", Cipactli "Many Mouths", Fallen Warlord "Shattering Strike").
const NUMBER_NAMES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight"];
function convertSoloMultiattack(description) {
    const count = parseAttackCount(description);
    return {
        name: "Sweeping Attacks",
        description: convertMarkdownToHTML(`**Action:** Mark a Stress to make a standard attack against up to ${NUMBER_NAMES[count] ?? count} different targets within range.`)
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
    buildMedianDPR(rows);
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
    const offense = fiveEOffense(row);
    const stats = calculateRoleStats(role, tier, cr, hpRaw, acRaw, int, isBeastOrPlant, hasPsychicResist, offense);
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
    
    // Feature damage in Daggerheart scale (minions deal flat damage and have no 5e-sized features worth scaling)
    if (role !== "MINION") rescaleFeatureDamage(features, stats.damage_dice, offense, cr, tier);

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

// Feature damage in the tier's scale (proposal 4). 5e features keep 5e dice (Iymrith's breath: 16d10), so every
// damage expression is rescaled relative to the stat block: its share of the creature's best 5e attack, times the
// average of the Daggerheart standard damage. Official adversaries' feature damage sits at about 0.5–1.5× their
// standard attack (area attacks 0.6–1.0×), so single-target damage is capped at 1.5× and area damage at 1×.
const FIVE_E_TYPES = 'bludgeoning|piercing|slashing|fire|cold|lightning|thunder|acid|poison|necrotic|radiant|psychic|force';
const DAMAGE_EXPR = new RegExp(`\\b(\\d+d\\d+(?:\\s*[+−-]\\s*\\d+)?)\\s+(physical|magic|${FIVE_E_TYPES})\\s+damage(?:\\s+\\((\\w+)\\))?`, 'gi');
const AREA_EFFECT = /\b(each creature|each target|all targets|every creature|each other creature|creatures? (?:in|within) (?:the|that|a|an) (?:cone|line|sphere|cube|cylinder|emanation|area|radius)|in a (?:cone|line|sphere|cube|cylinder|emanation)|all other creatures)\b/i;
function rescaleDamageText(text, standardDice, reference, tier) {
    const standardAvg = averageDice(standardDice);
    return text.split(/(?=<li>)/).map((segment) => {
        const cap = AREA_EFFECT.test(segment) ? 1.0 : 1.5;
        return segment.replace(DAMAGE_EXPR, (m, dice, kind, flavour) => {
            const ratio = Math.min(cap, averageDice(dice.replace(/\s+/g, '').replace('−', '-')) / reference);
            // About the standard attack's damage: write the stat block's own dice
            const scaled = Math.abs(ratio - 1) <= 0.1 ? standardDice : diceForAverage(standardAvg * ratio, tier);
            const lower = kind.toLowerCase();
            if (lower === 'physical' || lower === 'magic') return `${scaled} ${lower} damage${flavour ? ` (${flavour})` : ''}`;
            return formatDamage({ dice: scaled, type: lower });
        });
    }).join('');
}
function rescaleFeatureDamage(features, standardDice, offense, cr, tier) {
    const dice = String(standardDice).replace(/\s*(phy|mag)$/, '');
    const standardAvg = averageDice(dice);
    const reference = offense.best > 0 ? offense.best : medianDPR(cr) / 2;
    if (!(standardAvg > 0) || !(reference > 0)) return;
    for (const group of features) {
        for (const entry of group.entries) entry.description = rescaleDamageText(entry.description, dice, reference, tier);
    }
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

// Official Daggerheart adversaries from the SRD snapshot (scripts/import-srd.js); they replace adversaries-extracted.csv,
// whose PDF extraction broke thresholds and glued features together. Same name → same "<name>--daggerheart" id.
const srdAdversaries = JSON.parse(fs.readFileSync(srdAdversariesPath, 'utf8'));
console.log(`Read ${srdAdversaries.length} official Daggerheart adversaries from ${srdAdversariesPath}`);
allAdversaries.push(...srdAdversaries);

if (unknownSpells.size) console.warn(`Spells not in Spells.csv (listed by name only): ${[...unknownSpells].sort().join(", ")}`);

// Stable ids (name + book), so encounters and the Codex keep pointing at the same adversary after a re-run.
assignStableIds(allAdversaries);

// Write combined output
fs.writeFileSync(outputPath, JSON.stringify(allAdversaries, null, 2));
console.log(`Wrote ${allAdversaries.length} total adversaries to ${outputPath}`);
