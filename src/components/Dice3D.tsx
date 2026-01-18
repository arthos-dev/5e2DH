import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DiceBox from '@3d-dice/dice-box';
import { useDice, type DiceRollResult } from '../contexts/DiceContext';
import { parseDiceExpression } from '../utils/diceRoller';

// Global singleton to prevent multiple initializations
let globalDiceBoxInstance: DiceBox | null = null;
let globalInitializationInProgress = false;

export const Dice3D: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const diceBoxRef = useRef<DiceBox | null>(null);
    const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentRollExpressionRef = useRef<string | null>(null);
    const isInitializedRef = useRef(false);
    const [diceBoxInstance, setDiceBoxInstance] = useState<DiceBox | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [keepVisible, setKeepVisible] = useState(false);
    const { currentRoll, clearRoll, reportRollResult } = useDice();

    // Initialize dice-box when component mounts (only once)
    useEffect(() => {
        if (!containerRef.current || isInitializedRef.current) return;
        
        // Global singleton check - prevent multiple initializations across all instances
        if (globalInitializationInProgress || globalDiceBoxInstance) {
            // If global instance exists, use it
            if (globalDiceBoxInstance) {
                diceBoxRef.current = globalDiceBoxInstance;
                setDiceBoxInstance(globalDiceBoxInstance);
                isInitializedRef.current = true;
                setIsInitialized(true);
            }
            return;
        }

        const initDiceBox = async () => {
            globalInitializationInProgress = true;
            
            // Wait a bit to ensure the container is fully in the DOM
            await new Promise(resolve => setTimeout(resolve, 200));

            if (!containerRef.current) {
                globalInitializationInProgress = false;
                return;
            }

            // Singleton protection: Check if container already has a canvas (from previous init or React StrictMode)
            const container = containerRef.current;
            const existingCanvases = container.querySelectorAll('canvas.dice-box-canvas');
            
            // If canvas already exists, don't re-initialize - just use the existing instance
            if (existingCanvases.length > 0) {
                console.log('Dice-box canvas already exists, skipping initialization');
                globalInitializationInProgress = false;
                if (globalDiceBoxInstance) {
                    diceBoxRef.current = globalDiceBoxInstance;
                    setDiceBoxInstance(globalDiceBoxInstance);
                    isInitializedRef.current = true;
                    setIsInitialized(true);
                }
                return;
            }
            
            // Completely clear the container before initialization to prevent duplicates
            container.innerHTML = '';
            
            // Also check for any canvases that might have been created outside the container
            const allCanvases = document.querySelectorAll('canvas.dice-box-canvas');
            allCanvases.forEach(canvas => {
                // Remove any orphaned canvases
                canvas.remove();
            });
            
            // If we already have a dice-box instance, don't re-initialize
            if (diceBoxRef.current || globalDiceBoxInstance) {
                globalInitializationInProgress = false;
                if (globalDiceBoxInstance) {
                    diceBoxRef.current = globalDiceBoxInstance;
                    setDiceBoxInstance(globalDiceBoxInstance);
                    isInitializedRef.current = true;
                    setIsInitialized(true);
                }
                return;
            }

            const parent = container.parentElement;
            
            // Set parent to full screen dimensions first
            if (parent) {
                parent.style.visibility = 'visible';
                parent.style.opacity = '1';
                parent.style.display = 'block';
                parent.style.width = '100vw';
                parent.style.height = '100vh';
                parent.style.position = 'fixed';
                parent.style.top = '0';
                parent.style.left = '0';
            }
            
            // Set container to full dimensions
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            container.style.display = 'block';
            container.style.width = '100%';
            container.style.height = '100%';
            
            // Wait a moment for browser to calculate dimensions
            await new Promise(resolve => setTimeout(resolve, 100));

            // Try asset paths with trailing slashes (required by dice-box)
            const assetPaths = [
                '/assets/dice-box/',
                '/assets/dice-box',
                '/assets/',
                '/assets',
            ];

            let initialized = false;
            for (const assetPath of assetPaths) {
                try {
                    // Use the new v1.1.0+ API: constructor accepts only a config object
                    // Use selector string for container (the element has id="dice-box-container")
                    const diceBox = new DiceBox({
                        container: '#dice-box-container', // Use selector string
                        assetPath,
                        theme: 'default',
                        themeColor: '#D4AF37',
                        scale: 4, // Default scale value
                        enableShadows: true,
                        // offscreen defaults to true, which is needed for proper rendering
                        // Physics parameters to speed up animation
                        gravity: 9, // Faster fall (default: 3, was 7)
                        angularDamping: 0.9, // Spin dies down faster (default: 0.4, was 0.8)
                        linearDamping: 0.9, // Movement slows faster (default: 0.5, was 0.85)
                        spinForce: 3, // Less initial spinning (default: 6, was 3.5)
                        throwForce: 1.8, // Gentler throw (default: 2.5, was 2)
                        startingHeight: 6, // Less air time (default: 15, was 9)
                        settleTimeout: 1000, // Assume results faster (default: 5000ms, was 1500ms) - increased from 800ms for visibility
                    });

                    await diceBox.init();
                    
                    // Store in both ref and state AND global singleton
                    diceBoxRef.current = diceBox;
                    setDiceBoxInstance(diceBox);
                    globalDiceBoxInstance = diceBox;
                    
                    isInitializedRef.current = true;
                    setIsInitialized(true);
                    initialized = true;
                    globalInitializationInProgress = false;
                    
                    return; // Success, exit the loop
                } catch (error: any) {
                    // Continue to next path
                    console.warn('Failed to initialize dice-box with asset path:', assetPath, error);
                }
            }
            
            // If we get here, all paths failed
            isInitializedRef.current = true; // Prevent infinite retries
            setIsInitialized(true);
            globalInitializationInProgress = false;
        };

        initDiceBox();

        return () => {
            // Cleanup: Only destroy dice-box instance if this is the last component using it
            // Since we're using a global singleton, we should only clean up when the app unmounts
            // For now, we'll keep the instance alive since Dice3D should only mount once
            // But we'll clean up timeouts and local refs
            if (cleanupTimeoutRef.current) {
                clearTimeout(cleanupTimeoutRef.current);
                cleanupTimeoutRef.current = null;
            }
            
            // Don't destroy the global instance - it should persist for the app lifetime
            // Only clear local refs
            diceBoxRef.current = null;
            setDiceBoxInstance(null);
            isInitializedRef.current = false;
        };
    }, []); // Empty dependency array - only run on mount/unmount

    useEffect(() => {
        if (!isInitialized) {
            return;
        }
        
        if (!currentRoll) {
            return;
        }
        
        // Use state instance if ref is null (state is more reliable)
        const diceBox = diceBoxInstance || diceBoxRef.current;
        
        if (!diceBox) {
            return;
        }

        // Clear any pending cleanup timeout when a new roll starts
        if (cleanupTimeoutRef.current) {
            clearTimeout(cleanupTimeoutRef.current);
            cleanupTimeoutRef.current = null;
        }

        const rollDice = async () => {
            // Capture the roll at the start to avoid stale references
            const roll = currentRoll;
            if (!roll) return;
            
            const expression = roll.expression;
            // Track the expression being rolled in a ref so cleanup can check if it's still current
            currentRollExpressionRef.current = expression;
            
            try {
                const parsed = parseDiceExpression(expression);
                if (!parsed) {
                    clearRoll();
                    return;
                }

                // Roll just the dice part - dice-box may not handle modifiers in notation correctly
                // We'll add the modifier manually after extracting the results
                const diceBoxNotation = `${parsed.count}d${parsed.sides}`;

                // Make sure the container and its parent are visible before rolling
                if (containerRef.current) {
                    const container = containerRef.current;
                    const parent = container.parentElement;
                    
                    // Make parent visible first with full viewport dimensions
                    if (parent) {
                        parent.style.visibility = 'visible';
                        parent.style.opacity = '1';
                        parent.style.zIndex = '999999'; // Match the positionStyle z-index
                        parent.style.display = 'block';
                        parent.style.width = '100vw';
                        parent.style.height = '100vh';
                    }
                    
                    // Make container visible (full screen)
                    container.style.visibility = 'visible';
                    container.style.opacity = '1';
                    container.style.display = 'block';
                    container.style.width = '100%';
                    container.style.height = '100%';
                    
                    // Wait a moment for styles to apply and React to re-render
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // Roll the dice using dice-box (this generates the actual values)
                const diceBox = diceBoxInstance || diceBoxRef.current;
                if (!diceBox) {
                    clearRoll();
                    return;
                }

                const result = await diceBox.roll(diceBoxNotation);
                
                // Get the proper grouped results from getRollResults() - this is the preferred method
                let rollResults: any = null;
                if (diceBox.getRollResults) {
                    rollResults = diceBox.getRollResults();
                }
                
                // Extract the actual roll values from the dice-box result
                // roll() returns a flat array of die objects: [{value: 11, ...}, {value: 14, ...}]
                // getRollResults() returns grouped structure: [{rolls: [{value: 11, ...}], ...}]
                const allRolls: number[] = [];
                let diceTotal = 0;
                
                // First, try to use getRollResults() which has the proper grouped structure
                if (rollResults && Array.isArray(rollResults) && rollResults.length > 0) {
                    for (const group of rollResults) {
                        // Check if this is a group with rolls array (getRollResults format)
                        if (group.rolls && Array.isArray(group.rolls) && group.rolls.length > 0) {
                            for (const die of group.rolls) {
                                if (typeof die.value === 'number' && die.value > 0) {
                                    allRolls.push(die.value);
                                    diceTotal += die.value;
                                }
                            }
                        }
                        // Check if this is a flat die object (roll() format that got into rollResults somehow)
                        else if (typeof group.value === 'number' && group.value > 0 && !group.rolls) {
                            allRolls.push(group.value);
                            diceTotal += group.value;
                        }
                    }
                }
                
                // Fallback: if getRollResults didn't work or returned empty, try the direct result from roll()
                // The roll() method returns a flat array of die objects
                if (allRolls.length === 0 && result && Array.isArray(result) && result.length > 0) {
                    // Check if result is a flat array of dice (has value property directly)
                    const firstItem = result[0];
                    if (firstItem && typeof firstItem.value === 'number') {
                        // This is a flat array of die objects from roll()
                        for (const die of result) {
                            if (typeof die.value === 'number' && die.value > 0) {
                                allRolls.push(die.value);
                                diceTotal += die.value;
                            }
                        }
                    }
                }
                
                // Final fallback: if we still have no rolls, generate them
                if (allRolls.length === 0) {
                    diceTotal = 0;
                    for (let i = 0; i < parsed.count; i++) {
                        const roll = Math.floor(Math.random() * parsed.sides) + 1;
                        allRolls.push(roll);
                        diceTotal += roll;
                    }
                }
                
                // Add the modifier to the total (we always roll without modifier, then add it)
                const total = diceTotal + parsed.modifier;
                
                // Create the result object from dice-box results (matches visible dice)
                const diceRollResult: DiceRollResult = {
                    rolls: allRolls,
                    total: total,
                    expression: expression,
                };
                
                // Report the result to the context (callback will be queued and processed by clearRoll)
                reportRollResult(diceRollResult);
                
                // Keep dice visible for a while after roll completes
                // The promise resolves when physics settle, but visual animation may still be playing
                setKeepVisible(true);
                
                // Clear the roll after a delay to let users see the result
                // Store timeout ID in ref so we can clear it if a new roll starts
                cleanupTimeoutRef.current = setTimeout(() => {
                    // Only clear if this is still the current roll (no new roll has started)
                    // Check by comparing expressions - if currentRollExpressionRef changed, a new roll started
                    if (currentRollExpressionRef.current === expression) {
                        setKeepVisible(false);
                        clearRoll();
                    }
                    cleanupTimeoutRef.current = null;
                }, 1800); // Wait 1.8 seconds to ensure dice are visible after settling (settleTimeout ~1000ms + 800ms visibility)
            } catch (error: any) {
                // Clear any pending timeout if there's an error
                if (cleanupTimeoutRef.current) {
                    clearTimeout(cleanupTimeoutRef.current);
                    cleanupTimeoutRef.current = null;
                }
                setKeepVisible(false);
                clearRoll();
            }
        };

        rollDice();
    }, [currentRoll, isInitialized, diceBoxInstance, clearRoll, reportRollResult]);

    // Always render the container so dice-box can initialize
    // Make it full screen so dice can roll anywhere
    // Keep it in DOM but hidden when not rolling (display: none breaks dice-box rendering)
    // Container is visible if there's a current roll OR if keepVisible is true (after roll completes)
    const hasActiveRoll = !!currentRoll || keepVisible;
    
    const positionStyle: React.CSSProperties = {
        position: 'fixed',
        left: '0',
        top: '0',
        width: '100vw',
        height: '100vh',
        zIndex: 999999, // Very high z-index to ensure it's above all modals
        pointerEvents: 'none',
        opacity: hasActiveRoll ? 1 : 0,
        visibility: hasActiveRoll ? 'visible' : 'hidden',
        display: 'block', // Always in DOM, just hidden when not rolling
    };

    // Render dice container via portal to document.body to escape any stacking contexts
    const diceContainer = (
        <div style={positionStyle}>
            <div
                ref={containerRef}
                id="dice-box-container"
                style={{
                    width: '100%',
                    height: '100%',
                    minWidth: '100vw',
                    minHeight: '100vh',
                    backgroundColor: 'transparent',
                }}
            />
        </div>
    );

    return (
        <>
            {createPortal(diceContainer, document.body)}
        </>
    );
};
