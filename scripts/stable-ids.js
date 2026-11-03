// One-off migration of src/data/adversaries.json to stable ids without re-running the converter:
// recovers each 5e adversary's book from Bestiary.csv (the k-th "Name" in the JSON is the k-th row with that Name),
// then assigns ids with lib/stable-id.js. Usage: node scripts/stable-ids.js
import fs from "node:fs";
import Papa from "papaparse";
import { assignStableIds } from "./lib/stable-id.js";

const jsonPath = "src/data/adversaries.json";
const adversaries = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const rows = Papa.parse(fs.readFileSync("Bestiary.csv", "utf8"), { header: true }).data.filter((r) => r.Name && r.CR);

const books = new Map();
for (const r of rows) books.set(r.Name, [...(books.get(r.Name) ?? []), r.Source]);
const used = new Map();
let missing = 0;
for (const a of adversaries) {
  if (a.source === "Daggerheart") a.book = "Daggerheart";
  else {
    const i = used.get(a.name) ?? 0;
    used.set(a.name, i + 1);
    a.book = books.get(a.name)?.[i];
    if (!a.book) missing++;
  }
}
assignStableIds(adversaries);
const ids = new Set(adversaries.map((a) => a.id));
if (ids.size !== adversaries.length) throw new Error("duplicate ids");
fs.writeFileSync(jsonPath, JSON.stringify(adversaries, null, 2));
console.log(`${adversaries.length} adversaries, ${missing} without a book`);
