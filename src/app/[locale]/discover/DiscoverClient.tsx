'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, DollarSign, Thermometer, Compass } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

const CATEGORIES = [
    'All', 'Tropical', 'Urban', 'Cultural', 'Digital Nomad', 'Beach',
    'Budget', 'Luxury', 'Historic', 'Romantic', 'Nature'
];

export default function DiscoverClient({ destinations }: { destinations: any[] }) {
    const locale = useLocale();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const filteredDestinations = destinations.filter((dest) => {
        const matchesSearch = dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dest.country.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'All' || (dest.tags && dest.tags.some((t: string) => t.toLowerCase() === activeCategory.toLowerCase()));
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-[#020509] text-white py-24 font-sans selection:bg-[#00D4FF]/30">
            {/* Minimal Static Background Gradient (Fast Performance) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00D4FF]/10 rounded-full blur-[100px] transform-gpu" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#6366F1]/10 rounded-full blur-[100px] transform-gpu" />
            </div>

            <div className="container relative z-10 max-w-7xl mx-auto px-4 md:px-8">
                
                {/* Header & Search */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                    <div className="max-w-xl">
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent"
                        >
                            Discover
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-white/60 text-lg md:text-xl"
                        >
                            Find the world's most incredible destinations.
                        </motion.p>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative w-full md:w-[400px] group"
                    >
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 group-focus-within:text-[#00D4FF] transition-colors" />
                        <Input
                            placeholder="Search cities, countries..."
                            className="pl-12 h-14 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#00D4FF]/50 focus-visible:border-[#00D4FF]/50 transition-all font-medium text-base"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </motion.div>
                </div>

                {/* Categories */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex overflow-x-auto pb-4 mb-8 -mx-4 px-4 gap-3 md:gap-4 md:mb-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    {CATEGORIES.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200 ${
                                activeCategory === category
                                    ? 'bg-[#00D4FF] text-black shadow-[0_0_15px_rgba(0,212,255,0.3)]'
                                    : 'bg-[#111827] text-white/70 hover:bg-[#1E293B] hover:text-white border border-white/5'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </motion.div>

                {/* Premium Grid Viewer */}
                {filteredDestinations.length > 0 ? (
                    <motion.div 
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredDestinations.map((dest) => (
                                <motion.div
                                    key={dest.id || dest.name}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    className="group"
                                >
                                    <Link 
                                        href={`/${locale}/discover/${dest.slug}`} 
                                        className="relative block h-[400px] md:h-[450px] w-full rounded-[28px] overflow-hidden bg-[#0A101A] border border-white/5 ring-1 ring-white/10 hover:ring-[#00D4FF]/50 transition-all duration-300 shadow-xl"
                                    >
                                        {/* Background Image Setup (Hardware Accelerated) */}
                                        <div className="absolute inset-0 overflow-hidden rounded-[28px]">
                                            <img
                                                src={dest.image}
                                                alt={dest.name}
                                                className="w-full h-full object-cover will-change-transform transform-gpu transition-transform duration-700 ease-out group-hover:scale-105"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        </div>

                                        {/* Rich Deep Gradient overlay (Static, Non-Laggy) */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 transition-opacity duration-300 group-hover:via-black/40" />

                                        {/* Card Focus Interactive Border Glow */}
                                        <div className="absolute inset-0 rounded-[28px] border-2 border-transparent group-hover:border-white/10 transition-colors duration-500 pointer-events-none" />

                                        {/* Content Container */}
                                        <div className="absolute inset-0 p-6 flex flex-col justify-end z-10 transition-transform duration-300 ease-out group-hover:-translate-y-1">
                                            
                                            {/* Tag */}
                                            <Badge className="w-fit mb-3 bg-[#6366F1]/90 hover:bg-[#6366F1] text-white border-none px-3 py-1 text-xs font-bold shadow-md">
                                                {dest.tags?.[0] || 'Popular'}
                                            </Badge>
                                            
                                            {/* Title & Location */}
                                            <h3 className="text-3xl font-bold mb-1 text-white group-hover:text-[#00D4FF] transition-colors duration-300 line-clamp-1">{dest.name}</h3>
                                            <div className="flex items-center text-white/70 mb-5 font-semibold text-sm">
                                                <MapPin className="w-4 h-4 mr-1.5" />
                                                {dest.country}
                                            </div>

                                            {/* Quick Stats Grid */}
                                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                                <div className="bg-[#111827]/80 backdrop-blur-md rounded-2xl p-3 border border-white/5 transition-colors group-hover:bg-[#111827]">
                                                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-white/50 uppercase font-extrabold tracking-wider">
                                                        <DollarSign className="w-3.5 h-3.5 text-[#00FFB3]" /> 
                                                        <span>Budget</span>
                                                    </div>
                                                    <div className="text-white font-bold text-base leading-none">${dest.cost}<span className="text-xs text-white/50 font-medium tracking-normal">/day</span></div>
                                                </div>
                                                
                                                <div className="bg-[#111827]/80 backdrop-blur-md rounded-2xl p-3 border border-white/5 transition-colors group-hover:bg-[#111827]">
                                                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-white/50 uppercase font-extrabold tracking-wider">
                                                        <Thermometer className="w-3.5 h-3.5 text-amber-400" /> 
                                                        <span>Temp</span>
                                                    </div>
                                                    <div className="text-white font-bold text-base leading-none">{dest.temp}°C</div>
                                                </div>
                                            </div>

                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20 bg-[#111827]/50 rounded-3xl border border-white/5 mt-8"
                    >
                        <Compass className="w-16 h-16 text-white/20 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">No destinations found</h3>
                        <p className="text-white/50 text-base">Try adjusting your filters or search terms.</p>
                    </motion.div>
                )}
                {/* \u2500\u2500 Soft upsell strip \u2500\u2500 */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-20"
                >
                    <div
                        className="rounded-[28px] p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left"
                        style={{
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(0,212,255,0.07))',
                            border: '1px solid rgba(99,102,241,0.2)',
                        }}
                    >
                        <div className="flex-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-[#00D4FF]/70 mb-2">
                                Ready to visit one of these?
                            </p>
                            <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2 leading-tight">
                                Plan your full itinerary in{' '}
                                <span style={{
                                    background: 'linear-gradient(90deg, #00D4FF, #6366F1)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}>
                                    2 minutes
                                </span>
                            </h3>
                            <p className="text-white/50 text-sm">
                                Day-by-day plan, flights, hotels, visa info &mdash; all generated instantly. Free to start.
                            </p>
                        </div>
                        <Link href={`/${locale}/plan-trip`} className="flex-shrink-0">
                            <button
                                className="px-8 py-4 rounded-2xl font-extrabold text-black text-sm transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]"
                                style={{ background: 'linear-gradient(135deg, #00D4FF, #6366F1)' }}
                            >
                                Generate My Itinerary &rarr;
                            </button>
                        </Link>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
