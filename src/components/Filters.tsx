
import React from 'react';

interface Props {
    search: string;
    setSearch: (v: string) => void;
    role: string;
    setRole: (v: string) => void;
    category: string;
    setCategory: (v: string) => void;
    biome: string;
    setBiome: (v: string) => void;
    tier: string;
    setTier: (v: string) => void;
    uniqueRoles: string[];
    uniqueCategories: string[];
    uniqueBiomes: string[];
}

export const Filters: React.FC<Props> = ({
    search, setSearch,
    role, setRole,
    category, setCategory,
    biome, setBiome,
    tier, setTier,
    uniqueRoles, uniqueCategories, uniqueBiomes
}) => {
    return (
        <div className="sticky top-0 z-20">
            <div className="max-w-7xl mx-auto flex flex-col gap-2">
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-dagger-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            className="block w-full pl-9 pr-9 py-1.5 bg-dagger-surface border border-dagger-gold/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-dagger-gold text-dagger-light placeholder-dagger-light-dim transition-all shadow-inner text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search adversaries by name"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-dagger-gold transition-colors"
                                aria-label="Clear search"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <FilterSelect
                        value={role}
                        onChange={setRole}
                        options={uniqueRoles}
                        placeholder="All Roles"
                        isActive={!!role}
                    />

                    <FilterSelect
                        value={category}
                        onChange={setCategory}
                        options={uniqueCategories}
                        placeholder="All Categories"
                        isActive={!!category}
                    />

                    <FilterSelect
                        value={biome}
                        onChange={setBiome}
                        options={uniqueBiomes}
                        placeholder="All Biomes"
                        isActive={!!biome}
                    />

                    <div className="h-6 w-px bg-white/10 mx-1 hidden md:block"></div>

                    <div className="flex bg-dagger-surface rounded-lg p-1 gap-1 border border-dagger-gold/20">
                        {['1', '2', '3', '4'].map(t => (
                            <button
                                key={t}
                                className={`w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition-all duration-300 font-serif
                                    ${tier === t
                                        ? 'bg-dagger-gold text-dagger-dark shadow-glow'
                                        : 'text-dagger-light-dim hover:bg-white/5 hover:text-dagger-gold'}`}
                                onClick={() => setTier(tier === t ? '' : t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {(role || category || biome || tier || search) && (
                        <button
                            onClick={() => {
                                setSearch(''); setRole(''); setCategory(''); setBiome(''); setTier('');
                            }}
                            className="text-xs text-red-400 hover:text-red-300 uppercase tracking-wider font-bold px-2"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const FilterSelect = ({ value, onChange, options, placeholder, isActive }: { value: string, onChange: (v: string) => void, options: string[], placeholder: string, isActive?: boolean }) => (
    <div className="relative group">
        <select
            className={`appearance-none text-dagger-light text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-dagger-gold focus:ring-1 focus:ring-dagger-gold hover:border-dagger-gold/60 transition-colors cursor-pointer min-w-[120px] ${
                isActive 
                    ? 'bg-dagger-gold/20 border-dagger-gold/50 text-dagger-gold font-semibold' 
                    : 'bg-dagger-surface border border-dagger-gold/30'
            }`}
            value={value}
            onChange={e => onChange(e.target.value)}
            aria-label={placeholder}
        >
            <option value="">{placeholder}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-dagger-gold">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
        </div>
    </div>
);
