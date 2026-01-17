import type { Encounter } from '../types';

/**
 * Encodes an encounter to a base64 URL-safe string
 */
export function encodeEncounterToUrl(encounter: Encounter): string {
  // Only include essential data for sharing (exclude savedEncounterId, savedAt)
  const shareableEncounter = {
    id: encounter.id,
    name: encounter.name,
    playerCount: encounter.playerCount,
    adversaries: encounter.adversaries,
    battlePointModifier: encounter.battlePointModifier,
  };

  try {
    const jsonString = JSON.stringify(shareableEncounter);
    // Use base64 encoding with URL-safe characters
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
    return base64;
  } catch (error) {
    console.error('Failed to encode encounter to URL:', error);
    throw new Error('Failed to encode encounter');
  }
}

/**
 * Decodes a base64 URL-safe string back to an encounter
 */
export function decodeEncounterFromUrl(urlParam: string): Encounter | null {
  try {
    // Decode base64 and handle URL encoding
    const jsonString = decodeURIComponent(escape(atob(urlParam)));
    const encounter = JSON.parse(jsonString) as Encounter;

    // Validate the encounter structure
    if (
      typeof encounter !== 'object' ||
      typeof encounter.name !== 'string' ||
      typeof encounter.playerCount !== 'number' ||
      !Array.isArray(encounter.adversaries) ||
      typeof encounter.battlePointModifier !== 'number'
    ) {
      console.error('Invalid encounter structure in URL');
      return null;
    }

    // Validate adversaries structure
    for (const adv of encounter.adversaries) {
      if (
        typeof adv.id !== 'string' ||
        typeof adv.adversaryId !== 'string' ||
        typeof adv.quantity !== 'number' ||
        typeof adv.upscaling !== 'number'
      ) {
        console.error('Invalid adversary structure in URL');
        return null;
      }
    }

    return encounter;
  } catch (error) {
    console.error('Failed to decode encounter from URL:', error);
    return null;
  }
}

/**
 * Generates a shareable URL for an encounter
 */
export function generateShareableUrl(encounter: Encounter): string {
  const encoded = encodeEncounterToUrl(encounter);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?encounter=${encoded}`;
}

/**
 * Loads an encounter from the current URL if present
 */
export function loadEncounterFromUrl(): Encounter | null {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const encounterParam = urlParams.get('encounter');
    
    if (!encounterParam) {
      return null;
    }

    return decodeEncounterFromUrl(encounterParam);
  } catch (error) {
    console.error('Failed to load encounter from URL:', error);
    return null;
  }
}

/**
 * Clears the encounter parameter from the URL
 */
export function clearEncounterFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('encounter');
    window.history.replaceState({}, '', url.toString());
  } catch (error) {
    console.error('Failed to clear encounter from URL:', error);
  }
}

/**
 * Updates the URL with the current encounter (only if it has adversaries)
 */
export function updateUrlWithEncounter(encounter: Encounter): void {
  try {
    const url = new URL(window.location.href);
    
    // Only update URL if encounter has adversaries
    if (encounter.adversaries.length > 0) {
      const encoded = encodeEncounterToUrl(encounter);
      url.searchParams.set('encounter', encoded);
    } else {
      // Remove encounter parameter if encounter is empty
      url.searchParams.delete('encounter');
    }
    
    window.history.replaceState({}, '', url.toString());
  } catch (error) {
    console.error('Failed to update URL with encounter:', error);
  }
}
