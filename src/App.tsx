
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import adversariesData from './data/adversaries.json'
import type { Adversary, Encounter, EncounterAdversary, RunningEncounter } from './types'
import { AdversaryCard } from './components/AdversaryCard'
import { AdversaryDetail } from './components/AdversaryDetail'
import { Filters } from './components/Filters'
import { EncounterDeck } from './components/EncounterDeck'
import { CustomizeAdversaryModal } from './components/CustomizeAdversaryModal'
import { RunningEncounterView } from './components/RunningEncounter'
import { ToastContainer } from './components/Toast'
import { useToast } from './hooks/useToast'
import { DiceProvider } from './contexts/DiceContext'
import { Dice3D } from './components/Dice3D'
import { debounce } from './utils/debounce'
import { VALID_ROLES, VALID_CATEGORIES, VALID_BIOMES, normalizeRole, normalizeCategory } from './constants'
import { saveEncounter, getAllSavedEncounters, loadEncounter, deleteEncounter } from './utils/encounterStorage'
import { initializeRunningEncounter } from './utils/runningEncounterUtils'
import { loadEncounterFromUrl, updateUrlWithEncounter } from './utils/encounterUrl'

// Cast data to aligned types if strictly needed
const allAdversaries = adversariesData as unknown as Adversary[];

function App() {
  const { toasts, showToast, removeToast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState('');
  const [biome, setBiome] = useState('');
  const [tier, setTier] = useState('');
  const [source, setSource] = useState('');
  const [selectedAdversary, setSelectedAdversary] = useState<Adversary | null>(null);

  // Debounced search
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setSearch(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetSearch(searchInput);
  }, [searchInput, debouncedSetSearch]);
  
  // Encounter Builder State
  const [currentEncounter, setCurrentEncounter] = useState<Encounter>({
    id: 'default',
    name: 'New Encounter',
    playerCount: 4,
    adversaries: [],
    battlePointModifier: 0,
  });
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [customizeUpscaling, setCustomizeUpscaling] = useState(0);
  
  // Saved Encounters State
  const [savedEncounters, setSavedEncounters] = useState<Encounter[]>([]);
  
  // Running Encounter State
  const [isRunningEncounter, setIsRunningEncounter] = useState(false);
  const [runningEncounter, setRunningEncounter] = useState<RunningEncounter | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'manage' | 'edit'>('edit');

  // Ref to track if we're loading from URL (to prevent infinite loop)
  const isLoadingFromUrl = useRef(false);

  // Load saved encounters on mount
  useEffect(() => {
    const saved = getAllSavedEncounters();
    setSavedEncounters(saved);
  }, []);

  // Load encounter from URL on mount
  useEffect(() => {
    const urlEncounter = loadEncounterFromUrl();
    if (urlEncounter) {
      isLoadingFromUrl.current = true;
      
      // Validate that all adversary IDs exist in current data
      const missingAdversaries = urlEncounter.adversaries.filter(
        adv => !allAdversaries.find(a => a.id === adv.adversaryId)
      );
      
      if (missingAdversaries.length > 0) {
        showToast(
          `Warning: ${missingAdversaries.length} adversary(ies) from shared encounter not found in current data`,
          'error'
        );
        // Still load the encounter, but remove missing adversaries
        urlEncounter.adversaries = urlEncounter.adversaries.filter(
          adv => allAdversaries.find(a => a.id === adv.adversaryId)
        );
      }
      
      if (urlEncounter.adversaries.length > 0 || missingAdversaries.length === 0) {
        setCurrentEncounter(urlEncounter);
        setActiveTab('edit');
        showToast(`Encounter "${urlEncounter.name}" loaded from URL`, 'success');
      } else {
        showToast('Shared encounter contains no valid adversaries', 'error');
      }
      
      // Reset flag after a short delay to allow state to update
      setTimeout(() => {
        isLoadingFromUrl.current = false;
      }, 100);
    }
  }, []); // Only run on mount

  // Automatically update URL when encounter changes (but not when loading from URL)
  useEffect(() => {
    if (!isLoadingFromUrl.current) {
      updateUrlWithEncounter(currentEncounter);
    }
  }, [currentEncounter]);


  // Use canonical lists instead of extracting from data
  const uniqueRoles = useMemo(() => [...VALID_ROLES].sort(), []);
  const uniqueCategories = useMemo(() => [...VALID_CATEGORIES].sort(), []);
  const uniqueBiomes = useMemo(() => [...VALID_BIOMES].sort(), []);
  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    allAdversaries.forEach(a => {
      if (a.source) sources.add(a.source);
    });
    return Array.from(sources).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, []);

  // Filter Logic with normalization
  const filtered = useMemo(() => {
    return allAdversaries
      .filter(a => {
        if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
        
        // Normalize role for comparison (handles ELITE → SOLO, SNIPER → RANGED, SKIRMISHER → SKULK)
        if (role) {
          const normalizedAdversaryRole = normalizeRole(a.role);
          const normalizedFilterRole = normalizeRole(role);
          if (normalizedAdversaryRole !== normalizedFilterRole) return false;
        }
        
        // Normalize category for comparison (handles "Celestial," → "Celestial", case variations, etc.)
        if (category) {
          const normalizedAdversaryCategory = normalizeCategory(a.category);
          const normalizedFilterCategory = normalizeCategory(category);
          if (normalizedAdversaryCategory !== normalizedFilterCategory) return false;
        }
        
        if (biome && (a.biome === 'Unknown' || !a.biome.includes(biome))) return false;
        if (tier && a.tier.toString() !== tier) return false;
        if (source && a.source !== source) return false;
        return true;
      })
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [search, role, category, biome, tier, source]);

  // Pagination
  const [limit, setLimit] = useState(50);
  const visible = filtered.slice(0, limit);

  // Auto-open customize modal when adversary is selected in Edit mode
  useEffect(() => {
    if (selectedAdversary && activeTab === 'edit') {
      setCustomizeModalOpen(true);
    } else if (!selectedAdversary) {
      // Close modal when no adversary is selected
      setCustomizeModalOpen(false);
    }
  }, [selectedAdversary, activeTab]);

  // Reset upscaling when adversary changes or modal closes
  useEffect(() => {
    if (!selectedAdversary || !customizeModalOpen) {
      setCustomizeUpscaling(0);
    }
  }, [selectedAdversary, customizeModalOpen]);

  // Encounter Builder Handlers
  const handleCustomizeSubmit = (quantity: number, upscaling: number, customName: string) => {
    if (!selectedAdversary) return;

    const newEncounterAdversary: EncounterAdversary = {
      id: `${selectedAdversary.id}-${Date.now()}`,
      adversaryId: selectedAdversary.id,
      customName: customName !== selectedAdversary.name ? customName : undefined,
      quantity,
      upscaling,
    };

    setCurrentEncounter(prev => ({
      ...prev,
      adversaries: [...prev.adversaries, newEncounterAdversary],
    }));

    const displayName = customName !== selectedAdversary.name ? customName : selectedAdversary.name;
    showToast(`${quantity}x ${displayName} added to encounter`, 'success');
    setCustomizeModalOpen(false);
    setSelectedAdversary(null);
    setCustomizeUpscaling(0);
  };

  const handleDeleteAdversary = (id: string) => {
    setCurrentEncounter(prev => ({
      ...prev,
      adversaries: prev.adversaries.filter(a => a.id !== id),
    }));
    showToast('Adversary removed from encounter', 'info');
  };

  const handleUpdateEncounterName = (name: string) => {
    setCurrentEncounter(prev => ({ ...prev, name }));
  };

  const handleUpdatePlayerCount = (count: number) => {
    setCurrentEncounter(prev => ({ ...prev, playerCount: Math.max(1, count) }));
  };

  // Save/Load/Run Handlers
  const handleSaveEncounter = () => {
    try {
      const savedId = saveEncounter(currentEncounter);
      const saved = getAllSavedEncounters();
      setSavedEncounters(saved);
      // Update current encounter with saved ID
      setCurrentEncounter(prev => ({
        ...prev,
        savedEncounterId: savedId,
        savedAt: Date.now(),
      }));
      showToast(`Encounter "${currentEncounter.name}" saved successfully`, 'success');
    } catch (error) {
      console.error('Failed to save encounter:', error);
      showToast('Failed to save encounter', 'error');
    }
  };

  const handleLoadEncounter = (id: string) => {
    const loaded = loadEncounter(id);
    if (loaded) {
      // Switch to Edit tab first, then load encounter immediately
      setActiveTab('edit');
      setCurrentEncounter(loaded);
      showToast(`Encounter "${loaded.name}" loaded`, 'info');
    }
  };

  const handleDeleteSavedEncounter = (id: string) => {
    try {
      const encounterToDelete = savedEncounters.find(e => e.savedEncounterId === id);
      deleteEncounter(id);
      const saved = getAllSavedEncounters();
      setSavedEncounters(saved);
      // If we deleted the currently loaded encounter, reset it
      if (currentEncounter.savedEncounterId === id) {
        setCurrentEncounter({
          id: 'default',
          name: 'New Encounter',
          playerCount: 4,
          adversaries: [],
          battlePointModifier: 0,
        });
      }
      if (encounterToDelete) {
        showToast(`Encounter "${encounterToDelete.name}" deleted`, 'info');
      }
    } catch (error) {
      console.error('Failed to delete encounter:', error);
      showToast('Failed to delete encounter', 'error');
    }
  };

  const handleRunEncounter = () => {
    if (currentEncounter.adversaries.length === 0) return;
    const running = initializeRunningEncounter(currentEncounter, allAdversaries);
    setRunningEncounter(running);
    setIsRunningEncounter(true);
  };

  // Run encounter from Manage tab (loads encounter first)
  const handleRunEncounterFromManage = (id: string) => {
    const loaded = loadEncounter(id);
    if (loaded && loaded.adversaries.length > 0) {
      const running = initializeRunningEncounter(loaded, allAdversaries);
      setRunningEncounter(running);
      setIsRunningEncounter(true);
      showToast(`Running encounter "${loaded.name}"`, 'info');
    } else {
      showToast('Cannot run encounter with no adversaries', 'error');
    }
  };

  const handleStopRunningEncounter = () => {
    setIsRunningEncounter(false);
    setRunningEncounter(null);
  };

  const handleNavigateToManage = () => {
    setIsRunningEncounter(false);
    setRunningEncounter(null);
    setActiveTab('manage');
  };

  const handleNavigateToEdit = () => {
    setIsRunningEncounter(false);
    setRunningEncounter(null);
    setActiveTab('edit');
  };

  const handleShareEncounter = async () => {
    if (currentEncounter.adversaries.length === 0) {
      showToast('Cannot share an empty encounter', 'error');
      return;
    }

    try {
      // URL is already in the address bar, just copy it
      const currentUrl = window.location.href;
      
      // Check URL length (most browsers support ~2000 chars, but we'll warn at 1500)
      if (currentUrl.length > 1500) {
        showToast('Warning: Share URL is very long and may not work in all browsers', 'error');
      }

      // Try to copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
        showToast('Encounter URL copied to clipboard!', 'success');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showToast('Encounter URL copied to clipboard!', 'success');
        } catch (err) {
          // If copy fails, show the URL in a toast
          showToast(`Share URL: ${currentUrl}`, 'info');
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to share encounter:', error);
      showToast('Failed to copy URL to clipboard', 'error');
    }
  };

  // If running encounter, show running view
  if (isRunningEncounter && runningEncounter) {
    return (
      <DiceProvider>
        <RunningEncounterView
          runningEncounter={runningEncounter}
          allAdversaries={allAdversaries}
          onClose={handleStopRunningEncounter}
          onNavigateToManage={handleNavigateToManage}
          onNavigateToEdit={handleNavigateToEdit}
          showToast={showToast}
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <Dice3D />
      </DiceProvider>
    );
  }

  return (
    <DiceProvider>
      <div className="min-h-screen bg-dagger-dark flex flex-col font-sans text-gray-200 selection:bg-dagger-gold selection:text-dagger-dark">
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-dagger-gold/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-dagger-panel border-b border-dagger-gold/20 sticky top-0 z-20 shadow-lg backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto py-3 px-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-2 rounded border font-serif font-bold tracking-widest uppercase text-sm transition-all duration-300 text-center ${
                activeTab === 'manage'
                  ? 'bg-dagger-gold text-dagger-dark border-dagger-gold'
                  : 'bg-dagger-panel text-dagger-gold border-dagger-gold/30 hover:border-dagger-gold hover:bg-dagger-surface'
              }`}
            >
              Manage
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-6 py-2 rounded border font-serif font-bold tracking-widest uppercase text-sm transition-all duration-300 text-center ${
                activeTab === 'edit'
                  ? 'bg-dagger-gold text-dagger-dark border-dagger-gold'
                  : 'bg-dagger-panel text-dagger-gold border-dagger-gold/30 hover:border-dagger-gold hover:bg-dagger-surface'
              }`}
            >
              Edit
            </button>
          </div>
          {/* Filters - only show in Edit tab */}
          {activeTab === 'edit' && (
            <Filters
              search={searchInput} setSearch={setSearchInput}
              role={role} setRole={setRole}
              category={category} setCategory={setCategory}
              biome={biome} setBiome={setBiome}
              tier={tier} setTier={setTier}
              source={source} setSource={setSource}
              uniqueRoles={uniqueRoles}
              uniqueCategories={uniqueCategories}
              uniqueBiomes={uniqueBiomes}
              uniqueSources={uniqueSources}
            />
          )}
        </div>
      </div>

      <main id="main-content" className={`flex-1 p-4 md:p-8 overflow-y-auto z-10 relative ${activeTab === 'edit' ? 'mr-80 max-md:mr-0' : ''}`}>
        <div className="max-w-[1600px] mx-auto">
          {activeTab === 'manage' ? (
            /* Manage Tab View */
            <div>
              <div className="flex justify-between items-center mb-6 px-2">
                <div className="text-sm text-gray-500 font-medium uppercase tracking-widest">
                  <span className="text-dagger-gold font-bold">{savedEncounters.length}</span> Saved Encounter{savedEncounters.length !== 1 ? 's' : ''}
                </div>
              </div>

              {savedEncounters.length === 0 ? (
                <div className="text-center mt-20 p-10 border-2 border-dashed border-gray-700 rounded-xl bg-white/5">
                  <div className="text-6xl mb-4 opacity-50">📋</div>
                  <h3 className="text-xl font-serif font-bold text-gray-300 mb-2">No Saved Encounters</h3>
                  <p className="text-gray-500">Switch to Edit tab to build and save encounters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedEncounters.map((encounter) => (
                    <div
                      key={encounter.savedEncounterId}
                      className="bg-dagger-panel border border-dagger-gold/20 rounded-xl p-6 hover:border-dagger-gold/60 transition-all duration-300 flex flex-col"
                    >
                      <div className="flex-1 mb-4">
                        <h3 className="font-serif font-bold text-xl text-dagger-light mb-2">
                          {encounter.name}
                        </h3>
                        <div className="text-sm text-gray-500">
                          {encounter.adversaries.length} Adversar{encounter.adversaries.length !== 1 ? 'ies' : 'y'}
                          {encounter.playerCount && (
                            <span className="ml-2">• {encounter.playerCount} Player{encounter.playerCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRunEncounterFromManage(encounter.savedEncounterId!)}
                          className="flex-1 px-4 py-2 bg-dagger-gold text-dagger-dark border border-dagger-gold rounded hover:bg-dagger-gold-light font-serif font-bold tracking-widest uppercase text-sm transition-colors"
                        >
                          Run
                        </button>
                        <button
                          onClick={() => handleLoadEncounter(encounter.savedEncounterId!)}
                          className="w-10 h-10 flex items-center justify-center bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded hover:bg-blue-600/40 font-serif font-bold tracking-widest uppercase text-sm transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteSavedEncounter(encounter.savedEncounterId!)}
                          className="w-10 h-10 flex items-center justify-center bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/40 font-serif font-bold tracking-widest uppercase text-sm transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Edit Tab View */
            <>
              <div className="flex justify-between items-center mb-6 px-2">
                <div className="text-sm text-gray-500 font-medium uppercase tracking-widest">
                  Showing <span className="text-dagger-gold font-bold">{visible.length}</span> of {filtered.length} Results
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {visible.map(adv => (
                  <div key={adv.id} className="h-full">
                    <AdversaryCard adversary={adv} onClick={() => setSelectedAdversary(adv)} showToast={showToast} />
                  </div>
                ))}
              </div>

              {visible.length < filtered.length && (
                <div className="mt-12 flex justify-center pb-8">
                  <button
                    className="group relative px-8 py-3 bg-dagger-panel border border-dagger-gold/30 text-dagger-gold font-serif font-bold tracking-widest uppercase hover:bg-dagger-gold hover:text-dagger-dark transition-all duration-300 rounded overflow-hidden"
                    onClick={() => setLimit(l => l + 50)}
                  >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
                    Load More Adversaries ({filtered.length - visible.length} remaining)
                  </button>
                </div>
              )}

              {filtered.length === 0 && (
                <div className="text-center mt-20 p-10 border-2 border-dashed border-gray-700 rounded-xl bg-white/5">
                  <div className="text-6xl mb-4 opacity-50">🐉</div>
                  <h3 className="text-xl font-serif font-bold text-gray-300 mb-2">No Adversaries Found</h3>
                  <p className="text-gray-500">Try adjusting your filters or search terms.</p>
                  <button
                    onClick={() => {
                      setSearchInput(''); setRole(''); setCategory(''); setBiome(''); setTier(''); setSource('');
                    }}
                    className="mt-6 text-dagger-gold hover:text-white underline underline-offset-4"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Side-by-side layout for Edit mode */}
      {selectedAdversary && activeTab === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-stretch p-4 gap-4">
          {/* Shared backdrop */}
          <div 
            className="absolute inset-0 bg-dagger-dark/90 backdrop-blur-sm transition-opacity" 
            onClick={() => {
              setSelectedAdversary(null);
              setCustomizeModalOpen(false);
              setCustomizeUpscaling(0);
            }}
          />
          
          {/* Side-by-side container */}
          <div className="relative flex gap-4 w-full max-w-[1600px] mx-auto items-stretch">
            <AdversaryDetail 
              adversary={selectedAdversary} 
              onClose={() => {
                setSelectedAdversary(null);
                setCustomizeModalOpen(false);
                setCustomizeUpscaling(0);
              }}
              isEncounterBuilderActive={true}
              sideBySideMode={true}
              upscaling={customizeUpscaling}
              showToast={showToast}
            />
            {customizeModalOpen && (
              <CustomizeAdversaryModal
                adversary={selectedAdversary}
                onClose={() => setCustomizeModalOpen(false)}
                onAdd={handleCustomizeSubmit}
                sideBySideMode={true}
                upscaling={customizeUpscaling}
                onUpscalingChange={setCustomizeUpscaling}
              />
            )}
          </div>
        </div>
      )}

      {/* Original modal behavior for Manage tab */}
      {selectedAdversary && activeTab !== 'edit' && (
        <AdversaryDetail 
          adversary={selectedAdversary} 
          onClose={() => {
            setSelectedAdversary(null);
            setCustomizeModalOpen(false);
          }}
          isEncounterBuilderActive={false}
          onAddToEncounter={undefined}
          showToast={showToast}
        />
      )}

      {/* Standalone customize modal (only if not in side-by-side mode) */}
      {customizeModalOpen && selectedAdversary && activeTab !== 'edit' && (
        <CustomizeAdversaryModal
          adversary={selectedAdversary}
          onClose={() => {
            setCustomizeModalOpen(false);
            setCustomizeUpscaling(0);
          }}
          onAdd={handleCustomizeSubmit}
          upscaling={customizeUpscaling}
          onUpscalingChange={setCustomizeUpscaling}
        />
      )}

      {/* EncounterDeck always visible in Edit mode */}
      {activeTab === 'edit' && (
        <EncounterDeck
          encounter={currentEncounter}
          allAdversaries={allAdversaries}
          onClose={() => {}} // No close button needed since it's always visible in Edit mode
          onUpdateEncounterName={handleUpdateEncounterName}
          onUpdatePlayerCount={handleUpdatePlayerCount}
          onDeleteAdversary={handleDeleteAdversary}
          onSaveEncounter={handleSaveEncounter}
          onRunEncounter={handleRunEncounter}
          savedEncounters={savedEncounters}
          onLoadEncounter={handleLoadEncounter}
          onDeleteSavedEncounter={handleDeleteSavedEncounter}
          onShareEncounter={handleShareEncounter}
          showToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Dice3D />
      </div>
    </DiceProvider>
  )
}

export default App
