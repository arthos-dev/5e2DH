import { useState } from 'react';
import type { Adversary, EncounterInstance, RunningEncounter } from '../types';
import { updateInstanceHP, updateInstanceStress } from '../utils/runningEncounterUtils';
import { getEffectiveTier } from '../utils/scalingUtils';
import { StatBlock } from './StatBlock';
import { Icon } from './ui';

interface Props {
  running: RunningEncounter;
  /** The bestiary plus the encounter's own stat blocks. */
  adversaries: Adversary[];
  onExit: () => void;
}

/** The fight: every adversary on its own card, with HP and Stress to mark. */
export function RunView({ running, adversaries, onExit }: Props) {
  const [instances, setInstances] = useState(running.instances);

  // "Goblin 1", "Goblin 2" when a line has more than one.
  const sizes = new Map<string, number>();
  instances.forEach((i) => sizes.set(i.encounterAdversaryId, (sizes.get(i.encounterAdversaryId) ?? 0) + 1));
  const seen = new Map<string, number>();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-line bg-bg/90 px-2 backdrop-blur md:px-4">
        <button className="btn btn-ghost btn-icon" onClick={onExit} aria-label="Back to builder">
          <Icon name="back" />
        </button>
        <h1 className="truncate font-semibold">{running.name || 'Untitled'}</h1>
      </header>
      <main className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-4 p-4 md:p-6">
        {instances.map((instance) => {
          const adversary = adversaries.find((a) => a.id === instance.adversaryId);
          if (!adversary) return null;
          const n = (seen.get(instance.encounterAdversaryId) ?? 0) + 1;
          seen.set(instance.encounterAdversaryId, n);
          const name = (instance.customName || adversary.name) + ((sizes.get(instance.encounterAdversaryId) ?? 1) > 1 ? ` ${n}` : '');
          return (
            <InstanceCard
              key={instance.instanceId}
              name={name}
              instance={instance}
              adversary={adversary}
              onHP={(delta) => setInstances((all) => updateInstanceHP(all, instance.instanceId, delta))}
              onStress={(delta) => setInstances((all) => updateInstanceStress(all, instance.instanceId, delta))}
            />
          );
        })}
      </main>
    </div>
  );
}

interface CardProps {
  name: string;
  instance: EncounterInstance;
  adversary: Adversary;
  onHP: (delta: number) => void;
  onStress: (delta: number) => void;
}

function InstanceCard({ name, instance, adversary, onHP, onStress }: CardProps) {
  const defeated = instance.maxHP > 0 && instance.currentHP >= instance.maxHP;
  return (
    <article className={`rounded-xl border border-line bg-panel p-4 transition-opacity ${defeated ? 'opacity-50' : ''}`}>
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className={`font-semibold ${defeated ? 'line-through' : ''}`}>{name}</h2>
        <span className="shrink-0 text-xs text-muted">
          Tier {getEffectiveTier(adversary.tier, instance.upscaling)} · {adversary.role.charAt(0) + adversary.role.slice(1).toLowerCase()}
        </span>
      </header>
      <div className="mb-5 space-y-2">
        <Track label="HP" color="bg-hp" marked={instance.currentHP} max={instance.maxHP} onChange={onHP} />
        {instance.maxStress > 0 && <Track label="Stress" color="bg-stress" marked={instance.currentStress} max={instance.maxStress} onChange={onStress} />}
      </div>
      <StatBlock adversary={adversary} upscaling={instance.upscaling} hideHpStress />
    </article>
  );
}

/** A row of boxes to mark. Tapping a box marks up to it; tapping the last marked box clears it. */
function Track({ label, color, marked, max, onChange }: { label: string; color: string; marked: number; max: number; onChange: (delta: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-xs text-muted">{label}</span>
      <div className="flex flex-1 gap-1" role="group" aria-label={label}>
        {Array.from({ length: max }, (_, i) => {
          const on = i < marked;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange((i + 1 === marked ? i : i + 1) - marked)}
              aria-label={`${label} ${i + 1}`}
              aria-pressed={on}
              className={`h-6 min-w-0 flex-1 rounded border transition-colors ${on ? `${color} border-transparent` : 'border-line bg-bg hover:border-faint'}`}
            />
          );
        })}
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">
        {marked}/{max}
      </span>
    </div>
  );
}
