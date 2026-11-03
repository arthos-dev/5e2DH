import type { EncounterAdversary, Adversary } from '../types';

// Calculate available Battle Points
export function calculateAvailableBattlePoints(playerCount: number, modifier: number): number {
  return (3 * playerCount + 2) + modifier;
}

// Calculate Battle Points for a role
export function getBattlePointsForRole(role: string): number {
  const roleUpper = role.toUpperCase();
  if (['MINION', 'SOCIAL', 'SUPPORT'].includes(roleUpper)) return 1;
  if (['HORDE', 'RANGED', 'SKULK', 'STANDARD'].includes(roleUpper)) return 2;
  if (roleUpper === 'LEADER') return 3;
  if (roleUpper === 'BRUISER') return 4;
  if (roleUpper === 'SOLO') return 5;
  return 2; // default to STANDARD cost
}

// Calculate total Battle Points spent
export function calculateSpentBattlePoints(encounterAdversaries: EncounterAdversary[], allAdversaries: Adversary[]): number {
  return encounterAdversaries.reduce((total, encAdv) => {
    const baseAdv = allAdversaries.find(a => a.id === encAdv.adversaryId);
    if (!baseAdv) return total;
    const battlePoints = getBattlePointsForRole(baseAdv.role) * encAdv.quantity;
    return total + battlePoints;
  }, 0);
}

// Determine difficulty level (Very Easy, Easy, Medium, Hard, etc.)
export function getDifficultyLevel(spent: number, available: number): string {
  if (available === 0) return 'Unknown';
  const ratio = spent / available;
  if (ratio < 0.5) return 'Very Easy';
  if (ratio < 0.7) return 'Easy';
  if (ratio < 0.9) return 'Medium';
  if (ratio < 1.1) return 'Hard';
  return 'Very Hard';
}

// The bestiary plus an encounter's own stat blocks (customAdversaries, e.g. sent from the Storm King's Codex).
export function adversariesFor(encounter: { customAdversaries?: Adversary[] } | null | undefined, bestiary: Adversary[]): Adversary[] {
    const extra = encounter?.customAdversaries ?? [];
    return extra.length ? [...extra, ...bestiary] : bestiary;
}

// Ids used to be "<Name>_<random>"; they are now stable "<name>--<book>" slugs. Saved encounters and old shared links
// still hold the old form, so map an unknown id of that shape to the first adversary with the same name.
export function upgradeLegacyIds<T extends { adversaries: EncounterAdversary[]; customAdversaries?: Adversary[] }>(encounter: T, bestiary: Adversary[]): T {
    const known = adversariesFor(encounter, bestiary);
    return {
        ...encounter,
        adversaries: encounter.adversaries.map((a) => {
            if (known.some((k) => k.id === a.adversaryId)) return a;
            const m = /^(.*)_[a-z0-9]{6,12}$/.exec(a.adversaryId);
            const byName = m && known.find((k) => k.name === m[1]);
            return byName ? { ...a, adversaryId: byName.id } : a;
        }),
    };
}
