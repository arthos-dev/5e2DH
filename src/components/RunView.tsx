import { useEffect, useRef, useState } from 'react';
import type { Adversary, EncounterInstance, RunningEncounter } from '../types';
import { hitFor, minionSpill, updateInstanceHP, updateInstanceStress } from '../utils/runningEncounterUtils';
import { calculateScaledStats, getEffectiveTier } from '../utils/scalingUtils';
import { useToast } from '../hooks/useToast';
import { StatBlock } from './StatBlock';
import { Icon } from './ui';

interface Props {
  running: RunningEncounter;
  /** The bestiary plus the encounter's own stat blocks. */
  adversaries: Adversary[];
  /** Every change to the fight, so it can be kept across reloads. */
  onChange: (running: RunningEncounter) => void;
  onExit: () => void;
}

const MAX_FEAR = 12;
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** One line of the encounter: an adversary and its copies in the fight. */
interface Group {
  id: string;
  name: string;
  adversary: Adversary;
  instances: EncounterInstance[];
}

const isDefeated = (i: EncounterInstance) => i.maxHP > 0 && i.currentHP >= i.maxHP;

/**
 * The fight. A roster on the left: every adversary grouped by line, each copy with HP and Stress to mark and a damage box
 * that applies the thresholds. The focused adversary's stat block on the right (inline on phones). The GM's Fear on top.
 */
export function RunView({ running, adversaries, onChange, onExit }: Props) {
  const toast = useToast();
  const [fight, setFight] = useState(running);
  const [focus, setFocus] = useState(running.instances[0]?.encounterAdversaryId ?? '');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set()); // phones: stat blocks opened inline
  const [lastHit, setLastHit] = useState<{ id: string; n: number } | null>(null);

  const report = useRef(onChange);
  useEffect(() => {
    report.current = onChange;
  });
  useEffect(() => report.current(fight), [fight]);

  const groups: Group[] = [];
  for (const instance of fight.instances) {
    let group = groups.find((g) => g.id === instance.encounterAdversaryId);
    if (!group) {
      const adversary = adversaries.find((a) => a.id === instance.adversaryId);
      if (!adversary) continue;
      group = { id: instance.encounterAdversaryId, name: instance.customName || adversary.name, adversary, instances: [] };
      groups.push(group);
    }
    group.instances.push(instance);
  }
  const focused = groups.find((g) => g.id === focus) ?? groups[0];
  const total = fight.instances.length;
  const standing = fight.instances.filter((i) => !isDefeated(i)).length;
  const fear = fight.fear ?? 0;

  const setInstances = (update: (all: EncounterInstance[]) => EncounterInstance[]) => setFight((f) => ({ ...f, instances: update(f.instances) }));
  const setFear = (n: number) => setFight((f) => ({ ...f, fear: Math.max(0, Math.min(MAX_FEAR, n)) }));

  const select = (id: string) => {
    setFocus(id);
    setExpanded((open) => {
      const next = new Set(open);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const damage = (group: Group, instance: EncounterInstance, label: string, amount: number) => {
    const hit = hitFor(instance, amount);
    if (!hit.hp) return;
    const before = fight;
    const marked = Math.min(hit.hp, instance.maxHP - instance.currentHP);
    setInstances((all) => updateInstanceHP(all, instance.instanceId, hit.hp));
    setLastHit((h) => ({ id: instance.instanceId, n: (h?.n ?? 0) + 1 }));

    const down = instance.currentHP + hit.hp >= instance.maxHP;
    let message: string;
    if (hit.severity === 'minion') {
      const spill = minionSpill(group.adversary);
      const more = spill ? Math.floor(amount / spill) : 0;
      message = `${label} defeated` + (more ? ` · ${amount} damage takes ${more} more in range` : '');
    } else {
      message = `${label} takes ${amount} · ${titleCase(hit.severity)}, ${marked} HP` + (down ? ' · defeated' : '');
    }
    toast(message, { action: { label: 'Undo', run: () => setFight(before) } });
  };

  return (
    <div className="flex min-h-dvh flex-col md:h-dvh">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-bg/90 px-2 py-2 backdrop-blur md:px-4">
        <button className="btn btn-ghost btn-icon" onClick={onExit} aria-label="End fight" title="End fight">
          <Icon name="back" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-semibold">{fight.name || 'Untitled'}</h1>
        <span className="text-sm text-muted tabular-nums" aria-live="polite">
          {standing ? `${standing}/${total} standing` : 'All defeated'}
        </span>
        <FearTracker fear={fear} onChange={setFear} />
      </header>

      {standing === 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-accent/10 px-4 py-3 text-sm md:px-6">
          <span>
            <span className="font-semibold">Victory.</span> Every adversary is down.
          </span>
          <button className="btn btn-primary" onClick={onExit}>
            End fight
          </button>
        </div>
      )}

      <div className="flex-1 md:grid md:min-h-0 md:grid-cols-[minmax(22rem,30rem)_1fr]">
        <main className="space-y-3 p-3 md:overflow-y-auto md:border-r md:border-line md:p-4" aria-label="Adversaries">
          {groups.map((group) => {
            const up = group.instances.filter((i) => !isDefeated(i)).length;
            const first = group.instances[0];
            const active = focused?.id === group.id;
            const open = expanded.has(group.id);
            return (
              <section
                key={group.id}
                className={`rounded-xl border bg-panel transition-colors border-line ${active ? 'md:border-accent/60' : ''} ${up ? '' : 'opacity-60'}`}
              >
                <button
                  className="flex w-full items-start gap-3 rounded-t-xl px-4 pt-3 pb-2 text-left"
                  onClick={() => select(group.id)}
                  aria-expanded={open}
                  aria-controls={`stats-${group.id}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-semibold ${up ? '' : 'line-through'}`}>{group.name}</span>
                    <span className="mt-0.5 block text-xs text-muted tabular-nums">
                      Tier {getEffectiveTier(group.adversary.tier, first.upscaling)} · {titleCase(group.adversary.role)} · Diff{' '}
                      <span className="text-fg">{calculateScaledStats(group.adversary, first.upscaling).difficulty}</span>
                      {first.thresholdMajor !== null && first.thresholdSevere !== null && (
                        <>
                          {' '}
                          · Major <span className="text-fg">{first.thresholdMajor}</span> · Severe <span className="text-fg">{first.thresholdSevere}</span>
                        </>
                      )}
                    </span>
                  </span>
                  {group.instances.length > 1 && (
                    <span className="mt-0.5 shrink-0 text-xs text-muted tabular-nums">
                      {up}/{group.instances.length}
                    </span>
                  )}
                  <Icon name="back" className={`mt-1 size-4 shrink-0 text-faint transition-transform md:hidden ${open ? 'rotate-90' : '-rotate-90'}`} />
                </button>

                <ul className="divide-y divide-line border-t border-line">
                  {group.instances.map((instance, n) => {
                    const label = group.instances.length > 1 ? `${group.name} ${n + 1}` : group.name;
                    return (
                      <InstanceRow
                        key={instance.instanceId}
                        index={group.instances.length > 1 ? n + 1 : null}
                        label={label}
                        instance={instance}
                        flash={lastHit?.id === instance.instanceId ? lastHit.n : 0}
                        onHP={(delta) => setInstances((all) => updateInstanceHP(all, instance.instanceId, delta))}
                        onStress={(delta) => setInstances((all) => updateInstanceStress(all, instance.instanceId, delta))}
                        onDamage={(amount) => damage(group, instance, label, amount)}
                      />
                    );
                  })}
                </ul>

                {open && (
                  <div id={`stats-${group.id}`} className="border-t border-line px-4 py-4 md:hidden">
                    <StatBlock adversary={group.adversary} upscaling={first.upscaling} hideHpStress />
                  </div>
                )}
              </section>
            );
          })}
        </main>

        {focused && (
          <aside className="hidden md:block md:overflow-y-auto" aria-label={`${focused.name} stat block`}>
            <div className="mx-auto max-w-3xl px-6 py-5">
              <h2 className="text-lg font-semibold">{focused.name}</h2>
              <p className="mt-0.5 mb-5 text-sm text-muted first-letter:uppercase">
                {[titleCase(focused.adversary.role), focused.adversary.category, focused.adversary.biome !== 'Unknown' && focused.adversary.biome]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {focused.adversary.description && <p className="mb-5 text-sm text-muted italic">{focused.adversary.description}</p>}
              <StatBlock adversary={focused.adversary} upscaling={focused.instances[0].upscaling} hideHpStress />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  /** "1", "2"… when the line has more than one copy. */
  index: number | null;
  label: string;
  instance: EncounterInstance;
  /** Changes on every hit to this copy, to replay the flash. */
  flash: number;
  onHP: (delta: number) => void;
  onStress: (delta: number) => void;
  onDamage: (amount: number) => void;
}

/** One copy in the fight: HP and Stress to mark by hand, and a box to type the damage it takes. */
function InstanceRow({ index, label, instance, flash, onHP, onStress, onDamage }: RowProps) {
  const [value, setValue] = useState('');
  const defeated = isDefeated(instance);
  const submit = () => {
    const amount = parseInt(value, 10);
    if (amount > 0) onDamage(amount);
    setValue('');
  };

  return (
    <li key={flash} className={`flex items-center gap-3 px-4 py-2.5 ${flash ? 'animate-hit' : ''}`}>
      {index !== null && (
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums ${defeated ? 'bg-line text-faint line-through' : 'bg-hover text-muted'}`}
          aria-hidden="true"
        >
          {index}
        </span>
      )}
      <div className={`min-w-0 flex-1 space-y-1.5 ${defeated ? 'opacity-50' : ''}`}>
        <Track label="HP" name={label} color="bg-hp" marked={instance.currentHP} max={instance.maxHP} onChange={onHP} />
        {instance.maxStress > 0 && (
          <Track label="Stress" name={label} color="bg-stress" marked={instance.currentStress} max={instance.maxStress} onChange={onStress} />
        )}
      </div>
      <form
        className="shrink-0"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          inputMode="numeric"
          enterKeyHint="done"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={() => value && submit()}
          disabled={defeated}
          placeholder="Dmg"
          aria-label={`Damage to ${label}`}
          title="Type the damage and press Enter: thresholds decide how much HP is marked"
          className="field w-16 text-center tabular-nums disabled:opacity-40"
        />
      </form>
    </li>
  );
}

/** A row of boxes to mark. Tapping a box marks up to it; tapping the last marked box clears it. */
function Track({ label, name, color, marked, max, onChange }: { label: string; name: string; color: string; marked: number; max: number; onChange: (delta: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-[11px] text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 gap-1" role="group" aria-label={`${name} ${label}`}>
        {Array.from({ length: max }, (_, i) => {
          const on = i < marked;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange((i + 1 === marked ? i : i + 1) - marked)}
              aria-label={`${label} ${i + 1}`}
              aria-pressed={on}
              className={`h-5 min-w-0 flex-1 rounded-sm border transition-colors duration-300 ${on ? `${color} border-transparent` : 'border-line bg-bg hover:border-faint'}`}
            />
          );
        })}
      </div>
      <span className="w-8 shrink-0 text-right text-[11px] text-muted tabular-nums">
        {marked}/{max}
      </span>
    </div>
  );
}

/** The GM's Fear, 0–12. Tap a pip to set it; tap the last lit pip to drop one. */
function FearTracker({ fear, onChange }: { fear: number; onChange: (n: number) => void }) {
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto" role="group" aria-label={`Fear ${fear} of ${MAX_FEAR}`}>
      <button className="btn btn-ghost btn-icon" onClick={() => onChange(fear - 1)} disabled={fear <= 0} aria-label="Spend a Fear" title="Spend a Fear">
        <Icon name="minus" className="size-3.5" />
      </button>
      <div className="flex flex-1 gap-1 sm:flex-none">
        {Array.from({ length: MAX_FEAR }, (_, i) => {
          const on = i < fear;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i + 1 === fear ? i : i + 1)}
              aria-label={`Fear ${i + 1}`}
              aria-pressed={on}
              className={`h-4 min-w-0 flex-1 rounded-full transition-colors sm:w-3 sm:flex-none ${on ? 'bg-fear shadow-[0_0_8px_var(--fear)]' : 'bg-line hover:bg-faint'}`}
            />
          );
        })}
      </div>
      <button className="btn btn-ghost btn-icon" onClick={() => onChange(fear + 1)} disabled={fear >= MAX_FEAR} aria-label="Gain a Fear" title="Gain a Fear">
        <Icon name="plus" className="size-3.5" />
      </button>
      <span className="w-14 text-sm tabular-nums">
        <span className="text-muted">Fear</span> <span className="font-semibold text-fear">{fear}</span>
      </span>
    </div>
  );
}
