import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { Adversary } from '../types';
import { VALID_BIOMES, VALID_CATEGORIES, VALID_ROLES, normalizeCategory, normalizeRole } from '../constants';
import { signed, useRoll } from '../hooks/useRoll';
import { getBattlePointsForRole } from '../utils/encounterUtils';
import { Icon } from './ui';

interface Props {
  bestiary: Adversary[] | null;
  onSelect: (adversary: Adversary) => void;
  /** How many of each adversary (by id) the encounter holds. */
  counts: Map<string, number>;
  /** Adds one at base tier, without opening the sheet. */
  onQuickAdd: (adversary: Adversary) => void;
}

const PAGE = 100;
const EMPTY = { role: '', category: '', biome: '', tier: '', source: '' };
type FilterState = typeof EMPTY;

const SOURCE_NAMES: Record<string, string> = { DND5e: 'D&D 5e', Daggerheart: 'Daggerheart' };
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

const FILTERS: { key: keyof FilterState; name: string; options: (bestiary: Adversary[]) => [string, string][] }[] = [
  { key: 'tier', name: 'Tier', options: () => ['1', '2', '3', '4'].map((t) => [t, `Tier ${t}`]) },
  { key: 'role', name: 'Role', options: () => [...VALID_ROLES].sort().map((r) => [r, titleCase(r)]) },
  { key: 'category', name: 'Type', options: () => [...VALID_CATEGORIES].sort().map((c) => [c, c]) },
  { key: 'biome', name: 'Biome', options: () => [...VALID_BIOMES].sort().map((b) => [b, b]) },
  {
    key: 'source',
    name: 'Source',
    options: (bestiary) => [...new Set(bestiary.map((a) => a.source).filter(Boolean))].sort().map((s) => [s, SOURCE_NAMES[s] ?? s]),
  },
];

// Columns: name, role, tier, difficulty, HP, attack, add. Role is hidden on narrow screens.
const ROW = 'grid grid-cols-[minmax(0,1fr)_2rem_2.5rem_2.5rem_2.5rem_2.25rem] items-center gap-3 px-4 md:grid-cols-[minmax(0,1fr)_6rem_2rem_2.5rem_2.5rem_2.5rem_2.25rem] md:px-6 md:pr-4';

/** Search, filters and the adversary list. */
export function Library({ bestiary, onSelect, counts, onQuickAdd }: Props) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY);
  const search = useDeferredValue(query.trim().toLowerCase());
  const searchRef = useRef<HTMLInputElement>(null);
  const { roll } = useRoll();

  const results = useMemo(() => {
    if (!bestiary) return [];
    const { role, category, biome, tier, source } = filters;
    return bestiary
      .filter(
        (a) =>
          (!search || a.name.toLowerCase().includes(search)) &&
          (!role || normalizeRole(a.role) === role) &&
          (!category || normalizeCategory(a.category) === category) &&
          (!biome || (a.biome !== 'Unknown' && a.biome.includes(biome))) &&
          (!tier || String(a.tier) === tier) &&
          (!source || a.source === source),
      )
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [bestiary, search, filters]);

  // Render the list a page at a time; the next page loads as its end scrolls into view.
  const resultsKey = `${search}|${Object.values(filters).join('|')}`;
  const [page, setPage] = useState({ key: resultsKey, count: PAGE });
  const count = page.key === resultsKey ? page.count : PAGE;
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPage({ key: resultsKey, count: count + PAGE });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resultsKey, count]);

  // "/" focuses search, as in most list apps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]');
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const filtered = query !== '' || Object.values(filters).some(Boolean);
  const clear = () => {
    setQuery('');
    setFilters(EMPTY);
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-6">
          <label className="relative w-full sm:w-auto sm:flex-1 sm:basis-56">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              placeholder="Search"
              aria-label="Search adversaries"
              className="field w-full pl-8"
            />
          </label>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {FILTERS.map(({ key, name, options }) => (
              <select
                key={key}
                value={filters[key]}
                onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                aria-label={name}
                className={`select field max-w-40 shrink-0 ${filters[key] ? 'border-fg/30 text-fg' : 'text-muted'}`}
              >
                <option value="">{name}</option>
                {options(bestiary ?? []).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            ))}
            {filtered && (
              <button className="btn btn-ghost" onClick={clear}>
                Clear
              </button>
            )}
          </div>
        </div>
        <div className={`${ROW} pb-2 text-xs text-faint`} aria-hidden="true">
          <span>Name</span>
          <span className="hidden md:block">Role</span>
          <span className="text-right">Tier</span>
          <span className="text-right">Diff</span>
          <span className="text-right">HP</span>
          <span className="text-right">Atk</span>
          <span />
        </div>
      </div>

      {bestiary && results.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-24 text-sm text-muted">
          No adversaries
          {filtered && (
            <button className="btn btn-ghost" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      )}

      <ul className="py-1">
        {results.slice(0, count).map((a) => (
          <li key={a.id} className={`${ROW} relative h-10 text-sm hover:bg-hover`}>
            <button className="truncate text-left after:absolute after:inset-0" onClick={() => onSelect(a)}>
              {a.name}
            </button>
            <span className="hidden truncate text-muted md:block">{titleCase(a.role)}</span>
            <span className="text-right text-muted tabular-nums">{a.tier}</span>
            <span className="text-right tabular-nums">{a.stats.difficulty}</span>
            <span className="text-right tabular-nums">{a.stats.hp}</span>
            <button
              className="dice relative text-right tabular-nums"
              onClick={(e) => roll(`1d20${signed(a.stats.attack_mod)}`, `${a.name} attack`, e.currentTarget)}
              aria-label={`Roll ${a.name} attack ${signed(a.stats.attack_mod)}`}
            >
              {signed(a.stats.attack_mod)}
            </button>
            <QuickAdd adversary={a} count={counts.get(a.id) ?? 0} onAdd={onQuickAdd} />
          </li>
        ))}
      </ul>
      {count < results.length && <div ref={end} className="h-10" />}
    </>
  );
}

/** Adds one to the encounter; shows how many are in it once added. */
function QuickAdd({ adversary, count, onAdd }: { adversary: Adversary; count: number; onAdd: (a: Adversary) => void }) {
  const cost = getBattlePointsForRole(adversary.role);
  return (
    <button
      className={`btn btn-icon relative justify-self-end tabular-nums ${count ? 'bg-accent text-accent-fg hover:brightness-105' : 'btn-ghost'}`}
      onClick={() => onAdd(adversary)}
      aria-label={`Add ${adversary.name} (${cost} battle points)${count ? `, ${count} in encounter` : ''}`}
      title={`Add · ${cost} BP`}
    >
      {count ? count : <Icon name="plus" />}
    </button>
  );
}
