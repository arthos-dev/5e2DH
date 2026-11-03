// Copies the bestiary and the official environments to public/data/ so other tools (the Storm King's Codex) can fetch
// them from https://<this app>/data/adversaries.json and /data/environments.json. Runs before dev and build; the copies are git-ignored.
import fs from "node:fs";

fs.mkdirSync("public/data", { recursive: true });
for (const file of ["adversaries.json", "environments.json"]) {
  fs.copyFileSync(`src/data/${file}`, `public/data/${file}`);
  console.log(`public/data/${file} updated`);
}
