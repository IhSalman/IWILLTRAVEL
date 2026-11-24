'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, MapPin, Compass, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface CinematicSlot {
    id: string;
    slug: string;
    location: string;
    country: string;
    coordinates: string;
    title: string;
    tagline: string;
    bestSeason: string;
    dailyBudget: string;
    posterUrl: string;
}

const CINEMATIC_SLOTS: CinematicSlot[] = [
    {
        id: 'kyoto',
        slug: 'kyoto',
        location: 'Kyoto',
        country: 'Japan',
        coordinates: '35.0116° N, 135.7681° E',
        title: 'Morning Mist over Higashiyama Pagodas',
        tagline: 'Preserved wooden machiya townhouses, moss temple gardens, and quiet lantern alleys best explored at dawn.',
        bestSeason: 'Mar–May · Oct–Nov',
        dailyBudget: '$95 / day avg',
        posterUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=85',
    },
    {
        id: 'tokyo',
        slug: 'tokyo',
        location: 'Tokyo',
        country: 'Japan',
        coordinates: '35.6580° N, 139.7016° E',
        title: 'Shibuya Horizon & Midnight Izakaya Alleys',
        tagline: 'Precision rail networks connecting tranquil evergreen shrines with futuristic rooftop observatories and Michelin street food.',
        bestSeason: 'Mar–May · Sep–Nov',
        dailyBudget: '$120 / day avg',
        posterUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1600&q=85',
    },
    {
        id: 'swiss-alps',
        slug: 'paris',
        location: 'Zermatt',
        country: 'Switzerland',
        coordinates: '45.9765° N, 7.7491° E',
        title: 'Glacier Express Alpine Ascent',
        tagline: 'Car-free alpine villages, panoramic cogwheel railways, and crisp Matterhorn ridgelines.',
        bestSeason: 'Jun–Sep · Dec–Mar',
        dailyBudget: '$190 / day avg',
        posterUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1600&q=85',
    },
];

export function CinematicShowcase() {
    const [activeSlot, setActiveSlot] = useState<CinematicSlot>(CINEMATIC_SLOTS[0]);
    const [motionEnabled, setMotionEnabled] = useState(true);

    return (
        <section className="py-24 px-4 bg-[#0b0c0f] text-slate-100 relative overflow-hidden border-t border-white/[0.06]">
            <div className="container max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest apple-glass-pill text-slate-200 mb-3">
                            <Compass className="w-3.5 h-3.5 text-sky-300" />
                            <span>Spatial Destination Preview</span>
                        </div>
                        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                            Iconic Vistas.{' '}
                            <span className="italic font-normal text-gradient-champagne">
                                Ready to Plan.
                            </span>
                        </h2>
                    </div>

                    {/* Apple Liquid Glass Segmented Switcher */}
                    <div className="inline-flex items-center gap-1 p-1 rounded-full apple-liquid-glass text-xs font-medium self-start md:self-auto">
                        {CINEMATIC_SLOTS.map((slot) => {
                            const isActive = activeSlot.id === slot.id;
                            return (
                                <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => setActiveSlot(slot)}
                                    className={`relative px-4 py-1.5 rounded-full transition-colors duration-200 ${
                                        isActive ? 'text-white' : 'text-slate-300/75 hover:text-white'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.span
                                            layoutId="cinematic-tab-pill"
                                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                            className="absolute inset-0 rounded-full bg-white/[0.14] border border-white/[0.18]"
                                        />
                                    )}
                                    <span className="relative z-10">{slot.location}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Widescreen Apple Spatial Frame */}
                <div className="relative rounded-[32px] overflow-hidden h-[430px] sm:h-[540px] border border-white/[0.11] shadow-[0_28px_64px_-16px_rgba(0,0,0,0.75)] bg-[#121317]">
                    {/* Crossfading High-Res Photography with Optional Ken Burns Motion */}
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={activeSlot.id}
                            src={activeSlot.posterUrl}
                            alt={activeSlot.title}
                            initial={{ opacity: 0.25, scale: 1.02 }}
                            animate={{
                                opacity: 1,
                                scale: motionEnabled ? 1.08 : 1.01,
                            }}
                            exit={{ opacity: 0.2 }}
                            transition={{
                                opacity: { duration: 0.55, ease: 'easeOut' },
                                scale: { duration: motionEnabled ? 14 : 0.4, ease: 'linear' },
                            }}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </AnimatePresence>

                    {/* High-Legibility Multi-Stop Scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0f] via-[#0b0c0f]/45 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c0f]/75 via-transparent to-[#0b0c0f]/35" />

                    {/* Top Liquid Glass HUD */}
                    <div className="absolute top-5 left-5 right-5 sm:top-7 sm:left-7 sm:right-7 flex items-center justify-between gap-3 text-xs font-mono z-10">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-liquid-glass text-slate-200">
                            <MapPin className="w-3.5 h-3.5 text-sky-300" />
                            <span className="text-slate-300 tabular-nums">{activeSlot.coordinates}</span>
                            <span className="text-white/25">|</span>
                            <span className="text-white font-semibold">{activeSlot.country.toUpperCase()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-liquid-glass text-[11px] text-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Best Season: {activeSlot.bestSeason}</span>
                                <span className="text-white/25">·</span>
                                <span className="text-amber-200 tabular-nums">{activeSlot.dailyBudget}</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setMotionEnabled((m) => !m)}
                                aria-label={motionEnabled ? 'Pause ambient motion' : 'Play ambient motion'}
                                title={motionEnabled ? 'Pause motion' : 'Resume motion'}
                                className="w-8 h-8 rounded-full apple-liquid-glass flex items-center justify-center text-slate-200 hover:text-white transition-colors"
                            >
                                {motionEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Bottom Editorial Content + Direct Traveler Action */}
                    <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 z-10 max-w-2xl">
                        <motion.div
                            key={activeSlot.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <span className="text-xs font-mono uppercase tracking-widest text-sky-300 font-medium mb-2 block">
                                {activeSlot.location}, {activeSlot.country}
                            </span>
                            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
                                {activeSlot.title}
                            </h3>
                            <p className="text-sm text-slate-200/90 leading-relaxed mb-6 max-w-xl">
                                {activeSlot.tagline}
                            </p>

                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    href={`/plan-trip?destination=${encodeURIComponent(`${activeSlot.location}, ${activeSlot.country}`)}` as any}
                                >
                                    <button className="px-6 py-2.5 rounded-full btn-apple-primary text-xs inline-flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Plan Trip to {activeSlot.location}</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </Link>
                                <Link
                                    href={`/travel-research?destination=${encodeURIComponent(`${activeSlot.location}, ${activeSlot.country}`)}` as any}
                                >
                                    <button className="px-5 py-2.5 rounded-full btn-apple-glass text-xs font-medium">
                                        Research Local Costs & Safety
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
