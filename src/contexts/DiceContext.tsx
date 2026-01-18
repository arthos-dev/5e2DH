import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface DiceRollResult {
    rolls: number[];
    total: number;
    expression: string;
}

interface DiceRoll {
    expression: string;
    position?: { x: number; y: number };
    onComplete?: (result: DiceRollResult) => void;
}

interface DiceContextType {
    triggerRoll: (expression: string, position?: { x: number; y: number }, onComplete?: (result: DiceRollResult) => void) => void;
    currentRoll: DiceRoll | null;
    clearRoll: () => void;
}

const DiceContext = createContext<DiceContextType | undefined>(undefined);

export const useDice = () => {
    const context = useContext(DiceContext);
    if (!context) {
        throw new Error('useDice must be used within a DiceProvider');
    }
    return context;
};

interface DiceProviderProps {
    children: ReactNode;
}

export const DiceProvider: React.FC<DiceProviderProps> = ({ children }) => {
    const [currentRoll, setCurrentRoll] = useState<DiceRoll | null>(null);

    const triggerRoll = useCallback((expression: string, position?: { x: number; y: number }, onComplete?: (result: DiceRollResult) => void) => {
        console.log('🎲 triggerRoll called:', { expression, position });
        setCurrentRoll({ expression, position, onComplete });
    }, []);

    const clearRoll = useCallback(() => {
        setCurrentRoll(null);
    }, []);

    return (
        <DiceContext.Provider value={{ triggerRoll, currentRoll, clearRoll }}>
            {children}
        </DiceContext.Provider>
    );
};
