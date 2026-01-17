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
