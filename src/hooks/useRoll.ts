import { useCallback } from 'react';
import { useDice } from './useDice';
import { formatDiceRoll, parseDiceExpression } from '../utils/diceRoller';
import { useToast } from './useToast';

/**
 * Roll dice from a clicked element: the 3D dice start at the element and the result shows as a toast.
 * `roll('1d20+3', 'Attack', el)`; `rollFromText(event)` handles clicks on dice buttons inside feature text.
 */
export function useRoll() {
  const { triggerRoll } = useDice();
  const toast = useToast();

  const roll = useCallback(
    (expression: string, label: string, from: HTMLElement) => {
      const parsed = parseDiceExpression(expression);
      if (!parsed) {
        toast(`Can't roll ${expression}`, { tone: 'error' });
        return;
      }
      const rect = from.getBoundingClientRect();
      triggerRoll(expression, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, (result) => {
        const text = formatDiceRoll({ ...parsed, rolls: result.rolls, total: result.total, expression });
        toast(`${label}  ${text}`, { duration: 6000 });
      });
    },
    [triggerRoll, toast],
  );

  const rollFromText = useCallback(
    (event: React.MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-dice]');
      if (target?.dataset.dice) roll(target.dataset.dice, 'Roll', target);
    },
    [roll],
  );

  return { roll, rollFromText };
}

export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
