import type { Encounter } from '../types';

/**
 * The JSON inside an encounter link (?encounter=… or #encounter=…, base64 or base64url).
 * Unknown fields are ignored, so older and newer links keep working.
 */
export interface EncounterLinkPayload extends Encounter {
  // Open the encounter straight in the running view instead of the builder (e.g. from the Storm King's Codex).
  autoRun?: boolean;
}

/** An encounter read from the current URL. */
export interface EncounterFromUrl {
  encounter: Encounter;
  autoRun: boolean;
  source: 'query' | 'hash';
}

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
    ...(encounter.customAdversaries?.length ? { customAdversaries: encounter.customAdversaries } : {}),
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
export function decodeEncounterFromUrl(urlParam: string): EncounterLinkPayload | null {
  try {
    // Decode base64 and handle URL encoding
    // URLSearchParams turns "+" into a space; base64 needs it back. Accept base64url (-, _) too.
    const b64 = urlParam.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
    const jsonString = decodeURIComponent(escape(atob(b64)));
    const encounter = JSON.parse(jsonString) as EncounterLinkPayload;

    // Validate the encounter structure (only known fields; anything else is ignored)
    if (
      typeof encounter !== 'object' ||
      encounter === null ||
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

    // Stat blocks sent along with the encounter (e.g. from the Storm King's Codex)
    if (encounter.customAdversaries !== undefined) {
      if (
        !Array.isArray(encounter.customAdversaries) ||
        encounter.customAdversaries.some(
          (a) => !a || typeof a.id !== 'string' || typeof a.name !== 'string' || typeof a.tier !== 'number' || !a.stats || !Array.isArray(a.features)
        )
      ) {
        console.error('Invalid custom adversaries in URL');
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
export function loadEncounterFromUrl(): EncounterFromUrl | null {
  try {
    // ?encounter=… or #encounter=… (the hash form keeps long links with full stat blocks out of server request limits)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParam = urlParams.get('encounter');
    const encounterParam = queryParam ?? hashParams.get('encounter');
    
    if (!encounterParam) {
      return null;
    }

    const decoded = decodeEncounterFromUrl(encounterParam);
    if (!decoded) return null;
    // autoRun is a link instruction, not part of the encounter: keep it out of state and saved encounters.
    const { autoRun, ...encounter } = decoded;
    return { encounter, autoRun: autoRun === true, source: queryParam !== null ? 'query' : 'hash' };
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
    if (url.hash.includes('encounter=')) url.hash = '';
    window.history.replaceState({}, '', url.toString());
  } catch (error) {
    console.error('Failed to clear encounter from URL:', error);
  }
}

/**
 * Removes #encounter=… from the URL so a reload doesn't import the link again
 */
export function clearEncounterHashFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    if (!new URLSearchParams(url.hash.replace(/^#/, '')).has('encounter')) return;
    url.hash = '';
    window.history.replaceState(window.history.state, '', url.toString());
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
