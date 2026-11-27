'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Footprints, Utensils, Sparkles, X, ArrowRight
} from 'lucide-react';
import { Link } from '@/i18n/routing';

interface ActivityItem {
    id: string;
    time: string;
    title: string;
    neighborhood: string;
    category: string;
    duration: string;
    cost: string;
    photoUrl: string;
    description: string;
    insiderSecret: string;
    mealNearby: string;
    transitToNext: string;
    coordinates: string;
}

interface ItineraryDay {
    dayNumber: number;
    title: string;
    theme: string;
    neighborhood: string;
    activities: ActivityItem[];
}

const SAMPLE_DAYS: ItineraryDay[] = [
    {
        dayNumber: 1,
        title: 'Asakusa & Ueno: Edo Heritage & Historic Temples',
        theme: 'Ancient Traditions & Sacred Alleys',
        neighborhood: 'Taito Ward, Tokyo',
        activities: [
            {
                id: 'senso-ji',
                time: '09:00 AM – 11:30 AM',
                title: 'Sensō-ji Temple & Hōzōmon Gate',
                neighborhood: 'Asakusa',
                category: 'Sacred Heritage',
                duration: '2.5 hours',
                cost: 'Free Entry',
                photoUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
                description: 'Tokyo’s oldest Buddhist temple founded in 645 AD. The massive red paper lantern at Kaminarimon Gate is iconic, and incense smoke from the jokoro burner is said to bestow health.',
                insiderSecret: 'Arrive before 9 AM to walk Nakamise-dori before souvenir stalls crowd the path.',
                mealNearby: 'Asakusa Imahan (Legendary Sukiyaki since 1895)',
                transitToNext: '12 min walk along Sumida River Promenade',
                coordinates: '35.7148° N, 139.7967° E',
            },
            {
                id: 'skytree-view',
                time: '01:00 PM – 03:30 PM',
                title: 'Sumida Riverside & Edo-Tokyo Cultural Walk',
                neighborhood: 'Sumida',
                category: 'Architecture & River Walk',
                duration: '2.5 hours',
                cost: '¥1,800',
                photoUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
                description: 'A striking contrast between ancient pagoda spires and modern engineering marvels. Riverside walkways lined with weeping cherry trees offer pristine views.',
                insiderSecret: 'Visit the 4th-floor river terrace for uncrowded skyline photography.',
                mealNearby: 'Kaminarimon Sansada (Oldest tempura house in Tokyo)',
                transitToNext: '8 min subway ride on Ginza Line',
                coordinates: '35.7100° N, 139.8107° E',
            },
            {
                id: 'ueno-yokocho',
                time: '06:30 PM – 09:30 PM',
                title: 'Ameyoko Market & Yanaka Izakaya Stroll',
                neighborhood: 'Ueno / Yanaka',
                category: 'Culinary & Nightlife',
                duration: '3 hours',
                cost: '¥3,500 for dinner',
                photoUrl: 'https://images.unsplash.com/photo-1554797589-7241bb691973?auto=format&fit=crop&w=800&q=80',
                description: 'Bustling postwar market alleys filled with open-air yakitori grills, craft sakes, and retro lantern-lit alleyways.',
                insiderSecret: 'Duck into the basement spice market for rare single-origin matcha tea leaves.',
                mealNearby: 'Taitō Yanaka Beer Hall (Taisho-era restored residence)',
                transitToNext: 'Night wrap · Direct Yamanote Line return',
                coordinates: '35.7118° N, 139.7744° E',
            },
        ],
    },
    {
        dayNumber: 2,
        title: 'Shibuya & Harajuku: Spatial Architecture & High Design',
        theme: 'Metropolitan Art & Modern Aesthetics',
        neighborhood: 'Shibuya Ward, Tokyo',
        activities: [
            {
                id: 'meiji-shrine',
                time: '09:30 AM – 11:30 AM',
                title: 'Meiji Jingu Evergreen Sacred Forest',
                neighborhood: 'Harajuku',
                category: 'Sacred Forest',
                duration: '2 hours',
                cost: 'Free Entry',
                photoUrl: 'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=800&q=80',
                description: 'A tranquil 170-acre forest in the heart of Tokyo featuring 120,000 trees donated from across Japan, creating a serene microclimate.',
                insiderSecret: 'Step off the main gravel trail to see the sacred sake barrels and iris garden.',
                mealNearby: 'Chachanoma Tea Salon (Single-estate hand-brewed green teas)',
                transitToNext: '10 min walk via Cat Street designer promenade',
                coordinates: '35.6764° N, 139.6993° E',
            },
            {
                id: 'shibuya-sky',
                time: '01:30 PM – 04:00 PM',
                title: 'Shibuya Sky & Neo-Tokyo Architecture Tour',
                neighborhood: 'Shibuya',
                category: '360° Rooftop Vista',
                duration: '2.5 hours',
                cost: '¥2,200',
                photoUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
                description: 'Open-air observation deck sitting 229 meters above Shibuya Crossing with panoramic views stretching across Tokyo Tower to Mount Fuji on clear afternoons.',
                insiderSecret: 'Book tickets 28 days ahead at 00:00 JST to secure the golden hour sunset slot.',
                mealNearby: 'Katsukura Tonkatsu Sanjo Main Store',
                transitToNext: '15 min walk to Omoide Yokocho',
                coordinates: '35.6580° N, 139.7016° E',
            },
            {
                id: 'shinjuku-night',
                time: '06:30 PM – 10:00 PM',
                title: 'Omoide Yokocho & Bar Ben Fiddich',
                neighborhood: 'Shinjuku',
                category: 'Craft Cocktail Culture',
                duration: '3.5 hours',
                cost: '¥6,000 for drinks & food',
                photoUrl: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=800&q=80',
                description: 'Intimate farm-to-glass cocktail artistry where master Hiroyasu Kayama crushes wild botanicals, absinthe, and herbs harvested from his family farm.',
                insiderSecret: 'Arrive right at 6:00 PM opening as there are only 12 bar stools and no reservations.',
                mealNearby: 'Torishige (Legendary charcoal yakitori skewers since 1949)',
                transitToNext: 'Night wrap · Subway back to hotel',
                coordinates: '35.6927° N, 139.6996° E',
            },
        ],
    },
];

export function InteractiveItineraryShowcase() {
    const [activeDayIdx, setActiveDayIdx] = useState(0);
    const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

    const activeDay = SAMPLE_DAYS[activeDayIdx];

    return (
        <section className="py-28 md:py-36 px-4 bg-background relative overflow-hidden text-slate-100 border-t border-white/[0.06]">
            <div className="container max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <span className="eyebrow block mb-4">A sample day</span>
                    <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl text-slate-100 leading-[1.02] mb-5">
                        One neighbourhood at a time,
                        <br />
                        <em className="text-sunrise-300">no zig-zags.</em>
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                        Stops are grouped by area so the walk between them stays short. Tap any stop to see
                        timing tips, coordinates and a nearby place to eat.
                    </p>

                    {/* Apple Liquid Glass Segmented Day Switcher */}
                    <div className="inline-flex items-center gap-1 p-1 rounded-full apple-liquid-glass mt-8">
                        {SAMPLE_DAYS.map((day, idx) => {
                            const isActive = activeDayIdx === idx;
                            return (
                                <button
                                    key={day.dayNumber}
                                    type="button"
                                    onClick={() => setActiveDayIdx(idx)}
                                    className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
                                        isActive ? 'text-white' : 'text-slate-300/75 hover:text-white'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.span
                                            layoutId="itinerary-day-pill"
                                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                            className="absolute inset-0 rounded-full bg-white/[0.14] border border-white/[0.18]"
                                        />
                                    )}
                                    <span className="relative z-10">
                                        Day {day.dayNumber}: {day.neighborhood.split(',')[0]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Timeline Route Scrub Container */}
                <div className="relative max-w-4xl mx-auto">
                    <div className="hidden md:block absolute left-8 top-12 bottom-12 w-[1px] bg-gradient-to-b from-sky-400/30 via-white/15 to-amber-300/30" />

                    <div className="space-y-5 relative z-10">
                        {activeDay.activities.map((act, i) => (
                            <motion.div
                                key={act.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: i * 0.08 }}
                                onClick={() => setSelectedActivity(act)}
                                className="cursor-pointer group rounded-[28px] p-6 sm:p-7 apple-glass-card card-3d-interactive md:ml-16 relative"
                            >
                                {/* Timeline Stop Indicator */}
                                <div className="hidden md:flex absolute -left-[4.75rem] top-8 w-7 h-7 rounded-full apple-liquid-glass items-center justify-center text-[10px] font-mono font-semibold text-white tabular-nums">
                                    0{i + 1}
                                </div>

                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    {/* Left Content */}
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium apple-glass-pill text-slate-200 tabular-nums">
                                                {act.time}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/12 text-sky-300 border border-sky-400/20">
                                                {act.category}
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono tabular-nums">
                                                {act.cost} · {act.duration}
                                            </span>
                                        </div>

                                        <h3 className="font-heading text-lg sm:text-xl font-bold text-white group-hover:text-sky-200 transition-colors mb-2">
                                            {act.title}
                                        </h3>

                                        <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed line-clamp-2 mb-4">
                                            {act.description}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                                            <div className="flex items-center gap-1.5 text-slate-200">
                                                <Utensils className="w-3.5 h-3.5 text-amber-300" />
                                                <span className="truncate max-w-[250px]">{act.mealNearby}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-emerald-300">
                                                <Footprints className="w-3.5 h-3.5" />
                                                <span>{act.transitToNext}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Image Thumbnail */}
                                    <div className="w-full lg:w-44 h-32 rounded-2xl overflow-hidden relative flex-shrink-0 border border-white/[0.1]">
                                        <img
                                            src={act.photoUrl}
                                            alt={act.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0f]/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full apple-liquid-glass text-[10px] font-mono text-white">
                                            Inspect →
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Callout Footer */}
                <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
                    <Link href={'/plan-trip?destination=Tokyo%2C%20Japan&days=7' as any}>
                        <button className="px-7 py-3.5 rounded-full btn-apple-primary text-xs inline-flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Customize This Tokyo Trip</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </Link>
                    <Link href="/plan-trip">
                        <button className="px-6 py-3.5 rounded-full btn-apple-glass text-xs font-medium">
                            Plan Another Destination
                        </button>
                    </Link>
                </div>
            </div>

            {/* Modal Detail Dialog when clicking an Activity */}
            <AnimatePresence>
                {selectedActivity && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c0f]/80 backdrop-blur-xl"
                        onClick={(e) => { if (e.target === e.currentTarget) setSelectedActivity(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.94, y: 14 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 12 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            className="relative w-full max-w-lg rounded-[28px] overflow-hidden apple-liquid-glass p-6 sm:p-8"
                        >
                            <button
                                onClick={() => setSelectedActivity(null)}
                                aria-label="Close activity details"
                                className="absolute top-4 right-4 z-10 text-slate-200 hover:text-white p-2 rounded-full apple-glass-pill"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="h-48 rounded-2xl overflow-hidden relative mb-5 border border-white/[0.12]">
                                <img
                                    src={selectedActivity.photoUrl}
                                    alt={selectedActivity.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0f] via-transparent to-transparent" />
                                <div className="absolute bottom-3 left-3 text-[11px] font-mono text-white px-2.5 py-0.5 rounded-full apple-liquid-glass">
                                    {selectedActivity.coordinates}
                                </div>
                            </div>

                            <span className="text-[10px] font-mono uppercase tracking-widest text-sky-300 block mb-1">
                                {selectedActivity.category} · {selectedActivity.time}
                            </span>
                            <h3 className="font-heading text-xl sm:text-2xl font-bold text-white mb-3">
                                {selectedActivity.title}
                            </h3>

                            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed mb-5">
                                {selectedActivity.description}
                            </p>

                            <div className="rounded-2xl p-4 bg-[#0b0c0f]/75 border border-white/[0.08] space-y-3 text-xs mb-6">
                                <div className="flex items-start gap-2.5">
                                    <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-white font-semibold">Insider Timing Tip: </span>
                                        <span className="text-slate-300">{selectedActivity.insiderSecret}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 pt-2.5 border-t border-white/[0.07]">
                                    <Utensils className="w-4 h-4 text-sky-300 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-white font-semibold">Nearby Dining Match: </span>
                                        <span className="text-slate-300">{selectedActivity.mealNearby}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <Link
                                    href={'/plan-trip?destination=Tokyo%2C%20Japan' as any}
                                    onClick={() => setSelectedActivity(null)}
                                >
                                    <button className="px-5 py-2.5 rounded-full btn-apple-primary text-xs">
                                        Plan a Tokyo Itinerary →
                                    </button>
                                </Link>
                                <button
                                    onClick={() => setSelectedActivity(null)}
                                    className="px-4 py-2.5 rounded-full btn-apple-glass text-xs font-medium"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
