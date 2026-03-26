'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, DollarSign, Thermometer, Compass, ArrowLeft, ArrowRight } from 'lucide-react';
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
    const [activeIndex, setActiveIndex] = useState(0);

    const filteredDestinations = destinations.filter((dest) => {
        const matchesSearch = dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dest.country.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'All' || (dest.tags && dest.tags.some((t: string) => t.toLowerCase() === activeCategory.toLowerCase()));
        return matchesSearch && matchesCategory;
    });

    // Reset index when filter changes
    useEffect(() => {
        setActiveIndex(0);
    }, [searchQuery, activeCategory]);

    const handleNext = () => {
        setActiveIndex((prev) => (prev + 1) % filteredDestinations.length);
    };

    const handlePrev = () => {
        setActiveIndex((prev) => (prev - 1 + filteredDestinations.length) % filteredDestinations.length);
    };

    return (
        <div className="relative min-h-screen bg-[#03080f] text-white overflow-hidden py-24 font-sans">
            {/* 3D Animated Background Orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                <motion.div 
                    animate={{ y: [0, -50, 0], scale: [1, 1.2, 1], rotate: [0, 45, 0] }} 
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[0%] left-[-10%] w-[600px] h-[600px] bg-[#00D4FF] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.15]"
                />
                <motion.div 
                    animate={{ y: [0, 50, 0], scale: [1, 1.3, 1], rotate: [0, -45, 0] }} 
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#6366F1] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.15]"
                />
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
                            Swipe through the world's most incredible destinations in stunning 3D.
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
                            className="pl-12 h-14 rounded-full border-white/10 bg-white/5 backdrop-blur-xl text-white placeholder:text-white/40 focus-visible:ring-[#00D4FF]/50 focus-visible:border-[#00D4FF]/50 shadow-2xl transition-all"
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
                    className="flex overflow-x-auto pb-6 mb-12 -mx-4 px-4 gap-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    {CATEGORIES.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`whitespace-nowrap px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 backdrop-blur-md ${
                                activeCategory === category
                                    ? 'bg-[#00D4FF] text-black shadow-[0_0_20px_rgba(0,212,255,0.4)] scale-105'
                                    : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5 hover:border-white/20'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </motion.div>

                {/* 3D Carousel Viewer */}
                {filteredDestinations.length > 0 ? (
                    <div className="relative h-[550px] md:h-[650px] w-full mt-4 flex items-center justify-center" style={{ perspective: 1200 }}>
                        <AnimatePresence initial={false}>
                            {filteredDestinations.map((dest, index) => {
                                // Calculate position relative to active index
                                const diff = index - activeIndex;
                                const isVisible = Math.abs(diff) <= 3 || (filteredDestinations.length > 6 && Math.abs(filteredDestinations.length - Math.abs(diff)) <= 3);
                                
                                if (!isVisible) return null;

                                // Normalize diff for infinite wrap effect
                                let step = diff;
                                if (filteredDestinations.length > 5) {
                                  if (diff > 3) step = diff - filteredDestinations.length;
                                  if (diff < -3) step = diff + filteredDestinations.length;
                                }

                                const isActive = step === 0;

                                // 3D transforms
                                const x = step * 160; // Spread horizontally
                                const z = Math.abs(step) * -120; // Push back adjacent cards
                                const rotateY = step * -15; // Point adjacent cards inward
                                const scale = isActive ? 1 : 0.85;
                                const opacity = isActive ? 1 : 1 - (Math.abs(step) * 0.25);
                                const zIndex = 50 - Math.abs(step);

                                return (
                                    <motion.div
                                        key={dest.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ 
                                            x, z, rotateY, scale, opacity, zIndex 
                                        }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ 
                                            type: "spring", 
                                            stiffness: 250, 
                                            damping: 25,
                                            mass: 0.9
                                        }}
                                        className={`absolute w-[320px] md:w-[460px] h-[480px] md:h-[600px] rounded-[32px] overflow-hidden ${isActive ? 'cursor-default shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/20' : 'cursor-pointer border border-white/5'} bg-[#0a1628]`}
                                        onClick={() => !isActive && setActiveIndex(index)}
                                        style={{ transformStyle: 'preserve-3d' }}
                                    >
                                        <div className="absolute inset-0 z-0">
                                            <img
                                                src={dest.image}
                                                alt={dest.name}
                                                className={`w-full h-full object-cover transition-transform duration-[2s] ${isActive ? 'scale-110' : 'scale-100'}`}
                                            />
                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#03080f] via-[#03080f]/50 to-transparent" />
                                        </div>

                                        <div className="relative z-10 h-full p-6 md:p-8 flex flex-col justify-end">
                                        
                                            {isActive && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.15 }}
                                                >
                                                    <Badge className="bg-[#6366F1]/80 backdrop-blur-md border border-[#6366F1] text-white rounded-full px-4 py-1.5 mb-4 font-bold tracking-wide shadow-lg">
                                                        {dest.tags?.[0] || 'Popular'}
                                                    </Badge>
                                                    <h3 className="text-4xl md:text-5xl font-black mb-2 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] leading-none">{dest.name}</h3>
                                                    <div className="flex items-center text-[#00D4FF] font-semibold mb-8 text-lg">
                                                        <MapPin className="w-5 h-5 mr-2" />
                                                        {dest.country}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/20 transition-colors">
                                                            <DollarSign className="w-6 h-6 text-[#00FFB3]" />
                                                            <div>
                                                                <div className="text-lg font-bold text-white leading-none">${dest.cost}</div>
                                                                <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider mt-1">Daily Budget</div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/20 transition-colors">
                                                            <Thermometer className="w-6 h-6 text-amber-400" />
                                                            <div>
                                                                <div className="text-lg font-bold text-white leading-none">{dest.temp}°C</div>
                                                                <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider mt-1">Avg Temp</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Link href={`/${locale}/discover/${dest.slug}`} className="w-full block">
                                                        <Button className="w-full h-14 bg-white text-black hover:bg-[#00D4FF] rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]">
                                                            Explore Location
                                                        </Button>
                                                    </Link>
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Controls */}
                        {filteredDestinations.length > 1 && (
                            <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-2 md:px-0 md:-mx-16 pointer-events-none z-50">
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={handlePrev}
                                    className="w-14 h-14 rounded-full bg-[#03080f]/60 backdrop-blur-xl border-white/20 text-white hover:bg-white/20 pointer-events-auto shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all hover:scale-110"
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={handleNext}
                                    className="w-14 h-14 rounded-full bg-[#03080f]/60 backdrop-blur-xl border-white/20 text-white hover:bg-white/20 pointer-events-auto shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all hover:scale-110"
                                >
                                    <ArrowRight className="w-6 h-6" />
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] mt-10">
                        <Compass className="w-20 h-20 text-white/20 mx-auto mb-6" />
                        <h3 className="text-3xl font-extrabold text-white mb-3">No destinations found</h3>
                        <p className="text-white/50 text-lg">Try searching for something else or clearing the filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
