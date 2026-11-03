
# D&D 5e to Daggerheart Converter

This project is a React-based tool that converts D&D 5e adversaries (from a CSV source) into Daggerheart-compatible statistics cards.

## Features implemented
- **Automated Conversion**: Calculates HP, Difficulty, Stress, and Damage based on 5e CR and stats using the provided rules.
- **Card Interface**: Displays adversaries in a card format similar to the reference image.
- **Filtering**: Filter by Role, Category, Biome, and Tier.
- **Search**: Full-text search on names.
- **Details View**: Click on a card to see the full converted stat block, including features (Traits/Actions).

## How to Run

1.  **Install dependencies** (if not already done):
    ```bash
    cd converter
    npm install
    ```

2.  **Run the development server**:
    ```bash
    npm run dev
    ```
    This will start the local server (usually at `http://localhost:5173`).

3.  **Build for production**:
    ```bash
    npm run build
    ```
    The output will be in `converter/dist`.

## Encounter links

An encounter can be opened from a link (parsed in `src/utils/encounterUrl.ts`):

```
https://5e2dh.vercel.app/#encounter=<base64url JSON>
```

`?encounter=` works too, and plain base64 is accepted. The JSON:

```jsonc
{
  "id": "string",
  "name": "string",
  "playerCount": 4,
  "battlePointModifier": 0,
  "adversaries": [{ "id": "line-1", "adversaryId": "<name>--<book>", "quantity": 2, "upscaling": 0, "customName": "optional" }],
  "customAdversaries": [ /* optional: full stat blocks; adversaryId may point at their ids */ ],
  "autoRun": true // optional: open the running view instead of the builder
}
```

- Unknown fields are ignored, so older and newer links keep working.
- `autoRun: true` does what the "Run encounter" button does, custom adversaries included. Missing or anything other than `true` opens the builder. Stopping the fight leaves the encounter in the builder.
- The `#encounter=` hash is removed once the link is read, so a reload does not import it again or restart the fight.

## Project Structure
- `scripts/convert.js`: The script that parses `Bestiary.csv` and generates `src/data/adversaries.json` (5e conversions plus the official Daggerheart adversaries).
- `scripts/import-srd.js`: Imports the official Daggerheart adversaries and environments from the Daggerheart SRD 2.0 ([og-dhsrd](https://github.com/callmepartario/og-dhsrd) checkout, default `../ext/og-dhsrd` or `$OG_DHSRD_DIR`) into the committed snapshots `data/srd/adversaries.json`, `data/srd/adversary-types.json` and `src/data/environments.json`. `npm run convert` runs it first (it keeps the snapshots when no checkout is present), then `convert.js`.
- `scripts/calibration-report.js`: Official vs converted stats per tier and role (`--tiers`, `--roles`, `--mix`, `--ids old.json`).
- `src/components/`: UI Components (`AdversaryCard`, `Filters`, etc.).
- `src/types.ts`: TypeScript definitions for the Adversary data model.

## Note on Conversion Logic
The conversion logic in `scripts/convert.js` strictly follows the "Rules for Converting D&D Adversaries to DaggerHeart.md" guide:
- **Tier**: Derived from CR.
- **Difficulty**: Derived from CR and adjusted by AC.
- **HP**: Derived from 5e HP divided by the rule's factor.
- **Stress**: Derived from Intelligence score.
- **Role**: Estimated based on name keywords, stats, and type.

## Attribution

The official Daggerheart adversaries and environments come from the **Daggerheart SRD 2.0**, © Critical Role, LLC, used under the terms of the [Darrington Press Community Gaming License](https://darringtonpress.com/license/) (DPCGL), by way of Old Gus' hypertext edition of the SRD ([callmepartario/og-dhsrd](https://github.com/callmepartario/og-dhsrd)). The converter's role tables are calibrated against the SRD's adversary statistics and per-type damage dice. This product is not affiliated with Critical Role, LLC or Darrington Press. Daggerheart is a trademark of Critical Role, LLC.
