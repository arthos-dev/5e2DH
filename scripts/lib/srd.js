// Reads the official Daggerheart data from Old Gus' hypertext SRD 2.0 (og-dhsrd, © Critical Role LLC, DPCGL).
// Only the needed `const xxxList = [...]` literals are cut out of scripts/og-dhsrd-features.js and evaluated in an
// empty vm context (no DOM, no globals): the page script itself is never run.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

export const SRD_DIR = process.env.OG_DHSRD_DIR || path.resolve("../ext/og-dhsrd");
export const SRD_FILE = path.join(SRD_DIR, "scripts/og-dhsrd-features.js");

function extractList(src, name) {
  const start = src.indexOf(`const ${name} = [`);
  if (start < 0) throw new Error(`${name} not found in ${SRD_FILE}`);
  const end = src.indexOf("\n];", start);
  if (end < 0) throw new Error(`end of ${name} not found`);
  const literal = src.slice(src.indexOf("[", start), end + 2);
  return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 2000 });
}

export function loadSrd(file = SRD_FILE) {
  const src = fs.readFileSync(file, "utf8");
  return {
    adversaryTypes: extractList(src, "adversaryTypeList"),
    adversaries: extractList(src, "adversaryList"),
    environments: extractList(src, "environmentList"),
  };
}
