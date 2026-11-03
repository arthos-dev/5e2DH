# Converter review: 5e → Daggerheart (SKT focus)

Branch `claude/converter-review` (from `claude/codex-integration` @ 9e5de55). Scope: `scripts/convert.js`, new `scripts/lib/dh-text.js`, regenerated `src/data/adversaries.json`, the rules doc, and one UI line in `src/utils/scalingUtils.ts`.

## 1. Reproducibility

- **`node scripts/convert.js` reproduced the committed `src/data/adversaries.json` byte for byte** (3340 adversaries, ids included). There was no drift: the JSON was not hand-edited, and it was produced by this script. The `Math.random()` ids in `convertRow`/`convertDaggerheartRow` were dead code (they are overwritten by `assignStableIds`); they are now `""` placeholders, so nothing random is left in the pipeline.
- After the changes, two consecutive runs give identical output, and **the set and order of ids is unchanged** (3340 ids before and after, none missing, none added, same order). The 129 official adversaries are byte-identical to before.
- `npm run build` does not run the converter (the `prebuild` step only copies the JSON to `public/data`), so the JSON is a committed artifact. I added `npm run convert`. **Suggestion:** a CI step `npm run convert && git diff --exit-code src/data/adversaries.json` keeps it reproducible.
- `npm run build` passes. `npx eslint .` still reports the same 19 problems as before (none in the changed files).

## 2. Calibration against the 129 official adversaries

Values are median (min–max). "Avg dmg" is the average of the stat-block damage dice. **Data caveat:** 15 official adversaries have a broken Major threshold in `adversaries-extracted.csv` (only its first digit was extracted, e.g. Kraken 3/70, Zombie Legion 2/45, Head Vampire 2/42, Giant Brawler 1/28). They are excluded from the official Major column below; see proposal P5.

### Per tier (non-minions), before → after

**Before**

| Tier | Src | n | Difficulty | Major | Severe | HP | Stress | ATK | Avg dmg |
|---|---|---|---|---|---|---|---|---|---|
| T1 | DH | 45 | 12 (8–15) | 6 (4–9) | 11 (6–17) | 5 (2–10) | 3 (1–5) | 1 (0–4) | 8 (4–13) |
| T1 | 5e | 1046 | 12 (10–14) | 5 (3–10) | 9 (6–15) | 4 (3–7) | 3 (2–5) | 1 (-4–4) | 6 (4–10) |
| T2 | DH | 32 | 15 (13–16) | 9 (6–14) | 20 (13–28) | 5 (3–10) | 4 (3–6) | 2 (0–5) | 13 (6–24) |
| T2 | 5e | 979 | 14 (12–16) | 8 (5–18) | 17 (13–28) | 5 (3–8) | 4 (2–6) | 3 (-1–5) | 13 (9–15) |
| T3 | DH | 21 | 17 (14–19) | 19 (16–24) | 35 (29–42) | 6 (5–12) | 5 (3–6) | 3 (0–7) | 16 (9–32) |
| T3 | 5e | 631 | 16 (14–19) | 17 (12–33) | 29 (25–52) | 6 (4–10) | 5 (3–7) | 3 (-2–7) | 21 (14–26) |
| T4 | DH | 15 | 19 (17–21) | 33 (26–40) | 65 (42–71) | 8 (3–11) | 5 (2–10) | 7 (2–10) | 27 (23–41) |
| T4 | 5e | 297 | 20 (16–21) | 32 (25–37) | 65 (35–70) | 10 (4–12) | 8 (3–8) | 8 (2–10) | 32 (18–32) |

**After**

| Tier | Src | n | Difficulty | Major | Severe | HP | Stress | ATK | Avg dmg |
|---|---|---|---|---|---|---|---|---|---|
| T1 | DH | 45 | 12 (8–15) | 6 (4–9) | 11 (6–17) | 5 (2–10) | 3 (1–5) | 1 (0–4) | 8 (4–13) |
| T1 | 5e | 1028 | 12 (10–14) | 7 (3–10) | 10 (6–15) | 4 (3–7) | 4 (2–5) | 1 (-4–4) | 6 (4–10) |
| T2 | DH | 32 | 15 (13–16) | 9 (6–14) | 20 (13–28) | 5 (3–10) | 4 (3–6) | 2 (0–5) | 13 (6–24) |
| T2 | 5e | 996 | 14 (12–16) | 10 (5–14) | 18 (13–26) | 5 (3–8) | 4 (2–6) | 2 (-1–5) | 10 (9–15) |
| T3 | DH | 21 | 17 (14–19) | 19 (16–24) | 35 (29–42) | 6 (5–12) | 5 (3–6) | 3 (0–7) | 16 (9–32) |
| T3 | 5e | 631 | 17 (14–19) | 18 (12–22) | 33 (25–40) | 6 (4–12) | 6 (3–6) | 3 (-2–7) | 14 (14–26) |
| T4 | DH | 15 | 19 (17–21) | 33 (26–40) | 65 (42–71) | 8 (3–11) | 5 (2–10) | 7 (2–10) | 27 (23–41) |
| T4 | 5e | 298 | 20 (18–21) | 32 (26–37) | 65 (36–70) | 10 (6–12) | 8 (5–8) | 8 (3–10) | 32 (22–32) |

### Role mix

| Role | Official (129) | Converted before | Converted after |
|---|---|---|---|
| BRUISER | 17 (13%) | 210 (7%) | 357 (11%) |
| COLOSSAL | 0 | 18 (1%) | 0 |
| HORDE | 9 (7%) | 33 (1%) | 33 (1%) |
| LEADER | 16 (12%) | 24 (1%) | 77 (2%) |
| LEGENDARY | 0 | 151 (5%) | 0 |
| MINION | 16 (12%) | 258 (8%) | 258 (8%) |
| RANGED | 9 (7%) | 904 (28%) | 186 (6%) |
| SKULK | 15 (12%) | 282 (9%) | 336 (10%) |
| SOCIAL | 8 (6%) | 15 (0%) | 13 (0%) |
| SOLO | 20 (16%) | 218 (7%) | 406 (13%) |
| STANDARD | 12 (9%) | 593 (18%) | 757 (24%) |
| SUPPORT | 7 (5%) | 505 (16%) | 788 (25%) |

### Per tier and role, after (official `DH` vs converted `5e`)

| Tier | Role | Src | n | Difficulty | Major | Severe | HP | Stress | ATK | Avg dmg |
|---|---|---|---|---|---|---|---|---|---|---|
| T1 | BRUISER | DH | 8 | 13 (10–14) | 8 (7–9) | 15 (13–17) | 7 (5–7) | 3 (2–4) | 2 (1–2) | 9 (7–11) |
| T1 | BRUISER | 5e | 46 | 14 (12–14) | 8 (7–9) | 14 (13–15) | 5 (5–7) | 4 (3–4) | 1 (0–2) | 10 (10–10) |
| T1 | HORDE | DH | 5 | 10 (8–12) | 6 (5–6) | 11 (9–12) | 6 (4–6) | 3 (2–3) | 0 (0–1) | 8 (7–8) |
| T1 | HORDE | 5e | 23 | 11 (10–12) | 8 (6–10) | 10 (9–12) | 4 (4–5) | 3 (2–3) | -1 (-2–0) | 8 (8–8) |
| T1 | LEADER | DH | 5 | 14 (11–15) | 7 (6–8) | 14 (11–14) | 6 (6–7) | 3 (2–5) | 2 (0–4) | 9 (8–10) |
| T1 | LEADER | 5e | 10 | 14 (13–14) | 9 (8–9) | 15 (14–15) | 5 (5–6) | 4 (4–4) | 4 (3–4) | 9 (9–9) |
| T1 | MINION | DH | 7 | 10 (8–11) | - | - | 1 (1–1) | 1 (1–1) | 0 (0–3) | 2 (1–4) |
| T1 | MINION | 5e | 258 | 10 (10–11) | - | - | 1 (1–1) | 1 (1–1) | -2 (-2–-2) | 2 (2–2) |
| T1 | RANGED | DH | 3 | 10 (9–13) | 4 (4–4) | 7 (7–8) | 3 (3–3) | 2 (2–2) | 2 (1–2) | 8 (6–10) |
| T1 | RANGED | 5e | 75 | 11 (10–12) | 4 (3–5) | 7 (6–9) | 3 (3–4) | 3 (2–3) | 1 (1–2) | 9 (9–9) |
| T1 | SKULK | DH | 6 | 12 (8–14) | 6 (4–6) | 10 (8–11) | 4 (2–5) | 3 (1–3) | 2 (1–2) | 7 (5–8) |
| T1 | SKULK | 5e | 211 | 11 (10–12) | 6 (5–7) | 10 (8–12) | 3 (3–4) | 3 (2–3) | 2 (1–2) | 6 (6–6) |
| T1 | SOCIAL | DH | 3 | 12 (12–14) | 4 (4–6) | 8 (8–10) | 3 (3–3) | 4 (3–5) | 0 (0–0) | 4 (4–4) |
| T1 | SOCIAL | 5e | 11 | 10 (10–12) | 3 (3–5) | 6 (6–9) | 3 (3–3) | 3 (3–3) | -4 (-4–-1) | 4 (4–4) |
| T1 | SOLO | DH | 7 | 13 (13–14) | 8 (7–8) | 15 (14–15) | 8 (7–10) | 3 (3–4) | 3 (1–4) | 11 (8–13) |
| T1 | STANDARD | DH | 7 | 12 (10–14) | 5 (4–8) | 9 (6–14) | 4 (3–5) | 2 (1–3) | 1 (0–2) | 6 (5–7) |
| T1 | STANDARD | 5e | 439 | 12 (11–13) | 7 (5–8) | 10 (8–12) | 4 (4–5) | 4 (3–4) | 1 (0–2) | 6 (6–6) |
| T1 | SUPPORT | DH | 1 | 13 (13–13) | 5 (5–5) | 9 (9–9) | 4 (4–4) | 4 (4–4) | 2 (2–2) | 6 (6–6) |
| T1 | SUPPORT | 5e | 213 | 14 (12–14) | 8 (5–8) | 12 (9–12) | 3 (3–4) | 5 (4–5) | 2 (0–2) | 6 (6–6) |
| T2 | BRUISER | DH | 3 | 15 (14–16) | 14 (14–14) | 28 (27–28) | 7 (7–7) | 4 (3–5) | 2 (2–2) | 14 (14–16) |
| T2 | BRUISER | 5e | 188 | 16 (14–16) | 13 (12–14) | 25 (23–26) | 6 (5–7) | 4 (4–6) | 3 (2–4) | 13 (13–13) |
| T2 | HORDE | DH | 3 | 14 (13–15) | 10 (8–11) | 20 (16–23) | 5 (4–6) | 3 (3–3) | 0 (0–0) | 11 (10–11) |
| T2 | HORDE | 5e | 10 | 12 (12–14) | 10 (10–14) | 16 (16–19) | 5 (5–6) | 3 (2–3) | -1 (-1–1) | 15 (15–15) |
| T2 | LEADER | DH | 6 | 16 (15–16) | 13 (13–13) | 26 (24–27) | 6 (6–7) | 4 (4–5) | 4 (2–5) | 14 (13–15) |
| T2 | LEADER | 5e | 45 | 15 (14–16) | 13 (12–14) | 24 (23–26) | 5 (5–7) | 5 (5–5) | 4 (3–5) | 14 (14–14) |
| T2 | MINION | DH | 4 | 13 (12–13) | - | - | 1 (1–1) | 1 (1–2) | 1 (0–1) | 5 (4–6) |
| T2 | RANGED | DH | 3 | 15 (13–16) | 8 (6–11) | 16 (14–23) | 5 (3–5) | 4 (3–6) | 3 (2–4) | 13 (12–15) |
| T2 | RANGED | 5e | 61 | 14 (13–15) | 6 (5–8) | 14 (13–18) | 4 (3–5) | 3 (3–3) | 3 (2–5) | 14 (14–14) |
| T2 | SKULK | DH | 6 | 14 (13–15) | 9 (8–11) | 18 (16–22) | 4 (4–6) | 4 (3–5) | 3 (1–3) | 12 (10–15) |
| T2 | SKULK | 5e | 123 | 13 (12–14) | 8 (7–9) | 17 (16–20) | 4 (3–5) | 4 (3–4) | 3 (2–5) | 10 (10–10) |
| T2 | SOCIAL | DH | 4 | 15 (13–15) | 8 (7–9) | 17 (13–19) | 4 (3–5) | 3 (3–4) | 2 (2–2) | 6 (6–6) |
| T2 | SOLO | DH | 3 | 15 (14–15) | 13 (10–13) | 25 (20–26) | 9 (8–10) | 5 (3–6) | 4 (2–4) | 15 (10–24) |
| T2 | SOLO | 5e | 12 | 15 (14–16) | 13 (12–14) | 25 (23–26) | 8 (8–8) | 5 (4–5) | 4 (3–4) | 13 (13–13) |
| T2 | STANDARD | DH | 3 | 15 (13–15) | 9 (7–9) | 18 (15–23) | 4 (3–4) | 3 (3–3) | 1 (1–1) | 12 (10–13) |
| T2 | STANDARD | 5e | 219 | 14 (13–15) | 8 (8–12) | 16 (16–20) | 5 (5–6) | 4 (3–4) | 1 (1–3) | 10 (10–10) |
| T2 | SUPPORT | DH | 1 | 14 (14–14) | 9 (9–9) | 18 (18–18) | 4 (4–4) | 6 (6–6) | 2 (2–2) | 8 (8–8) |
| T2 | SUPPORT | 5e | 338 | 14 (13–15) | 10 (8–12) | 18 (16–20) | 4 (3–5) | 6 (4–6) | 2 (1–3) | 9 (9–9) |
| T3 | BRUISER | DH | 4 | 17 (17–17) | 22 (21–22) | 40 (40–40) | 7 (6–10) | 4 (3–5) | 3 (2–7) | 16 (14–18) |
| T3 | BRUISER | 5e | 123 | 17 (16–18) | 20 (19–22) | 36 (35–40) | 6 (6–8) | 6 (4–6) | 3 (3–5) | 21 (21–21) |
| T3 | LEADER | DH | 3 | 17 (16–19) | 24 (20–24) | 38 (36–42) | 7 (6–8) | 5 (5–6) | 4 (4–5) | 18 (17–25) |
| T3 | LEADER | 5e | 22 | 18 (17–19) | 20 (19–22) | 37 (35–39) | 6 (6–8) | 6 (5–6) | 6 (5–7) | 22 (22–22) |
| T3 | MINION | DH | 2 | 15 (14–15) | - | - | 1 (1–1) | 1 (1–1) | 0 (0–0) | 8 (5–8) |
| T3 | RANGED | DH | 2 | 17 (16–17) | 20 (17–20) | 32 (30–32) | 6 (5–6) | 6 (4–6) | 4 (3–4) | 20 (17–20) |
| T3 | RANGED | 5e | 50 | 15 (15–17) | 13 (12–15) | 26 (25–30) | 5 (4–6) | 4 (3–4) | 3 (3–4) | 22 (22–22) |
| T3 | SKULK | DH | 3 | 15 (14–17) | 18 (16–18) | 30 (30–35) | 6 (5–7) | 4 (3–5) | 3 (2–3) | 15 (14–15) |
| T3 | SKULK | 5e | 2 | 14 (14–14) | 16 (15–16) | 28 (27–28) | 4 (4–4) | 5 (5–5) | 4 (3–4) | 16 (16–16) |
| T3 | SOCIAL | DH | 1 | 16 (16–16) | 16 (16–16) | 32 (32–32) | 6 (6–6) | 5 (5–5) | 0 (0–0) | 14 (14–14) |
| T3 | SOCIAL | 5e | 2 | 16 (15–16) | 17 (15–17) | 29 (27–29) | 4 (4–4) | 3 (3–3) | -1 (-2–-1) | 14 (14–14) |
| T3 | SOLO | DH | 3 | 18 (17–18) | 20 (19–21) | 35 (35–41) | 10 (10–12) | 6 (5–6) | 3 (3–7) | 22 (15–32) |
| T3 | SOLO | 5e | 97 | 19 (17–19) | 22 (19–22) | 39 (35–40) | 10 (10–12) | 6 (5–6) | 7 (4–7) | 26 (26–26) |
| T3 | STANDARD | DH | 2 | 17 (16–17) | 19 (18–19) | 36 (35–36) | 7 (5–7) | 5 (4–5) | 3 (3–3) | 17 (14–17) |
| T3 | STANDARD | 5e | 98 | 17 (15–17) | 17 (15–20) | 29 (27–32) | 6 (5–6) | 4 (4–5) | 3 (2–4) | 14 (14–14) |
| T3 | SUPPORT | DH | 3 | 17 (16–17) | 19 (17–19) | 33 (29–34) | 5 (5–6) | 5 (3–5) | 2 (2–3) | 13 (9–16) |
| T3 | SUPPORT | 5e | 237 | 16 (15–17) | 17 (15–20) | 30 (28–35) | 5 (4–6) | 6 (5–6) | 3 (2–4) | 14 (14–14) |
| T4 | BRUISER | DH | 2 | 20 (19–20) | 40 (40–40) | 71 (70–71) | 9 (7–9) | 5 (4–5) | 4 (2–4) | 41 (27–41) |
| T4 | HORDE | DH | 1 | 17 (17–17) | - | 45 (45–45) | 8 (8–8) | 5 (5–5) | 2 (2–2) | 24 (24–24) |
| T4 | LEADER | DH | 2 | 21 (20–21) | 37 (33–37) | 70 (66–70) | 9 (7–9) | 8 (5–8) | 8 (6–8) | 34 (32–34) |
| T4 | MINION | DH | 3 | 18 (17–18) | - | - | 1 (1–1) | 1 (1–2) | 2 (2–3) | 11 (10–12) |
| T4 | RANGED | DH | 1 | 19 (19–19) | - | 45 (45–45) | 3 (3–3) | 2 (2–2) | 4 (4–4) | 26 (26–26) |
| T4 | SOLO | DH | 7 | 20 (18–20) | 33 (29–38) | 65 (55–70) | 8 (6–11) | 5 (5–10) | 8 (7–10) | 30 (25–41) |
| T4 | SOLO | 5e | 297 | 20 (19–21) | 32 (30–37) | 65 (63–70) | 10 (10–12) | 8 (6–8) | 8 (7–10) | 32 (32–32) |
| T4 | STANDARD | 5e | 1 | 18 (18–18) | 26 (26–26) | 36 (36–36) | 6 (6–6) | 5 (5–5) | 3 (3–3) | 22 (22–22) |
| T4 | SUPPORT | DH | 2 | 19 (19–19) | 27 (26–27) | 47 (42–47) | 6 (4–6) | 5 (3–5) | 7 (4–7) | 24 (23–24) |

### What the numbers say

- **Stat blocks sit inside the official bands** for Difficulty, thresholds and ATK, because the converter takes them from the role tables in "Making Custom Adversaries.md". The remaining biases come from those tables and from fixed choices, not from broken logic:
  - **Damage has no spread.** Every adversary of a given tier and role gets the same dice (the middle option of the table). Converted damage runs **low at T1–T2** (median 6 vs official 8 at T1, 10 vs 13 at T2; Standard T2 is 2d6+3 against 12 official) and **high at T3** (Bruiser 3d10+4 = 21 vs 16, Solo 26 vs 22). See P3.
  - **T4 is beefier than official:** HP 10 vs 8 (Solo 10–12 vs 8), Stress 8 vs 5. The Stress formula (INT 14+ → 8) hits the top of every T4 range. See P4.
  - **T3 Ranged thresholds are low** (13/26 vs 20/32 official): the guide's Ranged T3 row (12–15 / 25–30) is below the official Ranged adversaries.
  - Minion ATK is always −2 at T1 (official median 0); Social ATK is −4 at T1 (official 0).
- **Role detection was broken in two places** (fixed): every creature with any ranged attack was Ranged (28% vs 7% official; all SKT giants, the Bryn Shander sheriff with a warhammer...), and CR 20+ / big creatures got LEGENDARY / COLOSSAL, which are not Daggerheart roles and **cost 2 Battle Points** in the encounter builder (`getBattlePointsForRole` falls through to the Standard cost). COLOSSAL also used Colossal *segment* stats, so King Hekaton had **5 HP and Difficulty 16**.
- **Support is now over-represented** (25% vs 5%): creatures that used to be Ranged fall through to the Support rule, which fires on any INT 12+ creature that mentions "spell" or "magic" (478 of the 788 Supports). Left as is: see P2.

### Broken logic and leftovers found (counts = converted adversaries affected, before → after)

| Problem | Before | After |
|---|---|---|
| LEGENDARY / COLOSSAL roles (no Battle Point cost, segment stats) | 169 | 0 |
| Damage dice without `phy`/`mag` | 3211 | 0 |
| Basic weapon attacks costing a **Fear** ("Spend a Fear to make a standard attack…": any attack with a d10/d12 in it) | 145 | 0 |
| Broken sentences after the cost prefix: ". on a success" / "Mark a Stress to the aartuk tries…" / "Spend a Fear to each creature…" | 1039 / 547 / 84 | 0 / 0 / 0 |
| "saving throw(s)" left in text (the plural was never converted) | 969 | 0 |
| 5e DC kept as "Reaction Roll (23)" / "Difficulty (19)" | 498 / 1325 | 0 / 0 |
| Wrong ability mapping (CON→Finesse, INT→Instinct, WIS→Presence) | all | fixed (CON→Strength, INT→Knowledge, WIS→Instinct, CHA→Presence) |
| Distances in feet | 1927 | 141 (spell dimensions like "10 feet wide") |
| "Medium range" (not a DH range): `extractRange` regex `/(\d+)\s*ft|feet/` sent every "N feet" to Far and defaulted areas to Medium | 307 | 0 |
| "bonus action" | 576 | 29 |
| "(Recharge 5–6)" etc. kept although Fear pays for it | 768 | 25 |
| Spell text dumps over 1500 characters (full 5e spell descriptions) | 950 | 322 (long spell lists, now one line per spell) |
| Nth-level spellcaster / "+N to hit with spell attacks" preambles | 277 / 369 | 1 / 32 |
| Hordes without Horde (X) | 33 | 0 |
| Solos without Relentless | 89 | 20 (CR < 15, no Legendary Actions; e.g. King Hekaton) |
| 5e Reactions column (Parry, Shield…) | ignored | converted (446 creatures) |
| Multiattack sub-attacks (their riders: prone, poisoned, grapple) | dropped | kept |
| Multiattack count | number of grouped lines | parsed from "makes three attacks" |
| CR "None" (79, incl. 20 SKT townsfolk) | treated as CR 0 → minions | placed by HP |
| Spellcasting traits classified as Reactions (keyword "reaction" from converted saves) | many | Action |
| Roleplaying Information (SKT NPCs) as a "Passive" | 22 | narrative with Ideal/Bond/Flaw lines |
| Legendary Resistance "choose to succeed" (no saves in DH) | 326 | "spend a Fear to succeed on a failed Reaction Roll" |
| Minion damage "1-3" (not rollable) | 258 | flat "2 phy" etc., plus Group Attack |
| Minions with thresholds | 0 | 0 |
| HTML errors / unbalanced tags | 0 | 0 |

Still present and left for proposals: 5e conditions (Frightened, Incapacitated, Stunned, Poisoned… in 985 adversaries), durations ("for 1 minute"), temporary HP (96), 5e dice in feature damage.

### Rules doc vs code

"Rules for Converting D&D Adversaries to DaggerHeart.md" contradicted the code in most of its tables: thresholds 15/28 at CR 15+ (code: 30–37 / 63–70), ATK +4–5 at CR 15+ (code: up to +10), damage 3d8+4 (code: 4d10+10), HP minimum 3 and Stress up to 10 (code: clamped to role ranges), and roles "Sniper", "Skirmisher" and "Legendary", which Daggerheart doesn't have. The doc now has a section **"How scripts/convert.js applies these rules"** describing the actual logic (tier, role tables, role order, phy/mag, trait mapping for Reaction Rolls, range bands, action costs, spellcasting). It also says the old by-CR tables are guidelines only. The role table and the examples ("Medium range", "Legendary" type) are corrected.

## 3. What I fixed (commit 6845252; `npm run convert` in the report commit)

1. **Roles.** CR 20+, Gargantuan CR 10+, titans and 300+ HP bosses → **Solo** (no LEGENDARY/COLOSSAL). **Large-or-bigger giants → Bruiser**, or **Leader** when the name carries a rank (king, jarl, thane, chief, duke, countess, imperator, captain, sergeant…). Giants are checked before the Social rule, so the Cloud Giant Noble is no longer Social. **Ranged only when the best ranged attack out-damages the best melee attack** (or the creature is an archer/sniper). Named captains/commanders lead even when their pistol is their best attack. The tier still comes from CR, so giants feel big through their role, not through an inflated tier.
2. **CR "None"** is estimated from HP (median HP per CR in Bestiary.csv), e.g. Sheriff Markham Southwell (58 HP) → CR 3 → T2 instead of a T1 minion.
3. **Damage**: `phy`/`mag` on every stat block (from the first attack). Flat minion damage (2/5/7/11, the official medians) plus **Group Attack** on every minion. **Horde (X)** on every horde. **Relentless** also for Solos with Legendary Actions (e.g. Adult White Dragon, Cryovain).
4. **Feature text** (new `scripts/lib/dh-text.js`): attack lines are parsed in both the 2014 and 2024 formats. Attacks are free unless they carry a rider (then a Stress), with range band, phy/magic damage and the rider kept. Saving throws → `<Trait> Reaction Roll` against the adversary's Difficulty. The 2024 "Failure:/Success:" layout is rewritten DH-style. Feet → Melee / Very Close / Close / Far / Very Far. Prone → Vulnerable, grappled → Restrained. Bonus-action, AC and hit-point wording is replaced, and so are Dash/Disengage/Hide. Advantage and disadvantage are kept (Daggerheart has them too).
5. **Costs**: breath, area damage, frightful presence, summons, Recharge, X/Day and legendary actions cost a **Fear**; other actions cost a **Stress**; the Recharge tags are removed from feature names. Trivial legendary actions ("makes one tail attack", "Perception check") are dropped because Relentless covers them. The **Reactions column** is converted (it used to be ignored). **Legendary Resistance** becomes a Fear reaction.
6. **Spellcasting**: one Action. Spells are grouped by frequency, with the cost written on each group (at will and level 1–3: Stress; X/day and level 4+: Fear). Each spell is one line with its level and range band, and combat spells get a short mechanical summary. The preambles ("9th-level spellcaster… spell save DC 14, +6 to hit") and the 1500+-character dumps are gone. Spell-list parsing bugs are fixed: "2st level", level groups that were silently dropped, cantrips listed twice, Iymrith's stone-shape note read as a spell name.
7. **UI**: `scaleDamageDice` keeps the `phy`/`mag` suffix when the encounter builder scales an adversary to another tier.
8. **`npm run convert`** script; rules doc updated.

## 4. SKT showcase: before / after

Stat line, then the converted features (texts trimmed). "Before" shows one typical broken feature where there was one.

### Hill Giant (MM'25, CR 5) — `hill-giant--mm25`

- **Before:** T2 **BRUISER** · Difficulty 15 · Thresholds 13/25 · HP 6 · Stress 4 · ATK +3 · 2d10+2  
  Features: Multiattack, Momentum, Heavy Hitter
- **After:** T2 **BRUISER** · Difficulty 15 · Thresholds 13/25 · HP 6 · Stress 4 · ATK +3 · 2d10+2 phy

  - **Multiattack** — **Action:** Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Tree Club** — **Action:** Mark a Stress to make an attack against a target within Very Close range. On a success, deal 3d8+5 physical damage. If the target is a Large or smaller creature, it is knocked prone (Vulnerable).
  - **Trash Lob** — **Action:** Mark a Stress to make an attack against a target within Far range. On a success, deal 2d10+5 physical damage. The target has the Poisoned condition until the end of its next turn.
  - **Momentum** — **Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Heavy Hitter** — **Reaction:** When this adversary deals damage with a standard attack, you can spend a Fear to gain a +2 bonus to the damage roll.

### Frost Giant (MM'25, CR 8) — `frost-giant--mm25`

- **Before:** T3 **BRUISER** · Difficulty 16 · Thresholds 19/35 · HP 6 · Stress 4 · ATK +3 · 3d10+4  
  Features: Multiattack, War Cry (Recharge 5–6), Momentum, Heavy Hitter
  e.g. *War Cry (Recharge 5–6):* **Action:** Mark a Stress to the giant or one creature of its choice that can see or hear it gains 16 (2d10 + 5) temporary hp and has a bonus on attack rolls until the start of the giant's next turn.
- **After:** T3 **BRUISER** · Difficulty 16 · Thresholds 19/35 · HP 6 · Stress 4 · ATK +3 · 3d10+4 phy

  - **Multiattack** — **Action:** Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Frost Axe** — **Action:** Make an attack against a target within Very Close range. On a success, deal 2d12+6 physical damage plus 2d8 magic damage (cold).
  - **Great Bow** — **Action:** Make an attack against a target within Very Far range. On a success, deal 2d10+6 physical damage plus 2d6 magic damage (cold). The target's movement is slowed until the end of its next turn.
  - **War Cry** — **Action:** Spend a Fear to use this ability. The giant or one creature of its choice that can see or hear it gains 2d10+5 temporary HP and has Advantage on attacks until the start of the giant's next turn.
  - **Momentum** — **Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Heavy Hitter** — **Reaction:** When this adversary deals damage with a standard attack, you can spend a Fear to gain a +2 bonus to the damage roll.

### Fire Giant (MM'25, CR 9) — `fire-giant--mm25`

- **Before:** T3 **BRUISER** · Difficulty 17 · Thresholds 20/36 · HP 6 · Stress 6 · ATK +3 · 3d10+4  
  Features: Multiattack, Momentum, Heavy Hitter
- **After:** T3 **BRUISER** · Difficulty 17 · Thresholds 20/36 · HP 6 · Stress 6 · ATK +3 · 3d10+4 phy

  - **Multiattack** — **Action:** Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Flame Sword** — **Action:** Make an attack against a target within Very Close range. On a success, deal 4d6+7 physical damage plus 3d6 magic damage (fire).
  - **Hammer Throw** — **Action:** Mark a Stress to make an attack against a target within Far range. On a success, deal 3d10+7 physical damage plus 1d8 magic damage (fire). The target is pushed up to Close range straight away from the giant and has Disadvantage on the next attack it makes before the end of its next turn.
  - **Momentum** — **Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Heavy Hitter** — **Reaction:** When this adversary deals damage with a standard attack, you can spend a Fear to gain a +2 bonus to the damage roll.

### Cloud Giant (MM'25, CR 9) — `cloud-giant--mm25`

- **Before:** T3 **SUPPORT** · Difficulty 15 · Thresholds 16/29 · HP 6 · Stress 6 · ATK +2 · 3d6+3  
  Features: Multiattack, Spellcasting, Thundercloud, Misty Step, Harass
  e.g. *Spellcasting:* **Action:** Mark a Stress to use this ability. The giant casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell Reaction Roll Difficulty (15))
**At …
- **After:** T3 **BRUISER** · Difficulty 16 · Thresholds 20/36 · HP 7 · Stress 6 · ATK +3 · 3d10+4 phy

  - **Multiattack** — **Action:** Mark a Stress to make 2 standard attacks, against one target or split between targets in range. It can replace one attack with a use of Spellcasting to cast Fog Cloud.
  - **Thunderous Mace** — **Action:** Make an attack against a target within Very Close range. On a success, deal 3d8+8 physical damage plus 2d6 magic damage (thunder).
  - **Spellcasting** — **Action:** Cast one of the following spells. Spell attacks use this adversary's attack modifier and Reaction Rolls are made against its Difficulty. **At will (mark a Stress):** - **Detect Magic** (1st level, self) - **Fog Cloud** (1st level, Far range) - **Light** (cantrip, Melee range) **1/day (spend a Fear):** - **Control …
  - **Thundercloud** — **Action:** Mark a Stress to make an attack against a target within Very Far range. On a success, deal 3d6+8 magic damage (thunder). The target has the Incapacitated condition until the end of its next turn.
  - **Misty Step** — **Action:** Mark a Stress to use this ability. The giant casts the Misty Step spell, using the same spellcasting ability as Spellcasting.
  - **Momentum** — **Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Heavy Hitter** — **Reaction:** When this adversary deals damage with a standard attack, you can spend a Fear to gain a +2 bonus to the damage roll.

### Storm Giant (MM'25, CR 13) — `storm-giant--mm25`

- **Before:** T3 **SUPPORT** · Difficulty 17 · Thresholds 19/34 · HP 6 · Stress 6 · ATK +4 · 3d6+3  
  Features: Amphibious, Multiattack, Spellcasting, Thunderbolt, Lightning Storm (Recharge 5–6), Harass
  e.g. *Spellcasting:* **Action:** Mark a Stress to use this ability. The giant casts one of the following spells, requiring no Material components and using Wisdom as the spellcasting ability (spell Reaction Roll Difficulty (18))
**At …
- **After:** T3 **BRUISER** · Difficulty 18 · Thresholds 22/39 · HP 8 · Stress 6 · ATK +5 · 3d10+4 phy

  - **Amphibious** — **Passive:** The giant can breathe air and water.
  - **Multiattack** — **Action:** Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Storm Sword** — **Action:** Make an attack against a target within Very Close range. On a success, deal 4d6+9 physical damage plus 3d8 magic damage (lightning).
  - **Spellcasting** — **Action:** Cast one of the following spells. Spell attacks use this adversary's attack modifier and Reaction Rolls are made against its Difficulty. **At will (mark a Stress):** - **Detect Magic** (1st level, self) - **Light** (cantrip, Melee range) **1/day (spend a Fear):** - **Control Weather** (8th level, self): Must be …
  - **Thunderbolt** — **Action:** Mark a Stress to make an attack against a target within Very Far range. On a success, deal 2d12+9 magic damage (lightning). The target has the Blinded and Deafened conditions until the start of the giant's next turn.
  - **Lightning Storm** — **Action:** Spend a Fear to use this ability. Each creature in a Cylinder (Very Close range) originating from a point the giant can see within Very Far range must make an Agility Reaction Roll. Targets who fail take 10d10 magic damage (lightning). Targets who succeed take half damage.
  - **Momentum** — **Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Heavy Hitter** — **Reaction:** When this adversary deals damage with a standard attack, you can spend a Fear to gain a +2 bonus to the damage roll.

### Duke Zalto (SKT, CR 9) — `duke-zalto--skt`

- **Before:** T3 **RANGED** · Difficulty 16 · Thresholds 13/26 · HP 6 · Stress 4 · ATK +3 · 3d8+8  
  Features: Special Equipment, Siege Monster, Tackle, Multiattack
  e.g. *Tackle:* **Reaction:** When Zalto enters any enemy's space for the first time on a turn, the enemy must succeed on a Difficulty (19) Strength Reaction Roll or be knocked prone.
- **After:** T3 **LEADER** · Difficulty 18 · Thresholds 20/36 · HP 8 · Stress 6 · ATK +5 · 3d8+8 phy

  - **Special Equipment** — **Passive:** Zalto wears a ring of lightning resistance.
  - **Siege Monster** — **Passive:** Zalto deals double damage to objects and structures.
  - **Tackle** — **Reaction:** When Zalto enters any enemy's space for the first time on a turn, the enemy must succeed on a Strength Reaction Roll or be knocked prone (Vulnerable).
  - **Multiattack** — **Action:** Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Maul** — **Action:** Make an attack against a target within Very Close range. On a success, deal 6d6+7 physical damage.
  - **Rock** — **Action:** Make an attack against a target within Far range. On a success, deal 4d10+7 physical damage.
  - **Momentum** — **Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Tactician** — **Action:** Mark a Stress to spotlight this adversary and two allies within Close range.

### King Hekaton (SKT, CR 13) — `king-hekaton--skt`

- **Before:** T3 **COLOSSAL** · Difficulty 16 · Thresholds 33/52 · HP 5 · Stress 7 · ATK +4 · 3d8+6  
  Features: Amphibious, Innate Spellcasting, Multiattack, Lightning Strike (Recharge 5–6), Thunderous Stomp (Recharge 6)
  e.g. *Innate Spellcasting:* **Reaction:** The giant's innate spellcasting ability is Charisma (spell Reaction Roll Difficulty (17)). It can innately cast the following spells, requiring no material components
**At will:**
  - **Detect Magic** …
- **After:** T3 **SOLO** · Difficulty 19 · Thresholds 22/39 · HP 12 · Stress 6 · ATK +7 · 3d12+6 phy

  - **Amphibious** — **Passive:** Hekaton can breathe air and water.
  - **Innate Spellcasting** — **Action:** Cast one of the following spells. Spell attacks use this adversary's attack modifier and Reaction Rolls are made against its Difficulty. **At will (mark a Stress):** - **Detect Magic** (1st level, self) - **Feather Fall** (1st level, Far range) - **Levitate** (2nd level, Far range): One creature or loose object of …
  - **Multiattack** — **Action:** Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Broken Chain** — **Action:** Make an attack against a target within Very Close range. On a success, deal 3d6+9 physical damage.
  - **Ballista** — **Action:** Make an attack against a target within Far range. On a success, deal 3d10+2 physical damage.
  - **Lightning Strike** — **Action:** Spend a Fear to use this ability. Hekaton hurls a magical lightning bolt at a point he can see within Very Far range of it. Each creature within Very Close range of that point must make an Agility Reaction Roll, taking 12d8 magic damage (lightning) on a failure, or half as much damage on a successful one.
  - **Thunderous Stomp** — **Action:** Spend a Fear to use this ability. Hekaton stomps the ground, triggering a thunderclap. All other creatures within Close range of him must succeed on a Strength Reaction Roll or take 6d10 magic damage (thunder) and be deafened until the start of Hekaton's next turn. On a successful Reaction Roll, a creature takes …

### Chief Guh (SKT, CR 5) — `chief-guh--skt`

- **Before:** T2 **RANGED** · Difficulty 13 · Thresholds 7/16 · HP 5 · Stress 3 · ATK +4 · 2d10+3  
  Features: Multiattack
- **After:** T2 **LEADER** · Difficulty 14 · Thresholds 13/25 · HP 7 · Stress 5 · ATK +4 · 2d10+3 phy

  - **Multiattack** — **Action:** Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Greatclub** — **Action:** Make an attack against a target within Very Close range. On a success, deal 3d8+5 physical damage.
  - **Unarmed Attack** — **Action:** Make an attack against a target within Very Close range. On a success, deal 3d4+5 physical damage.
  - **Rock** — **Action:** Make an attack against a target within Far range. On a success, deal 3d10+5 physical damage.
  - **Momentum** — **Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Tactician** — **Action:** Mark a Stress to spotlight this adversary and two allies within Close range.

### Ogre (MM'25, CR 2) — `ogre--mm25`

- **Before:** T1 **STANDARD** · Difficulty 13 · Thresholds 8/12 · HP 5 · Stress 3 · ATK +2 · 1d6+2  
  Features: Greatclub, Javelin
  e.g. *Greatclub:* **Action:** Mark a Stress to make a standard attack against a target. on a success, the target takes 2d8+4 damage.
- **After:** T1 **BRUISER** · Difficulty 14 · Thresholds 9/15 · HP 6 · Stress 3 · ATK +2 · 1d10+4 phy

  - **Greatclub** — **Action:** Make an attack against a target within Melee range. On a success, deal 2d8+4 physical damage.
  - **Javelin** — **Action:** Make an attack against a target within Melee range (or Close range if thrown). On a success, deal 2d6+4 physical damage.
  - **Momentum** — **Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.

### Winter Wolf (MM'25, CR 3) — `winter-wolf--mm25`

- **Before:** T2 **STANDARD** · Difficulty 13 · Thresholds 8/16 · HP 5 · Stress 4 · ATK +1 · 2d6+3  
  Features: Pack Tactics, Bite, Cold Breath (Recharge 5–6)
  e.g. *Cold Breath (Recharge 5–6):* **Action:** Spend a Fear to exhale frost in a cone of Medium range. All targets within that area must make Finesse Reaction Roll (12). Targets who fail take 4d8 cold damage. Targets who succeed take half damage.
- **After:** T2 **STANDARD** · Difficulty 13 · Thresholds 8/16 · HP 5 · Stress 4 · ATK +1 · 2d6+3 phy

  - **Pack Tactics** — **Passive:** The wolf has Advantage on an attack against a creature if at least one of the wolf's allies is within Melee range of the creature and the ally doesn't have the Incapacitated condition.
  - **Bite** — **Action:** Mark a Stress to make an attack against a target within Melee range. On a success, deal 2d6+4 physical damage. If the target is a Large or smaller creature, it is knocked prone (Vulnerable).
  - **Cold Breath** — **Action:** Spend a Fear to use this ability. Each creature in a Cone (Close range) must make a Strength Reaction Roll. Targets who fail take 4d8 magic damage (cold). Targets who succeed take half damage.

### Kraken Priest (MPMM, CR 5) — `kraken-priest--mpmm`

- **Before:** T2 **RANGED** · Difficulty 14 · Thresholds 7/16 · HP 4 · Stress 3 · ATK +4 · 2d10+3  
  Features: Amphibious, Multiattack, Spellcasting, Thunderbolt, Voice of the Kraken (Recharges after a Short or Long Rest)
  e.g. *Spellcasting:* **Action:** Spend a Fear to use this ability in a area of Medium range. All targets within that area must make a Reaction Roll against this adversary's Difficulty. Targets who fail take damage equal to this adversary's …
- **After:** T2 **SUPPORT** · Difficulty 14 · Thresholds 10/18 · HP 4 · Stress 6 · ATK +2 · 2d6+2 mag

  - **Amphibious** — **Passive:** The priest can breathe air and water.
  - **Multiattack** — **Action:** Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Thunderous Touch** — **Action:** Make an attack against a target within Melee range. On a success, deal 5d10 magic damage (thunder).
  - **Spellcasting** — **Action:** Cast one of the following spells. Spell attacks use this adversary's attack modifier and Reaction Rolls are made against its Difficulty. **At will (mark a Stress):** - **Command** (1st level, Far range): Target must succeed on an Instinct Reaction Roll or follow the command on its next turn. Target moves toward you …
  - **Thunderbolt** — **Action:** Mark a Stress to make an attack against a target within Far range. On a success, deal 2d10 magic damage (lightning) plus 2d10 magic damage (thunder). The target is knocked prone (Vulnerable).
  - **Voice of the Kraken** — **Action:** Spend a Fear to use this ability. A kraken speaks through the priest with a thunderous voice audible within Very Far range. Creatures of the priest's choice that can hear the kraken's words (which are spoken in Abyssal, Infernal, or Primordial) must succeed on an Instinct Reaction Roll or be frightened of the priest …
  - **Harass** — **Action:** Mark a Stress to force a PC within Close range to make a test against this adversary's Difficulty or mark a Stress.

### Ancient Blue Dragon (MM'25, CR 23) — `ancient-blue-dragon--mm25`

- **Before:** T4 **LEGENDARY** · Difficulty 21 · Thresholds 34/67 · HP 12 · Stress 8 · ATK +9 · 4d10+10  
  Features: Legendary Resistance (4/Day, or 5/Day in Lair), Relentless (3), Multiattack, Lightning Breath (Recharge 5–6), Spellcasting, Cloaked Flight, Sonic Boom, Tail Swipe
  e.g. *Lightning Breath (Recharge 5–6):* **Action:** Spend two Fear to exhale thunder in a Far range line. All targets within that area must make Agility Reaction Roll (23). Targets who fail take 16d10 lightning damage. Targets who succeed take half damage.
- **After:** T4 **SOLO** · Difficulty 21 · Thresholds 34/67 · HP 12 · Stress 8 · ATK +9 · 4d10+10 phy

  - **Legendary Resistance** — **Reaction:** When this adversary fails a Reaction Roll, you can spend a Fear to make it succeed instead.
  - **Relentless (3)** — **Passive:** This adversary can be spotlighted up to 3 times per conflict. Spend Fear as usual to spotlight them.
  - **Multiattack** — **Action:** Mark a Stress to make 3 standard attacks, against one target or split between targets in range. It can replace one attack with a use of Spellcasting to cast Shatter (level 3 version).
  - **Rend** — **Action:** Make an attack against a target within Close range. On a success, deal 2d8+9 physical damage plus 2d10 magic damage (lightning).
  - **Lightning Breath** — **Action:** Spend a Fear to use this ability. Each creature in a Line (Far range) must make an Agility Reaction Roll. Targets who fail take 16d10 magic damage (lightning). Targets who succeed take half damage.
  - **Spellcasting** — **Action:** Cast one of the following spells. Spell attacks use this adversary's attack modifier and Reaction Rolls are made against its Difficulty. **At will (mark a Stress):** - **Detect Magic** (1st level, self) - **Invisibility** (2nd level, Melee range) - **Mage Hand** (cantrip, Close range) - **Shatter** (2nd level, Far …
  - **Cloaked Flight** — **Action:** Spend a Fear to use this ability. The dragon uses Spellcasting to cast Invisibility on itself, and it can fly up to half its Fly Speed.
  - **Sonic Boom** — **Action:** Spend a Fear to use this ability. The dragon uses Spellcasting to cast Shatter (level 3 version).

### Iymrith (SKT, CR 23) — `iymrith--skt`

- **Before:** T4 **LEGENDARY** · Difficulty 21 · Thresholds 34/67 · HP 12 · Stress 8 · ATK +9 · 4d10+10  
  Features: Legendary Resistance (3/Day), Relentless (3), Multiattack, Spellcasting, Tail, Frightful Presence, Lightning Breath (Recharge 5–6), Change Shape, Detect, Tail Attack, Wing Attack (Costs 2 Actions)
  e.g. *Spellcasting:* **Action:** Mark a Stress to use this ability. Iymrith casts one of the following spells, requiring no spell components and using Charisma as the spellcasting ability (spell Reaction Roll Difficulty (20))
**1/day:**
  - …
- **After:** T4 **SOLO** · Difficulty 21 · Thresholds 34/67 · HP 12 · Stress 8 · ATK +9 · 4d10+10 phy

  - **Legendary Resistance** — **Reaction:** When this adversary fails a Reaction Roll, you can spend a Fear to make it succeed instead.
  - **Relentless (3)** — **Passive:** This adversary can be spotlighted up to 3 times per conflict. Spend Fear as usual to spotlight them.
  - **Multiattack** — **Action:** Mark a Stress to make 3 standard attacks, against one target or split between targets in range.
  - **Bite** — **Action:** Make an attack against a target within Close range. On a success, deal 2d10+9 physical damage plus 2d10 magic damage (lightning).
  - **Claw** — **Action:** Make an attack against a target within Very Close range. On a success, deal 2d6+9 physical damage.
  - **Spellcasting** — **Action:** Cast one of the following spells. Spell attacks use this adversary's attack modifier and Reaction Rolls are made against its Difficulty. **1/day (spend a Fear):** - **Detect Magic** (1st level, self) - **Dispel Magic** (3rd level, Far range) - **Ice Storm** (4th level, Very Far range): Hail falls in a Cylinder …
  - **Tail** — **Action:** Make an attack against a target within Close range. On a success, deal 2d8+9 physical damage.
  - **Frightful Presence** — **Action:** Spend a Fear to use this ability. Each creature of Iymrith's choice that is within Far range of Iymrith and aware of it must succeed on an Instinct Reaction Roll or become frightened for 1 minute. A creature can repeat the Reaction Roll at the end of each of its turns, ending the effect on itself on a success. If a …
  - **Lightning Breath** — **Action:** Spend a Fear to use this ability. Iymrith exhales lightning in a line (Far range) that is 10 feet wide. Each creature in that line must make an Agility Reaction Roll, taking 16d10 magic damage (lightning) on a failure, or half as much damage on a successful one.
  - **Change Shape** — **Action:** Spend a Fear to use this ability. Iymrith magically polymorphs into a female storm giant or back into her true form. She reverts to her true form if she dies. Any equipment she is wearing or carrying is absorbed or borne by the new form (Iymrith's choice). In storm giant form, Iymrith retains her alignment, HP, Hit …
  - **Wing Attack** — **Action:** Spend a Fear to use this ability. Iymrith beats her wings. Each creature within Close range of Iymrith must succeed on an Agility Reaction Roll or take 2d6+9 physical damage and be knocked prone (Vulnerable). Iymrith can then fly up to half her flying speed.

### Uthgardt Barbarian Leader (SKT, CR 2) — `uthgardt-barbarian-leader--skt`

- **Before:** T1 **RANGED** · Difficulty 12 · Thresholds 5/9 · HP 4 · Stress 3 · ATK +2 · 1d10+3  
  Features: Reckless, Greataxe, Oathbow
  e.g. *Greataxe:* **Action:** Spend a Fear to make a standard attack against a target. on a success, the target takes 1d12+3 damage.
- **After:** T1 **LEADER** · Difficulty 14 · Thresholds 9/15 · HP 6 · Stress 4 · ATK +4 · 1d10+3 phy

  - **Reckless** — **Passive:** At the start of its turn, the barbarian can gain advantage on all melee weapon attacks during that turn, but attacks against it have advantage until the start of its next turn.
  - **Greataxe** — **Action:** Make an attack against a target within Melee range. On a success, deal 1d12+3 physical damage.
  - **Oathbow** — **Action:** Make an attack against a target within Very Far range. On a success, deal 1d8+3 physical damage plus 3d6 physical damage. Plus an extra  against a sworn enemy See the oathbow entry for the other properties.
  - **Momentum** — **Reaction:** When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Tactician** — **Action:** Mark a Stress to spotlight this adversary and two allies within Close range.

### Augrek Brighthelm (SKT, CR None) — `augrek-brighthelm--skt`

- **Before:** T1 **RANGED** · Difficulty 11 · Thresholds 3/6 · HP 3 · Stress 3 · ATK +1 · 1d10+3  
  Features: Dwarven Resilience, Roleplaying Information, Warhammer, Heavy Crossbow
  e.g. *Warhammer:* **Action:** Spend a Fear to make a standard attack against a target. on a success, the target takes 1d8+2 damage.
- **After:** T1 **STANDARD** · Difficulty 12 · Thresholds 5/9 · HP 4 · Stress 4 · ATK +0 · 1d6+2 phy

  - **Dwarven Resilience** — **Passive:** Augrek has advantage on Reaction Rolls against poison.
  - **Roleplaying Information** — Sheriff's deputy Augrek guards the southwest gate of Bryn Shander and welcomes visitors to town. She has a good heart. **Ideal:** "You'll get farther in life with a kind word than an axe." **Bond:** "Bryn Shander is my home. It's my job to protect her." **Flaw:** "I'm head over heels in love with Sheriff Southwell. One day I …
  - **Warhammer** — **Action:** Make an attack against a target within Melee range. On a success, deal 1d8+2 physical damage.
  - **Heavy Crossbow** — **Action:** Make an attack against a target within Far range. On a success, deal 1d10 physical damage. Augrek carries ten crossbow bolts.

## 5. Proposals (judgement calls, prioritized)

1. **P1 – Multiattack on Relentless Solos.** Iymrith or the Ancient Blue Dragon can be spotlighted 3 times per GM turn (Relentless 3), and each spotlight can be "Mark a Stress: 3 standard attacks" at 4d10+10. That is up to 9 T4 hits per round. The official solos have no multiattack. Proposal: for Solos with Relentless, drop Multiattack, or turn it into a single attack against up to N targets. This matters most for the SKT finale (Iymrith, Slarkrethel, Klauth, the Kraken).
2. **P2 – Support over-detection** (788 Support, 25%, against 5% official). 478 of them come from "INT ≥ 12 and the text mentions spell/magic". The keyword checks are also substring matches ("aid" in "said", "shield", "curse"). Proposal: Support only for creatures whose actions buff or heal allies or debuff PCs. Spellcasters with damage spells go to Ranged/Standard, and INT-heavy humanoids to Leader. Use word boundaries.
3. **P3 – Damage spread and T1–T2 damage.** Choose among the role table's dice by the 5e creature's average damage per round (Multiattack × attack damage) relative to the median for its CR, instead of always taking the middle option. This also corrects the low T1–T2 Standard/Skulk/Support damage and the high T3 Bruiser/Solo damage.
4. **P4 – Feature damage still uses 5e dice.** Breath weapons and AoEs keep their 5e dice (Iymrith's breath is 16d10, Hekaton's Lightning Strike 12d8, the Winter Wolf's breath 4d8). Since damage only marks 1–3 HP, it rarely breaks a fight, but it can trigger massive damage and reads out of scale. Proposal: rescale feature damage to the tier's role table (single target = standard damage, AoE = standard or Horde-sized damage, plus a Fear-scaled bonus). Rescale rider damage (e.g. "plus 2d8 cold") the same way.
5. **P5 – Fix the official data** (`adversaries-extracted.csv`): 15 broken Major thresholds (Kraken 3/70 should be 35/70; Zombie Legion, Head Vampire, Greater Earth Elemental, Hallowed Archer, Giant Brawler, Master Assassin, Mortal Hunter, Failed Experiment, Huge Green Ooze, Demon of Avarice, Demon of Wrath, Fallen Warlord: Undefeated Champion, Outer Realms Abomination, Giant Beastmaster). There are also features glued together (Relentless inside "Unyielding", "Headed Menace") and truncated texts ("…mark a"). Minion/Horde passives are missing from the official minions. Re-extract from the SRD. This affects the DM directly if they use the official Kraken.
6. **P6 – T4 HP/Stress and T3 Ranged thresholds.** Align the role tables with the official medians: T4 Solo HP 8–10 instead of 10–12, T4 Stress capped around 5–6 except for casters, T3 Ranged thresholds about 17–20 / 30–32. Update "Making Custom Adversaries.md" and `scalingUtils.ts` together.
7. **P7 – SKT bosses.** The giant lords are now Leaders (3 BP), which fits a jarl with a retinue. For set-piece lair fights (Guh, Kayalithica, Storvald, Zalto, Sansuri), offer a Solo variant with Relentless (2) and a phase/countdown. King Hekaton (Solo, CR 13, no Legendary Actions) and other Solos without Relentless (20) could get Relentless (2) by default at T3+.
8. **P8 – Remaining 5e conditions and durations** (985 adversaries). Map Frightened/Stunned/Incapacitated/Paralyzed to Vulnerable/Restrained or to explicit DH effects (lose Hope, mark Stress). Map "for 1 minute" to "until the end of the scene" and "until the end of its next turn" to "until they next act". Temporary HP → "clear 1 HP" or Armor. This needs a careful hand-written mapping.
9. **P9 – Dead Bruiser rule.** `hpRaw > daggerHP * divisor * 1.5` can never be true (`daggerHP ≈ hpRaw / divisor`), so "high HP for its CR" never makes a Bruiser. Replace it with HP above ~1.3× the median HP of its CR.
10. **P10 – Minion Battle Points.** The encounter builder charges 1 BP per minion. Daggerheart charges 1 BP per group of minions equal to the number of PCs (`encounterUtils.ts`).
11. **P11 – Spell lists.** 322 casters still exceed 1500 characters (long 2014 slot lists). Consider listing utility spells on one line and converting the 3–5 combat spells into proper DH actions.
12. **P12 – Default costs.** Non-attack actions default to a Stress, and every 5e reaction to "Mark a Stress". Official adversaries have many free actions and reactions. Experiences map Stealth to "Thief" even for dragons, and motives could get SKT flavour (Ordning rank for giants). These are cosmetic.
13. **P13 – Flag estimated CRs** (79 "None" stat blocks) with a field such as `cr_estimated: true`, so the UI can show it.

---

# Round 2: SRD 2.0 calibration

Branch `claude/srd-calibration` (from `master` @ fd88b02). The source of truth is now the **Daggerheart SRD 2.0** (Old Gus' hypertext edition, [og-dhsrd](https://github.com/callmepartario/og-dhsrd), © Critical Role, LLC, DPCGL). It has 264 adversaries (the 129 core-rulebook ones plus 135 later ones), the per-type damage dice by tier and 47 environments.

## R2.1 Official adversaries and environments from the SRD

- **`scripts/import-srd.js`** evaluates only the `adversaryTypeList`, `adversaryList` and `environmentList` literals of `og-dhsrd-features.js`, in an empty `vm` context (`scripts/lib/srd.js`). The page script is never run. It writes committed snapshots: `data/srd/adversaries.json` (app shape), `data/srd/adversary-types.json` (damage arrays) and `src/data/environments.json`. `npm run convert` runs the import, then `convert.js`. Without an SRD checkout (`../ext/og-dhsrd` or `$OG_DHSRD_DIR`), the import keeps the snapshots, so the conversion stays reproducible. Two runs give byte-identical output.
- **`adversaries-extracted.csv` is no longer used.** The CSV-only code in `convert.js` (`convertDaggerheartRow`, description re-joining, truncation repair) is removed.
- **Fixed: 36 of the 129 existing official adversaries had wrong stats** (a 37th, Spellblade, only changes its damage type to `phy/mag`). 15 broken Major thresholds (Kraken 3 → 37, Zombie Legion 2 → 25, Head Vampire 2 → 22, Fallen Warlord: Undefeated Champion 3 → 35…), plus the two tiny oozes' thresholds (6/10 → 4/None and 5/None). 22 wrong attack modifiers, 20 of which had lost their minus sign (Courtier 0 → −4, Giant Rat 0 → −4, Apprentice Assassin +1 → −1…). 11 wrong damage dice (Jagged Knife Sniper 1d8+5 → 1d10+2, Spy 1d4+3 → 2d6+3…). The features are now complete: **Relentless, Minion (X) and Horde (X) were missing** from the official stat blocks, and features no longer run into each other ("Unyielding" + Relentless) or stop mid-sentence.
- **Added: 135 official adversaries** (264 in total), with new `"<name>--daggerheart"` ids.
- **Feature format:** the SRD's `#define` links and CSS classes are stripped, and bold, emphasis and lists are kept. "<strong><em>Name—Action:</em></strong>" becomes the entry name plus "<strong>Action:</strong> …", the same convention as the converted 5e stat blocks. Passives go under *Traits*; actions, reactions and Evolution features go under *Actions*. The standard attack (name, range, damage) is the first action, because the app has no fields for it. Hordes note their X/HP. Two optional fields were added to the `Adversary` type: `description` (the SRD summary) and `srd_pages`.
- **Environments:** 47 exported to `src/data/environments.json` (`"<name>--daggerheart"` ids). Each has tier, type, description, impulses (list), difficulty (`null` plus `difficulty_note` for the three "Relative Strength" events), potential adversaries (text plus `adversary_ids` that resolve in the bestiary), and features `{name, type: action|reaction|passive, text, question?}`. `scripts/publish-data.js` copies the file to `public/data/environments.json`. There is no UI for environments.
- **Attribution:** an SRD/DPCGL line in the README (new "Attribution" section) and in a footer under the bestiary list.
- **Ids:** 3340 before, 3475 after. **None missing or changed**; 135 added. Check with `node scripts/calibration-report.js --ids <old adversaries.json>`.
- **SRD data oddities kept as published:** Temporal Enforcer's standard attack is "40 direct phy" (fixed damage), and the oozes have no Severe threshold.

## R2.2 What changed in the converter

| Proposal | Change |
|---|---|
| P6 role tables | Every tier × type range was recalibrated to about the 20th–80th percentile of the official SRD stat blocks, and widened where the SRD has fewer than 4 examples. Examples: **T3 Ranged thresholds 12–15/25–30 → 17–20/30–32**. T4 Bruiser ATK +5–8 → +3–5, Stress 4–6 → 4–5. T2 Standard HP 5–6 → 4–5. T1 Minion Difficulty 10–12 → 9–11. Standard/Skulk Stress −1 at T1. The SRD *contradicts* the "T4 Solo HP 8–10" part of P6: with all 15 official T4 Solos, the median is **HP 11 and Stress 8**. T4 Solo is now HP 9–12, Stress 6–8, Difficulty 19–20, ATK +7–9 (was 10–12, 6–8, 19–21, +7–10). The LEGENDARY/COLOSSAL tables are gone. The tables are in "Making Custom Adversaries.md" (new section at the top) and the tier-scaling deltas in `scalingUtils.ts`. |
| P3 damage | The damage dice are **the SRD's per-type arrays**. The pick depends on the 5e damage per round (best attack × Multiattack count) against the median for the CR: the median takes the middle option, 1.6× the top, 1/1.6× the bottom. Before, there was 1 distinct dice value per tier × role; now there are 2.85 on average. T2 average damage is 10 → 13 (official 13), T3 is 14 → 19 (official 18). |
| P2 Support | Support only for: healer, priest, druid or bard names; actions that heal, shield or empower allies; or casters with ≥2 support/control spells (Bless, Cure Wounds, Hold Person, Haste…). All with whole-word regexes (no more "aid" in "said"). "INT ≥ 12 and mentions magic" is gone. **788 (25%) → 181 (6%)**, official 5%. The former Supports went to Leader (INT 16+ humanoids/fiends, 77 → 262), Standard and Skulk. The Leader keyword test no longer matches the *Command* spell or "lead" inside other words. |
| P9 Bruiser | The dead rule is replaced by "HP above 1.5× the median HP of its CR": Bruisers 11% → 18% (official 14%). |
| P1 Solos | Every Solo gets **Relentless (X)** ("per GM turn", the SRD wording; it said "per conflict") and **Momentum**, as the SRD's Solo guidance says: 20 Solos had no Relentless (King Hekaton among them). A Solo's 5e Multiattack becomes **"Sweeping Attacks: mark a Stress to make a standard attack against up to N different targets within range"**, the official pattern (Kraken *Many Tentacles*, Cipactli *Many Mouths*, Fallen Warlord *Shattering Strike*). No official Solo makes several attacks against one target. Iymrith now makes at most 3 attacks per spotlight, one per target, instead of 3 per spotlight × 3 spotlights against anyone. **362 → 0** Relentless Solos with a multi-attack Multiattack. |
| Horde/Minion | Horde (X) is half the average standard damage, as the SRD prescribes (it used a fixed table). Minion (X) is 4/6/8/12 by tier (SRD medians; it was 3/5/7/9). |
| P4 feature damage | Every damage roll in a feature (attacks, riders, breaths, areas, spell summaries) is rescaled: its share of the creature's best 5e attack × the stat block's standard damage. Single target is capped at **1.5×**, areas at **1×**. Official features sit at 0.5–1.5× their standard attack (areas 0.6–1.0×). Within ±10% of the standard, the stat block's own dice are used. Iymrith's breath **16d10 → 4d12+15**, Hekaton's Lightning Strike 12d8 → 2d12+2, the Winter Wolf's breath 4d8 → 2d6+4. Features with 5+ dice: **802 → 44** (the rest are not damage, e.g. "5d10 days", or "Acid or Necrotic" pairs). |
| P8 conditions | Frightened/blinded → "(Vulnerable)", stunned/paralyzed → "(Restrained and Vulnerable)", incapacitated → "(can't act)", poisoned → "(disadvantage on action rolls)", restrained/grappled → Restrained, a level of exhaustion → mark a Stress. "For 1 minute … repeat the save at the end of each of its turns" → **"until they clear it with a successful <Trait> Roll"** (the SRD's wording). Plain "for 1 minute" → "until the end of the scene". "Until the end of its next turn" → "until they next act". "Until the start of the giant's next turn" → "until the giant is next spotlighted". |

Counts over the 3211 converted stat blocks, before → after:

| Leftover | Before | After |
|---|---|---|
| frightened/stunned/incapacitated/paralyzed/poisoned/blinded without a DH effect | 1299 | 684 (mostly immunities, "ends the condition", "isn't incapacitated") |
| "for 1 minute" | 422 | 0 |
| "repeat the Reaction Roll/save" | 403 | 271 (on-damage or 24-hour repeats) |
| turn-based durations | 1151 | 267 (mostly "regains N HP at the start of its turn") |
| Relentless Solos with a multi-attack Multiattack | 362 | 0 |
| Solos without Relentless | 20 | 0 |
| features with 5+ damage dice | 802 | 44 |
| "Relentless … per conflict" | 386 | 0 |
| unbalanced HTML tags | 0 | 0 |

`npm run build` passes. `npx eslint .` reports the same 19 problems as on master.

## R2.3 Calibration: official SRD (264) vs converted

Same format as section 2: median (min–max), non-minions. The "before" rows are master's converted stat blocks, compared with the new official baseline.

### Per tier, before

| Tier | Src | n | Difficulty | Major | Severe | HP | Stress | ATK | Avg dmg |
|---|---|---|---|---|---|---|---|---|---|
| T1 | DH | 76 | 12 (8–15) | 6 (3–9) | 11 (6–17) | 5 (2–10) | 3 (1–5) | 1 (-4–4) | 7 (4–13) |
| T1 | 5e | 1028 | 12 (10–14) | 7 (3–10) | 10 (6–15) | 4 (3–7) | 4 (2–5) | 1 (-4–4) | 6 (4–10) |
| T2 | DH | 69 | 15 (12–17) | 11 (6–17) | 23 (13–32) | 5 (3–10) | 4 (2–7) | 2 (-3–5) | 13 (6–24) |
| T2 | 5e | 996 | 14 (12–16) | 10 (5–14) | 18 (13–26) | 5 (3–8) | 4 (2–6) | 2 (-1–5) | 10 (9–15) |
| T3 | DH | 53 | 17 (14–20) | 20 (15–35) | 35 (29–70) | 7 (4–12) | 5 (3–8) | 3 (0–7) | 18 (9–42) |
| T3 | 5e | 631 | 17 (14–19) | 18 (12–22) | 33 (25–40) | 6 (4–12) | 6 (3–6) | 3 (-2–7) | 14 (14–26) |
| T4 | DH | 38 | 19 (16–21) | 35 (22–48) | 65 (42–88) | 8 (3–12) | 5 (2–10) | 7 (0–10) | 30 (22–42) |
| T4 | 5e | 298 | 20 (18–21) | 32 (26–37) | 65 (36–70) | 10 (6–12) | 8 (5–8) | 8 (3–10) | 32 (22–32) |

### Per tier, after

| Tier | Src | n | Difficulty | Major | Severe | HP | Stress | ATK | Avg dmg |
|---|---|---|---|---|---|---|---|---|---|
| T1 | DH | 76 | 12 (8–15) | 6 (3–9) | 11 (6–17) | 5 (2–10) | 3 (1–5) | 1 (-4–4) | 7 (4–13) |
| T1 | 5e | 1028 | 12 (9–14) | 6 (3–9) | 10 (6–15) | 4 (3–7) | 3 (2–5) | 1 (-4–3) | 7 (5–11) |
| T2 | DH | 69 | 15 (12–17) | 11 (6–17) | 23 (13–32) | 5 (3–10) | 4 (2–7) | 2 (-3–5) | 13 (6–24) |
| T2 | 5e | 996 | 15 (13–16) | 10 (7–15) | 19 (15–29) | 5 (3–8) | 4 (3–7) | 2 (-1–4) | 13 (8–24) |
| T3 | DH | 53 | 17 (14–20) | 20 (15–35) | 35 (29–70) | 7 (4–12) | 5 (3–8) | 3 (0–7) | 18 (9–42) |
| T3 | 5e | 631 | 17 (14–19) | 20 (16–24) | 36 (30–43) | 6 (4–12) | 5 (3–8) | 3 (0–7) | 19 (9–42) |
| T4 | DH | 38 | 19 (16–21) | 35 (22–48) | 65 (42–88) | 8 (3–12) | 5 (2–10) | 7 (0–10) | 30 (22–42) |
| T4 | 5e | 298 | 20 (19–20) | 35 (28–38) | 63 (45–70) | 9 (6–12) | 8 (5–8) | 8 (4–9) | 32 (26–41) |

T4 Stress is 8 because 297 of the 298 converted T4 stat blocks are Solos, and the official T4 Solo median is also 8.

### Role mix

| Role | Official SRD (264) | Converted before | Converted after |
|---|---|---|---|
| BRUISER | 36 (14%) | 357 (11%) | 588 (18%) |
| HORDE | 21 (8%) | 33 (1%) | 33 (1%) |
| LEADER | 26 (10%) | 77 (2%) | 262 (8%) |
| MINION | 28 (11%) | 258 (8%) | 258 (8%) |
| RANGED | 12 (5%) | 186 (6%) | 186 (6%) |
| SKULK | 31 (12%) | 336 (10%) | 401 (12%) |
| SOCIAL | 13 (5%) | 13 (0%) | 13 (0%) |
| SOLO | 51 (19%) | 406 (13%) | 406 (13%) |
| STANDARD | 34 (13%) | 757 (24%) | 883 (27%) |
| SUPPORT | 12 (5%) | 788 (25%) | 181 (6%) |

Horde and Social stay rare: 5e has few swarms and few non-combat stat blocks. Standard is still the fallback for 27%.

### Per tier and role, after (official `DH` vs converted `5e`)

| Tier | Role | Src | n | Difficulty | Major | Severe | HP | Stress | ATK | Avg dmg |
|---|---|---|---|---|---|---|---|---|---|---|
| T1 | BRUISER | DH | 11 | 13 (10–14) | 8 (7–9) | 15 (13–17) | 6 (5–7) | 3 (1–4) | 1 (-3–2) | 9 (7–11) |
| T1 | BRUISER | 5e | 172 | 14 (12–14) | 8 (7–9) | 14 (13–15) | 5 (5–7) | 4 (2–4) | 1 (0–2) | 9 (7–11) |
| T1 | HORDE | DH | 10 | 10 (8–12) | 5 (4–6) | 10 (8–12) | 5 (3–8) | 3 (2–4) | -1 (-3–1) | 7 (5–9) |
| T1 | HORDE | 5e | 23 | 11 (10–12) | 5 (4–6) | 10 (8–11) | 4 (4–5) | 3 (2–3) | -1 (-2–0) | 7 (5–9) |
| T1 | LEADER | DH | 6 | 13 (11–15) | 7 (6–8) | 13 (11–14) | 6 (6–7) | 3 (2–5) | 2 (0–4) | 9 (8–10) |
| T1 | LEADER | 5e | 40 | 13 (12–14) | 7 (6–8) | 13 (12–14) | 6 (6–6) | 4 (4–4) | 2 (1–3) | 10 (9–10) |
| T1 | MINION | DH | 10 | 10 (8–11) | - | - | 1 (1–1) | 1 (1–1) | -2 (-4–3) | 2 (1–4) |
| T1 | MINION | 5e | 258 | 9 (9–10) | - | - | 1 (1–1) | 1 (1–1) | -2 (-2–-2) | 2 (2–2) |
| T1 | RANGED | DH | 4 | 9 (9–13) | 4 (4–4) | 7 (7–8) | 3 (2–3) | 2 (2–3) | -1 (-1–2) | 7 (6–8) |
| T1 | RANGED | 5e | 75 | 10 (9–12) | 4 (3–5) | 7 (6–8) | 3 (3–3) | 3 (2–3) | 0 (-1–2) | 8 (7–8) |
| T1 | SKULK | DH | 13 | 12 (8–14) | 5 (3–6) | 8 (7–11) | 3 (2–5) | 3 (1–5) | 1 (-2–2) | 6 (4–8) |
| T1 | SKULK | 5e | 230 | 12 (11–13) | 5 (4–6) | 9 (8–10) | 3 (3–4) | 3 (2–3) | 1 (0–2) | 7 (6–8) |
| T1 | SOCIAL | DH | 4 | 12 (12–14) | 4 (4–6) | 8 (8–10) | 3 (3–3) | 4 (3–5) | -4 (-4–-3) | 5 (4–7) |
| T1 | SOCIAL | 5e | 11 | 12 (12–14) | 4 (4–6) | 8 (8–10) | 3 (3–3) | 5 (5–5) | -4 (-4–-3) | 5 (5–5) |
| T1 | SOLO | DH | 13 | 13 (12–14) | 8 (7–8) | 15 (14–15) | 8 (6–10) | 3 (3–5) | 3 (1–4) | 11 (6–13) |
| T1 | STANDARD | DH | 14 | 12 (10–14) | 5 (4–8) | 10 (6–14) | 4 (2–5) | 3 (1–4) | 1 (-1–2) | 6 (5–7) |
| T1 | STANDARD | 5e | 407 | 12 (11–13) | 6 (5–7) | 11 (9–12) | 4 (4–5) | 3 (2–3) | 1 (0–1) | 7 (6–7) |
| T1 | SUPPORT | DH | 1 | 13 (13–13) | 5 (5–5) | 9 (9–9) | 4 (4–4) | 4 (4–4) | 2 (2–2) | 6 (6–6) |
| T1 | SUPPORT | 5e | 70 | 13 (12–13) | 7 (5–7) | 11 (9–11) | 3 (3–4) | 5 (5–5) | 2 (1–2) | 6 (6–6) |
| T2 | BRUISER | DH | 12 | 15 (13–16) | 14 (14–15) | 28 (25–30) | 7 (5–8) | 3 (2–5) | 2 (2–3) | 14 (13–16) |
| T2 | BRUISER | 5e | 238 | 16 (14–16) | 14 (13–15) | 27 (25–29) | 6 (6–8) | 5 (3–5) | 3 (2–3) | 15 (14–16) |
| T2 | HORDE | DH | 5 | 14 (13–15) | 10 (8–11) | 20 (16–23) | 5 (4–6) | 3 (3–3) | 0 (0–0) | 11 (9–11) |
| T2 | HORDE | 5e | 10 | 13 (13–15) | 8 (8–10) | 18 (18–20) | 4 (4–6) | 3 (3–3) | -1 (-1–1) | 11 (11–11) |
| T2 | LEADER | DH | 11 | 16 (14–16) | 12 (12–15) | 25 (24–27) | 6 (6–7) | 4 (4–5) | 3 (2–5) | 13 (11–15) |
| T2 | LEADER | 5e | 134 | 15 (15–16) | 14 (12–14) | 26 (24–27) | 6 (6–7) | 5 (5–5) | 4 (2–4) | 13 (13–14) |
| T2 | MINION | DH | 9 | 13 (12–14) | - | - | 1 (1–1) | 1 (1–2) | 0 (-1–3) | 5 (4–6) |
| T2 | RANGED | DH | 4 | 14 (13–16) | 8 (6–11) | 16 (14–23) | 5 (3–5) | 3 (3–6) | 2 (2–4) | 13 (12–15) |
| T2 | RANGED | 5e | 61 | 15 (14–15) | 8 (7–10) | 16 (15–20) | 4 (4–5) | 5 (4–5) | 3 (2–4) | 15 (13–15) |
| T2 | SKULK | DH | 8 | 14 (13–15) | 9 (8–11) | 17 (16–22) | 4 (4–6) | 4 (3–5) | 2 (1–3) | 10 (8–15) |
| T2 | SKULK | 5e | 165 | 14 (13–15) | 9 (8–10) | 17 (16–20) | 4 (4–5) | 5 (3–5) | 2 (2–3) | 15 (10–20) |
| T2 | SOCIAL | DH | 4 | 14 (13–15) | 8 (7–9) | 15 (13–19) | 3 (3–5) | 3 (3–4) | -3 (-3–2) | 6 (6–10) |
| T2 | SOLO | DH | 10 | 15 (14–17) | 13 (10–17) | 26 (20–32) | 8 (5–10) | 5 (3–6) | 3 (2–4) | 15 (10–24) |
| T2 | SOLO | 5e | 12 | 15 (14–16) | 13 (12–14) | 25 (22–27) | 7 (7–7) | 5 (4–5) | 3 (2–4) | 10 (10–24) |
| T2 | STANDARD | DH | 12 | 14 (12–15) | 9 (7–12) | 18 (15–24) | 4 (3–5) | 3 (2–4) | 1 (1–2) | 11 (8–13) |
| T2 | STANDARD | 5e | 312 | 14 (13–15) | 9 (8–11) | 18 (17–22) | 4 (4–5) | 4 (3–4) | 1 (1–2) | 13 (11–13) |
| T2 | SUPPORT | DH | 3 | 14 (13–14) | 9 (8–9) | 18 (16–18) | 4 (3–4) | 6 (6–7) | 2 (2–2) | 9 (8–11) |
| T2 | SUPPORT | 5e | 64 | 14 (13–14) | 9 (8–9) | 17 (16–18) | 4 (3–4) | 6 (5–7) | 2 (1–2) | 8 (8–11) |
| T3 | BRUISER | DH | 8 | 17 (17–17) | 22 (21–22) | 40 (40–40) | 7 (6–10) | 4 (3–5) | 3 (1–7) | 18 (14–20) |
| T3 | BRUISER | 5e | 178 | 16 (16–18) | 20 (20–22) | 37 (36–40) | 6 (6–8) | 5 (3–5) | 3 (2–5) | 19 (14–20) |
| T3 | HORDE | DH | 2 | 15 (15–16) | 16 (16–17) | 30 (30–32) | 7 (7–8) | 3 (3–4) | 1 (1–1) | 15 (15–17) |
| T3 | LEADER | DH | 4 | 17 (16–19) | 22 (20–24) | 38 (36–42) | 6 (6–8) | 5 (5–6) | 4 (4–5) | 18 (17–25) |
| T3 | LEADER | 5e | 88 | 17 (17–19) | 22 (20–24) | 39 (36–42) | 6 (6–8) | 6 (5–6) | 5 (4–5) | 25 (21–25) |
| T3 | MINION | DH | 2 | 14 (14–15) | - | - | 1 (1–1) | 1 (1–1) | 0 (0–0) | 5 (5–8) |
| T3 | RANGED | DH | 3 | 17 (16–18) | 19 (17–20) | 30 (30–32) | 6 (5–6) | 5 (4–6) | 4 (3–4) | 20 (17–20) |
| T3 | RANGED | 5e | 50 | 16 (16–18) | 17 (17–20) | 30 (30–32) | 5 (5–6) | 6 (4–6) | 3 (3–4) | 20 (17–20) |
| T3 | SKULK | DH | 9 | 15 (14–17) | 16 (15–20) | 30 (30–35) | 6 (5–7) | 4 (3–6) | 3 (2–4) | 16 (14–19) |
| T3 | SKULK | 5e | 6 | 14 (14–16) | 17 (16–17) | 32 (30–32) | 5 (5–6) | 5 (5–5) | 3 (2–3) | 16 (16–19) |
| T3 | SOCIAL | DH | 4 | 16 (16–17) | 16 (16–20) | 32 (32–32) | 5 (4–6) | 5 (5–8) | 0 (0–3) | 15 (14–19) |
| T3 | SOCIAL | 5e | 2 | 16 (16–16) | 16 (16–17) | 30 (30–31) | 4 (4–5) | 6 (6–6) | 0 (0–1) | 15 (15–17) |
| T3 | SOLO | DH | 13 | 18 (17–20) | 20 (19–35) | 35 (32–70) | 10 (5–12) | 6 (5–8) | 5 (3–7) | 25 (15–42) |
| T3 | SOLO | 5e | 97 | 19 (17–19) | 22 (19–23) | 42 (35–43) | 10 (10–12) | 8 (6–8) | 6 (3–7) | 19 (15–42) |
| T3 | STANDARD | DH | 6 | 16 (16–17) | 18 (18–19) | 35 (35–36) | 7 (5–7) | 4 (3–5) | 3 (2–3) | 17 (11–20) |
| T3 | STANDARD | 5e | 163 | 17 (16–17) | 18 (17–19) | 35 (33–36) | 6 (5–7) | 5 (4–5) | 3 (2–3) | 19 (11–20) |
| T3 | SUPPORT | DH | 4 | 16 (15–17) | 17 (15–24) | 33 (29–38) | 5 (5–8) | 5 (3–5) | 2 (2–4) | 13 (9–23) |
| T3 | SUPPORT | 5e | 47 | 16 (15–17) | 18 (16–21) | 33 (31–36) | 5 (5–6) | 5 (4–5) | 2 (2–3) | 16 (9–23) |
| T4 | BRUISER | DH | 5 | 20 (19–21) | 40 (35–42) | 70 (68–71) | 8 (7–9) | 5 (4–5) | 4 (0–5) | 40 (27–42) |
| T4 | HORDE | DH | 4 | 17 (17–17) | 25 (24–25) | 45 (45–48) | 8 (7–8) | 5 (5–6) | 2 (2–2) | 24 (22–24) |
| T4 | LEADER | DH | 5 | 20 (18–21) | 37 (33–37) | 70 (66–70) | 8 (7–9) | 8 (5–8) | 8 (6–8) | 32 (32–34) |
| T4 | MINION | DH | 7 | 18 (16–19) | - | - | 1 (1–1) | 1 (1–2) | 3 (2–3) | 11 (9–12) |
| T4 | RANGED | DH | 1 | 19 (19–19) | 22 (22–22) | 45 (45–45) | 3 (3–3) | 2 (2–2) | 4 (4–4) | 26 (26–26) |
| T4 | SKULK | DH | 1 | 18 (18–18) | 28 (28–28) | 52 (52–52) | 6 (6–6) | 6 (6–6) | 8 (8–8) | 32 (32–32) |
| T4 | SOCIAL | DH | 1 | 18 (18–18) | 26 (26–26) | 42 (42–42) | 6 (6–6) | 5 (5–5) | 3 (3–3) | 22 (22–22) |
| T4 | SOLO | DH | 15 | 20 (16–20) | 35 (29–48) | 68 (55–88) | 11 (6–12) | 8 (5–10) | 8 (3–10) | 32 (25–41) |
| T4 | SOLO | 5e | 297 | 20 (19–20) | 35 (33–38) | 63 (60–70) | 9 (9–12) | 8 (6–8) | 8 (7–9) | 32 (30–41) |
| T4 | STANDARD | DH | 2 | 18 (18–19) | 30 (30–30) | 45 (45–50) | 6 (6–6) | 4 (4–5) | 4 (4–6) | 22 (22–26) |
| T4 | STANDARD | 5e | 1 | 19 (19–19) | 28 (28–28) | 45 (45–45) | 6 (6–6) | 5 (5–5) | 4 (4–4) | 26 (26–26) |
| T4 | SUPPORT | DH | 4 | 19 (18–19) | 26 (26–27) | 42 (42–47) | 4 (4–6) | 4 (3–5) | 4 (4–7) | 23 (23–28) |

## R2.4 SKT showcase, before → after

"Before" is master (fd88b02). Texts are trimmed. Kraken appears twice: the MM'25 conversion and the official SRD Kraken (its threshold was broken before).

### Frost Giant (MM'25, CR 8) — `frost-giant--mm25`

- **Before:** T3 **BRUISER** · Difficulty 16 · Thresholds 19/35 · HP 6 · Stress 4 · ATK +3 · 3d10+4 phy  
  Features: Multiattack, Frost Axe, Great Bow, War Cry, Momentum, Heavy Hitter
- **After:** T3 **BRUISER** · Difficulty 16 · Thresholds 20/36 · HP 6 · Stress 4 · ATK +2 · 3d10+2 phy

  - **Multiattack** — Action: Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Frost Axe** — Action: Make an attack against a target within Very Close range. On a success, deal 3d6+3 physical damage plus 1d10+1 magic damage (cold).
  - **Great Bow** — Action: Make an attack against a target within Very Far range. On a success, deal 3d6+1 physical damage plus 1d8+1 magic damage (cold). The target's movement is slowed until they next act.
  - **War Cry** — Action: Spend a Fear to use this ability. The giant or one creature of its choice that can see or hear it gains 2d10+5 temporary HP and has Advantage on attacks until the giant is next spotlighted.
  - **Momentum** — Reaction: When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Heavy Hitter** — Reaction: When this adversary deals damage with a standard attack, you can spend a Fear to gain a +2 bonus to the damage roll.

### Duke Zalto (SKT, CR 9) — `duke-zalto--skt`

- **Before:** T3 **LEADER** · Difficulty 18 · Thresholds 20/36 · HP 8 · Stress 6 · ATK +5 · 3d8+8 phy  
  Features: Special Equipment, Siege Monster, Tackle, Multiattack, Maul, Rock, Momentum, Tactician
- **After:** T3 **LEADER** · Difficulty 18 · Thresholds 21/37 · HP 8 · Stress 6 · ATK +4 · 2d20+4 phy

  - **Special Equipment** — Passive: Zalto wears a ring of lightning resistance.
  - **Siege Monster** — Passive: Zalto deals double damage to objects and structures.
  - **Tackle** — Reaction: When Zalto enters any enemy's space for the first time on a turn, the enemy must succeed on a Strength Reaction Roll or be knocked prone (Vulnerable).
  - **Multiattack** — Action: Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Maul** — Action: Make an attack against a target within Very Close range. On a success, deal 2d20+4 physical damage.
  - **Rock** — Action: Make an attack against a target within Far range. On a success, deal 2d20+4 physical damage.
  - **Momentum** — Reaction: When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Tactician** — Action: Mark a Stress to spotlight this adversary and two allies within Close range.

### King Hekaton (SKT, CR 13) — `king-hekaton--skt`

- **Before:** T3 **SOLO** · Difficulty 19 · Thresholds 22/39 · HP 12 · Stress 6 · ATK +7 · 3d12+6 phy  
  Features: Amphibious, Innate Spellcasting, Multiattack, Broken Chain, Ballista, Lightning Strike, Thunderous Stomp
- **After:** T3 **SOLO** · Difficulty 19 · Thresholds 22/42 · HP 12 · Stress 8 · ATK +6 · 2d12+2 phy

  - **Amphibious** — Passive: Hekaton can breathe air and water.
  - **Innate Spellcasting** — Action: Cast one of the following spells. Spell attacks use this adversary's attack modifier and Reaction Rolls are made against its Difficulty. At will (mark …
  - **Relentless (2)** — Passive: This adversary can be spotlighted up to 2 times per GM turn. Spend Fear as usual to spotlight them.
  - **Sweeping Attacks** — Action: Mark a Stress to make a standard attack against up to two different targets within range.
  - **Broken Chain** — Action: Make an attack against a target within Very Close range. On a success, deal 2d12+2 physical damage.
  - **Ballista** — Action: Make an attack against a target within Far range. On a success, deal 2d12+2 physical damage.
  - **Lightning Strike** — Action: Spend a Fear to use this ability. Hekaton hurls a magical lightning bolt at a point he can see within Very Far range of it. Each creature within Very Close range of that point must make an Agility Reaction Roll, taking 2d12+2 magic damage (lightning) on a failure, or half as much damage on …
  - **Thunderous Stomp** — Action: Spend a Fear to use this ability. Hekaton stomps the ground, triggering a thunderclap. All other creatures within Close range of him must succeed on a Strength Reaction Roll or take 2d12+2 magic damage (thunder) and be deafened until Hekaton is next spotlighted. On a successful Reaction …
  - **Momentum** — Reaction: When this adversary makes a successful attack against a PC, you gain a Fear.

### Iymrith (SKT, CR 23) — `iymrith--skt`

- **Before:** T4 **SOLO** · Difficulty 21 · Thresholds 34/67 · HP 12 · Stress 8 · ATK +9 · 4d10+10 phy  
  Features: Legendary Resistance, Relentless (3), Multiattack, Bite, Claw, Spellcasting, Tail, Frightful Presence, Lightning Breath, Change Shape, Wing Attack
- **After:** T4 **SOLO** · Difficulty 20 · Thresholds 36/65 · HP 12 · Stress 8 · ATK +8 · 4d12+15 phy

  - **Legendary Resistance** — Reaction: When this adversary fails a Reaction Roll, you can spend a Fear to make it succeed instead.
  - **Relentless (3)** — Passive: This adversary can be spotlighted up to 3 times per GM turn. Spend Fear as usual to spotlight them.
  - **Sweeping Attacks** — Action: Mark a Stress to make a standard attack against up to three different targets within range.
  - **Bite** — Action: Make an attack against a target within Close range. On a success, deal 4d12 physical damage plus 4d6+1 magic damage (lightning).
  - **Claw** — Action: Make an attack against a target within Very Close range. On a success, deal 4d8+3 physical damage.
  - **Spellcasting** — Action: Cast one of the following spells. Spell attacks use this adversary's attack modifier and Reaction Rolls are made against its Difficulty. 1/day (spend a …
  - **Tail** — Action: Make an attack against a target within Close range. On a success, deal 4d10+2 physical damage.
  - **Frightful Presence** — Action: Spend a Fear to use this ability. Each creature of Iymrith's choice that is within Far range of Iymrith and aware of it must succeed on an Instinct Reaction Roll or become frightened (Vulnerable) until they clear it with a successful Instinct Roll. If a creature's Reaction Roll is …
  - **Lightning Breath** — Action: Spend a Fear to use this ability. Iymrith exhales lightning in a line (Far range) that is 10 feet wide. Each creature in that line must make an Agility Reaction Roll, taking 4d12+15 magic damage (lightning) on a failure, or half as much damage on a successful one.
  - **Change Shape** — Action: Spend a Fear to use this ability. Iymrith magically polymorphs into a female storm giant or back into her true form. She reverts to her true form if she dies. Any equipment she is wearing or carrying is absorbed or borne by the new form (Iymrith's choice). In storm giant form, Iymrith …
  - **Wing Attack** — Action: Spend a Fear to use this ability. Iymrith beats her wings. Each creature within Close range of Iymrith must succeed on an Agility Reaction Roll or take 4d8+3 physical damage and be knocked prone (Vulnerable). Iymrith can then fly up to half her flying speed.
  - **Momentum** — Reaction: When this adversary makes a successful attack against a PC, you gain a Fear.

### Ancient Blue Dragon (MM'25, CR 23) — `ancient-blue-dragon--mm25`

- **Before:** T4 **SOLO** · Difficulty 21 · Thresholds 34/67 · HP 12 · Stress 8 · ATK +9 · 4d10+10 phy  
  Features: Legendary Resistance, Relentless (3), Multiattack, Rend, Lightning Breath, Spellcasting, Cloaked Flight, Sonic Boom
- **After:** T4 **SOLO** · Difficulty 20 · Thresholds 36/65 · HP 12 · Stress 8 · ATK +8 · 4d10+10 phy

  - **Legendary Resistance** — Reaction: When this adversary fails a Reaction Roll, you can spend a Fear to make it succeed instead.
  - **Relentless (3)** — Passive: This adversary can be spotlighted up to 3 times per GM turn. Spend Fear as usual to spotlight them.
  - **Sweeping Attacks** — Action: Mark a Stress to make a standard attack against up to three different targets within range.
  - **Rend** — Action: Make an attack against a target within Close range. On a success, deal 4d8+2 physical damage plus 3d6+2 magic damage (lightning).
  - **Lightning Breath** — Action: Spend a Fear to use this ability. Each creature in a Line (Far range) must make an Agility Reaction Roll. Targets who fail take 4d10+10 magic damage (lightning). Targets who succeed take half damage.
  - **Spellcasting** — Action: Cast one of the following spells. Spell attacks use this adversary's attack modifier and Reaction Rolls are made against its Difficulty. At will (mark …
  - **Cloaked Flight** — Action: Spend a Fear to use this ability. The dragon uses Spellcasting to cast Invisibility on itself, and it can fly up to half its Fly Speed.
  - **Sonic Boom** — Action: Spend a Fear to use this ability. The dragon uses Spellcasting to cast Shatter (level 3 version).
  - **Momentum** — Reaction: When this adversary makes a successful attack against a PC, you gain a Fear.

### Kraken (MM'25, CR 23) — `kraken--mm25`

- **Before:** T4 **SOLO** · Difficulty 21 · Thresholds 34/67 · HP 12 · Stress 8 · ATK +9 · 4d10+10 phy  
  Features: Amphibious, Legendary Resistance, Siege Monster, Relentless (3), Multiattack, Tentacle, Fling, Lightning Strike, Swallow, Storm Bolt, Toxic Ink
- **After:** T4 **SOLO** · Difficulty 20 · Thresholds 36/65 · HP 12 · Stress 8 · ATK +8 · 4d8+12 phy

  - **Amphibious** — Passive: The kraken can breathe air and water.
  - **Legendary Resistance** — Reaction: When this adversary fails a Reaction Roll, you can spend a Fear to make it succeed instead.
  - **Siege Monster** — Passive: The kraken deals double damage to objects and structures.
  - **Relentless (3)** — Passive: This adversary can be spotlighted up to 3 times per GM turn. Spend Fear as usual to spotlight them.
  - **Sweeping Attacks** — Action: Mark a Stress to make a standard attack against up to two different targets within range.
  - **Tentacle** — Action: Mark a Stress to make an attack against a target within Close range. On a success, deal 4d8+12 physical damage. The target is Restrained from one of ten tentacles, and it is Restrained until the grapple ends.
  - **Fling** — Action: Spend a Fear to use this ability. The kraken throws a Large or smaller creature Grappled by it to a space it can see within Far range of itself that isn't in the air. The creature thrown and each creature in the destination space must make an Agility Reaction Roll. Targets who fail take …
  - **Lightning Strike** — Action: Mark a Stress to use this ability. One creature the kraken can see within Far range must make an Agility Reaction Roll. Targets who fail take 4d12+15 magic damage (lightning). Targets who succeed take half damage.
  - **Swallow** — Action: Mark a Stress to use this ability. One creature Grappled by the kraken (it can have up to four creatures swallowed at a time) must make an Agility Reaction Roll. Targets who fail take 4d8+12 physical damage. If the target is Large or smaller, it is swallowed and no longer Grappled. A …
  - **Storm Bolt** — Action: Spend a Fear to use this ability. The kraken uses Lightning Strike.
  - **Toxic Ink** — Action: Spend a Fear to use this ability. Each creature in a Emanation (Close range) originating from the kraken while it is underwater must make a Strength Reaction Roll. On a failure: The target is blinded (Vulnerable) and poisoned (disadvantage on action rolls) until the kraken is next …
  - **Momentum** — Reaction: When this adversary makes a successful attack against a PC, you gain a Fear.

### Kraken (official SRD) — `kraken--daggerheart`

- **Before:** T4 **SOLO** · Difficulty 20 · Thresholds 3/70 · HP 11 · Stress 8 · ATK +7 · 4d12+10 phy  
  Features: Many Tentacles, Grapple and Drown, Boiling Blast, Momentum
- **After:** T4 **SOLO** · Difficulty 20 · Thresholds 37/70 · HP 11 · Stress 8 · ATK +7 · 4d12+10 phy

  - **Relentless (3)** — Passive: The Kraken can be spotlighted up to three times per GM turn. Spend Fear as usual to spotlight them.
  - **Many Tentacles** — Passive: While the Kraken has 7 or fewer marked HP, they can make their standard attack against two targets within range.
  - **Tentacles** — Standard Attack: Make an attack (+7) against a target within Close range. On a success, deal 4d12+10 physical damage.
  - **Grapple and Drown** — Action: Make an attack roll against a target within Close range. On a success, mark a Stress to grab them with a tentacle and drag them beneath the water. The target is Restrained and Vulnerable until they break free with a successful Strength Roll or the Kraken takes Major or greater damage. While …
  - **Boiling Blast** — Action: Spend a Fear to spew a line of boiling water at any number of targets in a line up to Far range. All targets must succeed on an Agility Reaction Roll or take 4d6+9 physical damage. If a target marks an Armor Slot to reduce the damage, they must also mark a Stress.
  - **Momentum** — Reaction: When the Kraken makes a successful attack against a PC, you gain a Fear.

### Chief Guh (SKT, CR 5) — `chief-guh--skt`

- **Before:** T2 **LEADER** · Difficulty 14 · Thresholds 13/25 · HP 7 · Stress 5 · ATK +4 · 2d10+3 phy  
  Features: Multiattack, Greatclub, Unarmed Attack, Rock, Momentum, Tactician
- **After:** T2 **LEADER** · Difficulty 15 · Thresholds 13/26 · HP 7 · Stress 5 · ATK +3 · 2d12+1 phy

  - **Multiattack** — Action: Mark a Stress to make 2 standard attacks, against one target or split between targets in range.
  - **Greatclub** — Action: Make an attack against a target within Very Close range. On a success, deal 2d10+1 physical damage.
  - **Unarmed Attack** — Action: Make an attack against a target within Very Close range. On a success, deal 2d6+1 physical damage.
  - **Rock** — Action: Make an attack against a target within Far range. On a success, deal 2d12+1 physical damage.
  - **Momentum** — Reaction: When this adversary makes a successful attack against a PC, you gain a Fear.
  - **Tactician** — Action: Mark a Stress to spotlight this adversary and two allies within Close range.

### Ogre (MM'25, CR 2) — `ogre--mm25`

- **Before:** T1 **BRUISER** · Difficulty 14 · Thresholds 9/15 · HP 6 · Stress 3 · ATK +2 · 1d10+4 phy  
  Features: Greatclub, Javelin, Momentum
- **After:** T1 **BRUISER** · Difficulty 14 · Thresholds 9/15 · HP 6 · Stress 3 · ATK +2 · 1d4+6 phy

  - **Greatclub** — Action: Make an attack against a target within Melee range. On a success, deal 1d4+6 physical damage.
  - **Javelin** — Action: Make an attack against a target within Melee range (or Close range if thrown). On a success, deal 1d12+1 physical damage.
  - **Momentum** — Reaction: When this adversary makes a successful attack against a PC, you gain a Fear.

## R2.5 Still open

- **Spotlight-economy features**: 5e Multiattack on non-Solos still costs a Stress for N standard attacks. Official adversaries rarely do this; the closest pattern is "spend a Fear to make two standard attacks".
- **Damage choice vs. 5e weakness**: the DPR rule follows 5e. King Hekaton (CR 13, 2 attacks of 3d6+9) gets the weakest T3 Solo dice (2d12+2), and his big lightning attacks are capped to that. If the DM wants Hekaton to feel like a king, give him the middle option (3d12+8) or play him as a T4 Solo.
- **Regeneration and turn wording**: "regains N HP at the start of its turn" (≈200), on-damage save repeats and "temporary HP" (≈100) have no DH mapping yet ("clear a HP when spotlighted" and Armor would be candidates).
- **Charmed** (855 mentions) is left as narrative. Remaining 5e spell texts (spell summaries are cut at a sentence) and the 322 long spell lists (P11) are unchanged.
- P7 (SKT boss variants), P10 (minion Battle Points), P12 (cosmetic costs/experiences), P13 (`cr_estimated` flag) are not addressed.
- Official adversaries keep `category: "Unknown"`. The SRD only gives categories indirectly, through the environments' "potential adversaries" groups (Beasts, Grove Guardians…).
- A CI check (`npm run convert && git diff --exit-code src/data`) is still a good idea.
