// Copies the bestiary to public/data/adversaries.json so other tools (the Storm King's Codex) can fetch it
// from https://<this app>/data/adversaries.json. Runs before dev and build; the copy is git-ignored.
import fs from "node:fs";

fs.mkdirSync("public/data", { recursive: true });
fs.copyFileSync("src/data/adversaries.json", "public/data/adversaries.json");
console.log("public/data/adversaries.json updated");
