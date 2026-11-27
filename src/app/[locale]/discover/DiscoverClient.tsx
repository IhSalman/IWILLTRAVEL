'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import {
    Search, MapPin, DollarSign, Thermometer, Compass,
    Shield, Wifi, Sparkles, ArrowRight, ArrowUpDown
} from 'lucide-react';
import { Link } from '@/i18n/routing';

const CATEGORIES = [
    'All', 'Cultural', 'Historic', 'Urban', 'Beach', 'Nature',
    'Adventure', 'Food', 'Romantic', 'Digital Nomad', 'Budget', 'Luxury', 'Tropical'
];

type SortOption = 'recommended' | 'cost-asc' | 'safety-desc' | 'wifi-desc';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
    { id: 'recommended', label: 'Curated' },
    { id: 'cost-asc', label: 'Lowest Cost' },
    { id: 'safety-desc', label: 'Highest Safety' },
    { id: 'wifi-desc', label: 'Fastest Wi-Fi' },
];

export default function DiscoverClient({ destinations }: { destinations: any[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [sortBy, setSortBy] = useState<SortOption>('recommended');

    const filteredDestinations = useMemo(() => {
        const list = destinations.filter((dest) => {
            const q = searchQuery.trim().toLowerCase();
            const matchesSearch =
                !q ||
                dest.name.toLowerCase().includes(q) ||
                dest.country.toLowerCase().includes(q) ||
                (dest.tags && dest.tags.some((t: string) => t.toLowerCase().includes(q)));
            const matchesCategory =
                activeCategory === 'All' ||
                (dest.tags && dest.tags.some((t: string) => t.toLowerCase() === activeCategory.toLowerCase()));
            return matchesSearch && matchesCategory;
        });

        if (sortBy === 'cost-asc') {
            return [...list].sort((a, b) => (a.cost || 0) - (b.cost || 0));
        }
        if (sortBy === 'safety-desc') {
            return [...list].sort((a, b) => (b.safety || 0) - (a.safety || 0));
        }
        if (sortBy === 'wifi-desc') {
            return [...list].sort((a, b) => (b.internet || 0) - (a.internet || 0));
        }
        return list;
    }, [destinations, searchQuery, activeCategory, sortBy]);

    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-100 py-16 md:py-20 font-body">
            {/* Ambient Spatial Lighting */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 right-1/4 w-[520px] h-[360px] bg-sky-500/[0.06] rounded-full blur-[140px]" />
                <div className="absolute bottom-0 left-1/4 w-[520px] h-[360px] bg-amber-400/[0.04] rounded-full blur-[140px]" />
            </div>

            <div className="container relative z-10 max-w-7xl mx-auto px-4 md:px-8">

                {/* Header & Search */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-6">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-glass-pill text-xs font-mono text-sky-300 mb-4">
                            <Compass className="w-3.5 h-3.5" />
                            <span>Global Destination Intelligence</span>
                        </div>
                        <motion.h1
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-6xl font-heading font-bold tracking-tight mb-3 text-white"
                        >
                            Discover Destinations
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                            className="text-slate-300/85 text-sm md:text-base leading-relaxed"
                        >
                            Compare daily travel costs, safety scores, climate, and Wi-Fi speeds—or launch an 8-agent itinerary for any city on Earth.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14 }}
                        className="relative w-full lg:w-[400px]"
                    >
                        <div className="apple-liquid-glass rounded-full flex items-center px-4 h-12 focus-within:border-white/25 transition-colors">
                            <Search className="h-4 w-4 text-sky-300 flex-shrink-0 mr-3" />
                            <Input
                                placeholder="Search city, country, or vibe…"
                                aria-label="Search destinations"
                                className="border-0 bg-transparent p-0 h-full text-sm text-white placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="text-xs text-slate-400 hover:text-white ml-2"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Filter Categories & Traveler Sort Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    {/* Categories */}
                    <div className="flex overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {CATEGORIES.map((category) => {
                            const isActive = activeCategory === category;
                            return (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => setActiveCategory(category)}
                                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                                        isActive
                                            ? 'btn-apple-primary'
                                            : 'apple-glass-pill text-slate-300 hover:text-white hover:border-white/25'
                                    }`}
                                >
                                    {category}
                                </button>
                            );
                        })}
                    </div>

                    {/* Sort Segmented Pill */}
                    <div className="inline-flex items-center gap-1 p-1 rounded-full apple-liquid-glass self-start md:self-auto flex-shrink-0">
                        <span className="pl-2.5 pr-1 text-[11px] font-mono text-slate-400 hidden sm:inline-flex items-center gap-1">
                            <ArrowUpDown className="w-3 h-3" /> Sort:
                        </span>
                        {SORT_OPTIONS.map((opt) => {
                            const isActive = sortBy === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setSortBy(opt.id)}
                                    className={`relative px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                        isActive ? 'text-white' : 'text-slate-300/75 hover:text-white'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.span
                                            layoutId="discover-sort-pill"
                                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                            className="absolute inset-0 rounded-full bg-white/[0.14] border border-white/[0.18]"
                                        />
                                    )}
                                    <span className="relative z-10">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Destination Cards Grid */}
                {filteredDestinations.length > 0 ? (
                    <motion.div
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredDestinations.map((dest) => (
                                <motion.div
                                    key={dest.slug || dest.id || dest.name}
                                    layout
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.25 }}
                                    className="group apple-glass-card card-3d-interactive rounded-[28px] overflow-hidden flex flex-col"
                                >
                                    {/* Top Photography Header */}
                                    <Link
                                        href={`/discover/${dest.slug}` as any}
                                        className="relative block h-56 overflow-hidden"
                                    >
                                        <img
                                            src={dest.image}
                                            alt={`${dest.name}, ${dest.country}`}
                                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#121317] via-[#121317]/30 to-transparent" />

                                        {/* Tags */}
                                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                            {(dest.tags || []).slice(0, 2).map((tag: string) => (
                                                <span
                                                    key={tag}
                                                    className="px-2.5 py-0.5 rounded-full apple-liquid-glass text-[10px] font-medium text-white"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Daily Cost Badge */}
                                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full apple-liquid-glass text-xs font-mono font-semibold text-white tabular-nums">
                                            ${dest.cost}<span className="text-[10px] text-slate-300 font-normal">/d</span>
                                        </div>

                                        {/* Title & Country */}
                                        <div className="absolute bottom-3 left-4 right-4">
                                            <h3 className="text-2xl font-heading font-bold text-white leading-tight line-clamp-1">
                                                {dest.name}
                                            </h3>
                                            <div className="flex items-center text-slate-300 text-xs mt-0.5">
                                                <MapPin className="w-3 h-3 mr-1 text-sky-300" />
                                                <span>{dest.country}</span>
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Traveler Telemetry & Dual Actions */}
                                    <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                                        {dest.heroDescription && (
                                            <p className="text-xs text-slate-300/85 line-clamp-2 leading-relaxed">
                                                {dest.heroDescription}
                                            </p>
                                        )}

                                        <div>
                                            <div className="grid grid-cols-3 gap-2 mb-4 text-center font-mono tabular-nums">
                                                <div className="rounded-xl bg-[#0b0c0f]/70 border border-white/[0.07] py-2 px-1.5">
                                                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                                                        <Shield className="w-3 h-3 text-emerald-400" />
                                                        <span>Safety</span>
                                                    </div>
                                                    <div className="text-xs font-semibold text-white">{dest.safety}/10</div>
                                                </div>
                                                <div className="rounded-xl bg-[#0b0c0f]/70 border border-white/[0.07] py-2 px-1.5">
                                                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                                                        <Thermometer className="w-3 h-3 text-amber-300" />
                                                        <span>Climate</span>
                                                    </div>
                                                    <div className="text-xs font-semibold text-white">{dest.temp}°C</div>
                                                </div>
                                                <div className="rounded-xl bg-[#0b0c0f]/70 border border-white/[0.07] py-2 px-1.5">
                                                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                                                        <Wifi className="w-3 h-3 text-sky-300" />
                                                        <span>Wi-Fi</span>
                                                    </div>
                                                    <div className="text-xs font-semibold text-white">{dest.internet}M</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <Link href={`/discover/${dest.slug}` as any}>
                                                    <button className="w-full h-9 rounded-full btn-apple-glass text-xs font-medium">
                                                        Read Guide
                                                    </button>
                                                </Link>
                                                <Link
                                                    href={`/plan-trip?destination=${encodeURIComponent(`${dest.name}, ${dest.country}`)}` as any}
                                                >
                                                    <button className="w-full h-9 rounded-full btn-apple-primary text-xs inline-flex items-center justify-center gap-1">
                                                        <span>Plan Trip</span>
                                                        <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    /* Smart Traveler Fallback: Plan or Research ANY custom query directly! */
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 px-6 apple-glass-card rounded-[32px] max-w-xl mx-auto mt-6"
                    >
                        <div className="w-12 h-12 rounded-2xl apple-liquid-glass flex items-center justify-center mx-auto mb-4 text-sky-300">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-heading font-bold text-white mb-2">
                            {searchQuery.trim()
                                ? `Explore "${searchQuery.trim()}" with Live AI`
                                : 'No destinations matched that filter'}
                        </h3>
                        <p className="text-slate-300/85 text-sm mb-6 leading-relaxed">
                            {searchQuery.trim()
                                ? `Our 8-agent planner supports every city and region worldwide using live Google Places and Amadeus data.`
                                : 'Reset your category filter or search for any city worldwide.'}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {searchQuery.trim() ? (
                                <>
                                    <Link href={`/plan-trip?destination=${encodeURIComponent(searchQuery.trim())}` as any}>
                                        <button className="px-6 py-3 rounded-full btn-apple-primary text-xs inline-flex items-center gap-2">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>Plan Trip to {searchQuery.trim()}</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </Link>
                                    <Link href="/travel-research">
                                        <button className="px-5 py-3 rounded-full btn-apple-glass text-xs font-medium">
                                            Open Live Place Research
                                        </button>
                                    </Link>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveCategory('All');
                                        setSearchQuery('');
                                    }}
                                    className="px-6 py-2.5 rounded-full btn-apple-primary text-xs"
                                >
                                    Show All Destinations
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Bottom Custom Destination Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-16"
                >
                    <div className="apple-glass-card rounded-[30px] p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300 mb-2 font-mono">
                                Unlimited Global Coverage
                            </p>
                            <h3 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2 leading-tight">
                                Heading somewhere off the beaten path?
                            </h3>
                            <p className="text-slate-300/85 text-sm">
                                Our 8-agent planner generates grounded, zero-backtrack itineraries for any city, island, or multi-neighborhood destination on Earth.
                            </p>
                        </div>
                        <Link href="/plan-trip" className="flex-shrink-0">
                            <button className="btn-apple-primary px-7 py-3.5 rounded-full text-sm inline-flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                <span>Plan Custom Trip</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
