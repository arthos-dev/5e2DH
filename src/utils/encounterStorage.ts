import type { Encounter } from '../types';

const STORAGE_KEY = 'daggerheart-encounters';

interface SavedEncounter extends Encounter {
    savedEncounterId: string;
    savedAt: number;
}

export function saveEncounter(encounter: Encounter): string {
    const savedEncounters = getAllSavedEncounters();
    
    // Generate unique ID if not already saved
    const savedEncounterId = encounter.savedEncounterId || `encounter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const savedAt = encounter.savedAt || Date.now();
    
    const savedEncounter: SavedEncounter = {
        ...encounter,
        savedEncounterId,
        savedAt,
    };
    
    // Check if encounter already exists (by savedEncounterId)
    const existingIndex = savedEncounters.findIndex(e => e.savedEncounterId === savedEncounterId);
    
    if (existingIndex >= 0) {
        // Update existing
        savedEncounters[existingIndex] = savedEncounter;
    } else {
        // Add new
        savedEncounters.push(savedEncounter);
    }
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedEncounters));
        return savedEncounterId;
    } catch (error) {
        console.error('Failed to save encounter to localStorage:', error);
        throw error;
    }
}

export function loadEncounter(id: string): Encounter | null {
    try {
        const savedEncounters = getAllSavedEncounters();
        const encounter = savedEncounters.find(e => e.savedEncounterId === id);
        return encounter || null;
    } catch (error) {
        console.error('Failed to load encounter from localStorage:', error);
        return null;
    }
}

export function getAllSavedEncounters(): SavedEncounter[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as SavedEncounter[];
    } catch (error) {
        console.error('Failed to read encounters from localStorage:', error);
        return [];
    }
}

export function deleteEncounter(id: string): void {
    try {
        const savedEncounters = getAllSavedEncounters();
        const filtered = savedEncounters.filter(e => e.savedEncounterId !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Failed to delete encounter from localStorage:', error);
        throw error;
    }
}
