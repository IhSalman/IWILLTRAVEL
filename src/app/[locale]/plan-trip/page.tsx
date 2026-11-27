'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays, addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { toast } from 'sonner';
import {
    Sparkles, MapPin, Calendar as CalendarIcon, Wallet, ArrowRight, ArrowLeft,
    User, Users, Heart, Coffee, Map, Zap, Train, Car, Footprints,
    Camera, Utensils, Trees, Music, Landmark, ShoppingBag,
    CheckCircle, Plane, Hotel, ToggleLeft, ToggleRight,
    Lock, X, Star, Loader2, SlidersHorizontal, Wand2
} from 'lucide-react';
import ItineraryTabs from '@/components/itinerary/ItineraryTabs';
import LiveTripCommandBar from '@/components/itinerary/LiveTripCommandBar';
import TripCopilotDrawer from '@/components/itinerary/TripCopilotDrawer';
import { TripBuildProgress } from '@/components/plan-trip/TripBuildProgress';
import type { PlaceResearch } from '@/app/api/research-place/route';
import type { AgentLog } from '@/app/api/agent-itinerary/types';

// ─── Option Data ──────────────────────────────────────────────────────────────
const companionsOptions = [
    { id: 'Solo', icon: <User className="w-4 h-4 text-sky-300" />, label: 'Solo', desc: 'Independent rhythm' },
    { id: 'Couple', icon: <Heart className="w-4 h-4 text-rose-300" />, label: 'Couple', desc: 'Romantic stays & dining' },
    { id: 'Friends', icon: <Users className="w-4 h-4 text-amber-300" />, label: 'Friends', desc: 'Shared social energy' },
    { id: 'Family', icon: <Users className="w-4 h-4 text-emerald-300" />, label: 'Family', desc: 'All-ages comfort' },
];

const budgetOptions = [
    { id: 'Backpacker', icon: <Wallet className="w-4 h-4 text-emerald-300" />, label: 'Smart Value', desc: '~$80/day · Hostels & street food' },
    { id: 'Mid-range', icon: <Wallet className="w-4 h-4 text-sky-300" />, label: 'Mid-Range', desc: '~$150/day · Boutique stays & bistros' },
    { id: 'Luxury', icon: <Wallet className="w-4 h-4 text-amber-300" />, label: 'Luxury', desc: '~$400/day · 5-star & fine dining' },
    { id: 'Custom', icon: <Wallet className="w-4 h-4 text-indigo-300" />, label: 'Custom Cap', desc: 'Set exact total cap' },
];

const CURRENCIES = [
    'USD', 'EUR', 'GBP', 'BDT', 'INR', 'JPY', 'CAD', 'AUD', 'SGD', 'AED',
    'SAR', 'PKR', 'MYR', 'THB', 'TRY', 'BRL', 'MXN', 'ZAR', 'EGP', 'NGN',
];

const paceOptions = [
    { id: 'Relaxed', icon: <Coffee className="w-4 h-4 text-amber-200" />, label: 'Relaxed', desc: '2–3 stops/day' },
    { id: 'Moderate', icon: <Map className="w-4 h-4 text-sky-300" />, label: 'Balanced', desc: '3–4 stops/day' },
    { id: 'Packed', icon: <Zap className="w-4 h-4 text-emerald-300" />, label: 'High-Energy', desc: '4–5 stops/day' },
];

const transitOptions = [
    { id: 'Public Transit', icon: <Train className="w-4 h-4 text-sky-300" />, label: 'Metro & Rail', desc: 'Trains & subways' },
    { id: 'Walking / Rideshares', icon: <Footprints className="w-4 h-4 text-emerald-300" />, label: 'Walk & Rideshare', desc: 'Walkable + Uber' },
    { id: 'Rental Car', icon: <Car className="w-4 h-4 text-amber-200" />, label: 'Rental Car', desc: 'Scenic driving' },
];

const interestsOptions = [
    { id: 'Culture', icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'Food', icon: <Utensils className="w-3.5 h-3.5" /> },
    { id: 'Nature', icon: <Trees className="w-3.5 h-3.5" /> },
    { id: 'Nightlife', icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'Photography', icon: <Camera className="w-3.5 h-3.5" /> },
    { id: 'Shopping', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { id: 'Adventure', icon: <Zap className="w-3.5 h-3.5" /> },
];

const POPULAR_DESTINATIONS = [
    'Tokyo, Japan',
    'Kyoto, Japan',
    'Paris, France',
    'Lisbon, Portugal',
    'Rome, Italy',
    'Bali, Indonesia',
    'Barcelona, Spain',
    'Istanbul, Turkey',
];

const MAGIC_PROMPT_EXAMPLES = [
    '5 days in Kyoto for a couple, mid-range, ramen & historic temples',
    'Weekend in Paris, relaxed pace, art museums & specialty cafes',
    '7 days in Bali with friends, nature, beaches & local food',
];

const DURATION_PRESETS = [
    { label: 'Weekend (3d)', days: 3 },
    { label: '5 Days', days: 5 },
    { label: '1 Week (7d)', days: 7 },
    { label: '10 Days', days: 10 },
    { label: '2 Weeks (14d)', days: 14 },
];

type LoadingStage = 'planning' | 'researching' | 'enriching' | 'optimizing' | 'composing' | null;

// ─── Smart Destination Presets ────────────────────────────────────────────────
function getSmartDestinationDefaults(dest: string): {
    transportation: string;
    interests: string[];
} {
    const lower = dest.toLowerCase();
    if (lower.includes('bali') || lower.includes('phuket') || lower.includes('santorini') || lower.includes('maldives')) {
        return { transportation: 'Walking / Rideshares', interests: ['Nature', 'Food', 'Photography'] };
    }
    if (lower.includes('iceland') || lower.includes('scotland') || lower.includes('new zealand')) {
        return { transportation: 'Rental Car', interests: ['Nature', 'Adventure', 'Photography'] };
    }
    return { transportation: 'Public Transit', interests: ['Culture', 'Food'] };
}

// ─── Signup Gate Modal ────────────────────────────────────────────────────────
function SignupGateModal({
    onClose,
    onContinueAsGuest,
}: {
    days: number;
    destination: string;
    onClose: () => void;
    onContinueAsGuest: () => void;
}) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0b0c0f]/85 backdrop-blur-xl"
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 16 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    className="relative w-full max-w-md rounded-[30px] overflow-hidden apple-liquid-glass"
                >
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="absolute top-4 right-4 text-slate-300 hover:text-white p-1.5 rounded-full apple-glass-pill transition-colors z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="p-8 text-center">
                        <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center apple-glass-pill">
                            <Lock className="w-6 h-6 text-sky-300" />
                        </div>

                        <h2 className="text-2xl font-heading font-bold text-white mb-2">
                            Save & Sync Your Trip
                        </h2>
                        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                            Create a free account to unlock <span className="text-white font-semibold">2 full itineraries every month</span> and access saved trips across devices.
                        </p>

                        <div className="rounded-2xl mb-6 p-4 text-left space-y-2.5 bg-[#0b0c0f]/70 border border-white/[0.08]">
                            {[
                                'Save & revisit itineraries anytime',
                                'Interactive AI Trip Co-Pilot & live route adjustments',
                                'Live Google Places & Amadeus flights/stays',
                                '2 free AI itineraries generated every month',
                            ].map((item) => (
                                <div key={item} className="flex items-center gap-2.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    <span className="text-slate-200 text-xs">{item}</span>
                                </div>
                            ))}
                        </div>

                        <Link
                            href="/signup"
                            className="block w-full py-3.5 rounded-full btn-apple-primary text-sm mb-3 text-center"
                        >
                            Create Free Account →
                        </Link>

                        <button
                            onClick={onContinueAsGuest}
                            className="block w-full py-2.5 rounded-full font-medium text-slate-300 text-xs transition-all hover:text-white hover:bg-white/[0.06] mb-3"
                        >
                            Continue without saving →
                        </button>

                        <p className="text-slate-400 text-xs">
                            Already have an account?{' '}
                            <Link href="/login" className="text-white hover:text-sky-300 underline underline-offset-2">Sign in</Link>
                        </p>

                        <div className="mt-5 flex items-center justify-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                            ))}
                            <span className="text-slate-400 text-[11px] ml-1.5">Trusted by 2,400+ travelers</span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Inner Client Planner ─────────────────────────────────────────────────────
function PlanTripContent() {
    // Consolidated 2-Step Express Architecture (Step 1: Destination & Dates / Magic Prompt, Step 2: All-in-One Bento Customizer)
    const TOTAL_STEPS = 2;
    const searchParams = useSearchParams();

    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [prefilledApplied, setPrefilledApplied] = useState(false);

    // Auth state
    const [user, setUser] = useState<any>(null);
    const [authLoaded, setAuthLoaded] = useState(false);

    // Magic Prompt state
    const [magicPrompt, setMagicPrompt] = useState('');
    const [isParsingPrompt, setIsParsingPrompt] = useState(false);

    // Form State with Smart Pre-Selected Defaults (Zero mandatory clicking through 8 screens)
    const [destination, setDestination] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const start = addDays(new Date(), 14);
        return { from: start, to: addDays(start, 4) }; // Default 5 Days
    });
    const [companions, setCompanions] = useState('Couple');
    const [budget, setBudget] = useState('Mid-range');
    const [pace, setPace] = useState('Moderate');
    const [transportation, setTransportation] = useState('Public Transit');
    const [interests, setInterests] = useState<string[]>(['Culture', 'Food']);
    const [includeFlights, setIncludeFlights] = useState(false);
    const [includeHotels, setIncludeHotels] = useState(false);
    const [originCity, setOriginCity] = useState('');
    const [customBudgetAmount, setCustomBudgetAmount] = useState('');
    const [currency, setCurrency] = useState('USD');

    // Result & Live Streaming State
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [skeletonDays, setSkeletonDays] = useState<any[]>([]);
    const [itinerary, setItinerary] = useState<any>(null);
    const [savedItineraryId, setSavedItineraryId] = useState<string | null>(null);
    const [research, setResearch] = useState<PlaceResearch | null>(null);
    const [flights, setFlights] = useState<any[]>([]);
    const [hotels, setHotels] = useState<any[]>([]);
    const [flightAnalysis, setFlightAnalysis] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
    const [nudgeDismissed, setNudgeDismissed] = useState(false);

    const [showGate, setShowGate] = useState(false);
    const [, setGuestOverride] = useState(false);

    const calculatedDays = dateRange?.from && dateRange?.to
        ? differenceInDays(dateRange.to, dateRange.from) + 1
        : 5;

    // ── Pre-fill from URL Query Parameters (?destination=...&days=...) ───────
    useEffect(() => {
        if (prefilledApplied) return;
        const paramDest = searchParams.get('destination');
        const paramDays = parseInt(searchParams.get('days') || '', 10);

        if (paramDest && paramDest.trim()) {
            const cleanDest = paramDest.trim();
            setDestination(cleanDest);
            const smart = getSmartDestinationDefaults(cleanDest);
            setTransportation(smart.transportation);
            setInterests(smart.interests);

            const daysCount = (!isNaN(paramDays) && paramDays >= 1 && paramDays <= 30) ? paramDays : 5;
            const start = addDays(new Date(), 14);
            setDateRange({ from: start, to: addDays(start, daysCount - 1) });
        }
        setPrefilledApplied(true);
    }, [searchParams, prefilledApplied]);

    // ── Load auth silently ────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const { createClient } = await import('@/utils/supabase/client');
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            } catch (_) {}
            finally { setAuthLoaded(true); }
        })();
    }, []);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const travelerTypeMap: Record<string, string> = {
        'Solo': 'single', 'Couple': 'couple', 'Family': 'family', 'Friends': 'friends'
    };
    const reverseTravelerMap: Record<string, string> = {
        'single': 'Solo', 'couple': 'Couple', 'family': 'Family', 'friends': 'Friends'
    };
    const budgetMap: Record<string, string> = {
        'Backpacker': 'budget', 'Mid-range': 'moderate', 'Luxury': 'luxury', 'Custom': 'custom'
    };
    const reverseBudgetMap: Record<string, string> = {
        'budget': 'Backpacker', 'moderate': 'Mid-range', 'luxury': 'Luxury', 'custom': 'Custom'
    };
    const styleMap: Record<string, string> = {
        'Relaxed': 'relaxed', 'Moderate': 'balanced', 'Packed': 'adventure'
    };
    const reverseStyleMap: Record<string, string> = {
        'relaxed': 'Relaxed', 'balanced': 'Moderate', 'adventure': 'Packed', 'cultural': 'Moderate'
    };
    const reverseTransportMap: Record<string, string> = {
        'public': 'Public Transit', 'rental': 'Rental Car', 'walking': 'Walking / Rideshares'
    };

    const applyDurationPreset = (daysCount: number) => {
        const baseStart = dateRange?.from && dateRange.from >= new Date(new Date().setHours(0, 0, 0, 0))
            ? dateRange.from
            : addDays(new Date(), 14);
        setDateRange({
            from: baseStart,
            to: addDays(baseStart, daysCount - 1),
        });
    };

    const handleSelectDestinationPill = (city: string) => {
        setDestination(city);
        const smart = getSmartDestinationDefaults(city);
        setTransportation(smart.transportation);
        setInterests(smart.interests);
    };

    const toggleInterest = (id: string) => {
        setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // ── Handle 1-Sentence Magic Prompt ────────────────────────────────────────
    const handleMagicPromptSubmit = async (customText?: string) => {
        const textToParse = (customText ?? magicPrompt).trim();
        if (!textToParse) {
            toast.error('Type a short description of your dream trip first.');
            return;
        }
        setIsParsingPrompt(true);
        try {
            const res = await fetch('/api/agent-itinerary/parse-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: textToParse }),
            });
            const data = await res.json();
            if (!res.ok || !data?.parsed) {
                throw new Error(data?.error || 'Could not parse trip prompt');
            }
            const p = data.parsed;
            const parsedDest = p.destination || destination || 'Tokyo, Japan';
            const parsedDays = Math.min(30, Math.max(1, Number(p.days) || 5));
            const start = addDays(new Date(), 14);
            const nextDateRange = { from: start, to: addDays(start, parsedDays - 1) };

            const nextCompanions = reverseTravelerMap[p.travelerType] || 'Couple';
            const nextBudget = reverseBudgetMap[p.budget] || 'Mid-range';
            const nextPace = reverseStyleMap[p.travelStyle] || 'Moderate';
            const nextTransport = reverseTransportMap[p.transport] || 'Public Transit';
            const nextInterests = Array.isArray(p.interests) && p.interests.length > 0 ? p.interests : ['Culture', 'Food'];

            setDestination(parsedDest);
            setDateRange(nextDateRange);
            setCompanions(nextCompanions);
            setBudget(nextBudget);
            setPace(nextPace);
            setTransportation(nextTransport);
            setInterests(nextInterests);
            if (p.originCity) setOriginCity(p.originCity);
            if (typeof p.includeFlights === 'boolean') setIncludeFlights(p.includeFlights);
            if (typeof p.includeHotels === 'boolean') setIncludeHotels(p.includeHotels);
            if (p.customBudget) setCustomBudgetAmount(String(p.customBudget));
            if (p.currency) setCurrency(p.currency);

            toast.success(`Configured ${parsedDays}-day ${parsedDest} trip (${nextCompanions}, ${nextBudget})!`);

            // Immediately launch generation with the parsed overrides
            await generateItinerary({
                destination: parsedDest,
                dateRange: nextDateRange,
                companions: nextCompanions,
                budget: nextBudget,
                pace: nextPace,
                transportation: nextTransport,
                interests: nextInterests,
                originCity: p.originCity || originCity,
                includeFlights: Boolean(p.includeFlights),
                includeHotels: Boolean(p.includeHotels),
                customBudgetAmount: p.customBudget ? String(p.customBudget) : customBudgetAmount,
                currency: p.currency || currency,
            });
        } catch (err: any) {
            toast.error(err?.message || 'Could not parse prompt. Try entering your destination below.');
        } finally {
            setIsParsingPrompt(false);
        }
    };

    // ── Generate Itinerary via 8-Agent SSE Stream ─────────────────────────────
    const generateItinerary = async (overrides?: {
        destination?: string;
        dateRange?: DateRange;
        companions?: string;
        budget?: string;
        pace?: string;
        transportation?: string;
        interests?: string[];
        originCity?: string;
        includeFlights?: boolean;
        includeHotels?: boolean;
        customBudgetAmount?: string;
        currency?: string;
    }) => {
        const effDest = (overrides?.destination ?? destination).trim();
        const effRange = overrides?.dateRange ?? dateRange;
        const effCompanions = overrides?.companions ?? companions;
        const effBudget = overrides?.budget ?? budget;
        const effPace = overrides?.pace ?? pace;
        const effTransport = overrides?.transportation ?? transportation;
        const effInterests = overrides?.interests ?? interests;
        const effOrigin = overrides?.originCity ?? originCity;
        const effFlights = overrides?.includeFlights ?? includeFlights;
        const effHotels = overrides?.includeHotels ?? includeHotels;
        const effCustomAmt = overrides?.customBudgetAmount ?? customBudgetAmount;
        const effCurrency = overrides?.currency ?? currency;

        if (!effDest) {
            toast.error('Please enter or select a destination first.');
            setStep(1);
            return;
        }
        if (!effRange?.from || !effRange?.to) {
            toast.error('Please select your travel dates first.');
            setStep(1);
            return;
        }

        const effDays = differenceInDays(effRange.to, effRange.from) + 1;

        setShowGate(false);
        setDirection(1);
        setStep(TOTAL_STEPS + 1);
        setItinerary(null);
        setSavedItineraryId(null);
        setSkeletonDays([]);
        setResearch(null);
        setLogs([]);
        setLoadingStage('planning');

        try {
            const researchPromise = fetch(`/api/research-place?destination=${encodeURIComponent(effDest)}`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null);

            const startDateStr = format(effRange.from, 'yyyy-MM-dd');
            const endDateStr = format(effRange.to, 'yyyy-MM-dd');

            const response = await fetch('/api/agent-itinerary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: effDest,
                    days: effDays,
                    startDate: startDateStr,
                    endDate: endDateStr,
                    travelerType: travelerTypeMap[effCompanions] || 'couple',
                    budget: budgetMap[effBudget] || 'moderate',
                    travelStyle: styleMap[effPace] || 'balanced',
                    interests: effInterests,
                    transport: effTransport === 'Public Transit' ? 'public'
                        : effTransport === 'Rental Car' ? 'rental'
                        : 'walking',
                    includeFlights: effFlights,
                    includeHotels: effHotels,
                    originCity: effFlights && effOrigin ? effOrigin : undefined,
                    customBudget: effBudget === 'Custom' && effCustomAmt
                        ? parseFloat(effCustomAmt)
                        : undefined,
                    currency: effBudget === 'Custom' ? effCurrency : 'USD',
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                if (response.status === 401) {
                    toast.error('Your session expired. Please sign in again.');
                    setStep(1);
                    return;
                }
                if (response.status === 429) {
                    toast.error(errData.error || 'Monthly itinerary limit reached. Upgrade your plan for more trips.');
                    setStep(1);
                    return;
                }
                throw new Error(errData.error || 'Failed to connect to 8-Agent Orchestrator');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (!reader) throw new Error('Response stream is not readable');

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const eventMatch = line.match(/^event: (\w+)\ndata: (.*)$/);
                    if (eventMatch) {
                        const [, event, dataStr] = eventMatch;
                        const data = JSON.parse(dataStr);

                        if (event === 'log') {
                            setLogs(prev => {
                                const filtered = prev.filter(
                                    (l) => !(l.agent === data.agent && l.status === 'running' && data.status !== 'running')
                                );
                                return [...filtered, data];
                            });
                            if (data.agent === 'Agent 1: Discovery' || data.agent === 'Agent 2: Planning') {
                                setLoadingStage('planning');
                            } else if (data.agent === 'Agent 3: Research' || data.agent === 'Agent 4: Logic Checker') {
                                setLoadingStage('researching');
                            } else if (data.agent === 'Agent 5: Experience') {
                                setLoadingStage('enriching');
                            } else if (data.agent === 'Agent 6: Logistics' || data.agent === 'Agent 7: Sustainability') {
                                setLoadingStage('optimizing');
                            } else if (data.agent === 'Agent 8: Composer') {
                                setLoadingStage(data.status === 'success' ? null : 'composing');
                            }
                        } else if (event === 'skeleton') {
                            if (Array.isArray(data?.plan)) {
                                setSkeletonDays(data.plan);
                            }
                        } else if (event === 'result') {
                            setItinerary(data.itinerary);
                            setFlights(data.flights || []);
                            setHotels(data.hotels || []);
                            setFlightAnalysis(data.flightAnalysis || null);
                            setLoadingStage(null);
                            setNudgeDismissed(false);
                            toast.success(`Your ${effDays}-day ${effDest} itinerary is ready!`);
                            if (!user) {
                                const currentMonth = new Date().toISOString().slice(0, 7);
                                const guestUsage = parseInt(localStorage.getItem(`guest_usage_${currentMonth}`) || '0', 10);
                                localStorage.setItem(`guest_usage_${currentMonth}`, (guestUsage + 1).toString());
                            }
                            handleAutoSave(data, startDateStr, endDateStr, effDest, effDays, effCompanions, effBudget, effPace, effInterests);
                        } else if (event === 'error') {
                            throw new Error(data.message || 'Agent pipeline encountered an error');
                        }
                    }
                }
            }

            const placeResearch = await researchPromise;
            setResearch(placeResearch);

        } catch (err: any) {
            toast.error(err.message || 'Something went wrong while generating your trip. Please try again.');
            setLoadingStage(null);
            setStep(1);
        }
    };

    const handleAutoSave = async (
        data: any,
        startDateStr: string,
        endDateStr: string,
        effDest = destination,
        effDays = calculatedDays,
        effCompanions = companions,
        effBudget = budget,
        effPace = pace,
        effInterests = interests
    ) => {
        if (!user) return;
        try {
            const cityId = (effDest || 'custom').toLowerCase().replace(/\s+/g, '-');
            const res = await fetch('/api/itineraries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: data.itinerary.title,
                    itinerary: data.itinerary,
                    start_date: startDateStr,
                    end_date: endDateStr,
                    city_id: cityId,
                    days: effDays,
                    budget: budgetMap[effBudget] || 'moderate',
                    travel_style: styleMap[effPace] || 'balanced',
                    traveler_type: travelerTypeMap[effCompanions] || 'couple',
                    interests: effInterests,
                    flights: data.flights || [],
                    hotels: data.hotels || [],
                    flightAnalysis: data.flightAnalysis || null,
                }),
            });
            if (res.ok) {
                const savedRow = await res.json().catch(() => null);
                if (savedRow?.id) {
                    setSavedItineraryId(String(savedRow.id));
                }
            }
        } catch (e) {
            console.error('[Auto-save] Unexpected error:', e);
        }
    };

    const handleSave = async () => {
        if (!user) {
            setShowGate(true);
            return;
        }
        if (savedItineraryId) {
            toast.success('Trip is already saved to your Dashboard & synced with AI Co-Pilot!');
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch('/api/itineraries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: itinerary.title,
                    itinerary,
                    start_date: format(dateRange?.from as Date, 'yyyy-MM-dd'),
                    end_date: format(dateRange?.to as Date, 'yyyy-MM-dd'),
                    city_id: destination.toLowerCase().replace(/\s+/g, '-'),
                    days: calculatedDays,
                    budget: budgetMap[budget] || 'moderate',
                    travel_style: styleMap[pace] || 'balanced',
                    traveler_type: travelerTypeMap[companions] || 'couple',
                    interests,
                    flights: flights || [],
                    hotels: hotels || [],
                    flightAnalysis: flightAnalysis || null,
                }),
            });
            if (res.ok) {
                const savedRow = await res.json().catch(() => null);
                if (savedRow?.id) setSavedItineraryId(String(savedRow.id));
                toast.success('Trip saved to your Dashboard!');
            } else {
                toast.error('Could not save trip. Please try again.');
            }
        } catch {
            toast.error('Network error while saving trip.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerate = () => {
        setItinerary(null);
        setSavedItineraryId(null);
        setSkeletonDays([]);
        setResearch(null);
        setFlights([]);
        setHotels([]);
        setFlightAnalysis(null);
        generateItinerary();
    };

    const currentProgress = Math.min(100, (step / TOTAL_STEPS) * 100);

    const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.98 }),
        center: { zIndex: 1, x: 0, opacity: 1, scale: 1 },
        exit: (dir: number) => ({ zIndex: 0, x: dir < 0 ? 80 : -80, opacity: 0, scale: 0.98 }),
    };

    return (
        <div className="relative min-h-screen bg-background py-10 md:py-16 font-body text-slate-100 overflow-x-clip">
            {/* Soft sunrise glow */}
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full bg-sunrise-300/[0.06] blur-[120px] pointer-events-none" />

            {/* Gate Modal */}
            {showGate && (
                <SignupGateModal
                    days={calculatedDays}
                    destination={destination || 'your trip'}
                    onClose={() => setShowGate(false)}
                    onContinueAsGuest={() => {
                        setShowGate(false);
                        setGuestOverride(true);
                        generateItinerary();
                    }}
                />
            )}

            <div className="container relative z-10 max-w-5xl mx-auto px-4 flex flex-col items-center">

                {/* ── Guest preview banner ───────────────────────────────── */}
                {!user && authLoaded && step <= TOTAL_STEPS && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-3xl mb-6 flex items-center justify-between gap-3 text-xs"
                    >
                        <span className="eyebrow hidden sm:inline">Trip planner</span>
                        <p className="text-slate-500">
                            Planning as a guest ·{' '}
                            <Link href="/signup" className="text-slate-200 underline decoration-white/20 underline-offset-4 hover:text-sunrise-300 hover:decoration-sunrise-300/60 transition-colors">
                                sign up free to save trips
                            </Link>
                        </p>
                    </motion.div>
                )}

                {/* ── Compact Step Switcher Header ──────────────────────── */}
                {step <= TOTAL_STEPS && (
                    <div className="w-full max-w-3xl mb-6 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="inline-flex p-1 rounded-full apple-liquid-glass">
                                <button
                                    type="button"
                                    onClick={() => { setDirection(-1); setStep(1); }}
                                    className={cn(
                                        'px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5',
                                        step === 1 ? 'btn-apple-primary' : 'text-slate-300 hover:text-white'
                                    )}
                                >
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>1. Where & When</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!destination.trim()) {
                                            toast.info('Pick or type a destination first');
                                            return;
                                        }
                                        setDirection(1);
                                        setStep(2);
                                    }}
                                    className={cn(
                                        'px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5',
                                        step === 2 ? 'btn-apple-primary' : 'text-slate-300 hover:text-white'
                                    )}
                                >
                                    <SlidersHorizontal className="w-3.5 h-3.5" />
                                    <span>2. Vibe & Add-Ons</span>
                                </button>
                            </div>

                            {/* Live Summary Pill Strip */}
                            <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end text-xs">
                                {destination && (
                                    <span className="px-3 py-1 rounded-full apple-glass-pill text-slate-100 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-sunrise-300" /> {destination}
                                    </span>
                                )}
                                <span className="px-2.5 py-1 rounded-full apple-glass-pill text-slate-300 tabular-nums">
                                    {calculatedDays}d
                                </span>
                                <span className="px-2.5 py-1 rounded-full apple-glass-pill text-slate-300">
                                    {companions} · {budget === 'Custom' && customBudgetAmount ? `${currency} ${customBudgetAmount}` : budget}
                                </span>
                            </div>
                        </div>

                        <div className="h-px w-full bg-white/[0.08] relative overflow-hidden">
                            <motion.div
                                className="h-full bg-sunrise-300"
                                initial={{ width: 0 }}
                                animate={{ width: `${currentProgress}%` }}
                                transition={{ duration: 0.35 }}
                            />
                        </div>
                    </div>
                )}

                <motion.div
                    layout
                    className={`w-full relative transition-all duration-500 ease-out ${itinerary && !loadingStage ? 'max-w-6xl' : 'max-w-3xl'}`}
                >
                    <AnimatePresence mode="wait" custom={direction}>

                        {/* ════════════════════════════════════════════════════════════
                            STEP 1: EXPRESS DESTINATION + DATES + AI MAGIC PROMPT
                        ════════════════════════════════════════════════════════════ */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                className="space-y-6 apple-glass-card rounded-[32px] p-6 sm:p-9"
                            >
                                {/* ── AI Magic Prompt Bar (1-Click Full Trip Setup) ─────── */}
                                <div className="rounded-2xl p-4 sm:p-5 bg-white/[0.02] border border-white/[0.08]">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="inline-flex items-center gap-2 text-sm text-slate-100">
                                            <Wand2 className="w-4 h-4 text-sunrise-300" /> Describe it in one sentence
                                        </span>
                                        <span className="text-xs text-slate-500 hidden sm:inline">
                                            We’ll fill in everything else
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2.5">
                                        <Input
                                            value={magicPrompt}
                                            onChange={(e) => setMagicPrompt(e.target.value)}
                                            placeholder="e.g. 5 days in Kyoto for a couple, mid-range, ramen & historic temples..."
                                            className="flex-1 h-12 px-4 text-sm border-white/15 bg-[#0b0c0f]/85 text-white placeholder:text-slate-500 rounded-xl"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && magicPrompt.trim()) {
                                                    e.preventDefault();
                                                    handleMagicPromptSubmit();
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            disabled={isParsingPrompt || !magicPrompt.trim()}
                                            onClick={() => handleMagicPromptSubmit()}
                                            className="h-12 px-5 rounded-xl btn-apple-primary text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-40"
                                        >
                                            {isParsingPrompt ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Launching…</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Plan it</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                        <span className="text-xs text-slate-500 mr-1">Try</span>
                                        {MAGIC_PROMPT_EXAMPLES.map((sample) => (
                                            <button
                                                key={sample}
                                                type="button"
                                                onClick={() => {
                                                    setMagicPrompt(sample);
                                                    handleMagicPromptSubmit(sample);
                                                }}
                                                className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/[0.08] transition-colors truncate max-w-full"
                                            >
                                                &ldquo;{sample}&rdquo;
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="relative flex items-center justify-center">
                                    <div className="border-t border-white/[0.08] w-full" />
                                    <span className="absolute px-3 whitespace-nowrap text-xs text-slate-500 bg-card">
                                        or choose step by step
                                    </span>
                                    <div className="border-t border-white/[0.08] w-full" />
                                </div>

                                {/* ── Destination Picker ──────────────────────────────────── */}
                                <div className="space-y-4 text-center">
                                    <div>
                                        <h1 className="text-4xl sm:text-5xl font-heading text-slate-100 mb-2 leading-[1.05]">
                                            Where are you <em className="text-sunrise-300">going?</em>
                                        </h1>
                                        <p className="text-sm text-slate-400">
                                            Pick a place and dates. Plan straight away, or fine-tune the style in step two.
                                        </p>
                                    </div>

                                    <div className="relative max-w-xl mx-auto">
                                        <MapPin className="w-5 h-5 text-sky-300 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <Input
                                            value={destination}
                                            onChange={(e) => setDestination(e.target.value)}
                                            placeholder="Enter any city, island, or country (e.g. Tokyo, Japan)"
                                            autoFocus
                                            className="text-base sm:text-lg py-6 pl-12 pr-5 border-white/15 bg-[#0b0c0f]/75 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-sky-400/50 rounded-2xl shadow-inner"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && destination.trim()) {
                                                    generateItinerary();
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Popular 1-Click Destination Chips */}
                                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                                        {POPULAR_DESTINATIONS.map((city) => (
                                            <button
                                                key={city}
                                                type="button"
                                                onClick={() => handleSelectDestinationPill(city)}
                                                className={cn(
                                                    'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all',
                                                    destination === city
                                                        ? 'btn-apple-primary'
                                                        : 'apple-glass-pill text-slate-300 hover:text-white hover:border-white/25'
                                                )}
                                            >
                                                {city}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Duration Presets + Calendar Picker (Same Screen!) ────── */}
                                <div className="pt-2 border-t border-white/[0.08] space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <span className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5 text-amber-200" />
                                            Trip Duration & Dates ({calculatedDays} {calculatedDays === 1 ? 'Day' : 'Days'})
                                        </span>

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="h-9 px-3.5 text-xs border-white/15 bg-[#0b0c0f]/75 text-slate-200 hover:bg-slate-900 rounded-xl"
                                                >
                                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-sky-300" />
                                                    {dateRange?.from && dateRange?.to
                                                        ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
                                                        : 'Pick exact calendar dates'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-4 apple-liquid-glass text-white rounded-3xl" align="end">
                                                <Calendar
                                                    initialFocus
                                                    mode="range"
                                                    defaultMonth={dateRange?.from}
                                                    selected={dateRange}
                                                    onSelect={setDateRange}
                                                    numberOfMonths={2}
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                    className="text-white"
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {DURATION_PRESETS.map((preset) => {
                                            const isActive = calculatedDays === preset.days;
                                            return (
                                                <button
                                                    key={preset.days}
                                                    type="button"
                                                    onClick={() => applyDurationPreset(preset.days)}
                                                    className={cn(
                                                        'flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-medium transition-all',
                                                        isActive
                                                            ? 'btn-apple-primary'
                                                            : 'apple-glass-pill text-slate-200 hover:border-white/25'
                                                    )}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ── Step 1 Express Action Bar (1-Click Instant Generate OR Customize) ── */}
                                <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        disabled={!destination.trim()}
                                        onClick={() => {
                                            setDirection(1);
                                            setStep(2);
                                        }}
                                        className="h-12 px-6 rounded-full btn-apple-glass text-xs font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"
                                    >
                                        <SlidersHorizontal className="w-4 h-4 text-sky-300" />
                                        <span>Customize Vibe, Budget & Flights ({companions} · {budget}) →</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={!destination.trim() || calculatedDays < 1}
                                        onClick={() => generateItinerary()}
                                        className="h-12 px-8 rounded-full btn-apple-primary text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"
                                    >
                                        <Zap className="w-4 h-4" />
                                        <span>Instant Plan ({calculatedDays}d)</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ════════════════════════════════════════════════════════════
                            STEP 2: ALL-IN-ONE BENTO CUSTOMIZER (Replaces Steps 3–8)
                        ════════════════════════════════════════════════════════════ */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                className="space-y-5 apple-glass-card rounded-[32px] p-6 sm:p-8"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
                                    <div>
                                        <h2 className="text-3xl sm:text-4xl font-heading text-slate-100 leading-[1.05]">
                                            {calculatedDays} days in <em className="text-sunrise-300">{destination.split(',')[0]}</em>
                                        </h2>
                                        <p className="mt-1.5 text-sm text-slate-400">
                                            We’ve picked sensible defaults. Change anything, then generate.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setDirection(-1); setStep(1); }}
                                        className="self-start sm:self-auto text-xs text-sky-300 hover:text-white inline-flex items-center gap-1"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" /> Change destination/dates
                                    </button>
                                </div>

                                {/* Bento Grid: Who + Budget + Pace/Transit */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    {/* Bento 1: Who's Traveling */}
                                    <div className="rounded-2xl p-4 bg-[#0b0c0f]/60 border border-white/[0.08] space-y-3">
                                        <p className="text-sm text-slate-200">
                                            1. Who&apos;s Traveling?
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {companionsOptions.map((opt) => {
                                                const active = companions === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setCompanions(opt.id)}
                                                        className={cn(
                                                            'p-3 rounded-xl text-left transition-all border flex items-start gap-2.5',
                                                            active
                                                                ? 'border-sky-300/50 bg-sky-500/15 text-white shadow-sm'
                                                                : 'border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-white/20'
                                                        )}
                                                    >
                                                        <div className="mt-0.5">{opt.icon}</div>
                                                        <div>
                                                            <div className="text-xs font-semibold text-white">{opt.label}</div>
                                                            <div className="text-[10px] text-slate-400 leading-tight">{opt.desc}</div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Bento 2: Budget Style */}
                                    <div className="rounded-2xl p-4 bg-[#0b0c0f]/60 border border-white/[0.08] space-y-3">
                                        <p className="text-sm text-slate-200">
                                            2. Budget Tier
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {budgetOptions.map((opt) => {
                                                const active = budget === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setBudget(opt.id)}
                                                        className={cn(
                                                            'p-3 rounded-xl text-left transition-all border flex items-start gap-2.5',
                                                            active
                                                                ? 'border-sky-300/50 bg-sky-500/15 text-white shadow-sm'
                                                                : 'border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-white/20'
                                                        )}
                                                    >
                                                        <div className="mt-0.5">{opt.icon}</div>
                                                        <div>
                                                            <div className="text-xs font-semibold text-white">{opt.label}</div>
                                                            <div className="text-[10px] text-slate-400 leading-tight">{opt.desc}</div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {budget === 'Custom' && (
                                            <div className="flex gap-2 items-center pt-1">
                                                <select
                                                    value={currency}
                                                    onChange={(e) => setCurrency(e.target.value)}
                                                    aria-label="Currency"
                                                    className="h-10 px-3 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-mono"
                                                >
                                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <Input
                                                    type="number"
                                                    value={customBudgetAmount}
                                                    onChange={(e) => setCustomBudgetAmount(e.target.value)}
                                                    placeholder="Total cap e.g. 2500"
                                                    className="h-10 text-xs border-white/15 bg-slate-900 text-white rounded-xl font-mono"
                                                    min={1}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Bento 3: Daily Pace & Local Transit */}
                                    <div className="rounded-2xl p-4 bg-[#0b0c0f]/60 border border-white/[0.08] space-y-3">
                                        <p className="text-sm text-slate-200">
                                            3. Daily Pace & Transit Mode
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {paceOptions.map((opt) => {
                                                const active = pace === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setPace(opt.id)}
                                                        className={cn(
                                                            'p-2.5 rounded-xl text-center transition-all border flex flex-col items-center gap-1',
                                                            active
                                                                ? 'border-sky-300/50 bg-sky-500/15 text-white'
                                                                : 'border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-white/20'
                                                        )}
                                                    >
                                                        {opt.icon}
                                                        <span className="text-xs font-semibold text-white">{opt.label}</span>
                                                        <span className="text-[10px] text-slate-400">{opt.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 pt-1">
                                            {transitOptions.map((opt) => {
                                                const active = transportation === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setTransportation(opt.id)}
                                                        className={cn(
                                                            'p-2.5 rounded-xl text-center transition-all border flex flex-col items-center gap-1',
                                                            active
                                                                ? 'border-amber-300/50 bg-amber-500/15 text-white'
                                                                : 'border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-white/20'
                                                        )}
                                                    >
                                                        {opt.icon}
                                                        <span className="text-xs font-semibold text-white">{opt.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Bento 4: Interests & Live Flights/Hotels */}
                                    <div className="rounded-2xl p-4 bg-[#0b0c0f]/60 border border-white/[0.08] space-y-3">
                                        <p className="text-sm text-slate-200">
                                            4. Interests & live prices
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {interestsOptions.map((opt) => {
                                                const isSelected = interests.includes(opt.id);
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => toggleInterest(opt.id)}
                                                        className={cn(
                                                            'inline-flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-full transition-all',
                                                            isSelected
                                                                ? 'btn-apple-primary'
                                                                : 'apple-glass-pill text-slate-300 hover:text-white'
                                                        )}
                                                    >
                                                        {opt.icon}
                                                        <span>{opt.id}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                                            <button
                                                type="button"
                                                onClick={() => setIncludeFlights(!includeFlights)}
                                                className={cn(
                                                    'p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all',
                                                    includeFlights
                                                        ? 'border-sky-300/45 bg-sky-500/15 text-white'
                                                        : 'border-white/[0.08] bg-white/[0.02] text-slate-300'
                                                )}
                                            >
                                                <span className="flex items-center gap-2 font-medium">
                                                    <Plane className="w-4 h-4 text-sky-300" /> Live Flights
                                                </span>
                                                {includeFlights ? <ToggleRight className="w-5 h-5 text-sky-300" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setIncludeHotels(!includeHotels)}
                                                className={cn(
                                                    'p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all',
                                                    includeHotels
                                                        ? 'border-amber-300/45 bg-amber-500/15 text-white'
                                                        : 'border-white/[0.08] bg-white/[0.02] text-slate-300'
                                                )}
                                            >
                                                <span className="flex items-center gap-2 font-medium">
                                                    <Hotel className="w-4 h-4 text-amber-300" /> Live Hotels
                                                </span>
                                                {includeHotels ? <ToggleRight className="w-5 h-5 text-amber-300" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                                            </button>
                                        </div>

                                        {includeFlights && (
                                            <Input
                                                value={originCity}
                                                onChange={(e) => setOriginCity(e.target.value)}
                                                placeholder="Departure City or IATA (e.g. London LHR or JFK)"
                                                className="h-9 text-xs border-white/15 bg-slate-900 text-white rounded-xl"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Step 2 Bottom Generate Bar */}
                                <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
                                    <button
                                        type="button"
                                        onClick={() => { setDirection(-1); setStep(1); }}
                                        className="h-12 px-6 rounded-full btn-apple-glass text-xs font-medium inline-flex items-center gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => generateItinerary()}
                                        className="h-12 px-8 rounded-full btn-apple-primary text-sm font-semibold inline-flex items-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span>Generate {calculatedDays}-Day Itinerary</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ════════════════════════════════════════════════════════════
                            LIVE 8-AGENT WORKBENCH + PROGRESSIVE SKELETON PREVIEW
                        ════════════════════════════════════════════════════════════ */}
                        {step > TOTAL_STEPS && !itinerary && (
                            <motion.div
                                key="workbench"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full space-y-4"
                            >
                                <div className="text-center mb-4">
                                    <span className="eyebrow block mb-3">Building your trip</span>
                                    <h2 className="font-heading text-4xl sm:text-5xl text-slate-100 leading-[1.05]">
                                        Off to <em className="text-sunrise-300">{destination.split(',')[0]}</em>
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-400">
                                        We’re checking real places, opening hours and routes before anything is written.
                                    </p>
                                </div>

                                <TripBuildProgress
                                    logs={logs}
                                    isComplete={!!itinerary}
                                    loadingStage={loadingStage}
                                    destination={destination.split(',')[0]}
                                />

                                {/* Live Progressive Skeleton Preview (Appears ~3s in right after Agent 2 finishes!) */}
                                {skeletonDays.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-200 flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5 text-sunrise-300" />
                                                First draft of your days
                                            </span>
                                            <Badge className="text-[10px] apple-glass-pill text-slate-300">
                                                {skeletonDays.length} days
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                                            {skeletonDays.map((d: any) => (
                                                <div
                                                    key={d.day}
                                                    className="p-3 rounded-xl border border-white/[0.07] text-left space-y-1"
                                                >
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-100">Day {d.day}</span>
                                                        <span className="text-[10px] text-slate-500 truncate max-w-[130px]">{d.neighborhood || d.city}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-300/90 line-clamp-2">
                                                        {(d.activities || []).join(' → ')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                            </motion.div>
                        )}

                        {/* ════════════════════════════════════════════════════════════
                            FINAL RESULT + LIVE COMMAND BAR + AI CO-PILOT DRAWER
                        ════════════════════════════════════════════════════════════ */}
                        {step > TOTAL_STEPS && itinerary && (
                            <motion.div key="result" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full relative z-20 space-y-5">
                                {savedItineraryId && (
                                    <LiveTripCommandBar
                                        itineraryId={savedItineraryId}
                                        initialStatus="saved"
                                        flights={flights}
                                        hotels={hotels}
                                        isOfflineFallback={false}
                                        onItineraryUpdated={(updated) => setItinerary(updated)}
                                    />
                                )}

                                <div className="apple-glass-card rounded-[32px] p-4 sm:p-6 md:p-8">
                                    <ItineraryTabs
                                        itinerary={itinerary}
                                        research={research}
                                        destination={destination}
                                        companions={companions || 'Couple'}
                                        budget={budget || 'Mid-range'}
                                        pace={pace || 'Moderate'}
                                        transportation={transportation || 'Public Transit'}
                                        onSave={handleSave}
                                        onRegenerate={handleRegenerate}
                                        isSaving={isSaving}
                                        flights={flights}
                                        hotels={hotels}
                                        flightAnalysis={flightAnalysis}
                                        itineraryId={savedItineraryId || undefined}
                                    />
                                </div>

                                {savedItineraryId && (
                                    <TripCopilotDrawer
                                        itineraryId={savedItineraryId}
                                        destination={destination}
                                        initialCanRollback={false}
                                        onItineraryUpdated={(updated) => setItinerary(updated)}
                                    />
                                )}

                                <div className="mt-8 text-center">
                                    <button
                                        type="button"
                                        className="px-6 py-2.5 rounded-full btn-apple-glass text-xs font-medium"
                                        onClick={() => {
                                            setStep(1);
                                            setItinerary(null);
                                            setSavedItineraryId(null);
                                            setSkeletonDays([]);
                                            setResearch(null);
                                            setFlights([]);
                                            setHotels([]);
                                            setFlightAnalysis(null);
                                            setLogs([]);
                                        }}
                                    >
                                        ← Plan Another Destination
                                    </button>
                                </div>

                                {/* Post-result signup nudge */}
                                <AnimatePresence>
                                    {!nudgeDismissed && !user && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            transition={{ delay: 0.8, duration: 0.4 }}
                                            className="mt-6 mx-auto max-w-lg"
                                        >
                                            <div className="relative rounded-2xl apple-liquid-glass p-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 apple-glass-pill">
                                                        <Lock className="w-4 h-4 text-sky-300" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-white leading-snug">
                                                            Save this {destination} itinerary?
                                                        </p>
                                                        <p className="text-xs text-slate-300 mt-0.5">
                                                            Create a free account to save trips, chat with AI Co-Pilot & unlock 2 itineraries/month.
                                                        </p>
                                                    </div>
                                                    <Link
                                                        href="/signup"
                                                        className="flex-shrink-0 px-4 py-2 rounded-full text-xs btn-apple-primary"
                                                    >
                                                        Save Free →
                                                    </Link>
                                                    <button
                                                        onClick={() => setNudgeDismissed(true)}
                                                        className="flex-shrink-0 text-slate-400 hover:text-white transition-colors text-lg leading-none"
                                                        aria-label="Dismiss"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}

// ─── Page Export (Wrapped in Suspense for Next.js useSearchParams) ────────────
export default function PlanTripPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center text-slate-300">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-300" />
                </div>
            }
        >
            <PlanTripContent />
        </Suspense>
    );
}
