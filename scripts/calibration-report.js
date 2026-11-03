// Calibration report: official Daggerheart adversaries (SRD snapshot) vs converted 5e adversaries, per tier and role.
// Prints markdown tables of median (min–max) per stat. Optional: compare the ids with an older adversaries.json.
//   node scripts/calibration-report.js [--ids old-adversaries.json] [--roles] [--tiers]
import fs from "node:fs";

const args = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync("src/data/adversaries.json", "utf8"));

const avgDice = (s) => {
  const m = String(s).match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/);
  if (!m) return parseFloat(s) || 0;
  return (+m[1] * (+m[2] + 1)) / 2 + (m[3] === "-" ? -1 : 1) * +(m[4] || 0);
};
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};
const cell = (xs) => {
  const v = xs.filter((x) => x !== null && x !== undefined && !Number.isNaN(x));
  if (!v.length) return "-";
  return `${Math.round(median(v))} (${Math.round(Math.min(...v))}–${Math.round(Math.max(...v))})`;
};
const STATS = [
  ["Difficulty", (a) => a.stats.difficulty],
  ["Major", (a) => a.stats.threshold_major],
  ["Severe", (a) => a.stats.threshold_severe],
  ["HP", (a) => a.stats.hp],
  ["Stress", (a) => a.stats.stress],
  ["ATK", (a) => a.stats.attack_mod],
  ["Avg dmg", (a) => avgDice(a.stats.damage_dice)],
];
const header = (first) => `| ${first.join(" | ")} | n | ${STATS.map((s) => s[0]).join(" | ")} |\n|${"---|".repeat(first.length + 1 + STATS.length)}`;
const row = (first, list) => `| ${first.join(" | ")} | ${list.length} | ${STATS.map(([, f]) => cell(list.map(f))).join(" | ")} |`;
const official = data.filter((a) => a.book === "Daggerheart");
const converted = data.filter((a) => a.book !== "Daggerheart");

if (args.includes("--ids")) {
  const old = JSON.parse(fs.readFileSync(args[args.indexOf("--ids") + 1], "utf8")).map((a) => a.id);
  const now = new Set(data.map((a) => a.id));
  const missing = old.filter((id) => !now.has(id));
  const added = [...now].filter((id) => !old.includes(id));
  console.log(`ids: ${old.length} before, ${now.size} after (${data.length} records), ${missing.length} missing, ${added.length} added`);
  if (missing.length) console.log("MISSING:", missing.join(", "));
  if (now.size !== data.length) console.log("DUPLICATE IDS");
}

if (args.includes("--tiers")) {
  console.log(header(["Tier", "Src"]));
  for (const t of [1, 2, 3, 4]) {
    for (const [src, list] of [["DH", official], ["5e", converted]]) console.log(row([`T${t}`, src], list.filter((a) => a.tier === t && a.role !== "MINION")));
  }
  console.log();
}

if (args.includes("--mix")) {
  const roles = [...new Set(data.map((a) => a.role))].sort();
  console.log("| Role | Official | Converted |\n|---|---|---|");
  const pct = (n, d) => `${n} (${Math.round((100 * n) / d)}%)`;
  for (const r of roles) console.log(`| ${r} | ${pct(official.filter((a) => a.role === r).length, official.length)} | ${pct(converted.filter((a) => a.role === r).length, converted.length)} |`);
  console.log();
}

if (args.includes("--roles")) {
  console.log(header(["Tier", "Role", "Src"]));
  const roles = [...new Set(data.map((a) => a.role))].sort();
  for (const t of [1, 2, 3, 4]) {
    for (const r of roles) {
      for (const [src, list] of [["DH", official], ["5e", converted]]) {
        const l = list.filter((a) => a.tier === t && a.role === r);
        if (l.length) console.log(row([`T${t}`, r, src], l));
      }
    }
  }
}
