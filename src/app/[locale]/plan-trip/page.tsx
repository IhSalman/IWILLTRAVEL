'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import {
    Sparkles, MapPin, Calendar as CalendarIcon, Wallet, ArrowRight, ArrowLeft,
    User, Users, Heart, Coffee, Map, Zap, Train, Car, Footprints,
    Camera, Utensils, Trees, Music, Landmark, ShoppingBag,
    Globe, FlaskConical, CheckCircle, Plane, Hotel, ToggleLeft, ToggleRight
} from 'lucide-react';
import ItineraryTabs from '@/components/itinerary/ItineraryTabs';
import { PlanTripGlobe } from '@/components/plan-trip/PlanTripGlobe';
import type { PlaceResearch } from '@/app/api/research-place/route';

const companionsOptions = [
    { id: 'Solo', icon: <User className="w-8 h-8 mb-2 text-[#00D4FF]" />, label: 'Solo', desc: 'Just me discovering the world' },
    { id: 'Couple', icon: <Heart className="w-8 h-8 mb-2 text-[#FF007F]" />, label: 'Couple', desc: 'A romantic getaway' },
    { id: 'Friends', icon: <Users className="w-8 h-8 mb-2 text-[#FFB300]" />, label: 'Friends', desc: 'Fun trip with the group' },
    { id: 'Family', icon: <Users className="w-8 h-8 mb-2 text-[#00FFB3]" />, label: 'Family', desc: 'Kid-friendly adventures' },
];

const budgetOptions = [
    { id: 'Backpacker', icon: <Wallet className="w-8 h-8 mb-2 text-[#00FFB3]" />, label: 'Backpacker', desc: 'Cheap stays & street food' },
    { id: 'Mid-range', icon: <Wallet className="w-8 h-8 mb-2 text-[#00D4FF]" />, label: 'Mid-range', desc: 'Comfy hotels & nice meals' },
    { id: 'Luxury', icon: <Wallet className="w-8 h-8 mb-2 text-[#6366F1]" />, label: 'Luxury', desc: '5-star all the way' },
    { id: 'Custom', icon: <Wallet className="w-8 h-8 mb-2 text-[#FF007F]" />, label: 'Custom Budget', desc: 'Set your exact amount' },
];

const CURRENCIES = [
    'USD', 'EUR', 'GBP', 'BDT', 'INR', 'JPY', 'CAD', 'AUD', 'SGD', 'AED',
    'SAR', 'PKR', 'MYR', 'THB', 'TRY', 'BRL', 'MXN', 'ZAR', 'EGP', 'NGN',
];

const paceOptions = [
    { id: 'Relaxed', icon: <Coffee className="w-8 h-8 mb-2 text-[#FFB300]" />, label: 'Relaxed', desc: 'Take it easy, slow mornings' },
    { id: 'Moderate', icon: <Map className="w-8 h-8 mb-2 text-[#00D4FF]" />, label: 'Moderate', desc: 'A good balance of chill and action' },
    { id: 'Packed', icon: <Zap className="w-8 h-8 mb-2 text-[#FF007F]" />, label: 'Packed', desc: 'See everything possible' },
];

const transitOptions = [
    { id: 'Public Transit', icon: <Train className="w-8 h-8 mb-2 text-[#6366F1]" />, label: 'Public Transit', desc: 'Trains and buses' },
    { id: 'Rental Car', icon: <Car className="w-8 h-8 mb-2 text-[#FF007F]" />, label: 'Rental Car', desc: 'Driving myself around' },
    { id: 'Walking / Rideshares', icon: <Footprints className="w-8 h-8 mb-2 text-[#00FFB3]" />, label: 'Walking / Uber', desc: 'Short distances' },
];

const interestsOptions = [
    { id: 'Culture', icon: <Landmark className="w-4 h-4 mr-2" /> },
    { id: 'Food', icon: <Utensils className="w-4 h-4 mr-2" /> },
    { id: 'Nature', icon: <Trees className="w-4 h-4 mr-2" /> },
    { id: 'Nightlife', icon: <Music className="w-4 h-4 mr-2" /> },
    { id: 'Photography', icon: <Camera className="w-4 h-4 mr-2" /> },
    { id: 'Shopping', icon: <ShoppingBag className="w-4 h-4 mr-2" /> },
    { id: 'Adventure', icon: <Zap className="w-4 h-4 mr-2" /> },
];

type LoadingStage = 'planning' | 'researching' | 'enriching' | 'optimizing' | 'composing' | null;

export default function PlanTripPage() {
    const TOTAL_STEPS = 8;
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

    // Form State
    const [destination, setDestination] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [companions, setCompanions] = useState('');
    const [budget, setBudget] = useState('');
    const [pace, setPace] = useState('');
    const [transportation, setTransportation] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [includeFlights, setIncludeFlights] = useState(false);
    const [includeHotels, setIncludeHotels] = useState(false);
    const [originCity, setOriginCity] = useState('');
    const [customBudgetAmount, setCustomBudgetAmount] = useState('');
    const [currency, setCurrency] = useState('USD');

    // Result State
    const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
    const [itinerary, setItinerary] = useState<any>(null);
    const [research, setResearch] = useState<PlaceResearch | null>(null);
    const [flights, setFlights] = useState<any[]>([]);
    const [hotels, setHotels] = useState<any[]>([]);
    const [flightAnalysis, setFlightAnalysis] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const calculatedDays = dateRange?.from && dateRange?.to
        ? differenceInDays(dateRange.to, dateRange.from) + 1
        : 0;

    const handleNext = () => {
        if (step < TOTAL_STEPS) {
            setDirection(1);
            setStep(s => s + 1);
        }
        else if (step === TOTAL_STEPS) generateItinerary();
    };
    
    const handleBack = () => {
        setDirection(-1);
        setStep(s => Math.max(s - 1, 1));
    };

    const toggleInterest = (id: string) => {
        setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const travelerTypeMap: Record<string, string> = {
        'Solo': 'single', 'Couple': 'couple', 'Family': 'family', 'Friends': 'single'
    };
    const budgetMap: Record<string, string> = {
        'Backpacker': 'budget', 'Mid-range': 'moderate', 'Luxury': 'luxury', 'Custom': 'custom'
    };
    const styleMap: Record<string, string> = {
        'Relaxed': 'relaxed', 'Moderate': 'balanced', 'Packed': 'adventure'
    };

    const generateItinerary = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            alert('Please select a date range first');
            return;
        }

        setDirection(1);
        setStep(TOTAL_STEPS + 1);
        setItinerary(null);
        setResearch(null);

        try {
            setLoadingStage('planning');
            await new Promise(r => setTimeout(r, 400));
            const researchPromise = fetch(`/api/research-place?destination=${encodeURIComponent(destination)}`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null);

            setLoadingStage('researching');
            await new Promise(r => setTimeout(r, 600));
            const placeResearch = await researchPromise;
            setResearch(placeResearch);

            setLoadingStage('enriching');
            const startDateStr = format(dateRange.from, 'yyyy-MM-dd');
            const endDateStr = format(dateRange.to, 'yyyy-MM-dd');

            const itineraryResponse = await fetch('/api/agent-itinerary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination, days: calculatedDays, startDate: startDateStr, endDate: endDateStr,
                    travelerType: travelerTypeMap[companions] || 'single', budget: budgetMap[budget] || 'moderate',
                    travelStyle: styleMap[pace] || 'balanced', interests,
                    transport: transportation === 'Public Transit' ? 'public' : (transportation === 'Rental Car' ? 'rental' : 'walking'),
                    includeFlights, includeHotels, originCity: includeFlights ? originCity : undefined,
                    customBudget: budget === 'Custom' && customBudgetAmount ? parseFloat(customBudgetAmount) : undefined,
                    currency: budget === 'Custom' ? currency : 'USD',
                }),
            });

            setLoadingStage('composing');
            await new Promise(r => setTimeout(r, 400));

            const rawText = await itineraryResponse.text();
            let data;
            try { data = JSON.parse(rawText); } catch { throw new Error('AI returned an invalid response. Please try again.'); }

            if (itineraryResponse.ok) {
                setItinerary(data.itinerary);
                setFlights(data.flights || []);
                setHotels(data.hotels || []);
                setFlightAnalysis(data.flightAnalysis || null);

                try {
                    const supabase = (await import('@/utils/supabase/client')).createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        fetch('/api/itineraries', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                title: data.itinerary.title, itinerary: data.itinerary, start_date: startDateStr, end_date: endDateStr,
                                city_id: destination.toLowerCase().replace(/\s+/g, '-'), days: calculatedDays, budget: budgetMap[budget] || 'moderate',
                                travel_style: styleMap[pace] || 'balanced', traveler_type: travelerTypeMap[companions] || 'single', interests,
                            })
                        }).catch(e => console.error('Auto-save error:', e));
                    }
                } catch (e) { console.error('Auto-save failed:', e); }
            } else {
                throw new Error(data.error || 'Failed to generate itinerary. Please try again.');
            }
        } catch (err: any) {
            alert(`Error: ${err.message || 'Something went wrong. Please try again.'}`);
            setStep(TOTAL_STEPS);
        } finally {
            setLoadingStage(null);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const supabase = (await import('@/utils/supabase/client')).createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { alert('Please log in to save your trip.'); return; }

            const res = await fetch('/api/itineraries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: itinerary.title, itinerary, start_date: format(dateRange?.from as Date, 'yyyy-MM-dd'), end_date: format(dateRange?.to as Date, 'yyyy-MM-dd'),
                    city_id: destination.toLowerCase().replace(/\s+/g, '-'), days: calculatedDays, budget: budgetMap[budget] || 'moderate',
                    travel_style: styleMap[pace] || 'balanced', traveler_type: travelerTypeMap[companions] || 'single', interests,
                }),
            });
            if (res.ok) alert('✅ Trip saved to your account!');
            else alert('Failed to save. Please try again.');
        } catch (e) { alert('Save error. Please try again.'); } 
        finally { setIsSaving(false); }
    };

    const handleRegenerate = () => {
        setItinerary(null); setResearch(null); setFlights([]); setHotels([]); setFlightAnalysis(null);
        generateItinerary();
    };

    const currentProgress = (step / TOTAL_STEPS) * 100;

    const OptionCard = ({ option, selectedValue, onSelect }: { option: any, selectedValue: string, onSelect: (id: string) => void }) => {
        const isSelected = selectedValue === option.id;
        return (
            <div
                onClick={() => onSelect(option.id)}
                className={`cursor-pointer p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center text-center backdrop-blur-xl ${
                    isSelected
                    ? 'border-[#00D4FF] bg-[#00D4FF]/10 shadow-[0_0_30px_rgba(0,212,255,0.3)] scale-[1.03]'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10 hover:scale-[1.01]'
                }`}
                style={{ transformStyle: 'preserve-3d' }}
            >
                <div className="transform translate-z-8">{option.icon}</div>
                <h3 className="font-bold text-lg mb-1 text-white">{option.label}</h3>
                <p className="text-sm text-white/50">{option.desc}</p>
            </div>
        );
    };

    const isDone = (stages: string[]) => stages.includes(loadingStage!) || (!loadingStage && !!itinerary);
    const loadingStages = [
        { id: 'planning', icon: <FlaskConical className="w-6 h-6" />, label: 'Planning trip structure…', done: isDone(['researching', 'enriching', 'optimizing', 'composing']) },
        { id: 'researching', icon: <MapPin className="w-6 h-6" />, label: 'Researching ' + (includeFlights ? '& finding flights ' : '') + '…', done: isDone(['enriching', 'optimizing', 'composing']) },
        { id: 'enriching', icon: <Sparkles className="w-6 h-6" />, label: 'Discovering local gems…', done: isDone(['optimizing', 'composing']) },
        { id: 'composing', icon: <Globe className="w-6 h-6" />, label: 'Composing final itinerary…', done: !loadingStage && !!itinerary },
    ];

    // Slide variants for a 3D Z-index pop effect
    const slideVariants = {
        enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0, scale: 0.9, rotateY: direction > 0 ? 15 : -15 }),
        center: { zIndex: 1, x: 0, opacity: 1, scale: 1, rotateY: 0 },
        exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 300 : -300, opacity: 0, scale: 0.9, rotateY: direction < 0 ? 15 : -15 })
    };

    return (
        <div className="relative min-h-screen bg-[#03080f] py-16 font-sans overflow-hidden">
            {/* 3D Background Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <PlanTripGlobe />
                <motion.div animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] bg-[#6366F1] rounded-full blur-[200px] opacity-20 mix-blend-screen" />
                <motion.div animate={{ opacity: [0.3, 0.1, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 15, repeat: Infinity }} className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] bg-[#00D4FF] rounded-full blur-[200px] opacity-20 mix-blend-screen" />
            </div>

            <div className="container relative z-10 max-w-4xl flex flex-col items-center">
                {/* 3D Progress Path */}
                {step <= TOTAL_STEPS && (
                    <div className="w-full max-w-2xl mb-16 relative">
                        <div className="flex justify-between text-white/50 mb-4 px-2 uppercase font-bold tracking-widest text-[10px]">
                            <span>Departure</span>
                            <span>Destination</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full relative">
                            {/* Animated progress dashed line */}
                            <motion.div
                                className="absolute top-0 left-0 h-full bg-[#00D4FF] rounded-full shadow-[0_0_15px_#00D4FF]"
                                initial={{ width: 0 }}
                                animate={{ width: `${currentProgress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                            {/* Plane Icon moving along the track */}
                            <motion.div
                                className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_white]"
                                initial={{ left: 0 }}
                                animate={{ left: `calc(${currentProgress}% - 16px)` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            >
                                <Plane className="w-4 h-4 text-[#03080f] rotate-45" />
                            </motion.div>
                        </div>
                    </div>
                )}

                <div className="w-full max-w-2xl relative" style={{ perspective: 1500 }}>
                    <AnimatePresence mode="wait" custom={direction}>

                        {/* STEP 1: DESTINATION */}
                        {step === 1 && (
                            <motion.div key="1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, type: 'spring' }} className="space-y-8 text-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 md:p-14 shadow-2xl">
                                <div className="mb-8">
                                    <div className="mx-auto w-20 h-20 bg-[#00D4FF]/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,212,255,0.3)]">
                                        <MapPin className="w-10 h-10 text-[#00D4FF]" />
                                    </div>
                                    <h1 className="text-4xl md:text-6xl font-black mb-4 text-white">Where to?</h1>
                                    <p className="text-xl text-white/50">Enter a city, country, or region.</p>
                                </div>
                                <Input
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    placeholder="e.g. Tokyo, Japan"
                                    className="text-2xl py-8 px-6 text-center border-white/20 bg-black/40 text-white placeholder:text-white/30 focus-visible:ring-[#00D4FF] focus-visible:border-[#00D4FF] rounded-2xl shadow-inner"
                                    onKeyDown={(e) => { if (e.key === 'Enter' && destination) handleNext(); }}
                                />
                            </motion.div>
                        )}

                        {/* STEP 2: DURATION */}
                        {step === 2 && (
                            <motion.div key="2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, type: 'spring' }} className="space-y-8 text-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 md:p-14 shadow-2xl">
                                <div className="mb-8">
                                    <div className="mx-auto w-20 h-20 bg-[#6366F1]/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                                        <CalendarIcon className="w-10 h-10 text-[#6366F1]" />
                                    </div>
                                    <h1 className="text-4xl md:text-6xl font-black mb-4 text-white">When are you going?</h1>
                                    <p className="text-xl text-white/50">Select your trip dates.</p>
                                </div>
                                <div className="flex flex-col items-center space-y-6">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full max-w-md text-left font-bold py-8 px-6 text-xl border-white/20 bg-black/40 text-white hover:bg-black/60 rounded-2xl shadow-inner", !dateRange && "text-white/40")}>
                                                <CalendarIcon className="mr-3 h-6 w-6 text-[#6366F1]" />
                                                {dateRange?.from ? (
                                                    dateRange.to ? (<><span>{format(dateRange.from, "LLL dd, y")}</span> – <span>{format(dateRange.to, "LLL dd, y")}</span></>) : (<span>{format(dateRange.from, "LLL dd, y")}</span>)
                                                ) : (<span>Pick a date range</span>)}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-4 bg-[#0a1628] border-white/10 text-white rounded-2xl shadow-2xl" align="center">
                                            <Calendar
                                                initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange}
                                                numberOfMonths={2} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                className="text-white"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {calculatedDays > 0 && (
                                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                                            <Badge className="text-lg py-2 px-6 rounded-full bg-[#6366F1]/20 text-[#00D4FF] border border-[#6366F1]/50 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                                                {calculatedDays} Days Duration
                                            </Badge>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3, 4, 5, 6 - Option Cards */}
                        {[
                            { s: 3, title: "Who\'s going?", desc: "Helps us pick the right vibe.", opts: companionsOptions, val: companions, set: setCompanions },
                            { s: 4, title: "What\'s the budget?", desc: "Helps us recommend dining and stays.", opts: budgetOptions, val: budget, set: setBudget },
                            { s: 5, title: "Choose your pace", desc: "How dense do you want your schedule?", opts: paceOptions, val: pace, set: setPace },
                            { s: 6, title: "Getting around", desc: "Your primary mode of transit?", opts: transitOptions, val: transportation, set: setTransportation }
                        ].map((cfg) => step === cfg.s && (
                            <motion.div key={cfg.s} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, type: 'spring' }} className="space-y-8 text-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl">
                                <div className="mb-6">
                                    <h1 className="text-4xl md:text-5xl font-black mb-2 text-white">{cfg.title}</h1>
                                    <p className="text-lg text-white/50">{cfg.desc}</p>
                                </div>
                                <div className={`grid gap-4 ${cfg.opts.length === 4 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
                                    {cfg.opts.map(opt => <OptionCard key={opt.id} option={opt} selectedValue={cfg.val as string} onSelect={cfg.set} />)}
                                </div>

                                {/* Custom Budget Input */}
                                {cfg.s === 4 && budget === 'Custom' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden bg-black/40 p-6 rounded-3xl border border-[#FF007F]/20 mt-4">
                                        <p className="text-sm font-bold mb-4 text-[#FF007F] uppercase tracking-wider">Set Your Budget</p>
                                        <div className="flex gap-3 items-center justify-center">
                                            <select
                                                value={currency}
                                                onChange={(e) => setCurrency(e.target.value)}
                                                className="h-14 px-4 rounded-xl bg-white/5 border border-white/20 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#FF007F] appearance-none cursor-pointer"
                                            >
                                                {CURRENCIES.map(c => <option key={c} value={c} className="bg-[#0a1628] text-white">{c}</option>)}
                                            </select>
                                            <Input
                                                type="number"
                                                value={customBudgetAmount}
                                                onChange={(e) => setCustomBudgetAmount(e.target.value)}
                                                placeholder="e.g. 50000"
                                                className="text-2xl py-6 px-6 text-center border-white/20 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#FF007F] rounded-xl max-w-[200px]"
                                                min={1}
                                            />
                                        </div>
                                        {customBudgetAmount && (
                                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-white/50 mt-3">
                                                Total trip budget: <span className="text-[#FF007F] font-bold">{currency} {Number(customBudgetAmount).toLocaleString()}</span>
                                            </motion.p>
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}

                        {/* STEP 7: INTERESTS */}
                        {step === 7 && (
                            <motion.div key="7" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, type: 'spring' }} className="space-y-8 text-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 md:p-14 shadow-2xl">
                                <div className="mb-8">
                                    <h1 className="text-4xl md:text-5xl font-black mb-4 text-white">What do you love?</h1>
                                    <p className="text-lg text-white/50">Select your main interests to customize the trip.</p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-4">
                                    {interestsOptions.map(opt => {
                                        const isSelected = interests.includes(opt.id);
                                        return (
                                            <Badge
                                                key={opt.id}
                                                variant="outline"
                                                className={`cursor-pointer text-sm md:text-base py-3 px-6 rounded-full transition-all duration-300 ${isSelected ? 'bg-[#00FFB3] text-black border-[#00FFB3] shadow-[0_0_20px_rgba(0,255,179,0.5)] scale-110' : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:border-white/40 font-medium'}`}
                                                onClick={() => toggleInterest(opt.id)}
                                            >
                                                <div className="flex items-center font-bold pb-[2px]">{opt.icon}<span>{opt.id}</span></div>
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 8: CUSTOMIZE */}
                        {step === 8 && (
                            <motion.div key="8" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, type: 'spring' }} className="space-y-8 text-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl">
                                <div className="mb-8">
                                    <div className="mx-auto w-16 h-16 bg-[#00FFB3]/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,255,179,0.3)]">
                                        <Sparkles className="w-8 h-8 text-[#00FFB3]" />
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black mb-4 text-white">Customize your trip</h1>
                                    <p className="text-lg text-white/50">Choose what extras to include in your itinerary.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Flight Toggle */}
                                    <div onClick={() => setIncludeFlights(!includeFlights)} className={`cursor-pointer p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center text-center backdrop-blur-xl ${includeFlights ? 'border-[#00D4FF] bg-[#00D4FF]/10 shadow-[0_0_30px_rgba(0,212,255,0.3)] scale-[1.03]' : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}`}>
                                        <Plane className={`w-8 h-8 mb-4 ${includeFlights ? 'text-[#00D4FF]' : 'text-white/40'}`} />
                                        <h3 className="font-bold text-lg mb-1 text-white">Flight Search</h3>
                                        <p className="text-sm text-white/50 mb-4">AI finds the best flights</p>
                                        {includeFlights ? <ToggleRight className="w-10 h-10 text-[#00D4FF]" /> : <ToggleLeft className="w-10 h-10 text-white/40" />}
                                    </div>

                                    {/* Hotel Toggle */}
                                    <div onClick={() => setIncludeHotels(!includeHotels)} className={`cursor-pointer p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center text-center backdrop-blur-xl ${includeHotels ? 'border-[#FFB300] bg-[#FFB300]/10 shadow-[0_0_30px_rgba(255,179,0,0.3)] scale-[1.03]' : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}`}>
                                        <Hotel className={`w-8 h-8 mb-4 ${includeHotels ? 'text-[#FFB300]' : 'text-white/40'}`} />
                                        <h3 className="font-bold text-lg mb-1 text-white">Hotel Search</h3>
                                        <p className="text-sm text-white/50 mb-4">AI finds top-rated stays</p>
                                        {includeHotels ? <ToggleRight className="w-10 h-10 text-[#FFB300]" /> : <ToggleLeft className="w-10 h-10 text-white/40" />}
                                    </div>
                                </div>

                                {includeFlights && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden bg-black/40 p-6 rounded-3xl border border-white/5 mt-6">
                                        <p className="text-sm font-bold mb-3 text-[#00D4FF] uppercase tracking-wider">Where are you flying from?</p>
                                        <Input value={originCity} onChange={(e) => setOriginCity(e.target.value)} placeholder="e.g. New York, USA" className="text-xl py-6 px-6 text-center border-white/20 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#00D4FF] rounded-2xl" />
                                    </motion.div>
                                )}
                            </motion.div>
                        )}


                        {/* LOADING STATE - 3D HUD Effect */}
                        {step > TOTAL_STEPS && loadingStage && (
                            <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                                <Card className="border border-white/10 shadow-[0_0_50px_rgba(0,212,255,0.15)] bg-white/5 backdrop-blur-3xl mt-4 overflow-hidden rounded-[40px]">
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#00D4FF] to-transparent animate-pulse" />
                                    <CardContent className="p-10 md:p-14 relative z-10">
                                        <div className="text-center mb-12">
                                            <div className="relative w-32 h-32 mx-auto mb-8">
                                                <div className="absolute inset-0 border-4 border-[#00D4FF]/20 rounded-full border-t-[#00D4FF] animate-spin" style={{ animationDuration: '2s' }} />
                                                <div className="absolute inset-2 border-4 border-[#FF007F]/20 rounded-full border-b-[#FF007F] animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Plane className="w-10 h-10 text-white" />
                                                </div>
                                            </div>
                                            <h2 className="text-3xl font-black text-white tracking-tight mb-2">
                                                Processing Request
                                            </h2>
                                            <p className="text-[#00D4FF] font-medium tracking-wide uppercase text-sm">System connecting to agents…</p>
                                        </div>

                                        <div className="space-y-4 max-w-sm mx-auto">
                                            {loadingStages.map((stage, i) => {
                                                const isActive = loadingStage === stage.id;
                                                const isDone = stage.done;
                                                return (
                                                    <motion.div
                                                        key={stage.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.15 }}
                                                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 ${isDone ? 'bg-[#00FFB3]/10 border-[#00FFB3]/30 shadow-[0_0_15px_rgba(0,255,179,0.2)]' : isActive ? 'bg-[#00D4FF]/10 border-[#00D4FF]/50 shadow-[0_0_15px_rgba(0,212,255,0.3)]' : 'bg-white/5 border-white/10 opacity-40'}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-[#00FFB3] text-black shadow-[0_0_10px_#00FFB3]' : isActive ? 'bg-[#00D4FF] text-black animate-pulse shadow-[0_0_10px_#00D4FF]' : 'bg-white/10 text-white/50'}`}>
                                                            {isDone ? <CheckCircle className="w-5 h-5" /> : stage.icon}
                                                        </div>
                                                        <span className={`font-bold text-sm ${isDone ? 'text-[#00FFB3]' : isActive ? 'text-[#00D4FF]' : 'text-white/50'}`}>
                                                            {isDone ? stage.label.replace('…', ' ✓') : stage.label}
                                                        </span>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* FINAL RESULT */}
                        {step > TOTAL_STEPS && !loadingStage && itinerary && (
                            <motion.div key="result" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full relative z-20">
                                <div className="p-1 rounded-[40px] bg-gradient-to-br from-[#00D4FF]/50 via-[#6366F1]/50 to-[#FF007F]/50 shadow-[0_0_50px_rgba(0,212,255,0.2)]">
                                    <div className="bg-[#0a1628] rounded-[38px] overflow-hidden">
                                        <ItineraryTabs
                                            itinerary={itinerary} research={research} destination={destination} companions={companions}
                                            budget={budget} pace={pace} transportation={transportation} onSave={handleSave}
                                            onRegenerate={handleRegenerate} isSaving={isSaving} flights={flights} hotels={hotels} flightAnalysis={flightAnalysis}
                                        />
                                    </div>
                                </div>
                                <div className="mt-10 text-center">
                                    <Button variant="ghost" className="rounded-full text-white/50 hover:text-white hover:bg-white/10" onClick={() => { setStep(1); setItinerary(null); setResearch(null); setFlights([]); setHotels([]); setFlightAnalysis(null); }}>
                                        ← Plan a different trip
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* BOTTOM NAVIGATION */}
                {step <= TOTAL_STEPS && (
                    <div className="flex justify-between w-full max-w-2xl mt-10 pt-8 border-t border-white/10 px-2 md:px-0 relative z-20">
                        <Button variant="ghost" size="lg" onClick={handleBack} disabled={step === 1} className="rounded-full px-8 text-white/50 hover:text-white hover:bg-white/10 font-bold">
                            <ArrowLeft className="w-5 h-5 mr-3" /> Back
                        </Button>
                        {step < TOTAL_STEPS ? (
                            <Button size="lg" onClick={handleNext} className="rounded-full px-10 bg-white text-black hover:bg-gray-200 font-extrabold text-base shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105"
                                disabled={(step === 1 && !destination) || (step === 2 && calculatedDays < 1) || (step === 3 && !companions) || (step === 4 && !budget) || (step === 5 && !pace) || (step === 6 && !transportation)}>
                                Continue <ArrowRight className="w-5 h-5 ml-3" />
                            </Button>
                        ) : (
                            <Button size="lg" onClick={generateItinerary} className="rounded-full px-10 bg-gradient-to-r from-[#00D4FF] to-[#6366F1] text-white hover:opacity-90 font-extrabold text-base shadow-[0_0_20px_rgba(0,212,255,0.5)] transition-all hover:scale-105 border-0">
                                <Sparkles className="w-5 h-5 mr-2" /> Generate Itinerary
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
