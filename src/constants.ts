/**
 * Canonical lists of valid roles, categories, and biomes for DaggerHeart adversaries
 * Based on "Making Custom Adversaries" guide and D&D 5e creature types
 */

export const VALID_ROLES = [
  'BRUISER',
  'COLOSSAL',
  'HORDE',
  'LEADER',
  'LEGENDARY',
  'MINION',
  'RANGED',
  'SKULK',
  'SOCIAL',
  'SOLO',
  'STANDARD',
  'SUPPORT',
] as const;

export const VALID_CATEGORIES = [
  'Aberration',
  'Beast',
  'Celestial',
  'Construct',
  'Dragon',
  'Elemental',
  'Fey',
  'Fiend',
  'Giant',
  'Humanoid',
  'Monstrosity',
  'Ooze',
  'Plant',
  'Undead',
] as const;

export const VALID_BIOMES = [
  'Any',
  'Arctic',
  'Coastal',
  'Desert',
  'Forest',
  'Grassland',
  'Hill',
  'Mountain',
  'Swamp',
  'Underdark',
  'Underwater',
  'Urban',
  'Planar (Abyss)',
  'Planar (Astral Plane)',
  'Planar (Beastlands)',
  'Planar (Elemental Chaos)',
  'Planar (Elemental Plane of Earth)',
  'Planar (Elemental Plane of Fire)',
  'Planar (Elemental Planes)',
  'Planar (Feywild)',
  'Planar (Gehenna)',
  'Planar (Limbo)',
  'Planar (Lower Planes)',
  'Planar (Mechanus)',
  'Planar (Nine Hells)',
  'Planar (Shadowfell)',
  'Planar (Upper Planes)',
] as const;

/**
 * Maps legacy role names to canonical role names
 */
export const ROLE_NORMALIZATION: Record<string, string> = {
  'ELITE': 'SOLO',
  'SNIPER': 'RANGED',
  'SKIRMISHER': 'SKULK',
};

/**
 * Normalizes a role name to its canonical form
 */
export function normalizeRole(role: string): string {
  const upperRole = role.toUpperCase().trim();
  return ROLE_NORMALIZATION[upperRole] || upperRole;
}

/**
 * Normalizes a category name to its canonical form
 * Handles variations like "Celestial," -> "Celestial", "swarm" -> "Swarm", etc.
 */
export function normalizeCategory(category: string): string {
  if (!category) return '';
  
  // Trim whitespace and trailing punctuation (commas, periods, etc.)
  let normalized = category.trim().replace(/[,\.]+$/, '').trim();
  
  // Capitalize first letter, lowercase the rest
  normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  
  // Handle specific known variations
  if (normalized === 'Celestial,' || normalized === 'Celestial') {
    return 'Celestial';
  }
  
  // Check if it matches a valid category (case-insensitive)
  const validCategory = VALID_CATEGORIES.find(
    cat => cat.toLowerCase() === normalized.toLowerCase()
  );
  
  return validCategory || normalized;
}
