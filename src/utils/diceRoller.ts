export interface DiceExpression {
    count: number;
    sides: number;
    modifier: number;
}

export interface DiceRollResult extends DiceExpression {
    rolls: number[];
    total: number;
    expression: string;
}

const normalizeExpression = (expression: string) => expression.replace(/\s+/g, '');

export const parseDiceExpression = (expression: string): DiceExpression | null => {
    // Extract the dice pattern from the start of the string (allows trailing text like "phy" or "(Physical)")
    const dicePatternMatch = expression.match(/^(\d*)d(\d+)([+-]\d+)?/i);
    if (!dicePatternMatch) return null;

    // Extract just the dice expression part (e.g., "1d12+2" from "1d12+2 phy")
    const diceExpression = dicePatternMatch[0];
    const normalized = normalizeExpression(diceExpression);
    const match = normalized.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!match) return null;

    const count = match[1] ? parseInt(match[1], 10) : 1;
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    if (!Number.isFinite(count) || !Number.isFinite(sides)) return null;
    if (count <= 0 || sides <= 0) return null;

    return { count, sides, modifier };
};

export const rollDice = ({ count, sides, modifier }: DiceExpression): DiceRollResult => {
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
    const base = count === 1 ? `d${sides}` : `${count}d${sides}`;
    const modifierText = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';

    return {
        count,
        sides,
        modifier,
        rolls,
        total,
        expression: `${base}${modifierText}`,
    };
};

export const rollDiceExpression = (expression: string): DiceRollResult | null => {
    const parsed = parseDiceExpression(expression);
    if (!parsed) return null;
    return rollDice(parsed);
};

export const rollD20WithModifier = (modifier: number): DiceRollResult => {
    return rollDice({ count: 1, sides: 20, modifier });
};

export const formatDiceRoll = (result: DiceRollResult): string => {
    const base = result.count === 1 ? `d${result.sides}` : `${result.count}d${result.sides}`;
    const rollsText = result.rolls.join(', ');
    const modifierText = result.modifier > 0 ? `+${result.modifier}` : result.modifier < 0 ? `${result.modifier}` : '';
    return `${base}(${rollsText})${modifierText} = ${result.total}`;
};

export const wrapDiceExpressions = (text: string): string => {
    const dicePattern = /\b\d*d\d+(?:\s*[+-]\s*\d+)?\b/gi;
    return text.replace(dicePattern, (match) => {
        const normalized = normalizeExpression(match);
        return `<span class="dice-roll cursor-pointer underline decoration-dotted underline-offset-2" data-dice="${normalized}" title="Roll ${normalized}" aria-label="Roll ${normalized}">${match}</span>`;
    });
};
