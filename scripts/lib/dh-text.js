// Text helpers for turning 5e stat-block prose into Daggerheart wording:
// range bands instead of feet, Reaction Rolls instead of saving throws, phy/mag damage, DH conditions.
// Used by scripts/convert.js; pure functions, no I/O.

// 5e ability -> Daggerheart trait used for the matching Reaction Roll.
// CON has no DH trait; endurance checks in the core adversaries use Strength.
export const ABILITY_TO_TRAIT = {
    strength: 'Strength',
    dexterity: 'Agility',
    constitution: 'Strength',
    intelligence: 'Knowledge',
    wisdom: 'Instinct',
    charisma: 'Presence',
};
const ABILITY_RE = '(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)';
const trait = (ability) => ABILITY_TO_TRAIT[ability.toLowerCase()];

// Daggerheart range bands (core rules: Melee, Very Close ~10 ft, Close ~30 ft, Far ~100 ft, Very Far beyond).
export function feetToRange(feet) {
    const ft = Number(feet);
    if (!Number.isFinite(ft)) return null;
    if (ft <= 5) return 'Melee';
    if (ft <= 10) return 'Very Close';
    if (ft <= 30) return 'Close';
    if (ft <= 120) return 'Far';
    return 'Very Far';
}
const rangePhrase = (feet) => {
    const band = feetToRange(feet);
    return band === 'Melee' ? 'Melee range' : `${band} range`;
};

const PHYSICAL_TYPES = new Set(['bludgeoning', 'piercing', 'slashing']);
export const isPhysicalType = (type) => PHYSICAL_TYPES.has(String(type).toLowerCase());

// "18 (3d8 + 5) Bludgeoning damage" / "1 piercing damage" -> [{ dice: "3d8+5", type: "bludgeoning" }]
export function extractDamages(text) {
    const out = [];
    const re = /(\d+)\s*\((\d+d\d+(?:\s*[+−-]\s*\d+)?)\)\s*([A-Za-z]+)\s+damage|\b(\d+)\s+([A-Za-z]+)\s+damage/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (m[2]) out.push({ dice: m[2].replace(/\s+/g, '').replace('−', '-'), type: m[3].toLowerCase() });
        else if (/^(bludgeoning|piercing|slashing|fire|cold|lightning|thunder|acid|poison|necrotic|radiant|psychic|force)$/i.test(m[5])) {
            out.push({ dice: m[4], type: m[5].toLowerCase() });
        }
    }
    return out;
}

// DH has two damage types; elemental flavour is kept in parentheses.
export function formatDamage(d, forceMagic = false) {
    if (!forceMagic && isPhysicalType(d.type)) return `${d.dice} physical damage`;
    const flavour = d.type && !isPhysicalType(d.type) && d.type !== 'force' ? ` (${d.type})` : '';
    return `${d.dice} magic damage${flavour}`;
}

// Parse a 5e attack line in either the 2014 ("Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: ...")
// or the 2024 format ("Melee Attack Roll: +8, reach 10 ft. Hit: ..."). Returns null for non-attacks.
export function parseAttack(description) {
    const head = description.match(/^(Melee or Ranged|Melee|Ranged)\s+(Weapon|Spell)?\s*Attack(?: Roll)?:/i);
    if (!head) return null;
    const kind = head[1].toLowerCase().startsWith('melee or') ? 'both' : head[1].toLowerCase();
    const spell = /spell/i.test(head[2] || '');
    const reach = description.match(/reach (\d+) ft/i);
    const range = description.match(/range (\d+)(?:\/\d+)? ft/i);
    const hitIdx = description.search(/\bHit:/);
    const hitText = hitIdx >= 0 ? description.slice(hitIdx + 4).trim() : '';
    // Drop the alternative two-handed / versatile clause, then the damage clauses; what is left is the rider.
    let primaryHit = hitText.replace(/,?\s*or \d+ \([^)]*\) \w+ damage (?:if|when) [^.]*\./i, '.');
    const damages = extractDamages(primaryHit);
    let rider = primaryHit
        .replace(/(\d+)\s*\((\d+d\d+(?:\s*[+−-]\s*\d+)?)\)\s*[A-Za-z]+\s+damage/g, '')
        .replace(/\b\d+\s+[A-Za-z]+\s+damage/g, '')
        .replace(/^\s*(plus\s*)+/i, '')
        .replace(/\s*plus\s*(?=[,.]|$)/gi, '')
        .replace(/^[\s,.;]+(and\s+)?/i, '')
        .trim();
    if (rider.length < 4) rider = '';
    if (rider) rider = rider[0].toUpperCase() + rider.slice(1);
    let rangeFt = null;
    if (kind === 'melee' || (kind === 'both' && reach)) rangeFt = reach ? parseInt(reach[1], 10) : 5;
    else if (range) rangeFt = parseInt(range[1], 10);
    return { kind, spell, rangeFt, damages, rider };
}

// Remove the 5e usage limiter from a feature name; DH pays for these with Fear instead.
export function stripUsageTag(name) {
    return name
        .replace(/\s*\((?:Recharge[^)]*|Recharges[^)]*|\d+\/Day[^)]*|Costs \d+ Actions)\)/gi, '')
        .replace(/;\s*(?:Recharge[^;)]*|Recharges[^;)]*|\d+\/Day[^;)]*|Costs \d+ Actions)(?=\))/gi, '')
        .trim();
}
export const usageTagCostsFear = (name) => /[(;]\s*(?:Recharge|Recharges|\d+\/Day)/i.test(name);

// Saving throws -> Reaction Rolls. The 5e DC is dropped: a DH Reaction Roll is made against the adversary's Difficulty.
export function convertSaves(text) {
    if (!text) return text;
    let t = text;
    t = t.replace(/\s*\((?:spell save DC|save DC)\s*\d+(?:,\s*[+]\d+ to hit with spell attacks)?\)/gi, '');
    t = t.replace(/,?\s*\bspell save DC\s*\d+/gi, '');
    t = t.replace(/[,;]?\s*[+]\d+ to hit with spell attacks/gi, '');
    // 2024: "Dexterity Saving Throw: DC 20, each creature ..." -> "Agility Reaction Roll: each creature ..."
    t = t.replace(new RegExp(`\\b${ABILITY_RE}\\s+Saving Throw:\\s*DC\\s*\\d+,?\\s*`, 'gi'), (_, ab) => `${trait(ab)} Reaction Roll: `);
    // 2014: "a DC 15 Wisdom saving throw" -> "an Instinct Reaction Roll"
    t = t.replace(new RegExp(`\\bDC\\s*\\d+\\s+${ABILITY_RE}\\s+(saving throws?|saves?)\\b`, 'gi'), (_, ab, st) => `${trait(ab)} Reaction Roll${/s$/i.test(st) ? 's' : ''}`);
    t = t.replace(new RegExp(`\\b${ABILITY_RE}\\s+(saving throws?|saves?)\\b`, 'gi'), (_, ab, st) => `${trait(ab)} Reaction Roll${/s$/i.test(st) ? 's' : ''}`);
    // Ability checks: "a DC 14 Strength (Athletics) check" -> "a Strength Roll (14)"
    t = t.replace(new RegExp(`\\bDC\\s*(\\d+)\\s+${ABILITY_RE}(?:\\s*\\([^)]*\\))?\\s+check`, 'gi'), (_, dc, ab) => `${trait(ab)} Roll (${dc})`);
    t = t.replace(/\s*\(escape DC \d+\)/gi, '');
    t = t.replace(/\bsaving throws\b/gi, 'Reaction Rolls');
    t = t.replace(/\bsaving throw\b/gi, 'Reaction Roll');
    t = t.replace(/\b(?:the caster's |your )?spell save DC\b/gi, "the caster's Difficulty");
    t = t.replace(/\b(a|the|its|their|this|that|failed|successful|later) save\b/gi, '$1 Reaction Roll');
    t = t.replace(/\b(these|those|the|its|their|later) saves\b/gi, '$1 Reaction Rolls');
    t = t.replace(/\battack or save\b/gi, 'attack or Reaction Roll');
    t = t.replace(/\bon a failed Reaction Roll\b/gi, 'on a failure');
    t = t.replace(/\bDC\s*(\d+)\b/g, 'Difficulty $1');
    t = t.replace(/\ba (Agility|Instinct)\b/g, 'an $1');
    return t;
}

// Feet -> range bands, everywhere in a text.
export function convertDistances(text) {
    if (!text) return text;
    let t = text;
    // Areas: "a 60-foot Cone", "a 120-foot-long, 10-foot-wide Line", "a 20-foot-radius Sphere", "10-foot-radius, 40-foot-high Cylinder"
    t = t.replace(/(\d+)-foot(?:-(?:radius|long|wide|high|tall))?(?:,?\s*\d+-foot-(?:wide|high|tall|long))?\s+(cone|line|cube|sphere|emanation|cylinder|square|radius|area)\b/gi,
        (_, ft, shape) => `${shape} (${rangePhrase(ft)})`);
    t = t.replace(/\brange (\d+)\/(\d+) ft\.?/gi, (_, ft) => rangePhrase(ft));
    t = t.replace(/\b(range|reach) (\d+) ft\.?/gi, (_, w, ft) => rangePhrase(ft));
    t = t.replace(/\b(\w+(?:'s)?\s+)?Speed (?:decreases|is reduced) by \d+ (?:feet|ft\.?)/gi, (m, who) => `${who || ''}movement is slowed`);
    t = t.replace(/\b(\w+(?:'s)?\s+)?Speed increases by \d+ (?:feet|ft\.?)/gi, (m, who) => `${who || ''}movement is hastened`);
    t = t.replace(/\bwithin (\d+) (?:feet|ft\.?)/gi, (_, ft) => `within ${rangePhrase(ft)}`);
    t = t.replace(/\b(up to|at least|more than) (\d+) (?:feet|ft\.?)/gi, (_, w, ft) => `${w} ${rangePhrase(ft)}`);
    t = t.replace(/\b(\d+)-foot\b/gi, (_, ft) => feetToRange(ft));
    t = t.replace(/\b(\d+) (?:feet|foot|ft\.?)(?! (?:tall|high|long|wide|deep|across|in diameter|thick))/gi, (_, ft) => rangePhrase(ft));
    return t;
}

// 5e conditions with a direct DH counterpart.
export function convertConditions(text) {
    if (!text) return text;
    return text
        .replace(/\bhas the Prone condition\b/gi, 'is knocked prone')
        .replace(/\b(knocked|falls?) prone\b(?! \(Vulnerable\))/gi, (m) => `${m} (Vulnerable)`)
        .replace(/\bthe Grappled condition\b/gi, 'the Restrained condition')
        .replace(/\bis grappled\b/gi, 'is Restrained');
}

// "27 (6d8) Fire damage" -> "6d8 magic damage (fire)"; "13 (2d8 + 4) Slashing damage" -> "2d8+4 physical damage".
export function convertDamageText(text) {
    if (!text) return text;
    return text.replace(/\b\d+\s*\((\d+d\d+(?:\s*[+−-]\s*\d+)?)\)\s*(bludgeoning|piercing|slashing|fire|cold|lightning|thunder|acid|poison|necrotic|radiant|psychic|force)\s+damage/gi,
        (_, dice, type) => formatDamage({ dice: dice.replace(/\s+/g, '').replace('−', '-'), type: type.toLowerCase() }))
        .replace(/\b\d+\s*\((\d+d\d+(?:\s*[+−-]\s*\d+)?)\)/g, (_, dice) => dice.replace(/\s+/g, '').replace('−', '-'));
}

// Leftover 5e vocabulary. Advantage/disadvantage are kept: Daggerheart uses them too.
export function convertTerminology(text) {
    if (!text) return text;
    let t = text;
    t = t.replace(/\btemporary hit points?\b/gi, 'temporary HP');
    t = t.replace(/\bhit points?\b/gi, 'HP');
    t = t.replace(/\b(?:As|as) (?:a|its|their|his|her) bonus action,?\s*/g, '');
    t = t.replace(/\bas a bonus action\b/gi, 'as part of its action');
    t = t.replace(/\b(?:a|its|their) bonus action\b/gi, 'its action');
    // "take(s) the Disengage or Hide action" -> "move(s) away freely or become(s) Hidden"
    const ACT = { dash: ['move', 'moves'], disengage: ['move away freely', 'moves away freely'], hide: ['become Hidden', 'becomes Hidden'] };
    t = t.replace(/\b(takes?) the (Dash|Disengage|Hide)(?:,? or (?:the )?(Dash|Disengage|Hide))? action\b/gi, (_, v, a, b) => {
        const i = /^takes$/i.test(v) ? 1 : 0;
        return [a, b].filter(Boolean).map((x) => ACT[x.toLowerCase()][i]).join(' or ');
    });
    t = t.replace(/\+(\d+) bonus to (its|his|her|their) AC\b/gi, '+$1 bonus to $2 Difficulty');
    t = t.replace(/\b(adds?) (\d+) to (its|his|her|their) AC\b/gi, '$1 $2 to $3 Difficulty');
    t = t.replace(/\bArmor Class\b/g, 'Difficulty').replace(/\bAC\b/g, 'Difficulty');
    t = t.replace(/\bnonmagical\b/gi, 'non-magical');
    return t;
}

// The whole pipeline for free text.
export const toDaggerheartText = (text) => convertConditions(convertDamageText(convertDistances(convertSaves(convertTerminology(text)))));
