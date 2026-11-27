'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Check, MapPin, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { SmoothScroll } from '@/components/landing/SmoothScroll';
import { InteractiveItineraryShowcase } from '@/components/landing/InteractiveItineraryShowcase';
import { FlightPathSteps } from '@/components/landing/FlightPathSteps';
import { DestinationTicker } from '@/components/landing/DestinationTicker';

// Photoreal WebGL globe is client-only and loaded after first paint.
const RealisticGlobe = dynamic(() => import('@/components/landing/RealisticGlobe'), {
    ssr: false,
    loading: () => <div className="w-full h-full rounded-full" />,
});

const EASE = [0.22, 1, 0.36, 1] as const;

const QUICK_DESTINATIONS = [
    { label: 'Tokyo, Japan', days: 7 },
    { label: 'Lisbon, Portugal', days: 4 },
    { label: 'Paris, France', days: 5 },
    { label: 'Bali, Indonesia', days: 7 },
];

const featuredDestinations = [
    {
        slug: 'kyoto-japan',
        name: 'Kyoto',
        country: 'Japan',
        tagline: 'Moss gardens, wooden machiya and quiet temple mornings.',
        img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80',
    },
    {
        slug: 'lisbon-portugal',
        name: 'Lisbon',
        country: 'Portugal',
        tagline: 'Tiled hillsides, old trams and Atlantic light.',
        img: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=900&q=80',
    },
    {
        slug: 'paris-france',
        name: 'Paris',
        country: 'France',
        tagline: 'Boulevards, small galleries and long lunches.',
        img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80',
    },
    {
        slug: 'tokyo-japan',
        name: 'Tokyo',
        country: 'Japan',
        tagline: 'Neighbourhood by neighbourhood, without the zig-zags.',
        img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80',
    },
];

const COMPARISON = [
    'Venues checked against live Google Places data',
    'Real opening hours and ratings for each stop',
    'Stops ordered to avoid back-and-forth travel',
    'Budget checked day by day',
    'Places it can’t verify are clearly marked',
];

const PLANE_PATH =
    'M 12 0 L -6 -2 L -10 -9 L -13 -9 L -10 -2 L -14 -1.5 L -16 -5 L -18 -5 L -17 0 L -18 5 L -16 5 L -14 1.5 L -10 2 L -13 9 L -10 9 L -6 2 Z';

export default function Home() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const handleQuickSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        router.push(q ? `/plan-trip?destination=${encodeURIComponent(q)}` : '/plan-trip');
    };

    return (
        <SmoothScroll>
            <div className="flex flex-col bg-background text-slate-100">

                {/* ── 1. HERO ─────────────────────────────────────────────── */}
                <section className="relative overflow-hidden grain">
                    <div className="pointer-events-none absolute -right-40 top-10 h-[640px] w-[640px] rounded-full bg-sunrise-300/[0.07] blur-[120px]" />

                    <div className="container max-w-7xl mx-auto px-4 pt-14 md:pt-20 pb-10 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] items-center gap-4 lg:gap-0 relative z-10">
                        <div className="max-w-xl">
                            <motion.span
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: EASE }}
                                className="eyebrow inline-flex items-center gap-2 mb-8"
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-sunrise-300" />
                                AI trip planner · verified places
                            </motion.span>

                            <motion.h1
                                initial={{ opacity: 0, y: 28 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
                                className="font-heading text-[3.3rem] leading-[0.95] sm:text-7xl lg:text-[5.4rem] xl:text-[6rem] text-slate-100"
                            >
                                Plan the trip.
                                <br />
                                <em className="text-sunrise-300">
                                    Every place
                                    <br />
                                    is real.
                                </em>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: EASE, delay: 0.18 }}
                                className="mt-7 text-base sm:text-lg text-slate-400 leading-relaxed max-w-md"
                            >
                                A day-by-day itinerary built from live map data — real venues, real
                                opening hours, routed in walking order and kept inside your budget.
                            </motion.p>

                            <motion.form
                                onSubmit={handleQuickSearch}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: EASE, delay: 0.28 }}
                                className="mt-10 flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.03] p-1.5 pl-5 focus-within:border-sunrise-300/60 transition-colors max-w-lg"
                            >
                                <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Where to next?"
                                    aria-label="Destination"
                                    className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-100 placeholder:text-slate-500 outline-none focus-visible:outline-none"
                                />
                                <button
                                    type="submit"
                                    className="btn-apple-primary h-11 rounded-full px-5 text-sm inline-flex items-center gap-2 whitespace-nowrap"
                                >
                                    Plan my trip
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </motion.form>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.8, delay: 0.45 }}
                                className="mt-5 flex flex-wrap items-center gap-2 text-xs"
                            >
                                <span className="text-slate-500 mr-1">Try</span>
                                {QUICK_DESTINATIONS.map(item => (
                                    <button
                                        key={item.label}
                                        type="button"
                                        onClick={() =>
                                            router.push(`/plan-trip?destination=${encodeURIComponent(item.label)}&days=${item.days}`)
                                        }
                                        className="rounded-full border border-white/[0.08] px-3 py-1.5 text-slate-300 hover:border-white/25 hover:text-slate-100 transition-colors"
                                    >
                                        {item.days} days in {item.label.split(',')[0]}
                                    </button>
                                ))}
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1.4, ease: EASE, delay: 0.1 }}
                            className="relative mx-auto aspect-square w-full max-w-[420px] sm:max-w-[560px] lg:max-w-none lg:-mr-10 cursor-grab active:cursor-grabbing"
                        >
                            <RealisticGlobe className="absolute inset-0" />
                        </motion.div>
                    </div>

                    {/* facts strip */}
                    <div className="container max-w-7xl mx-auto px-4 pb-16 relative z-10">
                        <dl className="grid grid-cols-2 md:grid-cols-4 border-t border-white/[0.08]">
                            {[
                                ['100%', 'of venues verified in our tests'],
                                ['~40 s', 'from request to full itinerary'],
                                ['8', 'specialist agents per trip'],
                                ['Free', 'to start · no card needed'],
                            ].map(([value, label], i) => (
                                <div
                                    key={label}
                                    className={`pt-6 pb-2 pr-4 ${i % 2 === 1 ? 'border-l border-white/[0.08] pl-6' : ''} ${i === 2 ? 'md:border-l md:border-white/[0.08] md:pl-6' : ''}`}
                                >
                                    <dt className="font-heading text-4xl text-slate-100">{value}</dt>
                                    <dd className="mt-1 text-xs text-slate-500">{label}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                <DestinationTicker />

                {/* ── 2. HOW IT WORKS (scroll flight path) ────────────────── */}
                <FlightPathSteps />

                {/* ── 3. ITINERARY PREVIEW ───────────────────────────────── */}
                <InteractiveItineraryShowcase />

                {/* ── 4. WHY IT'S DIFFERENT ──────────────────────────────── */}
                <section className="py-28 md:py-36 px-4 border-t border-white/[0.06]">
                    <div className="container max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.15fr] gap-14 lg:gap-20 items-start">
                        <div className="lg:sticky lg:top-28">
                            <span className="eyebrow block mb-4">Why it’s different</span>
                            <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl text-slate-100 leading-[1.02]">
                                Chatbots guess.
                                <br />
                                <em className="text-sunrise-300">We check.</em>
                            </h2>
                            <p className="mt-6 text-slate-400 leading-relaxed max-w-md">
                                General AI chat invents addresses and opening hours it was never sure about.
                                We fetch the facts from live map data first, then let AI arrange them —
                                so you don’t walk up to a closed door.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-white/[0.08] overflow-hidden">
                            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 sm:gap-x-6 px-5 sm:px-6 py-4 border-b border-white/[0.08] text-xs text-slate-500">
                                <span />
                                <span className="w-14 sm:w-16 text-center">AI chat</span>
                                <span className="w-14 sm:w-16 text-center text-sunrise-300">Us</span>
                            </div>
                            {COMPARISON.map((label, i) => (
                                <motion.div
                                    key={label}
                                    initial={{ opacity: 0, x: 16 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                                    className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 sm:gap-x-6 px-5 sm:px-6 py-5 border-b border-white/[0.06] last:border-b-0"
                                >
                                    <span className="text-sm text-slate-200">{label}</span>
                                    <span className="w-14 sm:w-16 flex justify-center">
                                        <X className="h-4 w-4 text-slate-600" />
                                    </span>
                                    <span className="w-14 sm:w-16 flex justify-center">
                                        <Check className="h-4 w-4 text-sunrise-300" />
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 5. DESTINATIONS ────────────────────────────────────── */}
                <section className="py-28 md:py-36 px-4 border-t border-white/[0.06]">
                    <div className="container max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
                            <div>
                                <span className="eyebrow block mb-4">Start somewhere</span>
                                <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl text-slate-100">
                                    Places worth the flight
                                </h2>
                            </div>
                            <Link
                                href="/discover"
                                className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-sunrise-300 transition-colors"
                            >
                                All destination guides <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {featuredDestinations.map((dest, i) => (
                                <motion.div
                                    key={dest.slug}
                                    initial={{ opacity: 0, y: 28 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-60px' }}
                                    transition={{ duration: 0.8, delay: i * 0.08, ease: EASE }}
                                >
                                    <Link href={`/discover/${dest.slug}` as any} className="group block">
                                        <div className="relative aspect-[4/3] sm:aspect-[3/4] overflow-hidden rounded-2xl bg-white/[0.03]">
                                            <img
                                                src={dest.img}
                                                alt={`${dest.name}, ${dest.country}`}
                                                loading="lazy"
                                                className="h-full w-full object-cover saturate-[0.65] brightness-[0.85] transition-all duration-[1200ms] ease-out group-hover:scale-[1.04] group-hover:saturate-100 group-hover:brightness-100"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                                            <span className="absolute bottom-4 left-4 text-xs text-slate-300">{dest.country}</span>
                                            <span className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-background/60 backdrop-blur text-slate-100 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                                <ArrowUpRight className="h-4 w-4" />
                                            </span>
                                        </div>
                                        <h3 className="mt-4 font-heading text-3xl text-slate-100">{dest.name}</h3>
                                        <p className="mt-1 text-sm text-slate-500 leading-relaxed">{dest.tagline}</p>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 6. FINAL CTA ───────────────────────────────────────── */}
                <section className="relative overflow-hidden py-32 md:py-44 px-4 border-t border-white/[0.06]">
                    <div className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 h-[520px] w-[1100px] rounded-full bg-sunrise-300/[0.12] blur-[120px]" />

                    {/* plane crossing the sky */}
                    <motion.svg
                        aria-hidden="true"
                        viewBox="-18 -10 32 20"
                        className="absolute top-24 h-5 w-8 text-slate-300/50"
                        initial={{ left: '-5%' }}
                        animate={{ left: '105%' }}
                        transition={{ duration: 16, ease: 'linear', repeat: Infinity, repeatDelay: 2 }}
                        fill="currentColor"
                    >
                        <path d={PLANE_PATH} />
                    </motion.svg>

                    <div className="container max-w-4xl mx-auto text-center relative z-10">
                        <h2 className="font-heading text-5xl sm:text-6xl md:text-8xl text-slate-100 leading-[0.95]">
                            Where are you
                            <br />
                            <em className="text-sunrise-300">going next?</em>
                        </h2>
                        <p className="mt-6 text-slate-400 max-w-md mx-auto">
                            Your first itineraries are free. No credit card, no endless tabs.
                        </p>
                        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href="/plan-trip"
                                className="btn-apple-primary h-12 rounded-full px-7 text-sm inline-flex items-center gap-2"
                            >
                                Start planning free <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/pricing"
                                className="btn-apple-glass h-12 rounded-full px-7 text-sm inline-flex items-center"
                            >
                                See pricing
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </SmoothScroll>
    );
}
