import { createContext, useContext } from 'react';

export interface DiceRollResult {
    rolls: number[];
    total: number;
    expression: string;
}

export interface DiceRoll {
    expression: string;
    position?: { x: number; y: number };
    onComplete?: (result: DiceRollResult) => void;
}

export interface DiceContextType {
    triggerRoll: (expression: string, position?: { x: number; y: number }, onComplete?: (result: DiceRollResult) => void) => void;
    currentRoll: DiceRoll | null;
    clearRoll: () => void;
    reportRollResult: (result: DiceRollResult) => void;
}

export const DiceContext = createContext<DiceContextType | undefined>(undefined);

/** The 3D dice queue. Provided by <DiceProvider>, rendered by <Dice3D>. */
export const useDice = () => {
    const context = useContext(DiceContext);
    if (!context) {
        throw new Error('useDice must be used within a DiceProvider');
    }
    return context;
};
