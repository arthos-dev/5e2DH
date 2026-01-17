
import { useState, useMemo } from 'react'
import adversariesData from './data/adversaries.json'
import type { Adversary } from './types'
import { AdversaryCard } from './components/AdversaryCard'
import { AdversaryDetail } from './components/AdversaryDetail'
import { Filters } from './components/Filters'
import { VALID_ROLES, VALID_CATEGORIES, VALID_BIOMES, normalizeRole, normalizeCategory } from './constants'

// Cast data to aligned types if strictly needed
const allAdversaries = adversariesData as unknown as Adversary[];

function App() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState('');
  const [biome, setBiome] = useState('');
  const [tier, setTier] = useState('');
  const [selectedAdversary, setSelectedAdversary] = useState<Adversary | null>(null);

  // Use canonical lists instead of extracting from data
  const uniqueRoles = useMemo(() => [...VALID_ROLES].sort(), []);
  const uniqueCategories = useMemo(() => [...VALID_CATEGORIES].sort(), []);
  const uniqueBiomes = useMemo(() => [...VALID_BIOMES].sort(), []);

  // Filter Logic with normalization
  const filtered = useMemo(() => {
    return allAdversaries.filter(a => {
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
      return true;
    });
  }, [search, role, category, biome, tier]);

  // Pagination
  const [limit, setLimit] = useState(50);
  const visible = filtered.slice(0, limit);

  return (
    <div className="min-h-screen bg-dagger-dark flex flex-col font-sans text-gray-200 selection:bg-dagger-gold selection:text-dagger-dark">

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-dagger-gold/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-900/10 rounded-full blur-[100px]"></div>
      </div>

      <Filters
        search={search} setSearch={setSearch}
        role={role} setRole={setRole}
        category={category} setCategory={setCategory}
        biome={biome} setBiome={setBiome}
        tier={tier} setTier={setTier}
        uniqueRoles={uniqueRoles}
        uniqueCategories={uniqueCategories}
        uniqueBiomes={uniqueBiomes}
      />

      <div className="flex-1 p-4 md:p-8 overflow-y-auto z-10 relative">
        <div className="max-w-[1600px] mx-auto">

          <div className="flex justify-between items-center mb-6 px-2">
            <div className="text-sm text-gray-500 font-medium uppercase tracking-widest">
              Showing <span className="text-dagger-gold font-bold">{visible.length}</span> of {filtered.length} Results
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {visible.map(adv => (
              <div key={adv.id} className="h-full">
                <AdversaryCard adversary={adv} onClick={() => setSelectedAdversary(adv)} />
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
                  setSearch(''); setRole(''); setCategory(''); setBiome(''); setTier('');
                }}
                className="mt-6 text-dagger-gold hover:text-white underline underline-offset-4"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      <AdversaryDetail adversary={selectedAdversary} onClose={() => setSelectedAdversary(null)} />
    </div>
  )
}

export default App
