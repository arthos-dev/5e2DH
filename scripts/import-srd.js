// Imports the official Daggerheart adversaries and environments from the Daggerheart SRD 2.0, using Old Gus'
// hypertext edition (https://github.com/callmepartario/og-dhsrd; SRD © Critical Role LLC, used under the
// Darrington Press Community Gaming License, DPCGL).
//
//   node scripts/import-srd.js [path/to/og-dhsrd]      (default: $OG_DHSRD_DIR or ../ext/og-dhsrd)
//
// Writes committed snapshots, so `npm run convert` works without the SRD checkout:
//   data/srd/adversaries.json       official adversaries in the app's Adversary shape (ids are assigned by convert.js)
//   data/srd/adversary-types.json   the SRD's per-type damage dice by tier (used to calibrate the converter)
//   src/data/environments.json      official environments ("<name>--daggerheart" ids)
// Without an SRD checkout it keeps the existing snapshots and says so.
import fs from "node:fs";
import path from "node:path";
import { loadSrd, SRD_DIR } from "./lib/srd.js";
import { convertFeature, cleanHtml, stripTags } from "./lib/srd-html.js";
import { slug } from "./lib/stable-id.js";

const OUT_DIR = path.resolve("data/srd");
const ADV_OUT = path.join(OUT_DIR, "adversaries.json");
const TYPES_OUT = path.join(OUT_DIR, "adversary-types.json");
const ENV_OUT = path.resolve("src/data/environments.json");

const parseExperience = (e) => {
  const m = String(e).match(/^(.*?)\s*([+−-]\s*\d+)\s*$/);
  return m ? { name: m[1].trim(), value: parseInt(m[2].replace(/[−\s]/g, (c) => (c === "−" ? "-" : "")), 10) } : { name: String(e).trim(), value: 2 };
};
const num = (v) => (typeof v === "number" ? v : /^\s*-?\d+\s*$/.test(String(v)) ? parseInt(v, 10) : null);
const RANGE_WORDS = { melee: "Melee", "very close": "Very Close", close: "Close", far: "Far", "very far": "Very Far" };
const DAMAGE_WORDS = { phy: "physical", mag: "magic" };

export function convertSrdAdversary(a) {
  const role = String(a.type).trim().toUpperCase();
  const dmgType = String(a.attackdamagetype || "phy").trim();
  const traits = [];
  const actions = [];

  // The standard attack (the app has no separate attack name/range fields, so it is listed as the first action).
  const range = RANGE_WORDS[String(a.attackrange).trim().toLowerCase()] ?? a.attackrange;
  const damageWords = dmgType.split(/\s+/).map((w) => DAMAGE_WORDS[w] ?? w).join(" ");
  const atk = num(a.attackbonus) ?? 0;
  actions.push({
    name: a.attacklabel || "Attack",
    description: `<strong>Standard Attack:</strong> Make an attack (${atk >= 0 ? "+" : "−"}${Math.abs(atk)}) against a target within ${range} range. On a success, deal ${a.attackdamage} ${damageWords} damage.`,
  });

  for (const html of [...(a.features || []), ...(a.evolution || [])]) {
    const f = convertFeature(html);
    if (!f.name) {
      console.warn(`  ${a.label}: feature without a "Name—Type:" header kept as is`);
    }
    let description = f.description;
    if (/^Horde\b/.test(f.name) && num(a.hphorde)) {
      description += ` Each HP stands for ${a.hphorde} member${a.hphorde > 1 ? "s" : ""} of the horde (${a.hphorde}/HP).`;
    }
    (f.type === "Passive" ? traits : actions).push({ name: f.name || "Feature", description });
  }

  const features = [];
  if (traits.length) features.push({ name: "Traits", entries: traits });
  features.push({ name: "Actions", entries: actions });

  const motive = stripTags(cleanHtml(a.motive || ""));
  return {
    id: "", // assigned by assignStableIds() in convert.js: "<name>--daggerheart"
    name: a.label,
    tier: num(a.tier) ?? 1,
    role,
    category: a.category || "Unknown",
    biome: "Unknown",
    stats: {
      difficulty: num(a.difficulty) ?? 10,
      threshold_major: num(a.thresholdmajor),
      threshold_severe: num(a.thresholdsevere),
      hp: num(a.hp) ?? 1,
      stress: num(a.stress) ?? 1,
      attack_mod: atk,
      damage_dice: `${a.attackdamage} ${dmgType}`,
    },
    features,
    motives_tactics: motive,
    description: stripTags(cleanHtml(a.summary || "")),
    experiences: (a.experiences || []).map(parseExperience),
    source: "Daggerheart",
    book: "Daggerheart",
    srd_pages: a.pages || [],
  };
}

export function convertSrdEnvironment(e) {
  const features = [];
  for (const html of e.features || []) {
    const f = convertFeature(html);
    if (!f.name && !stripTags(f.description)) {
      // A paragraph that only holds GM questions belongs to the feature before it.
      const prev = features[features.length - 1];
      if (prev && f.question) prev.question = prev.question ? `${prev.question} ${f.question}` : f.question;
      continue;
    }
    const feature = { name: f.name || "Feature", type: (f.type || "Passive").toLowerCase(), text: f.body ?? f.description };
    if (f.question) feature.question = f.question;
    features.push(feature);
  }
  const advHtml = String(e.adversaries || "");
  const adversaryIds = [...new Set([...advHtml.matchAll(/#define-adversary-([a-z0-9-]+)/g)].map((m) => `${m[1]}--daggerheart`))];
  const difficulty = num(e.difficulty);
  const env = {
    id: `${slug(e.label)}--daggerheart`,
    name: e.label,
    tier: num(e.tier) ?? 1,
    type: String(e.type).replace(/[^A-Za-z]/g, ""), // "Social)" typo in the SRD
    description: stripTags(cleanHtml(e.summary || "")),
    impulses: stripTags(cleanHtml(e.impulses || "")).split(/\s*,\s*/).filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)),
    difficulty,
    potential_adversaries: stripTags(cleanHtml(advHtml)),
    adversary_ids: adversaryIds,
    features,
    source: "Daggerheart",
    book: "Daggerheart",
    srd_pages: e.pages || [],
  };
  if (difficulty === null) env.difficulty_note = stripTags(cleanHtml(String(e.difficulty)));
  if (e.ednote) env.notes = stripTags(cleanHtml(e.ednote));
  return env;
}

function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : SRD_DIR;
  const file = path.join(dir, "scripts/og-dhsrd-features.js");
  if (!fs.existsSync(file)) {
    console.warn(`SRD not found at ${file}: keeping the committed snapshots in data/srd/ and src/data/environments.json`);
    return;
  }
  const srd = loadSrd(file);
  const adversaries = srd.adversaries.map(convertSrdAdversary);
  const types = srd.adversaryTypes.map((t) => ({
    type: t.label.toUpperCase(),
    damage: { 1: t.t1damage ?? [], 2: t.t2damage ?? [], 3: t.t3damage ?? [], 4: t.t4damage ?? [] },
    ...(t.t1damagehalf ? { horde_half_damage: { 1: t.t1damagehalf, 2: t.t2damagehalf, 3: t.t3damagehalf, 4: t.t4damagehalf } } : {}),
  }));
  const environments = srd.environments.map(convertSrdEnvironment);
  const known = new Set(adversaries.map((a) => `${slug(a.name)}--daggerheart`));
  for (const env of environments) {
    const missing = env.adversary_ids.filter((id) => !known.has(id));
    if (missing.length) console.warn(`  ${env.name}: links to unknown adversaries ${missing.join(", ")}`);
    env.adversary_ids = env.adversary_ids.filter((id) => known.has(id));
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(ADV_OUT, JSON.stringify(adversaries, null, 2) + "\n");
  fs.writeFileSync(TYPES_OUT, JSON.stringify(types, null, 2) + "\n");
  fs.writeFileSync(ENV_OUT, JSON.stringify(environments, null, 2) + "\n");
  console.log(`SRD: ${adversaries.length} adversaries, ${types.length} adversary types, ${environments.length} environments`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
