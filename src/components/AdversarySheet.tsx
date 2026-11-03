import { useEffect, useRef, useState } from 'react';
import type { Adversary } from '../types';
import { getEffectiveTier } from '../utils/scalingUtils';
import { StatBlock } from './StatBlock';
import { Icon, Stepper } from './ui';

interface Props {
  adversary: Adversary;
  onClose: () => void;
  onAdd: (quantity: number, upscaling: number) => void;
}

/** One adversary's stat block, with quantity and tier to add it to the encounter. */
export function AdversarySheet({ adversary, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [upscaling, setUpscaling] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const tier = getEffectiveTier(adversary.tier, upscaling);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // Focus the sheet while open, close on Escape, and give focus back to the row that opened it.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  const meta = [adversary.role.toLowerCase(), adversary.category, adversary.biome !== 'Unknown' && adversary.biome].filter(Boolean).join(' · ');
  const cr = adversary.original_cr?.split(' ')[0];
  const provenance = [adversary.book ?? adversary.source, ...(adversary.srd_pages ?? []), cr && `CR ${cr}`].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-xl border border-line bg-bg shadow-2xl outline-none sm:max-h-[85vh] sm:rounded-xl"
      >
        <header className="flex items-start gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="text-lg font-semibold">
              {adversary.name}
            </h2>
            <p className="mt-0.5 text-sm text-muted first-letter:uppercase">{meta}</p>
          </div>
          <button className="btn btn-ghost btn-icon -mt-1 -mr-2" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {adversary.description && <p className="mb-5 text-sm text-muted italic">{adversary.description}</p>}
          <StatBlock adversary={adversary} upscaling={upscaling} />
          {provenance && <p className="mt-6 text-xs text-faint">{provenance}</p>}
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Stepper value={quantity} onChange={setQuantity} min={1} label="quantity">
            ×{quantity}
          </Stepper>
          <Stepper value={tier} onChange={(t) => setUpscaling(t - adversary.tier)} min={1} max={4} label="tier">
            Tier {tier}
          </Stepper>
          <button className="btn btn-primary ml-auto" onClick={() => onAdd(quantity, upscaling)}>
            Add
          </button>
        </footer>
      </div>
    </div>
  );
}
