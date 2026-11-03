import type { ReactNode } from 'react';
import type { Adversary } from '../types';
import { calculateScaledStats, getEffectiveTier, scaleFeatures } from '../utils/scalingUtils';
import { wrapDiceExpressions } from '../utils/diceRoller';
import { signed, useRoll } from '../hooks/useRoll';

interface Props {
  adversary: Adversary;
  /** Tier change applied on top of the base stat block. */
  upscaling?: number;
  /** Leave HP and Stress out (the running view tracks them instead). */
  hideHpStress?: boolean;
}

/** An adversary's stats, experiences, motives and features, scaled by `upscaling`. Shared by the sheet and the running view. */
export function StatBlock({ adversary, upscaling = 0, hideHpStress }: Props) {
  const { roll, rollFromText } = useRoll();
  const base = adversary.stats;
  const stats = calculateScaledStats(adversary, upscaling);
  const tierDelta = getEffectiveTier(adversary.tier, upscaling) - adversary.tier;
  const features = scaleFeatures(adversary.features, tierDelta, adversary.role);
  const hasThresholds = stats.threshold_major !== null && stats.threshold_severe !== null;

  return (
    <div className="space-y-5 text-sm">
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <Stat label="Difficulty" changed={stats.difficulty !== base.difficulty}>
          {stats.difficulty}
        </Stat>
        {hasThresholds && (
          <Stat label="Thresholds" changed={stats.threshold_major !== base.threshold_major}>
            {stats.threshold_major}/{stats.threshold_severe}
          </Stat>
        )}
        {!hideHpStress && (
          <>
            <Stat label="HP" changed={stats.hp !== base.hp}>
              {stats.hp}
            </Stat>
            <Stat label="Stress" changed={stats.stress !== base.stress}>
              {stats.stress}
            </Stat>
          </>
        )}
        <Stat label="Attack" changed={stats.attack_mod !== base.attack_mod}>
          <button type="button" className="dice" onClick={(e) => roll(`1d20${signed(stats.attack_mod)}`, 'Attack', e.currentTarget)}>
            {signed(stats.attack_mod)}
          </button>
        </Stat>
        {stats.damage_dice && (
          <Stat label="Damage" changed={stats.damage_dice !== base.damage_dice}>
            <button type="button" className="dice text-left" onClick={(e) => roll(stats.damage_dice, 'Damage', e.currentTarget)}>
              {stats.damage_dice}
            </button>
          </Stat>
        )}
      </dl>

      {(adversary.experiences?.length || adversary.motives_tactics) && (
        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2">
          {!!adversary.experiences?.length && (
            <>
              <dt className="text-muted">Experience</dt>
              <dd>{adversary.experiences.map((x) => `${x.name} +${x.value}`).join(', ')}</dd>
            </>
          )}
          {adversary.motives_tactics && (
            <>
              <dt className="text-muted">Motives</dt>
              <dd>{adversary.motives_tactics}</dd>
            </>
          )}
        </dl>
      )}

      {features.map((feature, i) => {
        const entries = feature.entries?.length
          ? feature.entries
          : [{ name: '', description: (feature as { description?: string }).description ?? '' }];
        return (
          <section key={i} className="space-y-2">
            <h3 className="text-xs font-medium text-muted">{feature.name}</h3>
            {entries.map((entry, j) => (
              <div key={j} className="feature-text leading-relaxed" onClick={rollFromText}>
                {entry.name && <span className="font-semibold">{entry.name}. </span>}
                <span dangerouslySetInnerHTML={{ __html: featureHtml(entry.description) }} />
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Stat({ label, changed, children }: { label: string; changed?: boolean; children: ReactNode }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={`mt-0.5 text-base font-medium whitespace-nowrap tabular-nums ${changed ? 'text-accent-text' : ''}`}>{children}</dd>
    </div>
  );
}

const featureHtml = (description: string) => wrapDiceExpressions(description.replace(/\n{2,}/g, '\n\n')).replace(/\n/g, '<br/>');
