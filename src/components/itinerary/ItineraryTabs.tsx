'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    MapPin, Clock, DollarSign, Lightbulb, AlertTriangle,
    PiggyBank, ExternalLink, ChevronRight, CheckCircle,
    Users, Calendar, Wallet, Compass, Shield, Globe,
    RotateCcw, Save, Printer, Share2, Search, Zap,
    Star, Image, Eye, Plane, Hotel, Trophy, ArrowRight
} from 'lucide-react';
import RoadmapTab from './RoadmapTab';
import type { PlaceResearch } from '@/app/api/research-place/route';

// ── TYPES ──────────────────────────────────────────────────────────────────

interface ResourceLink { label: string; url: string; }

interface Activity {
    time: string;       // Period label: "Morning" | "Afternoon" | "Evening" etc.
    title: string;
    description: string;
    duration?: string;
    cost?: string;
    tip?: string;
    transportNote?: string;
    photoUrl?: string | null;
    highlights?: string[];
    editorialSummary?: string;
    rating?: number;
    totalRatings?: number;
    address?: string;
    openingHours?: string[];
    source?: string;
}

interface DayResources {
    whereToEat?: ResourceLink[];
    experiences?: ResourceLink[];
    transportTip?: string;
}

interface Day {
    day: number;
    theme: string;
    areaFocus?: string;
    difficulty?: 'high' | 'medium' | 'low';
    pace?: string;
    activities: Activity[];
    dayResources?: DayResources;
    dayLinks?: ResourceLink[]; // backward compat
}

interface RealityItem {
    level: 'high' | 'medium' | 'low';
    description: string;
}

interface FlightData {
    from: string;
    to: string;
    price: number;
    date: string;
    airline?: string;
    duration?: string;
    stops?: number;
    departureTime?: string;
    source?: string;
    bookingUrl?: string;
}

interface HotelData {
    city: string;
    name: string;
    price: number;
    rating?: number;
    roomType?: string;
    source?: string;
    bookingUrl?: string;
    stars?: number;
    tag?: string;
    location?: string;
    reviewScore?: number;
}

interface Itinerary {
    title: string;
    overview: string;
    bestTimeToVisit?: string;
    whyThisPlan?: string[];
    travelTips?: string[];
    localCustoms?: string[];
    safetyAdvice?: string[];
    budgetTips?: string[];
    realityCheck?: {
        crowds?: RealityItem;
        physical?: RealityItem;
        weather?: string[];
    };
    days: Day[];
    budgetBreakdown?: {
        totalEstimate: string;
        savingTips?: string[];
    };
}

interface Props {
    itinerary: Itinerary;
    research: PlaceResearch | null;
    destination: string;
    companions: string;
    budget: string;
    pace: string;
    transportation: string;
    onSave: () => void;
    onRegenerate: () => void;
    isSaving: boolean;
    flights?: FlightData[];
    hotels?: HotelData[];
    flightAnalysis?: { recommendation: string; bestOption: FlightData | null } | null;
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-500', label: 'high' },
    medium: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-500', label: 'medium' },
    low: { bg: 'bg-green-500/15 border-green-500/30', text: 'text-green-500', label: 'low' },
};

const TIME_COLOR: Record<string, string> = {
    'morning': 'text-amber-600 dark:text-amber-400',
    'late morning': 'text-orange-500',
    'afternoon': 'text-blue-600 dark:text-blue-400',
    'early evening': 'text-purple-500',
    'evening': 'text-indigo-500',
    'late evening': 'text-violet-600',
    'night': 'text-slate-500',
};

function timeLabelColor(label: string) {
    return TIME_COLOR[label.toLowerCase()] ?? 'text-muted-foreground';
}

function DifficultyBadge({ level }: { level?: string }) {
    if (!level) return null;
    const s = DIFFICULTY_STYLES[level] ?? DIFFICULTY_STYLES.medium;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.bg} ${s.text}`}>
            {s.label}
        </span>
    );
}

function PaceBadge({ pace }: { pace?: string }) {
    if (!pace) return null;
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted/60 text-muted-foreground border border-border/50">
            {pace.toLowerCase()}
        </span>
    );
}

const BASE_TABS = [
    { id: 'itinerary', label: '📍 Itinerary' },
    { id: 'roadmap', label: '🗺️ Roadmap' },
    { id: 'budget', label: '💰 Budget' },
    { id: 'visa', label: '✈️ Visa' },
    { id: 'tips', label: '💡 Tips' },
    { id: 'score', label: '📊 Score' },
];

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function ItineraryTabs({
    itinerary, research, destination, companions, budget, pace, transportation,
    onSave, onRegenerate, isSaving, flights, hotels, flightAnalysis
}: Props) {
    const [activeTab, setActiveTab] = useState('itinerary');
    const [expandedDay, setExpandedDay] = useState<number | null>(0);
    const [nationality, setNationality] = useState('');
    const [visaData, setVisaData] = useState<any>(null);
    const [visaLoading, setVisaLoading] = useState(false);

    const mapsEmbedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || '';

    const TABS = [
        ...BASE_TABS.slice(0, 2), // Itinerary, Roadmap
        { id: 'flights', label: '✈️ Flights' },
        { id: 'hotels', label: '🏨 Hotels' },
        ...BASE_TABS.slice(2), // Budget, Visa, Tips, Score
    ];

    const checkVisa = async () => {
        if (!nationality) return;
        setVisaLoading(true);
        try {
            const res = await fetch('/api/visa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: nationality, destination }),
            });
            if (res.ok) setVisaData(await res.json());
        } finally {
            setVisaLoading(false);
        }
    };

    const visaStatusColors: Record<string, string> = {
        green: 'bg-green-500/10 border-green-500/40 text-green-600',
        blue: 'bg-blue-500/10 border-blue-500/40 text-blue-600',
        yellow: 'bg-amber-500/10 border-amber-500/40 text-amber-600',
        orange: 'bg-orange-500/10 border-orange-500/40 text-orange-600',
        red: 'bg-red-500/10 border-red-500/40 text-red-600',
    };

    return (
        <div className="w-full space-y-6">

            {/* ── HERO HEADER ──────────────────────────────────────────── */}
            <div className="rounded-3xl border border-border/50 bg-card shadow-lg overflow-hidden">
                {/* Map */}
                {mapsEmbedKey ? (
                    <div className="relative h-52 bg-muted">
                        <iframe
                            title={`Map of ${destination}`}
                            width="100%" height="100%"
                            loading="lazy" allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.google.com/maps/embed/v1/search?key=${mapsEmbedKey}&q=${encodeURIComponent(destination)}`}
                            className="w-full h-full"
                            style={{ border: 0 }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent pointer-events-none" />
                        <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-sm font-semibold">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>{destination}</span>
                        </div>
                    </div>
                ) : (
                    <div className="h-16 bg-gradient-to-r from-primary/20 via-blue-500/10 to-emerald-500/20" />
                )}

                {/* Title & meta */}
                <div className="p-6 space-y-4">
                    <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{itinerary.title}</h1>
                    <p className="text-muted-foreground leading-relaxed">{itinerary.overview}</p>

                    {/* Info pills */}
                    <div className="flex flex-wrap gap-3 pt-1">
                        {itinerary.budgetBreakdown?.totalEstimate && (
                            <InfoPill icon={<Wallet className="w-3.5 h-3.5" />} label={itinerary.budgetBreakdown.totalEstimate} />
                        )}
                        {itinerary.bestTimeToVisit && (
                            <InfoPill icon={<Calendar className="w-3.5 h-3.5" />} label={itinerary.bestTimeToVisit.split('.')[0]} />
                        )}
                        <InfoPill icon={<Compass className="w-3.5 h-3.5" />} label={`${pace} Pace`} />
                        <InfoPill icon={<Clock className="w-3.5 h-3.5" />} label={`${itinerary.days.length} days`} />
                        <InfoPill icon={<Users className="w-3.5 h-3.5" />} label={companions} />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                        <Button size="sm" onClick={onSave} disabled={isSaving} className="rounded-full px-5 h-8 text-xs">
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            {isSaving ? 'Saving…' : 'Save Trip'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={onRegenerate} className="rounded-full px-5 h-8 text-xs">
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Regenerate
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.print()} className="rounded-full px-5 h-8 text-xs">
                            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print / PDF
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full px-5 h-8 text-xs"
                            onClick={() => navigator.share?.({ title: itinerary.title, url: window.location.href })}>
                            <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── TAB BAR ──────────────────────────────────────────────── */}
            <div className="flex overflow-x-auto scrollbar-hide border-b border-border/50 gap-0">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-shrink-0 px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap -mb-px
                            ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── TAB CONTENT ──────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                >

                    {/* ── 📍 ITINERARY TAB ─────────────────────────────── */}
                    {activeTab === 'itinerary' && (
                        <div className="space-y-3">
                            {itinerary.days.map((day, i) => {
                                const isExpanded = expandedDay === i;
                                // Merge dayLinks into dayResources for backward compat
                                const resources: DayResources = day.dayResources ?? {
                                    whereToEat: day.dayLinks?.slice(0, 3).map(l => ({ label: l.label, url: l.url })),
                                    experiences: day.dayLinks?.slice(3).map(l => ({ label: l.label, url: l.url })),
                                };

                                return (
                                    <Card key={i} className="border-border/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        {/* Day header */}
                                        <button className="w-full text-left" onClick={() => setExpandedDay(isExpanded ? null : i)}>
                                            <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-primary font-black text-base">{day.day}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                            <h3 className="font-bold text-base flex items-center gap-1.5">🧳 Day {day.day}: {day.theme}</h3>
                                                        </div>
                                                        {day.areaFocus && (
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" /> {day.areaFocus}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                                                        {day.activities.length} activities
                                                    </Badge>
                                                    <DifficultyBadge level={day.difficulty} />
                                                    <PaceBadge pace={day.pace} />
                                                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expandable activities */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.22 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="border-t border-border/40">
                                                        {/* Activity list */}
                                                        <div className="divide-y divide-border/30">
                                                            {day.activities.map((act, j) => (
                                                                <div key={j} className="px-5 py-5 hover:bg-muted/10 transition-colors">
                                                                    {/* Place Photo */}
                                                                    {act.photoUrl && (
                                                                        <div className="relative w-full h-44 rounded-xl overflow-hidden mb-4 group">
                                                                            <img
                                                                                src={act.photoUrl}
                                                                                alt={act.title}
                                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                                loading="lazy"
                                                                            />
                                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                                                            {act.rating && (
                                                                                <div className="absolute bottom-2 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-semibold">
                                                                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                                                    {act.rating}{act.totalRatings ? ` (${act.totalRatings.toLocaleString()})` : ''}
                                                                                </div>
                                                                            )}
                                                                            {act.source && (
                                                                                <span className="absolute bottom-2 right-3 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-[10px]">
                                                                                    📍 {act.source}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Time period label */}
                                                                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${timeLabelColor(act.time)}`}>
                                                                        {act.time}
                                                                    </p>

                                                                    <div className="space-y-3 mb-4">
                                                                        {/* Title (📍 Place Name) */}
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <h4 className="font-bold text-base text-primary flex items-start gap-2">
                                                                                <span className="flex-shrink-0">📍</span> 
                                                                                <span>{act.title}</span>
                                                                            </h4>
                                                                            {!act.photoUrl && act.rating && (
                                                                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold flex-shrink-0 mt-0.5">
                                                                                    <Star className="w-3 h-3 fill-current" /> {act.rating}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Location (🌍 Location) */}
                                                                        <p className="text-sm text-foreground/90 font-medium flex items-start gap-2">
                                                                            <span className="flex-shrink-0">🌍</span> 
                                                                            <span>{act.address || 'Local Area'}</span>
                                                                        </p>

                                                                        {/* Google Maps Link (🔗 Google Maps: [link]) */}
                                                                        <div className="text-sm font-medium flex items-center gap-2">
                                                                            <span className="flex-shrink-0">🔗</span> 
                                                                            <a 
                                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.title + (act.address ? ' ' + act.address : ''))}`}
                                                                                target="_blank" 
                                                                                rel="noreferrer"
                                                                                className="inline-flex items-center justify-center h-7 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                                                                            >
                                                                                View on Google Maps
                                                                            </a>
                                                                        </div>

                                                                        {/* Why visit (📝 Why visit) */}
                                                                        <div className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                                                                            <span className="flex-shrink-0">📝</span> 
                                                                            <div>
                                                                                <span className="font-semibold text-foreground/80 block mb-0.5">Why visit:</span>
                                                                                {act.description || act.editorialSummary}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Highlights */}
                                                                    {act.highlights && act.highlights.length > 0 && (
                                                                        <div className="mb-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                                                            <p className="text-xs font-bold uppercase tracking-wider text-primary/70 mb-2 flex items-center gap-1.5">
                                                                                <Eye className="w-3 h-3" /> What You&apos;ll Experience
                                                                            </p>
                                                                            <ul className="space-y-1.5">
                                                                                {act.highlights.map((h, k) => (
                                                                                    <li key={k} className="flex items-start gap-2 text-xs text-foreground/80">
                                                                                        <span className="text-primary mt-0.5 flex-shrink-0">✦</span>
                                                                                        <span>{h}</span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}

                                                                    {/* Duration + Cost + Address pills */}
                                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                                        {act.duration && (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-xs text-foreground/80 border border-border/40 font-medium">
                                                                                <Clock className="w-3 h-3" /> {act.duration}
                                                                            </span>
                                                                        )}
                                                                        {act.cost && (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/8 text-xs text-green-700 dark:text-green-400 border border-green-500/20 font-medium">
                                                                                <DollarSign className="w-3 h-3" /> {act.cost}
                                                                            </span>
                                                                        )}
                                                                        {act.address && (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-xs text-foreground/60 border border-border/30 font-medium truncate max-w-[200px]">
                                                                                <MapPin className="w-3 h-3 flex-shrink-0" /> {act.address}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Transport note */}
                                                                    {act.transportNote && (
                                                                        <p className="text-xs text-muted-foreground/80 flex items-start gap-1.5 mb-2">
                                                                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                            {act.transportNote}
                                                                        </p>
                                                                    )}

                                                                    {/* Insider tip */}
                                                                    {act.tip && (
                                                                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/6 border border-amber-500/20 mt-1">
                                                                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                                                            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{act.tip}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Day Resources */}
                                                        {(resources.whereToEat?.length || resources.experiences?.length || resources.transportTip) && (
                                                            <div className="bg-muted/20 border-t border-border/40 px-5 py-4">
                                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                                                                    Day {day.day} Resources
                                                                </p>

                                                                <div className="grid sm:grid-cols-2 gap-4">
                                                                    {/* Where to Eat */}
                                                                    {resources.whereToEat?.length ? (
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-foreground/70 mb-2">Where to Eat</p>
                                                                            <div className="space-y-1.5">
                                                                                {resources.whereToEat.map((link, k) => (
                                                                                    <a
                                                                                        key={k}
                                                                                        href={link.url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group text-xs"
                                                                                    >
                                                                                        <Search className="w-3 h-3 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                                                                                        <span className="font-medium group-hover:text-primary transition-colors line-clamp-1">{link.label}</span>
                                                                                        <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : null}

                                                                    {/* Book Experiences */}
                                                                    {resources.experiences?.length ? (
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-foreground/70 mb-2">Book Experiences</p>
                                                                            <div className="space-y-1.5">
                                                                                {resources.experiences.map((link, k) => (
                                                                                    <a
                                                                                        key={k}
                                                                                        href={link.url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group text-xs"
                                                                                    >
                                                                                        <Zap className="w-3 h-3 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                                                                                        <span className="font-medium group-hover:text-primary transition-colors line-clamp-1">{link.label}</span>
                                                                                        <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : null}
                                                                </div>

                                                                {/* Transport tip */}
                                                                {resources.transportTip && (
                                                                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30 flex items-start gap-1.5">
                                                                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                        {resources.transportTip}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* ── 🗺️ ROADMAP TAB ─────────────────────────────── */}
                    {activeTab === 'roadmap' && (
                        <RoadmapTab itinerary={itinerary} />
                    )}

                    {/* ── 💰 BUDGET TAB ────────────────────────────────── */}
                    {activeTab === 'budget' && (
                        <div className="space-y-5">
                            {/* Total */}
                            <Card className="border-primary/20 bg-primary/5">
                                <CardContent className="p-6 text-center">
                                    <p className="text-sm text-muted-foreground mb-1 font-medium uppercase tracking-wider">Total Estimated Budget</p>
                                    <p className="text-4xl font-black text-primary">{itinerary.budgetBreakdown?.totalEstimate ?? '—'}</p>
                                    <p className="text-sm text-muted-foreground mt-1">per person · excludes international flights</p>
                                </CardContent>
                            </Card>

                            {/* Profile breakdown */}
                            <Card className="border-border/40">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trip Profile</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Duration', value: `${itinerary.days.length} days` },
                                            { label: 'Budget Level', value: budget },
                                            { label: 'Pace', value: pace },
                                            { label: 'Transport', value: transportation },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="p-3 rounded-xl bg-muted/40">
                                                <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
                                                <dd className="font-semibold text-sm">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </CardContent>
                            </Card>

                            {/* Saving tips */}
                            {itinerary.budgetBreakdown?.savingTips?.length ? (
                                <Card className="border-green-500/20 bg-green-500/5">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                            <PiggyBank className="w-5 h-5" /> Money-Saving Tips
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2.5">
                                            {itinerary.budgetBreakdown.savingTips.map((tip, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-sm">
                                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                    <span>{tip}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ) : null}

                            {/* Budget tips from AI */}
                            {itinerary.budgetTips?.length ? (
                                <Card className="border-border/40">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-sm">
                                            <Lightbulb className="w-4 h-4 text-amber-500" /> Extra Budget Tips
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {itinerary.budgetTips.map((tip, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm">
                                                    <span className="text-primary mt-0.5">✦</span> {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ) : null}
                        </div>
                    )}

                    {/* ── ✈️ VISA TAB ───────────────────────────────────── */}
                    {activeTab === 'visa' && (
                        <div className="space-y-5">
                            <Card className="border-border/40">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-primary" /> Visa Requirements
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Check real-time entry requirements for <strong>{destination}</strong>.
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                                        <div>
                                            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Your Passport / Nationality</label>
                                            <Input
                                                placeholder="e.g. Nigerian, British, American…"
                                                value={nationality}
                                                onChange={e => setNationality(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && checkVisa()}
                                                className="h-10"
                                            />
                                        </div>
                                        <Button onClick={checkVisa} disabled={!nationality || visaLoading} className="h-10 px-5">
                                            {visaLoading ? 'Checking…' : 'Check'}
                                        </Button>
                                    </div>

                                    {/* Visa result */}
                                    {visaData && (
                                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
                                            {/* Status */}
                                            <div className={`p-4 rounded-xl border-2 ${visaStatusColors[visaData.statusColor ?? 'blue'] ?? visaStatusColors.blue}`}>
                                                <p className="font-black text-lg">{visaData.status}</p>
                                                <p className="text-sm mt-1">{visaData.description}</p>
                                            </div>

                                            {/* Quick stats */}
                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { label: 'Processing', value: visaData.processingTime },
                                                    { label: 'Cost', value: visaData.estimatedCost },
                                                    { label: 'Max Stay', value: visaData.maxStay },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="p-3 rounded-xl bg-muted/40 text-center">
                                                        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                                                        <p className="font-bold text-sm">{value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Requirements */}
                                            {visaData.requirements?.length ? (
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Requirements</p>
                                                    <ul className="space-y-2">
                                                        {visaData.requirements.map((req: any, i: number) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${req.weight === 'critical' ? 'bg-red-500' : req.weight === 'important' ? 'bg-amber-500' : 'bg-green-500'}`} />
                                                                <div><span className="font-semibold">{req.title}</span> — {req.desc}</div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : null}

                                            {/* Official links */}
                                            {visaData.officialLinks?.length ? (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Official Resources</p>
                                                    {visaData.officialLinks.map((link: any, i: number) => (
                                                        <a key={i} href={link.url} target="_blank" rel="noreferrer"
                                                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border/50 hover:border-primary/40 text-sm font-medium hover:text-primary transition-all">
                                                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                                            {link.title}
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </motion.div>
                                    )}

                                    {!visaData && (
                                        <p className="text-xs text-muted-foreground text-center pt-2">
                                            Or visit the{' '}
                                            <a href="/visa-hub" target="_blank" className="text-primary underline-offset-2 hover:underline font-medium">
                                                Visa Intelligence Hub
                                            </a>{' '}
                                            for a full deep-dive.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ── 💡 TIPS TAB ──────────────────────────────────── */}
                    {activeTab === 'tips' && (
                        <div className="grid md:grid-cols-2 gap-5">
                            {itinerary.travelTips?.length ? (
                                <TipsCard title="Travel Tips" icon={<Lightbulb className="w-5 h-5 text-amber-500" />} items={itinerary.travelTips} bullet="💡" />
                            ) : null}
                            {itinerary.localCustoms?.length ? (
                                <TipsCard title="Local Customs" icon={<Globe className="w-5 h-5 text-blue-500" />} items={itinerary.localCustoms} bullet="🌏" />
                            ) : null}
                            {itinerary.safetyAdvice?.length ? (
                                <TipsCard title="Safety Advice" icon={<Shield className="w-5 h-5 text-orange-500" />} items={itinerary.safetyAdvice} bullet="🛡️"
                                    cardClass="border-orange-500/20 bg-orange-500/5 md:col-span-2" />
                            ) : null}
                            {itinerary.bestTimeToVisit && (
                                <Card className="border-border/40 md:col-span-2">
                                    <CardContent className="p-5">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" /> Best Time to Visit
                                        </p>
                                        <p className="text-sm font-medium">{itinerary.bestTimeToVisit}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* ── 📊 SCORE TAB ─────────────────────────────────── */}
                    {activeTab === 'score' && (
                        <div className="space-y-5">
                            {/* Why This Plan */}
                            {itinerary.whyThisPlan?.length ? (
                                <Card className="border-primary/20 bg-primary/5">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-primary">
                                            <CheckCircle className="w-5 h-5" /> Why This Plan
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            {itinerary.whyThisPlan.map((reason, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm">
                                                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                                                    <span>{reason}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ) : null}

                            {/* Reality Check */}
                            {itinerary.realityCheck && (
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Reality Check</p>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {itinerary.realityCheck.crowds && (
                                            <RealityCard
                                                label="Crowds"
                                                level={itinerary.realityCheck.crowds.level}
                                                description={itinerary.realityCheck.crowds.description}
                                            />
                                        )}
                                        {itinerary.realityCheck.physical && (
                                            <RealityCard
                                                label="Physical Demand"
                                                level={itinerary.realityCheck.physical.level}
                                                description={itinerary.realityCheck.physical.description}
                                            />
                                        )}
                                        {itinerary.realityCheck.weather?.length ? (
                                            <Card className="border-blue-500/20 bg-blue-500/5 md:col-span-2">
                                                <CardContent className="p-5">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">🌤️ Weather</p>
                                                    <ul className="space-y-2">
                                                        {itinerary.realityCheck.weather.map((note, i) => (
                                                            <li key={i} className="text-sm flex items-start gap-2">
                                                                <span className="text-blue-400 mt-0.5 flex-shrink-0">◆</span>
                                                                <span>{note}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        ) : null}
                                    </div>
                                </div>
                            )}

                            {/* Fallback if no reality check */}
                            {!itinerary.realityCheck && !itinerary.whyThisPlan?.length && (
                                <Card className="border-border/40">
                                    <CardContent className="p-10 text-center text-muted-foreground text-sm">
                                        Score data available after regenerating with the latest AI prompt.
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* ── ✈️ FLIGHTS TAB ───────────────────────── */}
                    {activeTab === 'flights' && (
                        <div className="space-y-4">
                            {/* AI Recommendation Banner */}
                            {flightAnalysis?.recommendation && (
                                <Card className="border-emerald-500/30 bg-emerald-500/5">
                                    <CardContent className="p-5 flex items-start gap-3">
                                        <Trophy className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mb-1">AI Recommendation</p>
                                            <p className="text-sm">{flightAnalysis.recommendation}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {flights && flights.length > 0 ? (
                                <>
                                    {/* Flight cards */}
                                    <div className="grid gap-3">
                                        {flights.map((f: any, i: number) => {
                                            const isBest = flightAnalysis?.bestOption && f.price === flightAnalysis.bestOption.price && f.airline === flightAnalysis.bestOption.airline;
                                            return (
                                                <Card key={i} className={`border-border/40 transition-all hover:shadow-md ${isBest ? 'ring-2 ring-emerald-500/40 border-emerald-500/30' : ''}`}>
                                                    <CardContent className="p-5">
                                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                                    <Plane className="w-5 h-5 text-blue-500" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-bold text-sm">{f.airline || 'Unknown Airline'}</h4>
                                                                        {isBest && <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">Best</Badge>}
                                                                        {f.source && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{f.source}</Badge>}
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {f.from} <ArrowRight className="w-3 h-3 inline mx-1" /> {f.to}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6 text-right">
                                                                {f.departureTime && (
                                                                    <div>
                                                                        <p className="text-xs text-muted-foreground">Departure</p>
                                                                        <p className="font-semibold text-sm">{f.departureTime}</p>
                                                                    </div>
                                                                )}
                                                                {f.duration && (
                                                                    <div>
                                                                        <p className="text-xs text-muted-foreground">Duration</p>
                                                                        <p className="font-semibold text-sm">{f.duration}</p>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="text-xs text-muted-foreground">Stops</p>
                                                                    <p className="font-semibold text-sm">{f.stops === 0 ? 'Direct' : `${f.stops} stop${(f.stops ?? 0) > 1 ? 's' : ''}`}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-muted-foreground">Price</p>
                                                                    <p className="font-bold text-lg text-primary">${f.price?.toFixed(0)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {f.bookingUrl && (
                                                            <div className="mt-3 pt-3 border-t border-border/30">
                                                                <a href={f.bookingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                                                                    <ExternalLink className="w-3 h-3" /> Book this flight
                                                                </a>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>

                                    {/* Compare prices externally */}
                                    <Card className="border-border/40 bg-muted/20">
                                        <CardContent className="p-4">
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Compare prices on</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: 'Skyscanner', url: `https://www.skyscanner.com/transport/flights/${encodeURIComponent(flights[0]?.from || '')}/${encodeURIComponent(flights[0]?.to || '')}` },
                                                    { label: 'Google Flights', url: `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(flights[0]?.from || '')}+to+${encodeURIComponent(flights[0]?.to || '')}` },
                                                    { label: 'Kayak', url: `https://www.kayak.com/flights/${encodeURIComponent(flights[0]?.from || '')}-${encodeURIComponent(flights[0]?.to || '')}` },
                                                ].map(link => (
                                                    <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background border border-border/50 hover:border-primary/40 hover:bg-primary/5 text-xs font-medium transition-all">
                                                        {link.label} <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            ) : (
                                <Card className="border-border/40">
                                    <CardContent className="p-10 text-center">
                                        <Plane className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                        <p className="font-semibold mb-1">No flight data available</p>
                                        <p className="text-sm text-muted-foreground">Enable Flight Search when generating your itinerary to see real flight options.</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* ── 🏨 HOTELS TAB ──────────────────────────── */}
                    {activeTab === 'hotels' && (
                        <div className="space-y-4">
                            {hotels && hotels.length > 0 ? (
                                <>
                                    {/* Hotel Analysis Summary */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {(() => {
                                            const sorted = [...hotels].sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
                                            const cheapest = sorted[0];
                                            const bestRated = [...hotels].sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))[0];
                                            return [
                                                { label: 'Cheapest', value: `$${cheapest?.price?.toFixed(0) || '?'}/night`, sub: cheapest?.name, color: 'text-green-500' },
                                                { label: 'Best Rated', value: `★ ${bestRated?.rating?.toFixed(1) || '?'}`, sub: bestRated?.name, color: 'text-amber-500' },
                                                { label: 'Total Options', value: `${hotels.length}`, sub: 'hotels found', color: 'text-blue-500' },
                                            ].map(stat => (
                                                <Card key={stat.label} className="border-border/40">
                                                    <CardContent className="p-4 text-center">
                                                        <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                                                        <p className={`font-bold text-lg ${stat.color}`}>{stat.value}</p>
                                                        <p className="text-[10px] text-muted-foreground line-clamp-1">{stat.sub}</p>
                                                    </CardContent>
                                                </Card>
                                            ));
                                        })()}
                                    </div>

                                    {/* Hotel cards */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {[...hotels].sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0)).map((h: any, i: number) => (
                                            <Card key={i} className={`border-border/40 hover:shadow-md transition-all ${i === 0 ? 'ring-2 ring-amber-500/30 border-amber-500/20' : ''}`}>
                                                <CardContent className="p-5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                <Hotel className="w-5 h-5 text-amber-500" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h4 className="font-bold text-sm">{h.name}</h4>
                                                                    {i === 0 && <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">Top Rated</Badge>}
                                                                    {h.source && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{h.source}</Badge>}
                                                                    {h.tag && <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${h.tag === 'cheapest' ? 'border-green-500/50 text-green-600' : h.tag === 'best-rated' ? 'border-amber-500/50 text-amber-600' : 'border-blue-500/50 text-blue-600'}`}>{h.tag}</Badge>}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-0.5">{h.city}</p>
                                                                {h.roomType && <p className="text-xs text-muted-foreground">{h.roomType}</p>}
                                                                {h.location && <p className="text-[10px] text-muted-foreground">{h.location}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <p className="font-bold text-lg text-primary">${h.price?.toFixed(0)}</p>
                                                            <p className="text-[10px] text-muted-foreground">per night</p>
                                                            {h.rating && (
                                                                <div className="flex items-center gap-1 justify-end mt-1">
                                                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                                    <span className="text-xs font-semibold">{h.rating}</span>
                                                                </div>
                                                            )}
                                                            {h.stars > 0 && (
                                                                <p className="text-[10px] text-muted-foreground">{'★'.repeat(h.stars)} hotel</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {h.bookingUrl && (
                                                        <div className="mt-3 pt-3 border-t border-border/30">
                                                            <a href={h.bookingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                                                                <ExternalLink className="w-3 h-3" /> Book this hotel
                                                            </a>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Compare externally */}
                                    <Card className="border-border/40 bg-muted/20">
                                        <CardContent className="p-4">
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Compare hotel prices on</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: 'Booking.com', url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}` },
                                                    { label: 'Hotels.com', url: `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(destination)}` },
                                                    { label: 'Agoda', url: `https://www.agoda.com/search?city=${encodeURIComponent(destination)}` },
                                                ].map(link => (
                                                    <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background border border-border/50 hover:border-primary/40 hover:bg-primary/5 text-xs font-medium transition-all">
                                                        {link.label} <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            ) : (
                                <Card className="border-border/40">
                                    <CardContent className="p-10 text-center">
                                        <Hotel className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                        <p className="font-semibold mb-1">No hotel data available</p>
                                        <p className="text-sm text-muted-foreground">Enable Hotel Search when generating your itinerary to see real hotel options.</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50 text-xs font-semibold text-foreground/80">
            <span className="text-primary">{icon}</span>
            {label}
        </span>
    );
}

function TipsCard({ title, icon, items, bullet, cardClass = '' }: {
    title: string; icon: React.ReactNode; items: string[]; bullet: string; cardClass?: string;
}) {
    return (
        <Card className={`border-border/40 ${cardClass}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">{icon} {title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2.5">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                            <span className="mt-0.5 flex-shrink-0">{bullet}</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

function RealityCard({ label, level, description }: { label: string; level: 'high' | 'medium' | 'low'; description: string }) {
    const colors = {
        high: 'border-red-500/30 bg-red-500/5',
        medium: 'border-amber-500/30 bg-amber-500/5',
        low: 'border-green-500/30 bg-green-500/5',
    };
    return (
        <Card className={`${colors[level]}`}>
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <DifficultyBadge level={level} />
                </div>
                <p className="text-sm leading-relaxed">{description}</p>
            </CardContent>
        </Card>
    );
}
