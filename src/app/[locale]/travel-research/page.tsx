'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Plane, Hotel, MapPin, Calendar as CalendarIcon, Search,
    ArrowRight, Loader2, Star, Trophy, Activity, Scan, ShieldCheck, Crosshair,
    Flame, Newspaper, Lightbulb, Compass, AlertTriangle, Sparkles, Navigation
} from 'lucide-react';

// Radar Loading Animation (Preserved from original)
const RadarLoading = () => (
    <div className="relative w-72 h-72 mx-auto rounded-full border-2 border-[#00D4FF]/30 overflow-hidden shadow-[0_0_80px_rgba(0,212,255,0.2)] bg-[#03080F]/80 backdrop-blur-md">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.2)_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="absolute inset-0 m-auto w-3/4 h-3/4 rounded-full border border-[#00D4FF]/20" />
        <div className="absolute inset-0 m-auto w-1/2 h-1/2 rounded-full border border-[#00D4FF]/20" />
        <div className="absolute inset-0 m-auto w-1/4 h-1/4 rounded-full border border-[#00D4FF]/20 text-center flex items-center justify-center">
            <Scan className="w-6 h-6 text-[#00D4FF]/50" />
        </div>
        <motion.div 
            className="absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left bg-gradient-to-br from-[#00D4FF]/50 via-[#00D4FF]/10 to-transparent pointer-events-none"
            style={{ borderRadius: '100% 0 0 0' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        {[...Array(3)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-[#00FFB3] shadow-[0_0_15px_#00FFB3]"
                style={{
                    top: `${20 + Math.random() * 60}%`,
                    left: `${20 + Math.random() * 60}%`,
                }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
        ))}
        <div className="absolute bottom-6 w-full text-center">
            <span className="font-mono text-[#00D4FF] text-xs font-bold tracking-[0.3em] uppercase animate-pulse">Scanning Grid</span>
        </div>
    </div>
);

// 3D Flip Card Component (Preserved from original)
const FlipCard = ({ frontNode, backNode, className = '' }: { frontNode: React.ReactNode, backNode: React.ReactNode, className?: string }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div 
            className={cn("perspective-[2000px] cursor-pointer group h-full", className)}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <motion.div
                className="w-full h-full relative transform-style-3d transition-transform duration-700 ease-in-out"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
            >
                <div className="absolute inset-0 backface-hidden h-full">
                    {frontNode}
                </div>
                <div className="absolute inset-0 backface-hidden rotate-y-180 h-full">
                    {backNode}
                </div>
            </motion.div>
        </div>
    );
};

export default function TravelIntelligencePage() {
    // Recommendation Hero State
    const [budget, setBudget] = useState('');
    const [month, setMonth] = useState('');
    const [interests, setInterests] = useState('');
    const [recsLoading, setRecsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<any[] | null>(null);

    // Intelligence Dashboard State
    const [intel, setIntel] = useState<any | null>(null);
    const [intelLoading, setIntelLoading] = useState(true);

    // Old Radar Scan State (for integrating radar search)
    const [radarTarget, setRadarTarget] = useState('');
    const [originCity, setOriginCity] = useState('');
    const [radarDate, setRadarDate] = useState<Date | undefined>(undefined);
    const [radarLoading, setRadarLoading] = useState(false);
    const [radarResults, setRadarResults] = useState<{ flights?: any[], hotels?: any[], meta?: any } | null>(null);
    const [radarError, setRadarError] = useState('');
    const [showRadar, setShowRadar] = useState(false);

    useEffect(() => {
        const fetchIntelligence = async () => {
            try {
                const res = await fetch('/api/travel-intelligence');
                const data = await res.json();
                setIntel(data);
            } catch (err) {
                console.error("Failed to load intelligence dashboard", err);
            } finally {
                setIntelLoading(false);
            }
        };
        fetchIntelligence();
    }, []);

    const handleGetRecommendations = async () => {
        if (!budget || !month || !interests) return;
        setRecsLoading(true);
        try {
            const res = await fetch('/api/travel-recommendation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ budget, month, interests })
            });
            const data = await res.json();
            setRecommendations(data.recommendations || []);
        } catch (err) {
            console.error(err);
        } finally {
            setRecsLoading(false);
        }
    };

    const handleRadarScan = async (targetCity: string) => {
        setRadarTarget(targetCity);
        setShowRadar(true);
        if (!targetCity || !originCity || !radarDate) return;
        
        setRadarLoading(true);
        setRadarError('');
        try {
            const res = await fetch('/api/travel-research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: targetCity,
                    originCity: originCity,
                    startDate: format(radarDate, 'yyyy-MM-dd'),
                    includeFlights: true,
                    includeHotels: true,
                    adults: 1
                })
            });
            if (!res.ok) throw new Error('Radar Uplink Failed');
            const data = await res.json();
            setRadarResults(data);
        } catch (err: any) {
            setRadarError(err.message);
        } finally {
            setRadarLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#03080F] text-white py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
            {/* Cyber Background */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#8B5CF6]/10 to-transparent filter blur-[100px]" />
                <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-t from-[#00D4FF]/10 to-transparent filter blur-[100px]" />
            </div>

            <div className="max-w-6xl mx-auto space-y-16 relative z-10 w-full">
                
                {/* HERO SECTION - RECOMENDATIONS */}
                <div className="space-y-8">
                    <div className="text-center space-y-4">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }}
                            className="mx-auto w-20 h-20 bg-[#1A103C] border border-[#8B5CF6]/40 rounded-2xl flex items-center justify-center mb-6 shadow-[#8B5CF6]/20 shadow-[0_0_40px]"
                        >
                            <Sparkles className="w-10 h-10 text-[#00FFB3]" />
                        </motion.div>
                        <h1 className="text-5xl sm:text-6xl font-black tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-[#E2E8F0] to-[#00FFB3]">
                            Travel Intelligence
                        </h1>
                        <p className="text-lg text-white/50 max-w-2xl mx-auto font-light tracking-widest uppercase text-sm">
                            Where should you travel next? Let our AI Agents guide you.
                        </p>
                    </div>

                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-black/40 border border-[#8B5CF6]/20 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-[#00FFB3]">Budget Target</label>
                                <Input 
                                    placeholder="e.g., €1000, Cheap, High-end" 
                                    value={budget} onChange={e => setBudget(e.target.value)}
                                    className="bg-black/50 border-[#00FFB3]/30 h-14 rounded-xl text-lg font-mono focus-visible:ring-[#00FFB3]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-[#00D4FF]">Drop Month</label>
                                <Input 
                                    placeholder="e.g., October" 
                                    value={month} onChange={e => setMonth(e.target.value)}
                                    className="bg-black/50 border-[#00D4FF]/30 h-14 rounded-xl text-lg font-mono focus-visible:ring-[#00D4FF]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-[#8B5CF6]">Mission Interests</label>
                                <Input 
                                    placeholder="e.g., Nature, Cyberpunk city, Beach" 
                                    value={interests} onChange={e => setInterests(e.target.value)}
                                    className="bg-black/50 border-[#8B5CF6]/30 h-14 rounded-xl text-lg font-mono focus-visible:ring-[#8B5CF6]"
                                />
                            </div>
                        </div>
                        <Button 
                            className="w-full h-16 mt-6 bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF] hover:from-[#7C3AED] hover:to-[#00B4D8] text-white font-black text-lg tracking-widest uppercase rounded-xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_50px_rgba(0,212,255,0.5)]"
                            onClick={handleGetRecommendations}
                            disabled={recsLoading || !budget || !month || !interests}
                        >
                            {recsLoading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Navigation className="w-6 h-6 mr-3" />}
                            {recsLoading ? 'Consulting Agents...' : 'Get AI Recommendations'}
                        </Button>
                    </motion.div>

                    {/* RECOMMENDATION RESULTS */}
                    <AnimatePresence>
                        {recommendations && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                className="grid md:grid-cols-3 gap-6 pt-8"
                            >
                                {recommendations.map((rec, i) => (
                                    <div key={i} className="bg-[#1A103C]/80 border border-[#8B5CF6]/40 rounded-3xl p-6 relative flex flex-col items-start hover:border-[#00FFB3]/50 transition-colors group shadow-lg">
                                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#00FFB3] rounded-full flex items-center justify-center font-black text-black text-lg border-4 border-[#03080F] shadow-[0_0_20px_#00FFB3]">
                                            {rec.matchScore}
                                        </div>
                                        <h3 className="text-2xl font-black uppercase text-white mb-1 leading-tight w-10/12">{rec.destination}</h3>
                                        <p className="text-sm font-mono text-[#00D4FF] mb-4">Cost: {rec.estimatedCost} | {rec.weather}</p>
                                        <p className="text-white/70 text-sm leading-relaxed mb-6 flex-grow">{rec.reason}</p>
                                        
                                        <Button 
                                            variant="outline" 
                                            onClick={() => {
                                                setRadarTarget(rec.destination);
                                                setShowRadar(true);
                                                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                            }}
                                            className="w-full border-[#00FFB3]/30 text-[#00FFB3] hover:bg-[#00FFB3]/10"
                                        >
                                            <Scan className="w-4 h-4 mr-2" /> Global Radar Scan
                                        </Button>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* DASHBOARD GRID */}
                <div className="space-y-12">
                    <h2 className="text-2xl font-black uppercase tracking-widest text-[#8B5CF6] border-b border-white/10 pb-4 flex items-center gap-3 mt-16">
                        <Activity className="w-6 h-6" /> Live Subsystems
                    </h2>
                    
                    {intelLoading ? (
                        <RadarLoading />
                    ) : intel ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* COL 1: Trending & Gems */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* Trending Now */}
                                <div>
                                    <h3 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-6">
                                        <Flame className="w-5 h-5 text-[#FF5F00]" /> Trending Targets
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {intel.trending?.map((item: any, i: number) => (
                                            <div key={i} className="bg-black/30 border border-[#FF5F00]/30 rounded-2xl p-5 hover:bg-[#FF5F00]/5 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-lg text-white">{item.destination}</h4>
                                                    <Badge className="bg-[#FF5F00]/20 text-[#FF5F00] hover:bg-[#FF5F00]/30 font-mono">
                                                        🔥 {item.score}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-white/50 mb-3 line-clamp-2">{item.why}</p>
                                                <div className="flex justify-between items-center text-xs font-mono text-[#00D4FF]">
                                                    <span>{item.bestTime}</span>
                                                    <span>{item.budget} Budget</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Hidden Gems */}
                                <div>
                                    <h3 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-6">
                                        <Compass className="w-5 h-5 text-[#8B5CF6]" /> Encrypted Sectors (Hidden Gems)
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {intel.hiddenGems?.map((item: any, i: number) => (
                                            <div key={i} className="bg-black/30 border border-[#8B5CF6]/30 rounded-2xl p-5 hover:bg-[#8B5CF6]/5 transition-colors border-dashed">
                                                <h4 className="font-bold text-lg text-[#8B5CF6] mb-2">{item.destination}</h4>
                                                <p className="text-sm text-white/60 leading-relaxed">{item.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Flight Deals */}
                                <div>
                                    <h3 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-6">
                                        <Plane className="w-5 h-5 text-[#00D4FF]" /> Vector Anomalies (Flight Deals)
                                    </h3>
                                    <div className="grid gap-3">
                                        {intel.flightDeals?.map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between bg-black/40 border border-[#00D4FF]/20 rounded-xl p-4">
                                                <div className="font-mono text-white/80">{item.route}</div>
                                                <div className="flex items-center gap-6">
                                                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">{item.trend}</Badge>
                                                    <div className="text-right">
                                                        <div className="font-bold text-[#00D4FF] text-xl">{item.price}</div>
                                                        <div className="text-[10px] text-white/40 uppercase tracking-widest">{item.bestDay}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* COL 2: News, Insights, Alerts */}
                            <div className="space-y-8">
                                {/* Insights */}
                                <div className="bg-gradient-to-b from-[#8B5CF6]/10 to-transparent border border-[#8B5CF6]/20 rounded-3xl p-6">
                                    <h3 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-6">
                                        <Lightbulb className="w-5 h-5 text-[#00FFB3]" /> AI Insights
                                    </h3>
                                    <div className="space-y-4">
                                        {intel.insights?.map((item: any, i: number) => (
                                            <div key={i} className="border-l-2 border-[#00FFB3] pl-4">
                                                <h4 className="font-bold text-sm text-white mb-1">{item.title}</h4>
                                                <p className="text-xs text-white/60">{item.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Alerts */}
                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6">
                                    <h3 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-6">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" /> Hazard Alerts
                                    </h3>
                                    <div className="space-y-4">
                                        {intel.alerts?.map((item: any, i: number) => (
                                            <div key={i} className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-bold text-xs text-amber-500 uppercase tracking-wider">{item.title}</h4>
                                                    <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                                                        {item.severity}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-amber-500/70">{item.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* News */}
                                <div>
                                    <h3 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-4">
                                        <Newspaper className="w-5 h-5 text-white/70" /> Comms Traffic (News)
                                    </h3>
                                    <div className="space-y-3">
                                        {intel.news?.map((item: any, i: number) => (
                                            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <h4 className="font-bold text-sm text-white mb-2 leading-tight">{item.title}</h4>
                                                <p className="text-xs text-white/50 mb-3">{item.summary}</p>
                                                {item.impact === 'Good' ? (
                                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Positive Impact</Badge>
                                                ) : (
                                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Warning</Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-white/40 text-center py-20">Intelligence feed unavailable.</p>
                    )}
                </div>

                {/* THE RADAR (Appears when summoned from a recommendation) */}
                <AnimatePresence>
                    {showRadar && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="pt-16 border-t border-white/10"
                        >
                            <div className="text-center space-y-4 mb-8">
                                <Crosshair className="w-12 h-12 text-[#00D4FF] mx-auto animate-spin-slow" />
                                <h2 className="text-4xl font-black uppercase text-white">Global Radar Targeting</h2>
                                <p className="text-[#00D4FF] font-mono tracking-widest">Locked on: {radarTarget}</p>
                            </div>
                            
                            <div className="max-w-2xl mx-auto bg-black/40 border border-[#00D4FF]/30 p-6 rounded-3xl backdrop-blur-xl mb-12">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-[#00D4FF] tracking-widest pl-2">Launch Point</label>
                                        <Input 
                                            placeholder="Your origin city..." 
                                            value={originCity} onChange={e => setOriginCity(e.target.value)}
                                            className="bg-black/50 border-[#00D4FF]/30 h-14 rounded-xl text-lg font-mono focus-visible:ring-[#00D4FF]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-[#00FFB3] tracking-widest pl-2">Temporal Sync</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full h-14 justify-start bg-black/50 border-[#00FFB3]/30 hover:bg-black/70 hover:text-white rounded-xl font-mono text-lg text-white">
                                                    {radarDate ? format(radarDate, "PPP") : <span>Select Date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 border-[#00FFB3]/30 bg-[#03080F]/95 backdrop-blur-xl rounded-2xl text-white">
                                                <Calendar mode="single" selected={radarDate} onSelect={setRadarDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <Button 
                                    className="w-full mt-6 h-14 bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(0,212,255,0.4)]"
                                    onClick={() => handleRadarScan(radarTarget)}
                                    disabled={radarLoading || !originCity || !radarDate}
                                >
                                    {radarLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Scan className="w-5 h-5 mr-2" />}
                                    {radarLoading ? 'Scanning...' : 'Execute Full Deep Scan'}
                                </Button>
                                {radarError && (
                                    <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono flex items-center gap-3">
                                        <ShieldCheck className="w-5 h-5 text-red-500" /> {radarError}
                                    </div>
                                )}
                            </div>

                            {/* RADAR RESULTS */}
                            {radarLoading ? (
                                <div className="py-12"><RadarLoading /></div>
                            ) : radarResults && (
                                <div className="space-y-12">
                                    {radarResults.flights && radarResults.flights.length > 0 && (
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-6 border-b border-white/10 pb-4">
                                                Flight Vectors
                                            </h3>
                                            <div className="grid gap-4">
                                                {radarResults.flights.map((f: any, i: number) => (
                                                    <div key={i} className="bg-black/40 border border-[#8B5CF6]/30 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-[#8B5CF6]/10 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center font-bold text-white shadow-inner">
                                                                {f.airline?.charAt(0) || '✈️'}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-lg text-white tracking-wider uppercase">{f.airline || 'Unknown'}</h4>
                                                                <div className="text-xs text-[#00D4FF] font-mono mt-1 flex items-center gap-2">
                                                                    <span>{f.from}</span> <ArrowRight className="w-3 h-3 text-white/30" /> <span>{f.to}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-8 text-center sm:text-right">
                                                            <div>
                                                                <p className="text-[10px] uppercase text-[#8B5CF6] tracking-widest mb-1">Time</p>
                                                                <p className="font-mono text-white/90">{f.duration || 'N/A'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase text-[#8B5CF6] tracking-widest mb-1">Hops</p>
                                                                <p className="font-mono text-white/90">{f.stops === 0 ? 'Direct' : f.stops}</p>
                                                            </div>
                                                            <div className="border-l border-white/10 pl-8">
                                                                <p className="font-black text-2xl text-[#00FFB3] shadow-[#00FFB3]/20 drop-shadow-md">${f.price.toFixed(0)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {radarResults.hotels && radarResults.hotels.length > 0 && (
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-widest text-[#00D4FF] mb-6 border-b border-white/10 pb-4">
                                                Base Camps
                                            </h3>
                                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                                {[...radarResults.hotels].sort((a,b) => (a.price || 9999) - (b.price || 9999)).map((h: any, i: number) => (
                                                    <div key={i} className="bg-black/40 border border-[#00D4FF]/30 p-6 rounded-2xl flex flex-col hover:bg-[#00D4FF]/10 transition-colors">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0055FF] flex items-center justify-center p-2 text-white">
                                                                <Hotel className="w-5 h-5" />
                                                            </div>
                                                            {i === 0 && (
                                                                <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 font-mono text-[10px] uppercase tracking-widest">
                                                                    <Trophy className="w-3 h-3 mr-1 inline" /> Optimal
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-lg text-white leading-tight mb-2 truncate">{h.name}</h4>
                                                        <p className="font-mono text-xs text-[#00D4FF]/70 truncate">{h.city}</p>
                                                        <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-end">
                                                            <span className="text-[10px] uppercase tracking-widest text-white/40">Rate</span>
                                                            <span className="font-black text-2xl text-white drop-shadow-md">
                                                                ${h.price > 0 ? h.price.toFixed(0) : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
