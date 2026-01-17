
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

## Project Structure
- `scripts/convert.js`: The script that parses `Bestiary.csv` and generates `src/data/adversaries.json`.
- `src/components/`: UI Components (`AdversaryCard`, `Filters`, etc.).
- `src/types.ts`: TypeScript definitions for the Adversary data model.

## Note on Conversion Logic
The conversion logic in `scripts/convert.js` strictly follows the "Rules for Converting D&D Adversaries to DaggerHeart.md" guide:
- **Tier**: Derived from CR.
- **Difficulty**: Derived from CR and adjusted by AC.
- **HP**: Derived from 5e HP divided by the rule's factor.
- **Stress**: Derived from Intelligence score.
- **Role**: Estimated based on name keywords, stats, and type.
