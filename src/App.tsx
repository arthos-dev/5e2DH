import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Adversary, Encounter, EncounterAdversary, RunningEncounter } from './types';
import { Library } from './components/Library';
import { AdversarySheet } from './components/AdversarySheet';
import { EncounterPanel } from './components/EncounterPanel';
import { RunView } from './components/RunView';
import { BudgetBar } from './components/ui';
import { useToast } from './hooks/useToast';
import { saveEncounter, getAllSavedEncounters, loadEncounter, deleteEncounter } from './utils/encounterStorage';
import { initializeRunningEncounter, loadFight, saveFight } from './utils/runningEncounterUtils';
import { loadEncounterFromUrl, updateUrlWithEncounter, clearEncounterHashFromUrl } from './utils/encounterUrl';
import { adversariesFor, calculateAvailableBattlePoints, calculateSpentBattlePoints, getDifficultyLevel, upgradeLegacyIds } from './utils/encounterUtils';

const blankEncounter = (): Encounter => ({ id: 'default', name: 'New Encounter', playerCount: 4, adversaries: [], battlePointModifier: 0 });
const savedNewestFirst = () => getAllSavedEncounters().sort((a, b) => b.savedAt - a.savedAt);

/** The bestiary is fetched rather than bundled (~10 MB); scripts/publish-data.js puts it in public/data/. */
const loadBestiary = (): Promise<Adversary[]> =>
  fetch(`${import.meta.env.BASE_URL}data/adversaries.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));

export default function App() {
  const toast = useToast();
  const [bestiary, setBestiary] = useState<Adversary[] | null>(null);
  const [encounter, setEncounter] = useState<Encounter>(blankEncounter);
  const [saved, setSaved] = useState(savedNewestFirst);
  const [selected, setSelected] = useState<Adversary | null>(null);
  const [running, setRunning] = useState<{ encounter: RunningEncounter; adversaries: Adversary[]; source: Encounter } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false); // mobile only
  // A #encounter= link is dropped from the URL once read, so the first sync after importing one is skipped.
  const skipUrlSync = useRef(false);

  const pool = adversariesFor(encounter, bestiary ?? []);

  const run = useCallback((enc: Encounter, all: Adversary[]) => {
    const adversaries = adversariesFor(enc, all);
    const encounter = initializeRunningEncounter(enc, adversaries);
    saveFight({ encounter: enc, running: encounter });
    setRunning({ encounter, adversaries, source: enc });
  }, []);

  const endFight = () => {
    saveFight(null);
    setRunning(null);
  };

  // Load the bestiary, then the encounter link if there is one.
  useEffect(() => {
    let alive = true;
    loadBestiary()
      .then((all) => {
        if (!alive) return;
        setBestiary(all);
        const link = loadEncounterFromUrl();
        clearEncounterHashFromUrl();
        // A fight in progress when the page was reloaded picks up where it was, unless a link starts a new one.
        const fight = !link?.autoRun && loadFight();
        if (fight) {
          const enc = upgradeLegacyIds(fight.encounter, all);
          if (!link) setEncounter(enc);
          setRunning({ encounter: fight.running, adversaries: adversariesFor(enc, all), source: enc });
        }
        if (!link) return;
        const enc = upgradeLegacyIds(link.encounter, all);
        const known = adversariesFor(enc, all);
        const found = enc.adversaries.filter((l) => known.some((a) => a.id === l.adversaryId));
        const missing = enc.adversaries.length - found.length;
        if (missing) toast(missing === 1 ? "1 adversary in the link wasn't found" : `${missing} adversaries in the link weren't found`, { tone: 'error' });
        if (!found.length && missing) return;
        const loaded = { ...enc, adversaries: found };
        skipUrlSync.current = link.source === 'hash';
        setEncounter(loaded);
        if (link.autoRun && found.length) run(loaded, all);
      })
      .catch(() => alive && (setBestiary([]), toast("Couldn't load the bestiary", { tone: 'error' })));
    return () => {
      alive = false;
    };
  }, [run, toast]);

  // The address bar always holds the current encounter, so copying it shares the encounter.
  useEffect(() => {
    if (!bestiary) return;
    if (skipUrlSync.current) skipUrlSync.current = false;
    else updateUrlWithEncounter(encounter);
  }, [encounter, bestiary]);

  /** Replace the encounter. Saved encounters save on every change. */
  const commit = (next: Encounter) => {
    setEncounter(next);
    if (next.savedEncounterId) {
      saveEncounter(next);
      setSaved(savedNewestFirst());
    }
  };
  const change = (patch: Partial<Encounter>) => commit({ ...encounter, ...patch });

  const add = (adversary: Adversary, quantity: number, upscaling: number) => {
    const line: EncounterAdversary = { id: `${adversary.id}-${Date.now()}`, adversaryId: adversary.id, quantity, upscaling };
    change({ adversaries: [...encounter.adversaries, line] });
    setSelected(null);
  };

  // One click from the list: copies share one plain line (base tier, no custom name) per adversary.
  const quickAdd = (adversary: Adversary) => {
    const plain = encounter.adversaries.find((l) => l.adversaryId === adversary.id && !l.customName && l.upscaling === 0);
    change({
      adversaries: plain
        ? encounter.adversaries.map((l) => (l === plain ? { ...l, quantity: l.quantity + 1 } : l))
        : [...encounter.adversaries, { id: `${adversary.id}-${Date.now()}`, adversaryId: adversary.id, quantity: 1, upscaling: 0 }],
    });
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of encounter.adversaries) map.set(l.adversaryId, (map.get(l.adversaryId) ?? 0) + l.quantity);
    return map;
  }, [encounter.adversaries]);

  const remove = (line: EncounterAdversary) => {
    const before = encounter;
    change({ adversaries: encounter.adversaries.filter((l) => l.id !== line.id) });
    const name = line.customName ?? pool.find((a) => a.id === line.adversaryId)?.name ?? 'adversary';
    toast(`Removed ${name}`, { action: { label: 'Undo', run: () => commit(before) } });
  };

  const save = () => {
    try {
      const savedEncounterId = saveEncounter(encounter);
      commit({ ...encounter, savedEncounterId, savedAt: Date.now() });
    } catch {
      toast("Couldn't save", { tone: 'error' });
    }
  };

  const open = (id: string) => {
    const stored = loadEncounter(id);
    if (stored) setEncounter(upgradeLegacyIds(stored, bestiary ?? []));
  };

  const startNew = () => {
    const before = encounter;
    setEncounter(blankEncounter());
    if (!before.savedEncounterId && before.adversaries.length) {
      toast(`Discarded ${before.name || 'encounter'}`, { action: { label: 'Undo', run: () => setEncounter(before) } });
    }
  };

  const removeSaved = (id: string) => {
    const target = saved.find((s) => s.savedEncounterId === id);
    if (!target) return;
    const wasCurrent = encounter.savedEncounterId === id;
    deleteEncounter(id);
    setSaved(savedNewestFirst());
    if (wasCurrent) setEncounter(blankEncounter());
    toast(`Deleted ${target.name || 'encounter'}`, {
      action: {
        label: 'Undo',
        run: () => {
          saveEncounter(target);
          setSaved(savedNewestFirst());
          if (wasCurrent) setEncounter(target);
        },
      },
    });
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Link copied');
    } catch {
      toast("Couldn't copy the link", { tone: 'error' });
    }
  };

  const closeSheet = useCallback(() => setSelected(null), []);

  if (running) {
    return (
      <RunView
        running={running.encounter}
        adversaries={running.adversaries}
        onChange={(encounter) => saveFight({ encounter: running.source, running: encounter })}
        onExit={endFight}
      />
    );
  }

  const count = encounter.adversaries.reduce((n, l) => n + l.quantity, 0);
  const available = calculateAvailableBattlePoints(encounter.playerCount, encounter.battlePointModifier);
  const spent = calculateSpentBattlePoints(encounter.adversaries, pool);
  const difficulty = getDifficultyLevel(spent, available);

  return (
    <div className="flex h-dvh">
      <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-0">
        <Library bestiary={bestiary} onSelect={setSelected} counts={counts} onQuickAdd={quickAdd} />
        <footer className="px-4 py-10 text-xs leading-relaxed text-faint md:px-6">
          Official Daggerheart adversaries and environments are from the Daggerheart SRD 2.0 (© Critical Role, LLC), via{' '}
          <a href="https://github.com/callmepartario/og-dhsrd" className="underline hover:text-muted" target="_blank" rel="noreferrer">
            Old Gus' Daggerheart SRD
          </a>
          , used under the{' '}
          <a href="https://darringtonpress.com/license/" className="underline hover:text-muted" target="_blank" rel="noreferrer">
            Darrington Press Community Gaming License
          </a>
          . This product is not affiliated with Critical Role or Darrington Press.
        </footer>
      </main>

      <aside
        className={`${panelOpen ? 'fixed inset-0 z-40 flex' : 'hidden'} flex-col bg-panel md:static md:z-auto md:flex md:w-80 md:shrink-0 md:border-l md:border-line`}
        aria-label="Encounter"
      >
        <EncounterPanel
          encounter={encounter}
          adversaries={pool}
          saved={saved}
          onChange={change}
          onRemove={remove}
          onSave={save}
          onShare={share}
          onRun={() => run(encounter, bestiary ?? [])}
          onNew={startNew}
          onOpen={open}
          onDelete={removeSaved}
          onClose={() => setPanelOpen(false)}
        />
      </aside>

      {!panelOpen && (
        <button
          className="fixed inset-x-3 bottom-3 z-30 flex h-12 overflow-hidden items-center gap-3 rounded-xl border border-line bg-panel px-4 text-sm shadow-lg md:hidden mb-[env(safe-area-inset-bottom)]"
          onClick={() => setPanelOpen(true)}
        >
          <span className="truncate font-semibold">{encounter.name || 'Untitled'}</span>
          <span className="ml-auto shrink-0 text-muted tabular-nums">
            {count} · {difficulty}
          </span>
          <BudgetBar spent={spent} available={available} className="absolute inset-x-4 bottom-1.5" />
        </button>
      )}

      {selected && (
        <AdversarySheet key={selected.id} adversary={selected} onClose={closeSheet} onAdd={(q, u) => add(selected, q, u)} />
      )}
    </div>
  );
}
