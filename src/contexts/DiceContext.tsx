import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

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
    reportRollResult: (result: DiceRollResult) => void;
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

interface QueuedCallback {
    expression: string;
    callback: (result: DiceRollResult) => void;
}

interface QueuedRoll {
    expression: string;
    position?: { x: number; y: number };
    onComplete?: (result: DiceRollResult) => void;
}

export const DiceProvider: React.FC<DiceProviderProps> = ({ children }) => {
    const [currentRoll, setCurrentRoll] = useState<DiceRoll | null>(null);
    const rollQueueRef = useRef<QueuedRoll[]>([]);
    const callbackQueueRef = useRef<QueuedCallback[]>([]);
    const resultQueueRef = useRef<DiceRollResult[]>([]);
    const isProcessingCallbacksRef = useRef(false);
    const isRollActiveRef = useRef(false);

    // Keep ref in sync with state to ensure accurate roll status
    useEffect(() => {
        isRollActiveRef.current = currentRoll !== null;
    }, [currentRoll]);

    const processRollQueue = useCallback(() => {
        // Only process if no current roll is active and there are rolls in queue
        if (isRollActiveRef.current || rollQueueRef.current.length === 0) {
            return;
        }

        // Get the next roll from the queue
        const nextRoll = rollQueueRef.current.shift();
        if (!nextRoll) {
            return;
        }

        console.log('🎲 Processing queued roll:', nextRoll.expression);

        // Mark roll as active BEFORE setting state to avoid race conditions
        isRollActiveRef.current = true;

        // Create roll without onComplete (callback will be queued separately)
        const newRoll: DiceRoll = {
            expression: nextRoll.expression,
            position: nextRoll.position,
            // Don't include onComplete here - it will be queued separately
        };

        // Set currentRoll to start animation
        setCurrentRoll(newRoll);
        console.log('🎲 Queued roll started. Animation beginning.');

        // Queue the onComplete callback with its expression for matching
        if (nextRoll.onComplete) {
            callbackQueueRef.current.push({ expression: nextRoll.expression, callback: nextRoll.onComplete });
            console.log('🎲 Callback queued. Queue length:', callbackQueueRef.current.length);
        }
    }, []);

    const triggerRoll = useCallback((expression: string, position?: { x: number; y: number }, onComplete?: (result: DiceRollResult) => void) => {
        console.log('🎲 triggerRoll called:', { expression, position, hasCurrentRoll: isRollActiveRef.current });
        
        // If a roll is already active, queue this roll instead of replacing it
        if (isRollActiveRef.current) {
            console.log('🎲 Roll already active, queuing new roll. Queue length:', rollQueueRef.current.length + 1);
            rollQueueRef.current.push({ expression, position, onComplete });
            return;
        }

        // Mark roll as active BEFORE setting state to avoid race conditions
        isRollActiveRef.current = true;

        // Create roll without onComplete (callback will be queued separately)
        const newRoll: DiceRoll = {
            expression,
            position,
            // Don't include onComplete here - it will be queued separately
        };
        
        // Set currentRoll immediately to start animation right away
        setCurrentRoll(newRoll);
        console.log('🎲 Roll started immediately. Animation beginning.');

        // Queue the onComplete callback with its expression for matching
        if (onComplete) {
            callbackQueueRef.current.push({ expression, callback: onComplete });
            console.log('🎲 Callback queued. Queue length:', callbackQueueRef.current.length);
        }
    }, []);

    const processCallbackQueue = useCallback(() => {
        // If already processing, don't process again (prevents concurrent processing)
        if (isProcessingCallbacksRef.current) {
            return;
        }

        // Match results to callbacks by expression
        let processedAny = false;
        for (let i = resultQueueRef.current.length - 1; i >= 0; i--) {
            const result = resultQueueRef.current[i];
            // Find matching callback by expression
            const callbackIndex = callbackQueueRef.current.findIndex(
                queued => queued.expression === result.expression
            );
            
            if (callbackIndex !== -1) {
                // Found a match - process it
                const queued = callbackQueueRef.current[callbackIndex];
                isProcessingCallbacksRef.current = true;
                processedAny = true;
                
                // Remove matched items
                callbackQueueRef.current.splice(callbackIndex, 1);
                resultQueueRef.current.splice(i, 1);
                
                console.log('🎲 Processing callback from queue (matched by expression):', result.expression);
                
                // Check if there are more to process after removal
                const hasMore = callbackQueueRef.current.length > 0 && resultQueueRef.current.length > 0;
                
                // Process this callback immediately
                queued.callback(result);
                
                if (hasMore) {
                    // Continue processing with delay
                    setTimeout(() => {
                        isProcessingCallbacksRef.current = false;
                        processCallbackQueue();
                    }, 100);
                } else {
                    // Done processing
                    isProcessingCallbacksRef.current = false;
                }
                
                return; // Process one at a time
            }
        }
        
        if (!processedAny) {
            // Done processing
            isProcessingCallbacksRef.current = false;
        }
    }, []);

    const reportRollResult = useCallback((result: DiceRollResult) => {
        // Queue the result (will be matched with callbacks by expression)
        resultQueueRef.current.push(result);
        console.log('🎲 Result queued. Result queue length:', resultQueueRef.current.length, 'Expression:', result.expression);
        // Try to process callback queue (will process if matching callback is ready)
        processCallbackQueue();
    }, [processCallbackQueue]);

    const clearRoll = useCallback(() => {
        // Mark roll as no longer active FIRST (before clearing state)
        // This ensures the ref is updated before queue processing happens
        isRollActiveRef.current = false;
        setCurrentRoll(null);
        
        // Process callback queue after animation completes
        // Results are already queued via reportRollResult(), so just check queue again
        setTimeout(() => {
            processCallbackQueue();
            // After processing callbacks, process the next roll in the queue if available
            // Small delay to ensure state has updated
            setTimeout(() => {
                processRollQueue();
            }, 50);
        }, 100);
    }, [processCallbackQueue, processRollQueue]);

    return (
        <DiceContext.Provider value={{ triggerRoll, currentRoll, clearRoll, reportRollResult }}>
            {children}
        </DiceContext.Provider>
    );
};
