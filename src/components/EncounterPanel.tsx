import { useEffect, useRef, useState } from 'react';
import type { Adversary, Encounter, EncounterAdversary } from '../types';
import { calculateAvailableBattlePoints, calculateSpentBattlePoints, getDifficultyLevel } from '../utils/encounterUtils';
import { getEffectiveTier } from '../utils/scalingUtils';
import { Icon, Stepper } from './ui';

interface Props {
  encounter: Encounter;
  /** The bestiary plus the encounter's own stat blocks. */
  adversaries: Adversary[];
  saved: Encounter[];
  onChange: (patch: Partial<Encounter>) => void;
  onRemove: (line: EncounterAdversary) => void;
  onSave: () => void;
  onShare: () => void;
  onRun: () => void;
  onNew: () => void;
  onOpen: (savedId: string) => void;
  onDelete: (savedId: string) => void;
  /** Mobile only: hide the panel. */
  onClose: () => void;
}

/** The encounter being built. */
export function EncounterPanel(props: Props) {
  const { encounter, adversaries, onChange } = props;
  const available = calculateAvailableBattlePoints(encounter.playerCount, encounter.battlePointModifier);
  const spent = calculateSpentBattlePoints(encounter.adversaries, adversaries);
  const updateLine = (id: string, patch: Partial<EncounterAdversary>) =>
    onChange({ adversaries: encounter.adversaries.map((l) => (l.id === id ? { ...l, ...patch } : l)) });

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-1 px-4 pt-3">
        <input
          value={encounter.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Untitled"
          aria-label="Encounter name"
          className="h-9 min-w-0 flex-1 rounded-md bg-transparent px-2 -ml-2 text-base font-semibold outline-none hover:bg-hover focus:bg-hover"
        />
        <EncounterMenu {...props} />
        <button className="btn btn-ghost btn-icon md:hidden" onClick={props.onClose} aria-label="Close encounter">
          <Icon name="close" />
        </button>
      </header>

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <Stepper value={encounter.playerCount} onChange={(n) => onChange({ playerCount: n })} min={1} label="players">
          {encounter.playerCount} {encounter.playerCount === 1 ? 'player' : 'players'}
        </Stepper>
        <span className="text-sm tabular-nums" title="Battle points spent / available">
          {getDifficultyLevel(spent, available)} <span className="text-muted">{spent}/{available}</span>
        </span>
      </div>

      <ul className="flex-1 overflow-y-auto border-t border-line py-1">
        {encounter.adversaries.length === 0 && <li className="py-16 text-center text-sm text-faint">No adversaries</li>}
        {encounter.adversaries.map((line) => {
          const adversary = adversaries.find((a) => a.id === line.adversaryId);
          if (!adversary) return null;
          return (
            <li key={line.id} className="flex items-center gap-2 px-4 py-1">
              <NameInput
                value={line.customName ?? adversary.name}
                label={`Name of ${adversary.name}`}
                onCommit={(name) => updateLine(line.id, { customName: name && name !== adversary.name ? name : undefined })}
              />
              <span className="text-xs text-muted tabular-nums" title="Tier">
                T{getEffectiveTier(adversary.tier, line.upscaling)}
              </span>
              <Stepper
                value={line.quantity}
                onChange={(q) => (q === 0 ? props.onRemove(line) : updateLine(line.id, { quantity: q }))}
                min={0}
                removes
                label={line.customName ?? adversary.name}
              />
            </li>
          );
        })}
      </ul>

      <footer className="flex items-center gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button className="btn btn-ghost btn-icon" onClick={props.onShare} disabled={!encounter.adversaries.length} aria-label="Copy link" title="Copy link">
          <Icon name="link" />
        </button>
        {!encounter.savedEncounterId && (
          <button className="btn btn-ghost" onClick={props.onSave}>
            Save
          </button>
        )}
        <button className="btn btn-primary ml-auto px-5" onClick={props.onRun} disabled={!encounter.adversaries.length}>
          Run
        </button>
      </footer>
    </div>
  );
}

/** Renames on Enter or blur; Escape cancels. Empty goes back to the bestiary name. */
function NameInput({ value, label, onCommit }: { value: string; label: string; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  return (
    <input
      value={draft ?? value}
      onFocus={() => setDraft(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (!cancelled.current && draft !== null) onCommit(draft.trim());
        cancelled.current = false;
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancelled.current = true;
        if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
      }}
      aria-label={label}
      className="h-8 min-w-0 flex-1 truncate rounded-md bg-transparent px-2 -ml-2 text-sm outline-none hover:bg-hover focus:bg-hover"
    />
  );
}

/** Saved encounters: open, delete, or start a new one. */
function EncounterMenu({ encounter, saved, onNew, onOpen, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button className="btn btn-ghost btn-icon" onClick={() => setOpen(!open)} aria-label="Encounters" aria-expanded={open} title="Encounters">
        <Icon name="list" />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 w-72 rounded-lg border border-line bg-bg p-1 shadow-xl" role="menu">
          <button className="btn btn-ghost w-full justify-start" onClick={pick(onNew)} role="menuitem">
            <Icon name="plus" /> New encounter
          </button>
          {saved.length > 0 && <div className="my-1 border-t border-line" />}
          <div className="max-h-80 overflow-y-auto">
            {saved.map((s) => {
              const current = s.savedEncounterId === encounter.savedEncounterId;
              return (
                <div key={s.savedEncounterId} className="group flex items-center rounded-md hover:bg-hover">
                  <button className="flex h-9 min-w-0 flex-1 items-center gap-2 px-3 text-left text-sm sm:h-8" onClick={pick(() => onOpen(s.savedEncounterId!))} role="menuitem">
                    <span className={`truncate ${current ? 'font-semibold' : ''}`}>{s.name || 'Untitled'}</span>
                    <span className="ml-auto text-xs text-faint tabular-nums">{s.adversaries.reduce((n, l) => n + l.quantity, 0)}</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-icon opacity-100 group-hover:opacity-100 sm:opacity-0"
                    onClick={pick(() => onDelete(s.savedEncounterId!))}
                    aria-label={`Delete ${s.name}`}
                  >
                    <Icon name="trash" className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
