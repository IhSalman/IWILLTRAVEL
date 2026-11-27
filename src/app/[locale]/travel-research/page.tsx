'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import {
    Plane, Hotel, Calendar as CalendarIcon,
    ArrowRight, Loader2, Trophy, Activity, Scan, ShieldCheck, Crosshair,
    Flame, Newspaper, Lightbulb, Compass, AlertTriangle, Sparkles, Navigation, Lock
} from 'lucide-react';

const RadarLoading = () => (
    <div className="relative w-60 h-60 mx-auto rounded-full border border-white/[0.12] overflow-hidden shadow-2xl apple-liquid-glass">
        <div className="absolute inset-0 m-auto w-3/4 h-3/4 rounded-full border border-white/[0.07]" />
        <div className="absolute inset-0 m-auto w-1/2 h-1/2 rounded-full border border-white/[0.07]" />
        <div className="absolute inset-0 m-auto w-1/4 h-1/4 rounded-full border border-white/[0.12] flex items-center justify-center">
            <Scan className="w-5 h-5 text-sky-300" />
        </div>
        <motion.div
            className="absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left bg-gradient-to-br from-sky-400/[0.16] to-transparent pointer-events-none"
            style={{ borderRadius: '100% 0 0 0' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute bottom-6 w-full text-center">
            <span className="font-mono text-slate-300 text-[11px] font-medium tracking-wider uppercase">Scanning Global Telemetry</span>
        </div>
    </div>
);

const BUDGET_PRESETS = ['$1,200 Budget', '$2,500 Comfort', '$5,000+ Luxury'];
const MONTH_PRESETS = ['May', 'July', 'October', 'December'];
const VIBE_PRESETS = ['Food & Culture', 'Beaches & Nature', 'Architecture & Art', 'Mountain Adventure'];

function TravelIntelligenceContent() {
    const searchParams = useSearchParams();
    const radarSectionRef = useRef<HTMLDivElement>(null);

    // Recommendation Hero State
    const [budget, setBudget] = useState('');
    const [month, setMonth] = useState('');
    const [interests, setInterests] = useState('');
    const [recsLoading, setRecsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<any[] | null>(null);
    const [recsError, setRecsError] = useState<string | null>(null);
    const [recsRequiresAuth, setRecsRequiresAuth] = useState(false);

    // Intelligence Dashboard State
    const [intel, setIntel] = useState<any | null>(null);
    const [intelLoading, setIntelLoading] = useState(true);

    // Radar Scan State (Always accessible so travelers can research flights/stays directly)
    const [radarTarget, setRadarTarget] = useState('');
    const [originCity, setOriginCity] = useState('');
    const [radarDate, setRadarDate] = useState<Date | undefined>(undefined);
    const [radarLoading, setRadarLoading] = useState(false);
    const [radarResults, setRadarResults] = useState<{ flights?: any[]; hotels?: any[]; meta?: any } | null>(null);
    const [radarError, setRadarError] = useState('');

    useEffect(() => {
        const destParam = searchParams.get('destination');
        if (destParam) {
            setRadarTarget(destParam);
            setTimeout(() => {
                radarSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 250);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchIntelligence = async () => {
            try {
                const res = await fetch('/api/travel-intelligence');
                const data = await res.json();
                setIntel(data);
            } catch (err) {
                console.error('Failed to load intelligence dashboard', err);
            } finally {
                setIntelLoading(false);
            }
        };
        fetchIntelligence();
    }, []);

    const handleGetRecommendations = async () => {
        if (!budget || !month || !interests) return;
        setRecsLoading(true);
        setRecsError(null);
        setRecsRequiresAuth(false);
        try {
            const res = await fetch('/api/travel-recommendation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ budget, month, interests }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (res.status === 401 || data.requiresAuth) {
                    setRecsRequiresAuth(true);
                } else {
                    setRecsError(data.error || 'Something went wrong. Please try again.');
                }
                return;
            }
            setRecommendations(data.recommendations || []);
        } catch (err) {
            console.error(err);
            setRecsError('Network error. Please check your connection.');
        } finally {
            setRecsLoading(false);
        }
    };

    const focusRadarOn = (city: string) => {
        setRadarTarget(city);
        radarSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleRadarScan = async (targetCity: string) => {
        const cleanTarget = targetCity.trim();
        setRadarTarget(cleanTarget);
        if (!cleanTarget || !originCity.trim() || !radarDate) return;

        setRadarLoading(true);
        setRadarError('');
        try {
            const res = await fetch('/api/travel-research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: cleanTarget,
                    originCity: originCity.trim(),
                    startDate: format(radarDate, 'yyyy-MM-dd'),
                    includeFlights: true,
                    includeHotels: true,
                    adults: 1,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Unable to fetch live flight & hotel fares right now.');
            setRadarResults(data);
        } catch (err: any) {
            setRadarError(err.message || 'Flight & Stay scan encountered an error.');
        } finally {
            setRadarLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-200 py-28 px-4 sm:px-6 lg:px-8 relative overflow-x-clip font-body selection:bg-white/10">
            {/* Background Ambient Glow */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[620px] h-[620px] bg-sky-500/[0.04] rounded-full blur-[150px]" />
                <div className="absolute bottom-10 left-1/4 w-[520px] h-[520px] bg-indigo-500/[0.04] rounded-full blur-[150px]" />
            </div>

            <div className="max-w-6xl mx-auto space-y-16 relative z-10 w-full">
                {/* HERO SECTION - RECOMMENDATIONS */}
                <div className="space-y-8">
                    <div className="text-center space-y-3">
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-glass-pill mb-2"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300">Destination Matchmaker &amp; Fare Radar</span>
                        </motion.div>
                        <h1 className="text-4xl sm:text-6xl font-serif font-bold tracking-tight text-white">
                            Travel Research &amp; Radar
                        </h1>
                        <p className="text-slate-300/80 max-w-2xl mx-auto text-base">
                            Discover high-fit destinations matched to your budget, season, and travel style—then inspect live flight fares, hotel rates, and regional advisories.
                        </p>
                    </div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="apple-glass-card rounded-[32px] p-6 md:p-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">Budget Target</label>
                                <Input
                                    placeholder="e.g. $1,500 or Luxury"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                    className="bg-slate-950/65 border-white/[0.1] h-13 rounded-2xl text-base text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-white/[0.25]"
                                />
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {BUDGET_PRESETS.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setBudget(p)}
                                            className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
                                                budget === p ? 'bg-white text-slate-950 font-semibold' : 'apple-glass-pill text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">Target Month</label>
                                <Input
                                    placeholder="e.g. October"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="bg-slate-950/65 border-white/[0.1] h-13 rounded-2xl text-base text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-white/[0.25]"
                                />
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {MONTH_PRESETS.map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setMonth(m)}
                                            className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
                                                month === m ? 'bg-white text-slate-950 font-semibold' : 'apple-glass-pill text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">Trip Vibe &amp; Interests</label>
                                <Input
                                    placeholder="e.g. Gastronomy, Architecture, Nature"
                                    value={interests}
                                    onChange={(e) => setInterests(e.target.value)}
                                    className="bg-slate-950/65 border-white/[0.1] h-13 rounded-2xl text-base text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-white/[0.25]"
                                />
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {VIBE_PRESETS.map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setInterests(v)}
                                            className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
                                                interests === v ? 'bg-white text-slate-950 font-semibold' : 'apple-glass-pill text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            className="w-full h-14 mt-6 btn-apple-primary font-semibold text-base rounded-2xl flex items-center justify-center gap-2 disabled:opacity-45 disabled:pointer-events-none"
                            onClick={handleGetRecommendations}
                            disabled={recsLoading || !budget || !month || !interests}
                        >
                            {recsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                            <span>{recsLoading ? 'Consulting Discovery Agents…' : 'Synthesize Destination Matches →'}</span>
                        </button>

                        {/* Auth prompt */}
                        {recsRequiresAuth && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-5 p-5 rounded-2xl apple-liquid-glass border border-sky-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center shrink-0">
                                        <Lock className="w-4 h-4 text-sky-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Sign in to unlock tailored AI destination matching</p>
                                        <p className="text-xs text-slate-300/80 mt-0.5">
                                            Create a free account to receive personalized season, weather, and budget matches—or scroll down to use the Flight &amp; Stay Radar right away.
                                        </p>
                                    </div>
                                </div>
                                <Link href="/login" className="btn-apple-primary px-5 py-2.5 text-xs font-semibold rounded-full shrink-0 text-center">
                                    Sign In →
                                </Link>
                            </motion.div>
                        )}

                        {/* Error */}
                        {recsError && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-4 rounded-2xl bg-rose-950/35 border border-rose-500/25 text-rose-200 text-xs flex items-center gap-2.5"
                            >
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>{recsError}</span>
                            </motion.div>
                        )}
                    </motion.div>

                    {/* RECOMMENDATION RESULTS */}
                    <AnimatePresence>
                        {recommendations && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid md:grid-cols-3 gap-6 pt-2"
                            >
                                {recommendations.map((rec, i) => (
                                    <div
                                        key={i}
                                        className="apple-glass-card rounded-3xl p-6 relative flex flex-col items-start hover:border-white/20 transition-all"
                                    >
                                        <div className="absolute top-5 right-5 px-3 py-1 apple-glass-pill rounded-full text-xs font-mono font-semibold text-emerald-300">
                                            {rec.matchScore}% Match
                                        </div>
                                        <h3 className="text-2xl font-serif font-bold text-white mb-1 leading-snug w-8/12">{rec.destination}</h3>
                                        <p className="text-xs font-mono text-slate-400 mb-4">
                                            Est. {rec.estimatedCost} • {rec.weather}
                                        </p>
                                        <p className="text-slate-300/85 text-sm leading-relaxed mb-6 flex-grow">{rec.reason}</p>

                                        <div className="w-full grid grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => focusRadarOn(rec.destination)}
                                                className="btn-apple-glass py-2.5 px-3 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5"
                                            >
                                                <Scan className="w-3.5 h-3.5" /> Flights &amp; Stays
                                            </button>
                                            <Link
                                                href={`/plan-trip?destination=${encodeURIComponent(rec.destination)}`}
                                                className="btn-apple-primary py-2.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1"
                                            >
                                                Plan Trip →
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* FLIGHT & STAY RADAR (Always Accessible + Deep-Linkable via ?destination=) */}
                <div ref={radarSectionRef} className="pt-8 border-t border-white/[0.07] scroll-mt-28">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-300">
                                <Crosshair className="w-4 h-4" /> Live Fare &amp; Accommodation Scanner
                            </div>
                            <h2 className="text-3xl font-serif font-bold text-white">Flight &amp; Stay Radar</h2>
                            <p className="text-slate-400 text-sm">
                                Compare live airfare corridors and top-value hotel options for any destination before generating your day-by-day itinerary.
                            </p>
                        </div>
                        {radarTarget && (
                            <Link
                                href={`/plan-trip?destination=${encodeURIComponent(radarTarget)}`}
                                className="btn-apple-primary px-5 py-2.5 rounded-full text-xs font-semibold shrink-0 inline-flex items-center gap-1.5 self-start md:self-auto"
                            >
                                Build {radarTarget} Itinerary <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>

                    <div className="apple-glass-card p-6 md:p-8 rounded-[32px] mb-10">
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-mono uppercase text-slate-300 pl-1">Departure City</label>
                                <Input
                                    placeholder="e.g. New York, London, Dubai"
                                    value={originCity}
                                    onChange={(e) => setOriginCity(e.target.value)}
                                    className="bg-slate-950/65 border-white/[0.1] h-12 rounded-2xl text-sm font-medium focus-visible:ring-1 focus-visible:ring-white/[0.25] text-white placeholder:text-slate-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-mono uppercase text-slate-300 pl-1">Destination City</label>
                                <Input
                                    placeholder="e.g. Kyoto, Tokyo, Lisbon"
                                    value={radarTarget}
                                    onChange={(e) => setRadarTarget(e.target.value)}
                                    className="bg-slate-950/65 border-white/[0.1] h-12 rounded-2xl text-sm font-medium focus-visible:ring-1 focus-visible:ring-white/[0.25] text-white placeholder:text-slate-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-mono uppercase text-slate-300 pl-1">Departure Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 justify-start bg-slate-950/65 border-white/[0.1] hover:bg-slate-900 text-white rounded-2xl text-sm font-medium"
                                        >
                                            <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                                            {radarDate ? format(radarDate, 'PPP') : <span className="text-slate-500">Select Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-white/[0.14] bg-slate-950 text-white rounded-2xl shadow-2xl">
                                        <Calendar
                                            mode="single"
                                            selected={radarDate}
                                            onSelect={setRadarDate}
                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <button
                            className="w-full mt-5 h-13 btn-apple-primary font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 disabled:opacity-45 disabled:pointer-events-none"
                            onClick={() => handleRadarScan(radarTarget)}
                            disabled={radarLoading || !originCity.trim() || !radarTarget.trim() || !radarDate}
                        >
                            {radarLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                            <span>{radarLoading ? 'Scanning Global Airlines & Stays…' : 'Scan Live Flights & Stays →'}</span>
                        </button>

                        {radarError && (
                            <div className="mt-4 p-3.5 rounded-2xl bg-rose-950/35 border border-rose-500/25 text-rose-200 text-xs flex items-center gap-2.5">
                                <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>{radarError}</span>
                            </div>
                        )}
                    </div>

                    {/* RADAR RESULTS */}
                    {radarLoading ? (
                        <div className="py-10">
                            <RadarLoading />
                        </div>
                    ) : (
                        radarResults && (
                            <div className="space-y-10">
                                {radarResults.flights && radarResults.flights.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-serif font-bold text-white mb-4 border-b border-white/[0.07] pb-3">
                                            Identified Flight Corridors
                                        </h3>
                                        <div className="grid gap-3">
                                            {radarResults.flights.map((f: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="apple-glass-card p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center font-semibold text-white text-sm">
                                                            {f.airline?.charAt(0) || '✈'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-base text-white">{f.airline || 'Carrier'}</h4>
                                                            <div className="text-xs text-slate-300 font-mono mt-0.5 flex items-center gap-2">
                                                                <span>{f.from}</span> <ArrowRight className="w-3 h-3 text-slate-400" /> <span>{f.to}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-6 text-center sm:text-right items-center">
                                                        <div>
                                                            <p className="text-[10px] uppercase text-slate-400 font-mono mb-0.5">Duration</p>
                                                            <p className="text-xs font-mono text-slate-200">{f.duration || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase text-slate-400 font-mono mb-0.5">Stops</p>
                                                            <p className="text-xs font-mono text-slate-200">{f.stops === 0 ? 'Non-stop' : `${f.stops} stop`}</p>
                                                        </div>
                                                        <div className="border-l border-white/[0.1] pl-6">
                                                            <p className="font-serif font-bold text-2xl text-white">
                                                                ${typeof f.price === 'number' ? f.price.toFixed(0) : f.price}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {radarResults.hotels && radarResults.hotels.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-serif font-bold text-white mb-4 border-b border-white/[0.07] pb-3">
                                            Curated Accommodations
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {[...radarResults.hotels]
                                                .sort((a, b) => (a.price || 9999) - (b.price || 9999))
                                                .map((h: any, i: number) => (
                                                    <div key={i} className="apple-glass-card p-5 rounded-2xl flex flex-col justify-between">
                                                        <div>
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-sky-300">
                                                                    <Hotel className="w-4 h-4" />
                                                                </div>
                                                                {i === 0 && (
                                                                    <Badge className="bg-emerald-950/50 text-emerald-200 border border-emerald-400/25 font-mono text-[10px]">
                                                                        <Trophy className="w-3 h-3 mr-1 inline" /> Top Value
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <h4 className="font-serif font-bold text-base text-white mb-1 truncate">{h.name}</h4>
                                                            <p className="font-mono text-xs text-slate-400 truncate">{h.city}</p>
                                                        </div>
                                                        <div className="mt-6 pt-3 border-t border-white/[0.08] flex justify-between items-end">
                                                            <span className="text-[10px] uppercase font-mono text-slate-400">Est. Nightly</span>
                                                            <span className="font-serif font-bold text-xl text-white">
                                                                ${h.price > 0 ? h.price.toFixed(0) : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* DASHBOARD GRID */}
                <div className="space-y-10 pt-6 border-t border-white/[0.07]">
                    <div className="border-b border-white/[0.07] pb-4 flex items-center justify-between">
                        <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2.5">
                            <Activity className="w-5 h-5 text-sky-300" /> Global Travel Pulse
                        </h2>
                        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Live Agent Telemetry</span>
                    </div>

                    {intelLoading ? (
                        <RadarLoading />
                    ) : intel ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* COL 1: Trending & Gems */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* Trending Now */}
                                <div>
                                    <h3 className="text-base font-serif font-bold text-white flex items-center gap-2 mb-4">
                                        <Flame className="w-4 h-4 text-amber-300" /> Trending Destinations
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {intel.trending?.map((item: any, i: number) => (
                                            <div
                                                key={i}
                                                className="apple-glass-card rounded-2xl p-5 hover:border-white/[0.2] transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-serif font-bold text-lg text-white">{item.destination}</h4>
                                                        <Badge className="bg-white/[0.06] text-slate-200 border border-white/[0.1] font-mono text-[11px]">
                                                            Score: {item.score}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-300/80 mb-3 line-clamp-2 leading-relaxed">{item.why}</p>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-xs font-mono text-slate-400 pt-2 border-t border-white/[0.06]">
                                                        <span>{item.bestTime}</span>
                                                        <span>{item.budget}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => focusRadarOn(item.destination)}
                                                            className="btn-apple-glass flex-1 py-1.5 rounded-xl text-[11px] font-medium"
                                                        >
                                                            Check Fares
                                                        </button>
                                                        <Link
                                                            href={`/plan-trip?destination=${encodeURIComponent(item.destination)}`}
                                                            className="btn-apple-primary flex-1 py-1.5 rounded-xl text-[11px] font-semibold text-center"
                                                        >
                                                            Plan Trip →
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Hidden Gems */}
                                <div>
                                    <h3 className="text-base font-serif font-bold text-white flex items-center gap-2 mb-4">
                                        <Compass className="w-4 h-4 text-sky-300" /> Curated Hidden Gems
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {intel.hiddenGems?.map((item: any, i: number) => (
                                            <div key={i} className="apple-glass-card rounded-2xl p-5 flex flex-col justify-between gap-4">
                                                <div>
                                                    <h4 className="font-serif font-bold text-base text-white mb-1.5">{item.destination}</h4>
                                                    <p className="text-xs text-slate-300/80 leading-relaxed">{item.description}</p>
                                                </div>
                                                <Link
                                                    href={`/plan-trip?destination=${encodeURIComponent(item.destination)}`}
                                                    className="text-xs font-medium text-sky-300 hover:text-white inline-flex items-center gap-1"
                                                >
                                                    Plan itinerary for {item.destination} <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Flight Deals */}
                                <div className={intel.flightDeals?.length ? '' : 'hidden'}>
                                    <h3 className="text-base font-serif font-bold text-white flex items-center gap-2 mb-4">
                                        <Plane className="w-4 h-4 text-emerald-300" /> Flight Market Opportunities
                                    </h3>
                                    <div className="grid gap-2.5">
                                        {intel.flightDeals?.map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between apple-glass-card rounded-2xl p-4">
                                                <div className="font-mono text-xs font-medium text-white">{item.route}</div>
                                                <div className="flex items-center gap-4">
                                                    <Badge className="bg-emerald-950/40 text-emerald-300 border border-emerald-400/20 text-[10px] font-mono">
                                                        {item.trend}
                                                    </Badge>
                                                    <div className="text-right">
                                                        <div className="font-semibold text-white text-base">{item.price}</div>
                                                        <div className="text-[10px] text-slate-400 uppercase font-mono">{item.bestDay}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* COL 2: News, Insights, Alerts */}
                            <div className="space-y-6">
                                {/* Insights */}
                                <div className="apple-glass-card rounded-2xl p-5">
                                    <h3 className="text-base font-serif font-bold text-white flex items-center gap-2 mb-4">
                                        <Lightbulb className="w-4 h-4 text-amber-300" /> Strategic Travel Insights
                                    </h3>
                                    <div className="space-y-3.5">
                                        {intel.insights?.map((item: any, i: number) => (
                                            <div key={i} className="border-l-2 border-sky-400/40 pl-3">
                                                <h4 className="font-medium text-xs text-white mb-1">{item.title}</h4>
                                                <p className="text-xs text-slate-300/80 leading-relaxed">{item.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Alerts */}
                                <div className={'apple-glass-card rounded-2xl p-5' + (intel.alerts?.length ? '' : ' hidden')}>
                                    <h3 className="text-base font-serif font-bold text-white flex items-center gap-2 mb-4">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" /> Regional Advisories
                                    </h3>
                                    <div className="space-y-3">
                                        {intel.alerts?.map((item: any, i: number) => (
                                            <div key={i} className="bg-amber-950/25 rounded-2xl p-3.5 border border-amber-500/25">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="font-medium text-xs text-amber-200">{item.title}</h4>
                                                    <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px] font-mono">
                                                        {item.severity}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-300/85 leading-relaxed">{item.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* News */}
                                <div className={intel.news?.length ? '' : 'hidden'}>
                                    <h3 className="text-base font-serif font-bold text-white flex items-center gap-2 mb-3">
                                        <Newspaper className="w-4 h-4 text-slate-300" /> Global Travel News
                                    </h3>
                                    <div className="space-y-2.5">
                                        {intel.news?.map((item: any, i: number) => (
                                            <div key={i} className="apple-glass-card rounded-2xl p-4">
                                                <h4 className="font-medium text-xs text-white mb-1 leading-snug">{item.title}</h4>
                                                <p className="text-xs text-slate-300/80 mb-2">{item.summary}</p>
                                                <Badge className="bg-white/[0.06] text-slate-200 border border-white/[0.1] text-[10px] font-mono">
                                                    {item.impact === 'Good' ? 'Positive' : 'Advisory'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-center py-16 text-sm">Intelligence feed currently updating…</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TravelIntelligencePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
                </div>
            }
        >
            <TravelIntelligenceContent />
        </Suspense>
    );
}
