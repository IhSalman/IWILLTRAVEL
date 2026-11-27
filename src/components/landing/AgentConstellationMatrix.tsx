'use client';

import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
    Compass, ShieldCheck, Plane, Mic, Leaf,
    ArrowUpRight, Sparkles, CheckCircle2, MapPin, Calculator, Route, FileCheck2
} from 'lucide-react';
import { Link } from '@/i18n/routing';

interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
}

function TiltCard({ children, className = '' }: TiltCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 320, damping: 28 });
    const mouseYSpring = useSpring(y, { stiffness: 320, damping: 28 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['4deg', '-4deg']);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-4deg', '4deg']);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
            }}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className={`relative rounded-[28px] p-6 sm:p-7 apple-glass-card ${className}`}
        >
            <div style={{ transform: 'translateZ(14px)' }} className="h-full flex flex-col justify-between">
                {children}
            </div>
        </motion.div>
    );
}

const PIPELINE_STEPS = [
    { num: '01', name: 'Discovery', detail: 'Google Places grounding' },
    { num: '02', name: 'Planning', detail: 'Neighborhood day skeleton' },
    { num: '03', name: 'Research', detail: 'Amadeus flights & hotels' },
    { num: '04', name: 'Logic Audit', detail: 'Budget & time feasibility' },
    { num: '05', name: 'Experience', detail: 'Local dining & insider tips' },
    { num: '06', name: 'Logistics', detail: 'Google Routes zero-backtrack' },
    { num: '07', name: 'Sustainability', detail: 'Carbon & ESG footprint' },
    { num: '08', name: 'Composer', detail: 'Verified trip synthesis' },
];

export function AgentConstellationMatrix() {
    const [audioActive] = useState(true);

    return (
        <section className="py-24 px-4 relative overflow-hidden bg-[#0b0c0f] text-slate-100 border-t border-white/[0.06]">
            {/* Ambient Glows */}
            <div className="absolute top-1/3 -left-40 w-96 h-96 bg-sky-500/[0.06] blur-[140px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-amber-400/[0.04] blur-[140px] rounded-full pointer-events-none" />

            <div className="container max-w-6xl mx-auto relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest apple-glass-pill text-sky-300 mb-4">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>8-Agent Autonomous Pipeline</span>
                    </div>
                    <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-white mb-5 leading-tight">
                        Eight Specialized Agents.{' '}
                        <span className="italic font-normal text-gradient-champagne">
                            Zero Hallucinated Venues.
                        </span>
                    </h2>
                    <p className="text-slate-300/85 text-base sm:text-lg leading-relaxed">
                        Every itinerary runs through an 8-stage orchestration pipeline backed by live Google Places coordinates, Google Routes transit math, Amadeus fare feeds, and dedicated border & language intelligence.
                    </p>
                </div>

                {/* Live 8-Stage Pipeline Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-10">
                    {PIPELINE_STEPS.map((stage) => (
                        <div
                            key={stage.num}
                            className="rounded-2xl p-3 apple-glass-pill flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-mono text-sky-300 font-semibold tabular-nums">
                                    AGENT {stage.num}
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            </div>
                            <div className="text-xs font-semibold text-white">{stage.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{stage.detail}</div>
                        </div>
                    ))}
                </div>

                {/* Apple Spatial Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* 1. DISCOVERY, PLANNING & ROUTE LOGISTICS (Agents 1, 2 & 6) */}
                    <TiltCard className="lg:col-span-2">
                        <div>
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300">
                                        <Route className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white font-heading">Agents 1, 2 & 6: Spatial Discovery & Zero-Backtrack Routing</h3>
                                        <p className="text-xs text-slate-400 font-mono">Google Places + Google Routes API</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-semibold apple-glass-pill text-emerald-300">
                                    Verified Coordinates
                                </span>
                            </div>

                            <p className="text-xs sm:text-sm text-slate-300/85 mb-6 leading-relaxed">
                                Grounds every stop against real Google Places IDs, opening hours, and ratings—then sequences each day by neighborhood proximity with exact walk, subway, or drive minutes between stops.
                            </p>

                            {/* Animated SVG Trajectory Path */}
                            <div className="relative h-28 bg-[#0b0c0f]/85 rounded-2xl p-4 border border-white/[0.08] overflow-hidden">
                                <svg className="w-full h-full" viewBox="0 0 500 80" fill="none">
                                    <path
                                        d="M 30 42 Q 150 10 250 45 T 470 32"
                                        stroke="#222328"
                                        strokeWidth="3"
                                        strokeDasharray="6 6"
                                    />
                                    <motion.path
                                        d="M 30 42 Q 150 10 250 45 T 470 32"
                                        stroke="url(#apple-route-grad)"
                                        strokeWidth="3.5"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                    <defs>
                                        <linearGradient id="apple-route-grad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#f3b87f" />
                                            <stop offset="55%" stopColor="#e2e8f0" />
                                            <stop offset="100%" stopColor="#fde68a" />
                                        </linearGradient>
                                    </defs>
                                    <circle cx="30" cy="42" r="5" fill="#f3b87f" />
                                    <circle cx="250" cy="45" r="5" fill="#e2e8f0" />
                                    <circle cx="470" cy="32" r="6" fill="#fde68a" />
                                </svg>

                                <div className="absolute bottom-2.5 left-4 right-4 flex justify-between text-[10px] font-mono text-slate-300">
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-sky-300" /> Sensō-ji (09:00)</span>
                                    <span>12m walk → Sumida Promenade</span>
                                    <span>8m Ginza Line → Yanaka</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono tabular-nums">Weather + Air Quality AQI Enriched</span>
                            <Link href="/plan-trip" className="text-white hover:text-sky-300 font-semibold inline-flex items-center gap-1 transition-colors">
                                Launch AI Planner <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </TiltCard>

                    {/* 2. RESEARCH: AMADEUS FLIGHTS & STAYS (Agent 3) */}
                    <TiltCard>
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center text-sky-300">
                                        <Plane className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white font-heading">Agent 3: Flights & Stays</h3>
                                        <p className="text-xs text-slate-400 font-mono">Amadeus GDS Inventory</p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono apple-glass-pill text-sky-200">
                                    Live
                                </span>
                            </div>

                            <p className="text-xs text-slate-300/85 mb-5 leading-relaxed">
                                Fetches live airline routes, duration vs. price trade-offs, and top-rated hotels tailored to your budget tier.
                            </p>

                            <div className="p-4 rounded-2xl bg-[#0b0c0f]/85 border border-white/[0.08] text-slate-200">
                                <div className="flex items-center justify-between border-b border-white/[0.07] pb-2 mb-2 font-mono text-[11px] tabular-nums">
                                    <span className="text-slate-400">NH 109 · ANA DIRECT</span>
                                    <span className="text-emerald-300 font-semibold">Best Value</span>
                                </div>
                                <div className="flex items-center justify-between my-2 font-mono tabular-nums">
                                    <div>
                                        <div className="text-xl font-bold text-white">JFK</div>
                                        <div className="text-[10px] text-slate-400">11:30</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] text-slate-400">14h 25m</div>
                                        <div className="w-20 h-0.5 bg-slate-700 my-1 relative">
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-300" />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-white">HND</div>
                                        <div className="text-[10px] text-slate-400">15:55 +1</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono">20+ Currencies Supported</span>
                            <Link href="/plan-trip" className="text-white hover:text-sky-300 font-semibold inline-flex items-center gap-1 transition-colors">
                                Include Flights <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </TiltCard>

                    {/* 3. LOGIC CHECKER & EXPERIENCE (Agents 4 & 5) */}
                    <TiltCard>
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-300/25 flex items-center justify-center text-amber-200">
                                        <Calculator className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white font-heading">Agents 4 & 5: Feasibility & Insider</h3>
                                        <p className="text-xs text-slate-400 font-mono">Physics, Budget & Culinary Audit</p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-300/85 mb-5 leading-relaxed">
                                Audits daily pacing against crowd levels and budget caps while pairing every activity with authentic nearby dining.
                            </p>

                            <div className="p-4 rounded-2xl bg-[#0b0c0f]/85 border border-white/[0.08] space-y-2.5 text-xs font-mono">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Pacing Physics</span>
                                    <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Daily Spend Target</span>
                                    <span className="text-white tabular-nums">$118 / $125 cap</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Hidden Gem Ratio</span>
                                    <span className="text-amber-200">94% Local Spots</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono">Agents 7 & 8: ESG + Composer</span>
                            <Link href="/travel-research" className="text-white hover:text-sky-300 font-semibold inline-flex items-center gap-1 transition-colors">
                                Research Any City <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </TiltCard>

                    {/* 4. VISA & BORDER COMPLIANCE HUB */}
                    <TiltCard>
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center text-emerald-300">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white font-heading">Visa & Policy Decoder</h3>
                                        <p className="text-xs text-slate-400 font-mono">4-Tool Border Intelligence</p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-300/85 mb-5 leading-relaxed">
                                Check passport entry status, generate interactive document checklists, inspect passport power, and translate dense embassy text into plain English.
                            </p>

                            <div className="relative p-4 rounded-2xl bg-[#0b0c0f]/85 border border-white/[0.08] flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                                        Corridor Clearance
                                    </div>
                                    <div className="text-sm font-heading font-bold text-white mt-0.5">
                                        Visa-Free · 90 Days Max
                                    </div>
                                    <div className="text-[10px] text-emerald-300 font-mono mt-1 flex items-center gap-1">
                                        <FileCheck2 className="w-3 h-3" /> Checklist & Embassy Links Ready
                                    </div>
                                </div>

                                <div className="w-12 h-12 rounded-full border border-dashed border-emerald-300/40 flex items-center justify-center text-center p-1 rotate-6 bg-emerald-400/10">
                                    <div className="text-[8px] font-mono font-semibold text-emerald-200 uppercase leading-tight">
                                        CLEAR<br />ENTRY
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono">190+ Countries Indexed</span>
                            <Link href="/visa-hub" className="text-white hover:text-sky-300 font-semibold inline-flex items-center gap-1 transition-colors">
                                Open Visa Hub <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </TiltCard>

                    {/* 5. LINGUASPHERE TRANSLATOR */}
                    <TiltCard>
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-400/25 flex items-center justify-center text-indigo-300">
                                        <Mic className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white font-heading">LinguaSphere™ AI</h3>
                                        <p className="text-xs text-slate-400 font-mono">Voice, Phonetics & Etiquette</p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-300/85 mb-5 leading-relaxed">
                                Speech-to-text, natural audio playback, phonetic pronunciation guides, and cultural nuance notes across 16 global travel languages.
                            </p>

                            <div className="p-4 rounded-2xl bg-[#0b0c0f]/85 border border-white/[0.08]">
                                <div className="flex items-center justify-between mb-2.5 text-[11px] font-mono">
                                    <span className="text-slate-200">English → Japanese</span>
                                    <span className="text-sky-300 flex items-center gap-1"><Leaf className="w-3 h-3" /> Cultural Context</span>
                                </div>

                                <div className="flex items-end justify-center gap-1 h-9 py-1">
                                    {[35, 65, 90, 45, 80, 100, 65, 40, 85, 95, 50, 75, 90, 60, 40, 70].map((h, i) => (
                                        <motion.div
                                            key={i}
                                            className="w-1.5 rounded-full bg-sky-300/75"
                                            animate={{
                                                height: audioActive ? [`${h * 0.32}%`, `${h}%`, `${h * 0.38}%`] : '25%',
                                            }}
                                            transition={{
                                                duration: 1.3,
                                                repeat: Infinity,
                                                delay: i * 0.05,
                                                ease: 'easeInOut',
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="mt-2 text-center text-[10px] font-mono text-slate-300">
                                    “Osusume wa nan desu ka?” · What do you recommend?
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono">16 Languages · Audio TTS</span>
                            <Link href="/translate" className="text-white hover:text-sky-300 font-semibold inline-flex items-center gap-1 transition-colors">
                                Open Translator <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </TiltCard>

                </div>
            </div>
        </section>
    );
}
