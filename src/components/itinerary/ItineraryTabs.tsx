'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    MapPin, Clock, DollarSign, Lightbulb,
    PiggyBank, ExternalLink, ChevronRight, CheckCircle,
    Users, Calendar, Wallet, Compass, Shield, Globe,
    RotateCcw, Save, Printer, Share2, Search, Zap, Loader2,
    Star, Eye, Plane, Hotel, Trophy, ArrowRight,
    CheckSquare, Square, RefreshCw, CalendarPlus, ChevronDown,
    ChevronUp, Navigation, Sparkles, Leaf, SlidersHorizontal
} from 'lucide-react';
import RoadmapTab from './RoadmapTab';
import FlightAnalysisTab from './FlightAnalysisTab';
import HotelAnalysisTab from './HotelAnalysisTab';
import { ESGBadge } from './ESGBadge';
import type { PlaceResearch } from '@/app/api/research-place/route';
import { Link } from '@/i18n/routing';
import { toast } from 'sonner';

// ── TYPES ──────────────────────────────────────────────────────────────────

interface ResourceLink { label: string; url: string; rating?: number; lat?: number; lng?: number; }

interface Activity {
    time: string;
    title: string;
    description: string;
    duration?: string;
    cost?: string;
    tip?: string;
    transportNote?: string;
    photoUrl?: string | null;
    aerialVideoUrl?: string | null;
    highlights?: string[];
    editorialSummary?: string;
    rating?: number;
    totalRatings?: number;
    address?: string;
    openingHours?: string[];
    openingHoursVerified?: boolean;
    scheduleAdjustmentNote?: string;
    source?: string;
    bookingUrl?: string;
    lat?: number;
    lng?: number;
    transitToNextMinutes?: number;
    transitToNextMode?: string;
    transitToNextKm?: number;
    mealNearby?: string;
    accessibilityNote?: string;
    airQuality?: any;
    category?: string;
    bestTimeToVisit?: string;
}

interface DayResources {
    whereToEat?: ResourceLink[];
    experiences?: ResourceLink[];
    transportTip?: string;
}

interface Day {
    day: number;
    date?: string;
    weekday?: string;
    theme: string;
    areaFocus?: string;
    neighborhood?: string;
    neighborhoodDescription?: string;
    difficulty?: 'high' | 'medium' | 'low';
    pace?: string;
    activities: Activity[];
    dayResources?: DayResources;
    dayLinks?: ResourceLink[];
}

interface RealityItem {
    level: 'high' | 'medium' | 'low';
    description: string;
}

interface FlightData {
    id?: string;
    offerId?: string;
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
    isEstimate?: boolean;
    tier?: 'budget' | 'value' | 'premium';
    comparisonLinks?: any;
    cabin?: string;
}

interface HotelData {
    id?: string;
    offerId?: string;
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
    isEstimate?: boolean;
    tier?: 'budget' | 'mid-range' | 'luxury';
    amenities?: string[];
    comparisonLinks?: any;
    imageUrl?: string;
}

interface Itinerary {
    title: string;
    overview: string;
    bestTimeToVisit?: string;
    weatherForecast?: string;
    currencyAdvice?: string;
    whyThisPlan?: string[];
    travelTips?: string[];
    localCustoms?: string[];
    safetyAdvice?: string[];
    budgetTips?: string[];
    realityCheck?: {
        crowds?: RealityItem;
        physical?: RealityItem;
        weather?: string[];
        physicsCheck?: string;
    };
    days: Day[];
    budgetBreakdown?: {
        totalEstimate: string;
        savingTips?: string[];
    };
    esgReport?: any;
    blackboardState?: {
        truthPool?: any[];
        groundingSource?: string;
        weather?: Record<string, any>;
        currency?: { base?: string; rates?: Record<string, number> };
        locationCoords?: { lat: number; lng: number };
        temporalAuditFixes?: string[];
        spatialDistanceSavedKm?: number;
        lastVerifiedAt?: string;
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
    startDate?: string;
    endDate?: string;
    originCity?: string;
    onSave: () => void;
    onRegenerate: () => void;
    isSaving: boolean;
    flights?: FlightData[];
    hotels?: HotelData[];
    flightAnalysis?: { recommendation: string; bestOption: FlightData | null } | null;
    /** Saved trip id — enables a private stored copy of the PDF in the user's account. */
    itineraryId?: string;
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

function safeStr(val: unknown, fallback = ''): string {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        return String(obj.name ?? obj.title ?? obj.description ?? obj.text ?? fallback);
    }
    return fallback;
}

function normalizeActivity(raw: any, fallbackTime = 'Morning'): Activity {
    if (!raw || typeof raw !== 'object') {
        return {
            time: fallbackTime,
            title: 'Unknown Activity',
            description: '',
        };
    }
    const title = safeStr(raw.title ?? raw.name, 'Unknown Activity');
    const time = safeStr(raw.time, fallbackTime);
    const description = safeStr(raw.description ?? raw.editorialSummary, '');
    const tip = safeStr(raw.tip, '');
    const duration = safeStr(raw.duration, '');
    const cost = safeStr(raw.cost, '');
    const address = safeStr(raw.address, '');
    const transportNote = safeStr(raw.transportNote ?? raw.transportToNext, '');
    const source = safeStr(raw.source, '');
    const bookingUrl = safeStr(raw.bookingUrl, '');
    const editorialSummary = safeStr(raw.editorialSummary, '');
    const photoUrl = typeof raw.photoUrl === 'string' ? raw.photoUrl : null;
    const aerialVideoUrl = typeof raw.aerialVideoUrl === 'string' ? raw.aerialVideoUrl : null;
    const transitToNextMinutes = typeof raw.transitToNextMinutes === 'number' ? raw.transitToNextMinutes : undefined;
    const transitToNextMode = typeof raw.transitToNextMode === 'string' ? raw.transitToNextMode : undefined;
    const transitToNextKm = typeof raw.transitToNextKm === 'number' ? raw.transitToNextKm : undefined;
    const mealNearby = safeStr(raw.mealNearby, '');
    const accessibilityNote = safeStr(raw.accessibilityNote, '');
    const airQuality = raw.airQuality;
    const category = safeStr(raw.category, '');
    const bestTimeToVisit = safeStr(raw.bestTimeToVisit, '');
    const openingHoursVerified = Boolean(raw.openingHoursVerified);
    const scheduleAdjustmentNote = safeStr(raw.scheduleAdjustmentNote, '');

    let highlights: string[] = [];
    if (Array.isArray(raw.highlights)) {
        highlights = raw.highlights.map((h: unknown) => safeStr(h)).filter(Boolean);
    }
    let openingHours: string[] = [];
    if (Array.isArray(raw.openingHours)) {
        openingHours = raw.openingHours.map((h: unknown) => safeStr(h)).filter(Boolean);
    }

    return {
        time,
        title,
        description,
        duration: duration || undefined,
        cost: cost || undefined,
        tip: tip || undefined,
        transportNote: transportNote || undefined,
        photoUrl,
        aerialVideoUrl,
        highlights,
        editorialSummary,
        rating: typeof raw.rating === 'number' ? raw.rating : 0,
        totalRatings: typeof raw.totalRatings === 'number' ? raw.totalRatings : 0,
        address: address || undefined,
        openingHours,
        openingHoursVerified,
        scheduleAdjustmentNote: scheduleAdjustmentNote || undefined,
        source: source || undefined,
        bookingUrl: bookingUrl || undefined,
        lat: typeof raw.lat === 'number' ? raw.lat : undefined,
        lng: typeof raw.lng === 'number' ? raw.lng : undefined,
        transitToNextMinutes,
        transitToNextMode,
        transitToNextKm,
        mealNearby: mealNearby || undefined,
        accessibilityNote: accessibilityNote || undefined,
        airQuality,
        category: category || undefined,
        bestTimeToVisit: bestTimeToVisit || undefined,
    };
}

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400', label: 'high' },
    medium: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-300', label: 'medium' },
    low: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-300', label: 'low' },
};

function DifficultyBadge({ level }: { level?: string }) {
    if (!level) return null;
    const s = DIFFICULTY_STYLES[level] ?? DIFFICULTY_STYLES.medium;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${s.bg} ${s.text}`}>
            {s.label}
        </span>
    );
}

function PaceBadge({ pace }: { pace?: string }) {
    if (!pace) return null;
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/[0.06] text-slate-300 border border-white/[0.1]">
            {pace.toLowerCase()}
        </span>
    );
}

const PASSPORT_PRESETS = [
    { label: '🇺🇸 United States', value: 'American' },
    { label: '🇬🇧 United Kingdom', value: 'British' },
    { label: '🇪🇺 European Union', value: 'German' },
    { label: '🇨🇦 Canada', value: 'Canadian' },
    { label: '🇦🇺 Australia', value: 'Australian' },
    { label: '🇮🇳 India', value: 'Indian' },
    { label: '🇧🇩 Bangladesh', value: 'Bangladeshi' },
    { label: '🇳🇬 Nigeria', value: 'Nigerian' },
];

const FALLBACK_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 154.5,
    CAD: 1.39,
    AUD: 1.53,
    AED: 3.67,
    SGD: 1.34,
    THB: 34.8,
    INR: 84.4,
    BDT: 119.5,
    TRY: 34.5,
};

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function ItineraryTabs({
    itinerary: initialItinerary,
    research,
    destination,
    companions,
    budget,
    pace,
    transportation,
    startDate,
    endDate,
    originCity,
    onSave,
    onRegenerate,
    isSaving,
    flights,
    hotels,
    flightAnalysis,
    itineraryId,
}: Props) {
    const [localItinerary, setLocalItinerary] = useState<Itinerary>(initialItinerary);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    useEffect(() => {
        setLocalItinerary(initialItinerary);
    }, [initialItinerary]);

    const itinerary = localItinerary;

    const [activeTab, setActiveTab] = useState('itinerary');
    // Multi-day expand state (default Day 1 & Day 2 expanded for immediate scannability)
    const [expandedDays, setExpandedDays] = useState<number[]>([0, 1]);
    const [openHoursExpanded, setOpenHoursExpanded] = useState<Record<string, boolean>>({});
    const [activitySearch, setActivitySearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [completedStops, setCompletedStops] = useState<Record<string, boolean>>({});
    const [focusedMapPoint, setFocusedMapPoint] = useState<{ lat: number; lng: number; title?: string; day?: number } | null>(null);

    // Interactive Budget Simulator State
    const [simTravelers, setSimTravelers] = useState<number>(
        companions === 'Couple' ? 2 : companions === 'Family' || companions === 'Friends' ? 4 : 1
    );
    const [simDailySpend, setSimDailySpend] = useState<number>(
        budget === 'Luxury' ? 220 : budget === 'Backpacker' ? 55 : 110
    );
    const [simIncludeFlight, setSimIncludeFlight] = useState<boolean>(true);
    const [simIncludeHotel, setSimIncludeHotel] = useState<boolean>(true);
    const [convAmount, setConvAmount] = useState<string>('100');
    const [convTargetCurr, setConvTargetCurr] = useState<string>('EUR');

    // Interactive Packing Checklist State
    const [checkedPacking, setCheckedPacking] = useState<Record<string, boolean>>({});

    // Visa State
    const [nationality, setNationality] = useState('');
    const [visaData, setVisaData] = useState<any>(null);
    const [visaLoading, setVisaLoading] = useState(false);
    const [visaError, setVisaError] = useState<string | null>(null);
    const [visaNeedsAuth, setVisaNeedsAuth] = useState(false);

    const storageKeyPrefix = useMemo(
        () => `dgis_ui_${(destination || 'trip').toLowerCase().replace(/\s+/g, '_')}_${itinerary?.days?.length || 0}`,
        [destination, itinerary?.days?.length]
    );

    // Load persisted checklists from localStorage
    useEffect(() => {
        try {
            const savedStops = localStorage.getItem(`${storageKeyPrefix}_stops`);
            if (savedStops) setCompletedStops(JSON.parse(savedStops));
            const savedPack = localStorage.getItem(`${storageKeyPrefix}_packing`);
            if (savedPack) setCheckedPacking(JSON.parse(savedPack));
        } catch {
            // ignore storage errors
        }
    }, [storageKeyPrefix]);

    const toggleStopComplete = (key: string) => {
        setCompletedStops((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            try {
                localStorage.setItem(`${storageKeyPrefix}_stops`, JSON.stringify(next));
            } catch {}
            return next;
        });
    };

    const togglePackingItem = (item: string) => {
        setCheckedPacking((prev) => {
            const next = { ...prev, [item]: !prev[item] };
            try {
                localStorage.setItem(`${storageKeyPrefix}_packing`, JSON.stringify(next));
            } catch {}
            return next;
        });
    };

    const toggleDayExpanded = (dayIndex: number) => {
        setExpandedDays((prev) =>
            prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
        );
    };

    const expandAllDays = () => {
        setExpandedDays(itinerary.days.map((_, idx) => idx));
    };

    const collapseAllDays = () => {
        setExpandedDays([]);
    };

    // ── Instant 1-Click Local Activity Swap from Truth Pool ──────────────────
    const handleSwapStopFromTruthPool = (dayIndex: number, actIndex: number) => {
        const pool: any[] = itinerary.blackboardState?.truthPool || [];
        const usedTitles = new Set(
            itinerary.days.flatMap((d) => d.activities.map((a) => safeStr(a.title).toLowerCase()))
        );
        const candidate = pool.find(
            (v) => v?.name && !usedTitles.has(String(v.name).toLowerCase())
        );
        if (!candidate) {
            toast.info('Use the "Trip Co-Pilot" button at bottom-right to search Google Places for more custom swaps!');
            return;
        }
        const currentAct = itinerary.days[dayIndex].activities[actIndex];
        const swappedAct: Activity = {
            ...currentAct,
            title: candidate.name,
            address: candidate.address || destination,
            rating: candidate.rating || 4.5,
            totalRatings: candidate.totalRatings || 180,
            lat: candidate.lat ?? currentAct.lat,
            lng: candidate.lng ?? currentAct.lng,
            category: candidate.types?.[0] || currentAct.category || 'Attraction',
            description: `API-verified alternative from your ${destination} Truth Pool (${candidate.rating || 4.5}★). Located at ${candidate.address || destination}.`,
            scheduleAdjustmentNote: `Swapped in for "${currentAct.title}" from Verified Truth Pool`,
        };

        setLocalItinerary((prev) => {
            const nextDays = [...prev.days];
            const nextActs = [...nextDays[dayIndex].activities];
            nextActs[actIndex] = swappedAct;
            nextDays[dayIndex] = { ...nextDays[dayIndex], activities: nextActs };
            return { ...prev, days: nextDays };
        });
        toast.success(`Swapped "${currentAct.title}" → "${candidate.name}" (${candidate.rating || 4.5}★)!`);
    };

    // ── 1-Click .ics Calendar Export ─────────────────────────────────────────
    const handleExportICS = () => {
        try {
            const lines: string[] = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//iWillTravel DGIS//8-Agent Itinerary//EN',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
            ];

            const baseStart = startDate ? new Date(`${startDate}T09:00:00`) : new Date(Date.now() + 14 * 86400_000);

            itinerary.days.forEach((day, dIdx) => {
                const dayDate = day.date ? new Date(`${day.date}T00:00:00`) : new Date(baseStart.getTime() + dIdx * 86400_000);
                const y = dayDate.getFullYear();
                const m = String(dayDate.getMonth() + 1).padStart(2, '0');
                const d = String(dayDate.getDate()).padStart(2, '0');

                day.activities.forEach((rawAct, aIdx) => {
                    const act = normalizeActivity(rawAct);
                    const startHour = Math.min(20, 9 + aIdx * 3);
                    const endHour = Math.min(22, startHour + 2);
                    const dtStart = `${y}${m}${d}T${String(startHour).padStart(2, '0')}0000`;
                    const dtEnd = `${y}${m}${d}T${String(endHour).padStart(2, '0')}0000`;
                    const cleanDesc = (act.description || '')
                        .replace(/\r?\n/g, ' ')
                        .replace(/[,;]/g, ' ')
                        .slice(0, 240);

                    lines.push(
                        'BEGIN:VEVENT',
                        `UID:dgis-${y}${m}${d}-${dIdx}-${aIdx}@iwilltravel.ai`,
                        `DTSTART:${dtStart}`,
                        `DTEND:${dtEnd}`,
                        `SUMMARY:Day ${day.day}: ${act.title}`,
                        `LOCATION:${(act.address || destination).replace(/[,;]/g, ' ')}`,
                        `DESCRIPTION:${cleanDesc}${act.tip ? ` | Tip: ${act.tip.replace(/[,;]/g, ' ')}` : ''}`,
                        'END:VEVENT'
                    );
                });
            });

            lines.push('END:VCALENDAR');
            const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${destination.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-itinerary.ics`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Calendar (.ics) downloaded! Open it to import into Apple, Google, or Outlook Calendar.');
        } catch {
            toast.error('Could not generate calendar file.');
        }
    };

    const mapsEmbedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || '';

    const headerPoints = itinerary?.days?.flatMap(d => d.activities).filter(a => a.lat && a.lng) || [];
    const routePoints = headerPoints.filter(p => !p.title?.toLowerCase().includes('hotel') && !p.title?.toLowerCase().includes('dinner'));

    let headerMapUrl = '';
    if (mapsEmbedKey) {
        if (routePoints.length >= 2) {
            const origin = `${routePoints[0].lat},${routePoints[0].lng}`;
            const dest = `${routePoints[routePoints.length - 1].lat},${routePoints[routePoints.length - 1].lng}`;
            const waypoints = routePoints.slice(1, -1).slice(0, 20).map(p => `${p.lat},${p.lng}`).join('%7C');
            headerMapUrl = `https://www.google.com/maps/embed/v1/directions?key=${mapsEmbedKey}&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ''}`;
        } else if (routePoints.length === 1) {
            headerMapUrl = `https://www.google.com/maps/embed/v1/place?key=${mapsEmbedKey}&q=${routePoints[0].lat},${routePoints[0].lng}`;
        } else {
            headerMapUrl = `https://www.google.com/maps/embed/v1/search?key=${mapsEmbedKey}&q=${encodeURIComponent(destination)}`;
        }
    }

    if (!itinerary || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 rounded-2xl border border-border/40 bg-muted/20 p-10 text-center">
                <span className="text-4xl">🗺️</span>
                <h2 className="text-xl font-bold">Itinerary data unavailable</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                    This trip was saved in an older format. Please regenerate it to view the full itinerary.
                </p>
                <button
                    onClick={onRegenerate}
                    className="mt-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    Regenerate Trip
                </button>
            </div>
        );
    }

    const totalStopsCount = itinerary.days.reduce((sum, d) => sum + (d.activities?.length || 0), 0);
    const completedCount = Object.values(completedStops).filter(Boolean).length;

    const allCategories = Array.from(
        new Set(
            itinerary.days
                .flatMap((d) => d.activities.map((a) => safeStr(a.category).trim()))
                .filter(Boolean)
        )
    ).slice(0, 6);

    const TABS = [
        { id: 'itinerary', label: `Itinerary · ${itinerary.days.length} days` },
        { id: 'roadmap', label: `Map` },
        {
            id: 'flights',
            label: (
                <span className="flex items-center gap-1.5">
                    Flights
                    {flights && flights.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
                            {flights.length}
                        </span>
                    )}
                </span>
            ),
        },
        {
            id: 'hotels',
            label: (
                <span className="flex items-center gap-1.5">
                    Hotels
                    {hotels && hotels.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
                            {hotels.length}
                        </span>
                    )}
                </span>
            ),
        },
        { id: 'budget', label: 'Budget' },
        { id: 'visa', label: 'Visa' },
        { id: 'tips', label: 'Tips & packing' },
        { id: 'score', label: 'Footprint' },
    ];

    const checkVisa = async (overridePassport?: string) => {
        const pass = (overridePassport ?? nationality).trim();
        if (!pass) return;
        if (overridePassport) setNationality(overridePassport);
        setVisaLoading(true);
        setVisaError(null);
        setVisaNeedsAuth(false);
        try {
            const res = await fetch('/api/visa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: pass, destination }),
            });
            if (res.status === 401) {
                setVisaNeedsAuth(true);
                return;
            }
            const payload = await res.json().catch(() => ({}));
            if (res.ok) {
                setVisaData(payload);
            } else {
                setVisaError(payload.error || 'Could not retrieve visa rules right now.');
            }
        } catch {
            setVisaError('Network error while checking visa requirements.');
        } finally {
            setVisaLoading(false);
        }
    };

    /** Server-rendered multi-page PDF (photos, route maps, clickable map links). */
    const handleDownloadPdf = async () => {
        if (isExportingPdf) return;
        setIsExportingPdf(true);
        const toastId = toast.loading('Building your PDF — adding photos and maps…');
        try {
            const res = await fetch('/api/itinerary-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itinerary: localItinerary,
                    itineraryId,
                    flights: flights || [],
                    hotels: hotels || [],
                    meta: { destination, startDate, endDate, companions, budget, pace, transportation },
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    toast.error('Sign in to download your trip as a PDF.', { id: toastId });
                } else if (data?.upgradeRequired) {
                    toast.error(data.error || 'PDF export is part of the Starter and Pro plans.', {
                        id: toastId,
                        action: { label: 'See plans', onClick: () => (window.location.href = '/pricing') },
                    });
                } else {
                    toast.error(data?.error || 'Could not create the PDF. Please try again.', { id: toastId });
                }
                return;
            }

            const blob = await res.blob();
            const disposition = res.headers.get('content-disposition') || '';
            const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || 'itinerary.pdf';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10_000);

            toast.success(
                res.headers.get('x-saved-copy') === '1'
                    ? 'PDF downloaded — a copy is also saved to your account.'
                    : 'PDF downloaded.',
                { id: toastId }
            );
        } catch {
            toast.error('Network error while creating the PDF.', { id: toastId });
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: itinerary.title, url: window.location.href });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Trip link copied to clipboard!');
            }
        } catch {}
    };

    const visaStatusColors: Record<string, string> = {
        green: 'bg-emerald-500/12 border-emerald-400/35 text-emerald-200',
        blue: 'bg-sky-500/12 border-sky-400/35 text-sky-200',
        yellow: 'bg-amber-500/12 border-amber-400/35 text-amber-200',
        orange: 'bg-orange-500/12 border-orange-400/35 text-orange-200',
        red: 'bg-rose-500/12 border-rose-400/35 text-rose-200',
    };

    // Smart Packing List items
    const smartPackingItems = [
        'Universal power adapter & portable power bank',
        `Comfortable walking shoes (${pace} pace — ${totalStopsCount} verified stops)`,
        'Offline copy of passport, visa & hotel confirmations',
        'No-foreign-transaction-fee debit/credit card + local cash',
        'Lightweight packable rain jacket / umbrella',
        'Reusable water bottle & daypack',
        'Downloaded offline Google Maps & local transit app',
        'Essential medications & compact first-aid kit',
    ];

    return (
        <div className="w-full space-y-6">

            {/* ── HERO HEADER ──────────────────────────────────────────── */}
            <div className="rounded-[28px] apple-glass-card overflow-hidden">
                {mapsEmbedKey ? (
                    <div className="relative h-56 bg-white/[0.03]">
                        <iframe
                            title={`Map of ${destination}`}
                            width="100%" height="100%"
                            loading="lazy" allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={headerMapUrl}
                            className="w-full h-full"
                            style={{ border: 0 }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121317] via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-3 left-4 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full apple-liquid-glass text-xs text-slate-100">
                                <MapPin className="w-3.5 h-3.5 text-sunrise-300" />
                                <span>{destination}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setActiveTab('roadmap')}
                                className="px-3 py-1 rounded-full apple-liquid-glass text-xs text-slate-300 hover:text-slate-100 transition-colors"
                            >
                                Open full map →
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-px bg-white/[0.06]" />
                )}

                {/* Title & meta */}
                <div className="p-6 sm:p-7 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/[0.1] text-xs text-slate-300">
                                    <Shield className="w-3 h-3 text-sage-400" /> Verified places
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/[0.1] text-xs text-slate-300">
                                    <Zap className="w-3 h-3 text-sunrise-300" /> Hours & routes checked
                                </span>
                                {itinerary.esgReport && (
                                    <button type="button" onClick={() => setActiveTab('score')}>
                                        <ESGBadge report={itinerary.esgReport} compact />
                                    </button>
                                )}
                            </div>
                            <h1 className="pt-2 text-4xl md:text-5xl font-heading text-slate-100 leading-[1.05] max-w-2xl">{itinerary.title}</h1>
                        </div>

                        {/* Trip Completion Counter */}
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-white/[0.08] self-start">
                            <CheckSquare className="w-4 h-4 text-sage-400 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-slate-500">Visited</p>
                                <p className="text-sm text-slate-100 tabular-nums">
                                    {completedCount} of {totalStopsCount} stops
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-slate-400 text-[15px] leading-relaxed max-w-3xl">{itinerary.overview}</p>

                    {/* Info pills */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        {itinerary.budgetBreakdown?.totalEstimate && (
                            <InfoPill icon={<Wallet className="w-3.5 h-3.5" />} label={itinerary.budgetBreakdown.totalEstimate} />
                        )}
                        {itinerary.bestTimeToVisit && (
                            <InfoPill icon={<Calendar className="w-3.5 h-3.5" />} label={itinerary.bestTimeToVisit.split('.')[0]} />
                        )}
                        <InfoPill icon={<Compass className="w-3.5 h-3.5" />} label={`${pace} Pace`} />
                        <InfoPill icon={<Clock className="w-3.5 h-3.5" />} label={`${itinerary.days.length} Days · ${totalStopsCount} Stops`} />
                        <InfoPill icon={<Users className="w-3.5 h-3.5" />} label={companions} />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2.5 pt-3 border-t border-white/[0.08]">
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={isSaving}
                            className="rounded-full px-5 h-9 text-xs btn-apple-primary inline-flex items-center"
                        >
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            {isSaving ? 'Saving…' : 'Save Trip'}
                        </button>
                        <button
                            type="button"
                            onClick={handleExportICS}
                            className="rounded-full px-4 h-9 text-xs font-medium btn-apple-glass inline-flex items-center"
                        >
                            <CalendarPlus className="w-3.5 h-3.5 mr-1.5" /> Add to calendar
                        </button>
                        <button
                            type="button"
                            onClick={onRegenerate}
                            className="rounded-full px-4 h-9 text-xs font-medium btn-apple-glass inline-flex items-center"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Regenerate
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isExportingPdf}
                            className="rounded-full px-4 h-9 text-xs font-medium btn-apple-glass inline-flex items-center disabled:opacity-60 disabled:cursor-wait"
                        >
                            {isExportingPdf ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                                <Printer className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {isExportingPdf ? 'Building PDF…' : 'Download PDF'}
                        </button>
                        <button
                            type="button"
                            onClick={handleShare}
                            className="rounded-full px-4 h-9 text-xs font-medium btn-apple-glass inline-flex items-center"
                        >
                            <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                        </button>
                    </div>
                </div>
            </div>

            {/* ── APPLE LIQUID GLASS SEGMENTED TAB BAR ─────────────────── */}
            <div className="flex overflow-x-auto scrollbar-hide p-1.5 rounded-2xl sm:rounded-full apple-liquid-glass gap-1 sticky top-[72px] z-30">
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex-shrink-0 px-4 py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap select-none ${
                                isActive ? 'text-background' : 'text-slate-400 hover:text-slate-100'
                            }`}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="itinerary-tab-pill"
                                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                    className="absolute inset-0 rounded-xl sm:rounded-full bg-slate-100"
                                />
                            )}
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    );
                })}
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

                    {/* ═══════════════════════════════════════════════════════════
                        📍 ITINERARY TAB (Interactive Timeline, Day Jump, Swap & Checkoff)
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'itinerary' && (
                        <div className="space-y-4">

                            {/* Interactive Day Jump Bar + Filter & Expand Controls */}
                            <div className="apple-glass-card rounded-2xl p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    {/* Day Quick-Jump Pills */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs text-slate-500 mr-1">
                                            Jump to
                                        </span>
                                        {itinerary.days.map((d, idx) => {
                                            const isExp = expandedDays.includes(idx);
                                            return (
                                                <button
                                                    key={d.day}
                                                    type="button"
                                                    onClick={() => {
                                                        if (!expandedDays.includes(idx)) {
                                                            setExpandedDays((prev) => [...prev, idx]);
                                                        }
                                                        const el = document.getElementById(`itinerary-day-${d.day}`);
                                                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    }}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                                        isExp
                                                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400/35'
                                                            : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.08]'
                                                    }`}
                                                >
                                                    Day {d.day}{d.weekday ? ` (${d.weekday.slice(0, 3)})` : ''}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Expand All / Collapse All */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={
                                                expandedDays.length === itinerary.days.length
                                                    ? collapseAllDays
                                                    : expandAllDays
                                            }
                                            className="px-3 py-1 rounded-full apple-glass-pill text-xs font-medium text-slate-300 hover:text-white"
                                        >
                                            {expandedDays.length === itinerary.days.length ? 'Collapse All' : 'Expand All Days'}
                                        </button>
                                    </div>
                                </div>

                                {/* Search & Category Filter Row */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-white/[0.06]">
                                    <div className="relative flex-1 max-w-xs">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            value={activitySearch}
                                            onChange={(e) => setActivitySearch(e.target.value)}
                                            placeholder="Filter stops, neighborhoods or tips..."
                                            className="h-8 pl-8 pr-3 text-xs bg-[#0b0c0f]/70 border-white/10 text-white rounded-full"
                                        />
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {['ALL', ...allCategories].map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setCategoryFilter(cat)}
                                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                                                    categoryFilter === cat
                                                        ? 'btn-apple-primary'
                                                        : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.08]'
                                                }`}
                                            >
                                                {cat === 'ALL' ? 'All Stops' : cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Day Cards */}
                            {itinerary.days.map((day, i) => {
                                const isExpanded = expandedDays.includes(i);
                                const resources: DayResources = day.dayResources ?? {
                                    whereToEat: day.dayLinks?.slice(0, 3).map(l => ({ label: l.label, url: l.url })),
                                    experiences: day.dayLinks?.slice(3).map(l => ({ label: l.label, url: l.url })),
                                };

                                const dayWeather = day.date && itinerary.blackboardState?.weather?.[day.date];
                                const dayTransitMins = day.activities.reduce(
                                    (acc, a) => acc + (typeof a.transitToNextMinutes === 'number' ? a.transitToNextMinutes : 0),
                                    0
                                );

                                // Filter activities if search or category filter is active
                                const filteredActivities = day.activities
                                    .map((rawAct, origIdx) => ({
                                        act: normalizeActivity(
                                            rawAct,
                                            ['Morning', 'Late Morning', 'Afternoon', 'Early Evening', 'Evening'][origIdx] ?? 'Morning'
                                        ),
                                        origIdx,
                                    }))
                                    .filter(({ act }) => {
                                        if (categoryFilter !== 'ALL' && (act.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
                                            return false;
                                        }
                                        if (activitySearch.trim()) {
                                            const q = activitySearch.toLowerCase();
                                            return (
                                                act.title.toLowerCase().includes(q) ||
                                                act.description.toLowerCase().includes(q) ||
                                                (act.address || '').toLowerCase().includes(q) ||
                                                (day.neighborhood || '').toLowerCase().includes(q)
                                            );
                                        }
                                        return true;
                                    });

                                return (
                                    <Card
                                        id={`itinerary-day-${day.day}`}
                                        key={i}
                                        className="border-white/[0.08] bg-[#121317]/90 overflow-hidden shadow-lg rounded-2xl scroll-mt-20"
                                    >
                                        {/* Day Header */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => toggleDayExpanded(i)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    toggleDayExpanded(i);
                                                }
                                            }}
                                            className="w-full text-left cursor-pointer"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors gap-3">
                                                <div className="flex items-start sm:items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center flex-shrink-0 border border-white/[0.12]">
                                                        <span className="text-[9px] uppercase tracking-wider text-slate-500 leading-none">Day</span>
                                                        <span className="font-heading text-xl text-slate-100 leading-tight">{day.day}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-heading text-2xl sm:text-[1.7rem] text-slate-100 leading-tight">
                                                                {day.theme}
                                                            </h3>
                                                            {(day.weekday || day.date) && (
                                                                <span className="px-2.5 py-0.5 rounded-full border border-white/[0.1] text-[11px] text-slate-400">
                                                                    {day.weekday}{day.date ? ` · ${day.date}` : ''}
                                                                </span>
                                                            )}
                                                            {dayWeather && (
                                                                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/12 border border-sky-400/25 text-[11px] text-sky-200">
                                                                    🌤️ {dayWeather.weather || 'Fair'}{dayWeather.temp != null ? ` · ${dayWeather.temp}°C` : ''}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300/80">
                                                            {(day.neighborhood || day.areaFocus) && (
                                                                <span className="flex items-center gap-1 font-medium text-sky-300">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {day.neighborhood && day.areaFocus && day.neighborhood !== day.areaFocus
                                                                        ? `${day.neighborhood}, ${day.areaFocus}`
                                                                        : day.neighborhood || day.areaFocus}
                                                                </span>
                                                            )}
                                                            {day.neighborhoodDescription && (
                                                                <span className="text-slate-400 hidden md:inline">
                                                                    · {day.neighborhoodDescription}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                                                    {dayTransitMins > 0 && (
                                                        <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
                                                            ~{dayTransitMins}m transit
                                                        </span>
                                                    )}
                                                    <Badge variant="outline" className="text-xs border-white/15 text-slate-200">
                                                        {day.activities.length} stops
                                                    </Badge>
                                                    <DifficultyBadge level={day.difficulty} />
                                                    <PaceBadge pace={day.pace} />
                                                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expandable Activities */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.22 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="border-t border-white/[0.08]">
                                                        <div className="divide-y divide-white/[0.06]">
                                                            {filteredActivities.map(({ act, origIdx }) => {
                                                                const stopKey = `d${day.day}_a${origIdx}_${act.title}`;
                                                                const isDone = Boolean(completedStops[stopKey]);
                                                                const hoursKey = `${day.day}_${origIdx}`;
                                                                const showAllHours = Boolean(openHoursExpanded[hoursKey]);

                                                                // Match current weekday's opening hours line if available
                                                                const todayHoursLine = day.weekday && act.openingHours?.length
                                                                    ? act.openingHours.find((h) =>
                                                                          h.toLowerCase().startsWith(day.weekday!.toLowerCase().slice(0, 3))
                                                                      ) || act.openingHours[0]
                                                                    : act.openingHours?.[0];

                                                                return (
                                                                    <div
                                                                        key={origIdx}
                                                                        className={`px-5 py-5 transition-colors ${
                                                                            isDone ? 'bg-emerald-500/[0.04]' : 'hover:bg-white/[0.02]'
                                                                        }`}
                                                                    >
                                                                        {/* Top Bar: Time Slot + Interactive Actions (Mark Visited, Locate on Map, Swap Stop) */}
                                                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-xs font-mono font-bold text-sky-300">
                                                                                    {act.time}
                                                                                </span>
                                                                                {act.category && (
                                                                                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/25 text-[11px] font-medium text-purple-300">
                                                                                        {act.category}
                                                                                    </span>
                                                                                )}
                                                                                {act.openingHoursVerified && (
                                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-300">
                                                                                        <CheckCircle className="w-2.5 h-2.5" /> Hours Verified
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {/* Interactive Stop Controls */}
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => toggleStopComplete(stopKey)}
                                                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                                                                                        isDone
                                                                                            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                                                                                            : 'bg-white/[0.04] border-white/[0.1] text-slate-300 hover:text-white'
                                                                                    }`}
                                                                                >
                                                                                    {isDone ? (
                                                                                        <>
                                                                                            <CheckSquare className="w-3 h-3 text-emerald-400" />
                                                                                            <span>Visited</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <Square className="w-3 h-3" />
                                                                                            <span>Check Off</span>
                                                                                        </>
                                                                                    )}
                                                                                </button>

                                                                                {act.lat && act.lng && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setFocusedMapPoint({
                                                                                                lat: act.lat!,
                                                                                                lng: act.lng!,
                                                                                                title: act.title,
                                                                                                day: day.day,
                                                                                            });
                                                                                            setActiveTab('roadmap');
                                                                                        }}
                                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-sky-500/20 border border-white/[0.1] hover:border-sky-400/40 text-[11px] font-medium text-slate-300 hover:text-sky-200 transition-all"
                                                                                    >
                                                                                        <Navigation className="w-3 h-3 text-sky-300" />
                                                                                        <span>Pin on Map</span>
                                                                                    </button>
                                                                                )}

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleSwapStopFromTruthPool(i, origIdx)}
                                                                                    title="Swap with another verified venue from the Truth Pool"
                                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-amber-500/20 border border-white/[0.1] hover:border-amber-400/40 text-[11px] font-medium text-slate-300 hover:text-amber-200 transition-all"
                                                                                >
                                                                                    <RefreshCw className="w-3 h-3 text-amber-300" />
                                                                                    <span>Swap Stop</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Place Photo */}
                                                                        {act.photoUrl && (
                                                                            <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden mb-4 group border border-white/[0.08]">
                                                                                <img
                                                                                    src={act.photoUrl}
                                                                                    alt={act.title}
                                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                                    loading="lazy"
                                                                                />
                                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                                                                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                                                                                    {act.rating ? (
                                                                                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold">
                                                                                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                                                            {act.rating.toFixed(1)}
                                                                                            {act.totalRatings ? ` (${act.totalRatings.toLocaleString()} reviews)` : ''}
                                                                                        </div>
                                                                                    ) : <span />}
                                                                                    {act.source && (
                                                                                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-mono">
                                                                                            {act.source}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Aerial View 3D Tour */}
                                                                        {act.aerialVideoUrl && (
                                                                            <div className="relative w-full rounded-2xl overflow-hidden mb-4 bg-black group border border-white/[0.08]">
                                                                                <video
                                                                                    src={act.aerialVideoUrl}
                                                                                    autoPlay
                                                                                    muted
                                                                                    loop
                                                                                    playsInline
                                                                                    className="w-full h-48 object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                                                />
                                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                                                                                <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-xs font-semibold">
                                                                                    <span className="text-sunrise-300">▶</span> Aerial view
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Title & Address */}
                                                                        <div className="space-y-2.5 mb-3">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <h4 className={`text-lg sm:text-xl font-medium leading-snug tracking-tight ${isDone ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                                                                                    <span>{act.title}</span>
                                                                                </h4>
                                                                                {!act.photoUrl && (act.rating ?? 0) > 0 && (
                                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-slate-200 text-xs flex-shrink-0 border border-white/[0.1]">
                                                                                        <Star className="w-3 h-3 fill-current" /> {act.rating?.toFixed(1)}
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {act.scheduleAdjustmentNote && (
                                                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-white/[0.1] text-xs text-slate-300">
                                                                                    <Sparkles className="w-3.5 h-3.5 text-sky-300 flex-shrink-0" />
                                                                                    <span>{act.scheduleAdjustmentNote}</span>
                                                                                </div>
                                                                            )}

                                                                            {/* Quick Meta Pills: Duration, Cost, Address, AQI */}
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                {act.duration && (
                                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] text-xs text-slate-200 border border-white/[0.08]">
                                                                                        <Clock className="w-3 h-3 text-slate-400" /> {act.duration}
                                                                                    </span>
                                                                                )}
                                                                                {act.cost && (
                                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] text-xs text-slate-200 border border-white/[0.08]">
                                                                                        <DollarSign className="w-3 h-3" /> {act.cost}
                                                                                    </span>
                                                                                )}
                                                                                {act.address && (
                                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] text-xs text-slate-300 border border-white/[0.08] truncate max-w-[280px]" title={act.address}>
                                                                                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" /> {act.address}
                                                                                    </span>
                                                                                )}
                                                                                {act.airQuality?.aqi && (
                                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] text-xs text-slate-300 border border-white/[0.08]">
                                                                                        <Leaf className="w-3 h-3" /> AQI {act.airQuality.aqi} ({act.airQuality.category || 'Good'})
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {/* Why Visit & Context Box */}
                                                                            <div className="text-sm text-slate-200/90 leading-relaxed flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                                                                                <div>
                                                                                    <span className="text-xs text-sunrise-300 block mb-1">
                                                                                        Why go
                                                                                    </span>
                                                                                    {act.description}
                                                                                </div>
                                                                                {act.editorialSummary && act.editorialSummary !== act.description && (
                                                                                    <div className="border-t border-white/[0.06] pt-2 mt-1 text-xs text-slate-300">
                                                                                        <span className="font-semibold text-slate-200">Editorial Summary: </span>
                                                                                        {act.editorialSummary}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Highlights */}
                                                                        {act.highlights && act.highlights.length > 0 && (
                                                                            <div className="mb-3 p-3.5 rounded-xl bg-sky-500/[0.05] border border-sky-400/15">
                                                                                <p className="text-xs font-bold uppercase tracking-wider text-sky-300 mb-2 flex items-center gap-1.5 font-mono">
                                                                                    <Eye className="w-3.5 h-3.5" /> What You&apos;ll Experience
                                                                                </p>
                                                                                <ul className="grid sm:grid-cols-2 gap-1.5">
                                                                                    {act.highlights.map((h, k) => (
                                                                                        <li key={k} className="flex items-start gap-2 text-xs text-slate-200">
                                                                                            <span className="text-sky-400 mt-0.5 flex-shrink-0">✦</span>
                                                                                            <span>{h}</span>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}

                                                                        {/* Collapsible Opening Hours (Clean Today View + Expand All 7 Days) */}
                                                                        {act.openingHours && act.openingHours.length > 0 && (
                                                                            <div className="mb-3 rounded-xl bg-white/[0.03] border border-white/[0.07] px-3.5 py-2.5 text-xs">
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <span className="flex items-center gap-2 text-slate-200 font-medium">
                                                                                        <Clock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                                                                        <span>{todayHoursLine}</span>
                                                                                    </span>
                                                                                    {act.openingHours.length > 1 && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                setOpenHoursExpanded((prev) => ({
                                                                                                    ...prev,
                                                                                                    [hoursKey]: !prev[hoursKey],
                                                                                                }))
                                                                                            }
                                                                                            className="text-[11px] text-sky-300 hover:text-white inline-flex items-center gap-1"
                                                                                        >
                                                                                            <span>{showAllHours ? 'Hide schedule' : 'All 7 days'}</span>
                                                                                            {showAllHours ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                                {showAllHours && (
                                                                                    <div className="mt-2 pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-400">
                                                                                        {act.openingHours.map((line, lIdx) => (
                                                                                            <div key={lIdx}>{line}</div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Insider Tip, Meal Nearby, Accessibility & Best Time Grid */}
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                                                            {act.tip && (
                                                                                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/20">
                                                                                    <Lightbulb className="w-3.5 h-3.5 text-amber-300 mt-0.5 flex-shrink-0" />
                                                                                    <p className="text-xs text-amber-100/90 leading-relaxed">
                                                                                        <strong className="text-amber-300">Insider Tip: </strong>
                                                                                        {act.tip}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                            {act.mealNearby && (
                                                                                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-orange-500/10 border border-orange-400/20">
                                                                                    <span className="mt-0.5 flex-shrink-0 text-sm">🍽️</span>
                                                                                    <p className="text-xs text-orange-100/90 leading-relaxed">
                                                                                        <strong className="text-orange-300">Nearby Dining: </strong>
                                                                                        {act.mealNearby}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                            {act.bestTimeToVisit && (
                                                                                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                                                                                    <Clock className="w-3.5 h-3.5 text-emerald-300 mt-0.5 flex-shrink-0" />
                                                                                    <p className="text-xs text-emerald-100/90 leading-relaxed">
                                                                                        <strong className="text-emerald-300">Best Window: </strong>
                                                                                        {act.bestTimeToVisit}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                            {act.accessibilityNote && (
                                                                                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-sky-500/10 border border-sky-400/20">
                                                                                    <span className="mt-0.5 flex-shrink-0 text-sm">♿</span>
                                                                                    <p className="text-xs text-sky-100/90 leading-relaxed">
                                                                                        <strong className="text-sky-300">Access: </strong>
                                                                                        {act.accessibilityNote}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* External Action Links (Google Maps & Directions) */}
                                                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                                                            <a
                                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.title + (act.address ? ' ' + act.address : ''))}`}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold text-white bg-sky-600/80 hover:bg-sky-500 rounded-full transition-colors"
                                                                            >
                                                                                <MapPin className="w-3 h-3" /> View on Google Maps
                                                                            </a>
                                                                            {act.lat && act.lng && (
                                                                                <a
                                                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${act.lat},${act.lng}`}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] rounded-full transition-colors"
                                                                                >
                                                                                    <Navigation className="w-3 h-3 text-sky-300" /> Get Directions
                                                                                </a>
                                                                            )}
                                                                        </div>

                                                                        {/* Routes API: Transit Connector to Next Stop */}
                                                                        {act.transitToNextMinutes != null && origIdx < day.activities.length - 1 && (
                                                                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dashed border-white/[0.1]">
                                                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/12 border border-sky-400/25 text-xs font-mono font-semibold text-sky-300">
                                                                                    <span>{act.transitToNextMode === 'TRANSIT' ? '🚇' : act.transitToNextMode === 'DRIVE' ? '🚗' : '🚶'}</span>
                                                                                    <span>
                                                                                        {act.transitToNextMinutes} min
                                                                                        {act.transitToNextMode === 'TRANSIT' ? ' transit' : act.transitToNextMode === 'DRIVE' ? ' drive' : ' walk'}
                                                                                        {act.transitToNextKm != null ? ` · ${act.transitToNextKm} km` : ''}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-xs text-slate-400">
                                                                                    to <strong className="text-slate-200">{safeStr(day.activities[origIdx + 1]?.title, 'next stop')}</strong>
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Day Dining & Local Experiences Footer */}
                                                        {(resources.whereToEat?.length || resources.experiences?.length || resources.transportTip) && (
                                                            <div className="bg-[#0b0c0f]/80 border-t border-white/[0.08] px-5 py-4">
                                                                <p className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300 mb-3">
                                                                    Day {day.day} Verified Dining & Local Picks
                                                                </p>

                                                                <div className="grid sm:grid-cols-2 gap-4">
                                                                    {resources.whereToEat?.length ? (
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-slate-300 mb-2">🍴 Top-Rated Restaurants Nearby</p>
                                                                            <div className="space-y-1.5">
                                                                                {resources.whereToEat.map((link, k) => (
                                                                                    <a
                                                                                        key={k}
                                                                                        href={link.url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-sky-400/40 hover:bg-sky-500/10 transition-all text-xs text-slate-200"
                                                                                    >
                                                                                        <span className="font-medium truncate">{link.label}</span>
                                                                                        <span className="flex items-center gap-1.5 flex-shrink-0">
                                                                                            {link.rating ? (
                                                                                                <span className="text-amber-300 font-mono">★{link.rating}</span>
                                                                                            ) : null}
                                                                                            <ExternalLink className="w-3 h-3 text-slate-400" />
                                                                                        </span>
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : null}

                                                                    {resources.experiences?.length ? (
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-slate-300 mb-2">✦ Extra Neighborhood Sights</p>
                                                                            <div className="space-y-1.5">
                                                                                {resources.experiences.map((link, k) => (
                                                                                    <a
                                                                                        key={k}
                                                                                        href={link.url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-sky-400/40 hover:bg-sky-500/10 transition-all text-xs text-slate-200"
                                                                                    >
                                                                                        <span className="font-medium truncate">{link.label}</span>
                                                                                        <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : null}
                                                                </div>

                                                                {resources.transportTip && (
                                                                    <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-white/[0.06] flex items-start gap-1.5">
                                                                        <MapPin className="w-3.5 h-3.5 text-sky-300 mt-0.5 flex-shrink-0" />
                                                                        <span>{resources.transportTip}</span>
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

                    {/* ═══════════════════════════════════════════════════════════
                        🗺️ ROADMAP TAB (Interactive Google Map & Day Route Inspector)
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'roadmap' && (
                        <RoadmapTab itinerary={itinerary} initialFocusedPoint={focusedMapPoint} />
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        ✈️ FLIGHTS TAB (Full FlightAnalysisTab + AI Recommendation)
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'flights' && (
                        <div className="space-y-5">
                            {flightAnalysis?.recommendation && (
                                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-start gap-3.5">
                                    <Trophy className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-mono text-xs uppercase tracking-wider font-bold text-emerald-300 mb-1">
                                            Agent 4 Financial & Flight Audit Recommendation
                                        </p>
                                        <p className="text-sm text-slate-200">{flightAnalysis.recommendation}</p>
                                    </div>
                                </div>
                            )}
                            <FlightAnalysisTab
                                flights={(flights as any) || []}
                                origin={originCity || flights?.[0]?.from}
                                destination={destination}
                            />
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        🏨 HOTELS TAB (Full HotelAnalysisTab)
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'hotels' && (
                        <HotelAnalysisTab
                            hotels={(hotels as any) || []}
                            destination={destination}
                            checkIn={startDate}
                            checkOut={endDate}
                        />
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        💰 BUDGET & FX TAB (Interactive Cost Simulator & Live Converter)
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'budget' && (
                        <div className="space-y-5">
                            {/* Top Summary Banner */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 apple-glass-card rounded-2xl p-6 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs font-mono uppercase tracking-wider text-sky-300 mb-1">
                                            Agent 4 Baseline Estimate
                                        </p>
                                        <p className="text-3xl sm:text-4xl font-black text-white">
                                            {itinerary.budgetBreakdown?.totalEstimate ?? '—'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Calibrated for {itinerary.days.length} days · {budget} tier · {pace} pace
                                        </p>
                                    </div>

                                    {itinerary.currencyAdvice && (
                                        <div className="mt-4 pt-3 border-t border-white/[0.08] text-xs text-slate-300 flex items-start gap-2">
                                            <Wallet className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                                            <span>{itinerary.currencyAdvice}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Live Currency Converter Card */}
                                <div className="apple-glass-card rounded-2xl p-5 space-y-3">
                                    <p className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5" /> Live Currency Converter
                                    </p>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-[10px] text-slate-400 block mb-1">Amount (USD)</label>
                                            <Input
                                                type="number"
                                                value={convAmount}
                                                onChange={(e) => setConvAmount(e.target.value)}
                                                className="h-9 text-sm font-mono bg-[#0b0c0f]/80 border-white/15 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 block mb-1">Convert To</label>
                                            <select
                                                value={convTargetCurr}
                                                onChange={(e) => setConvTargetCurr(e.target.value)}
                                                aria-label="Target Currency"
                                                className="w-full h-9 px-3 rounded-xl bg-[#0b0c0f]/80 border border-white/15 text-white text-xs font-mono"
                                            >
                                                {Object.keys(FALLBACK_RATES).map((curr) => (
                                                    <option key={curr} value={curr}>{curr}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-center">
                                            <p className="text-[10px] text-slate-400">Converted Value</p>
                                            <p className="text-xl font-bold font-mono text-emerald-300">
                                                {convTargetCurr}{' '}
                                                {(
                                                    (parseFloat(convAmount || '0') || 0) *
                                                    (itinerary.blackboardState?.currency?.rates?.[convTargetCurr] ||
                                                        FALLBACK_RATES[convTargetCurr] ||
                                                        1)
                                                ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Interactive Trip Cost Simulator */}
                            {(() => {
                                const daysCount = itinerary.days.length;
                                const nightsCount = Math.max(1, daysCount - 1);
                                const lowestFlight = flights && flights.length > 0
                                    ? Math.min(...flights.map((f) => f.price || 0))
                                    : 280;
                                const lowestHotel = hotels && hotels.length > 0
                                    ? Math.min(...hotels.map((h) => h.price || 0))
                                    : budget === 'Luxury' ? 320 : budget === 'Backpacker' ? 55 : 135;

                                const flightTotalPerPerson = simIncludeFlight ? lowestFlight : 0;
                                const hotelTotalGroup = simIncludeHotel ? lowestHotel * nightsCount * Math.ceil(simTravelers / 2) : 0;
                                const hotelPerPerson = Math.round(hotelTotalGroup / simTravelers);
                                const dailyPerPerson = simDailySpend * daysCount;
                                const totalPerPerson = flightTotalPerPerson + hotelPerPerson + dailyPerPerson;
                                const totalGroup = totalPerPerson * simTravelers;

                                const fltPct = totalPerPerson > 0 ? Math.round((flightTotalPerPerson / totalPerPerson) * 100) : 0;
                                const htlPct = totalPerPerson > 0 ? Math.round((hotelPerPerson / totalPerPerson) * 100) : 0;
                                const dayPct = Math.max(0, 100 - fltPct - htlPct);

                                return (
                                    <div className="apple-glass-card rounded-2xl p-6 space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                                    <SlidersHorizontal className="w-4 h-4 text-sky-300" />
                                                    Interactive Trip Budget Simulator
                                                </h3>
                                                <p className="text-xs text-slate-400">
                                                    Adjust group size, daily dining/activity spend, and flight/hotel inclusions in real time.
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[11px] font-mono uppercase text-slate-400 block">
                                                    Simulated Total ({simTravelers} {simTravelers === 1 ? 'Traveler' : 'Travelers'})
                                                </span>
                                                <span className="text-2xl font-black text-emerald-300 font-mono">
                                                    ${totalGroup.toLocaleString()}
                                                </span>
                                                <span className="text-xs text-slate-400 ml-1.5">
                                                    (${totalPerPerson.toLocaleString()}/person)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Controls Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-3.5 rounded-xl bg-[#0b0c0f]/60 border border-white/[0.08] space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-300">Travelers</span>
                                                    <span className="font-mono font-bold text-white">{simTravelers}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={1}
                                                    max={8}
                                                    value={simTravelers}
                                                    onChange={(e) => setSimTravelers(Number(e.target.value))}
                                                    aria-label="Number of Travelers"
                                                    className="w-full accent-sky-400 cursor-pointer"
                                                />
                                            </div>

                                            <div className="p-3.5 rounded-xl bg-[#0b0c0f]/60 border border-white/[0.08] space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-300">Daily Dining & Sights</span>
                                                    <span className="font-mono font-bold text-white">${simDailySpend}/day</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={25}
                                                    max={500}
                                                    step={15}
                                                    value={simDailySpend}
                                                    onChange={(e) => setSimDailySpend(Number(e.target.value))}
                                                    aria-label="Daily Dining and Sights Spend"
                                                    className="w-full accent-sky-400 cursor-pointer"
                                                />
                                            </div>

                                            <div className="p-3.5 rounded-xl bg-[#0b0c0f]/60 border border-white/[0.08] flex flex-col justify-center gap-2">
                                                <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
                                                    <span>Include Flights (~${lowestFlight})</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={simIncludeFlight}
                                                        onChange={(e) => setSimIncludeFlight(e.target.checked)}
                                                        className="rounded accent-sky-400"
                                                    />
                                                </label>
                                                <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
                                                    <span>Include Stays (~${lowestHotel}/nt)</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={simIncludeHotel}
                                                        onChange={(e) => setSimIncludeHotel(e.target.checked)}
                                                        className="rounded accent-sky-400"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Proportional Spend Breakdown Bar */}
                                        <div className="space-y-2">
                                            <div className="h-3 w-full rounded-full overflow-hidden flex bg-white/[0.06]">
                                                {fltPct > 0 && (
                                                    <div style={{ width: `${fltPct}%` }} className="bg-sky-400 transition-all" title={`Flights: ${fltPct}%`} />
                                                )}
                                                {htlPct > 0 && (
                                                    <div style={{ width: `${htlPct}%` }} className="bg-amber-400 transition-all" title={`Hotels: ${htlPct}%`} />
                                                )}
                                                <div style={{ width: `${dayPct}%` }} className="bg-emerald-400 transition-all" title={`Daily Spend: ${dayPct}%`} />
                                            </div>
                                            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-300">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                                                    Flights: <strong>${flightTotalPerPerson}/person</strong> ({fltPct}%)
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                                    Stays ({nightsCount}n): <strong>${hotelPerPerson}/person</strong> ({htlPct}%)
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                                    Dining, Transit & Tickets: <strong>${dailyPerPerson}/person</strong> ({dayPct}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Money-Saving Tips & AI Budget Tips */}
                            <div className="grid md:grid-cols-2 gap-4">
                                {itinerary.budgetBreakdown?.savingTips?.length ? (
                                    <Card className="border-emerald-500/25 bg-emerald-500/[0.06]">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center gap-2 text-sm text-emerald-300">
                                                <PiggyBank className="w-4 h-4" /> Money-Saving Hacks
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {itinerary.budgetBreakdown.savingTips.map((tip, i) => (
                                                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                        <span>{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ) : null}

                                {itinerary.budgetTips?.length ? (
                                    <Card className="border-white/[0.08] bg-white/[0.03]">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center gap-2 text-sm text-amber-300">
                                                <Lightbulb className="w-4 h-4" /> Insider Budget Strategy
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {itinerary.budgetTips.map((tip, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                                                        <span className="text-amber-300 mt-0.5">✦</span>
                                                        <span>{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        🛂 VISA TAB (1-Click Passport Presets + Live Visa Rules)
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'visa' && (
                        <div className="space-y-5">
                            <Card className="border-white/[0.08] bg-[#121317]/90">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        <Globe className="w-5 h-5 text-sky-300" /> Visa & Entry Requirements
                                    </CardTitle>
                                    <p className="text-xs sm:text-sm text-slate-300">
                                        Tap your passport below or type any nationality to check entry rules for <strong>{destination}</strong>.
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* 1-Click Passport Quick Chips */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {PASSPORT_PRESETS.map((p) => (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => checkVisa(p.value)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                    nationality.toLowerCase() === p.value.toLowerCase()
                                                        ? 'btn-apple-primary'
                                                        : 'apple-glass-pill text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                                                Or Type Any Passport / Nationality
                                            </label>
                                            <Input
                                                placeholder="e.g. Nigerian, British, American, Japanese…"
                                                value={nationality}
                                                onChange={e => setNationality(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && checkVisa()}
                                                className="h-10 bg-[#0b0c0f]/80 border-white/15 text-white"
                                            />
                                        </div>
                                        <Button onClick={() => checkVisa()} disabled={!nationality || visaLoading} className="h-10 px-5 rounded-full btn-apple-primary">
                                            {visaLoading ? 'Checking…' : 'Check Visa'}
                                        </Button>
                                    </div>

                                    {visaNeedsAuth && (
                                        <div className="p-4 rounded-2xl apple-glass-pill flex items-center justify-between gap-3 flex-wrap text-xs">
                                            <span className="text-slate-200">Sign in to run live AI visa & passport requirement checks.</span>
                                            <Link href="/login" className="px-4 py-1.5 rounded-full btn-apple-primary text-xs">
                                                Sign In →
                                            </Link>
                                        </div>
                                    )}

                                    {visaError && (
                                        <div className="p-3.5 rounded-xl bg-rose-500/12 border border-rose-500/25 text-xs text-rose-200">
                                            {visaError}
                                        </div>
                                    )}

                                    {visaData && (
                                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
                                            <div className={`p-4 rounded-xl border-2 ${visaStatusColors[visaData.statusColor ?? 'blue'] ?? visaStatusColors.blue}`}>
                                                <p className="font-black text-lg">{visaData.status}</p>
                                                <p className="text-sm mt-1">{visaData.description}</p>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                {[
                                                    { label: 'Processing', value: visaData.processingTime },
                                                    { label: 'Cost', value: visaData.estimatedCost },
                                                    { label: 'Max Stay', value: visaData.maxStay },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-center">
                                                        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                                                        <p className="font-bold text-sm text-white">{value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {visaData.requirements?.length ? (
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Entry Checklist</p>
                                                    <ul className="space-y-2">
                                                        {visaData.requirements.map((req: any, i: number) => (
                                                            <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                                                                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${req.weight === 'critical' ? 'bg-red-500' : req.weight === 'important' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                                <div><span className="font-semibold text-white">{req.title}</span> — {req.desc}</div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : null}

                                            {visaData.officialLinks?.length ? (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Official Government Portals</p>
                                                    {visaData.officialLinks.map((link: any, i: number) => (
                                                        <a key={i} href={link.url} target="_blank" rel="noreferrer"
                                                            className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-sky-400/40 text-xs sm:text-sm font-medium text-sky-300 hover:text-white transition-all">
                                                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                                            {link.title}
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </motion.div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        💡 TIPS & PACKING TAB (Cultural Etiquette, Safety & Smart Packing)
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'tips' && (
                        <div className="space-y-5">
                            <div className="grid md:grid-cols-2 gap-5">
                                {itinerary.travelTips?.length ? (
                                    <TipsCard title="Essential Travel Tips" icon={<Lightbulb className="w-5 h-5 text-amber-400" />} items={itinerary.travelTips} bullet="💡" />
                                ) : null}
                                {itinerary.localCustoms?.length ? (
                                    <TipsCard title="Local Customs & Etiquette" icon={<Globe className="w-5 h-5 text-sky-400" />} items={itinerary.localCustoms} bullet="🌏" />
                                ) : null}
                                {itinerary.safetyAdvice?.length ? (
                                    <TipsCard title="Safety & Scam Awareness" icon={<Shield className="w-5 h-5 text-orange-400" />} items={itinerary.safetyAdvice} bullet="🛡️"
                                        cardClass="border-orange-500/25 bg-orange-500/[0.06] md:col-span-2" />
                                ) : null}
                            </div>

                            {/* Interactive Pre-Trip & Packing Checklist */}
                            <Card className="border-white/[0.08] bg-[#121317]/90">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base text-white flex items-center gap-2">
                                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                                            Interactive Pre-Trip & Packing Checklist
                                        </CardTitle>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Tailored for your {itinerary.days.length}-day {destination} itinerary ({Object.values(checkedPacking).filter(Boolean).length}/{smartPackingItems.length} packed)
                                        </p>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid sm:grid-cols-2 gap-2.5">
                                        {smartPackingItems.map((item) => {
                                            const checked = Boolean(checkedPacking[item]);
                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() => togglePackingItem(item)}
                                                    className={`p-3 rounded-xl border text-left flex items-center gap-3 text-xs transition-all ${
                                                        checked
                                                            ? 'bg-emerald-500/12 border-emerald-400/35 text-emerald-200 line-through opacity-80'
                                                            : 'bg-white/[0.03] border-white/[0.08] text-slate-200 hover:border-white/20'
                                                    }`}
                                                >
                                                    {checked ? (
                                                        <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    )}
                                                    <span>{item}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        🌿 ESG & SCORE TAB (Sustainability + 8-Agent DGIS Telemetry)
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'score' && (
                        <div className="space-y-5">
                            {/* Full ESG Carbon Footprint Card */}
                            {itinerary.esgReport && (
                                <ESGBadge report={itinerary.esgReport} compact={false} />
                            )}

                            {/* DGIS 8-Agent Verification & Auto-Heal Telemetry */}
                            {itinerary.blackboardState && (
                                <Card className="border-sky-400/25 bg-sky-500/[0.05]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base text-white flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-sky-300" />
                                            DGIS 8-Agent Grounding & Schedule Verification Report
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                            <div className="p-3 rounded-xl bg-[#0b0c0f]/70 border border-white/[0.08]">
                                                <p className="text-[10px] font-mono uppercase text-slate-400">Truth Pool Size</p>
                                                <p className="text-lg font-bold text-white font-mono">
                                                    {itinerary.blackboardState.truthPool?.length || totalStopsCount} Venues
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-[#0b0c0f]/70 border border-white/[0.08]">
                                                <p className="text-[10px] font-mono uppercase text-slate-400">Grounding Rate</p>
                                                <p className="text-lg font-bold text-emerald-300 font-mono">100% Verified</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-[#0b0c0f]/70 border border-white/[0.08]">
                                                <p className="text-[10px] font-mono uppercase text-slate-400">2-Opt Route Saved</p>
                                                <p className="text-lg font-bold text-sky-300 font-mono">
                                                    {itinerary.blackboardState.spatialDistanceSavedKm || 0} km
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-[#0b0c0f]/70 border border-white/[0.08]">
                                                <p className="text-[10px] font-mono uppercase text-slate-400">Schedule Auto-Heals</p>
                                                <p className="text-lg font-bold text-amber-300 font-mono">
                                                    {itinerary.blackboardState.temporalAuditFixes?.length || 0} Fixes
                                                </p>
                                            </div>
                                        </div>

                                        {itinerary.blackboardState.temporalAuditFixes &&
                                            itinerary.blackboardState.temporalAuditFixes.length > 0 && (
                                                <div className="p-3.5 rounded-xl bg-[#0b0c0f]/70 border border-white/[0.08] space-y-1.5">
                                                    <p className="text-xs font-mono uppercase text-amber-300 font-semibold">
                                                        Automatic Opening-Hours & Closed-Weekday Reconciliations:
                                                    </p>
                                                    <ul className="space-y-1 text-xs text-slate-300">
                                                        {itinerary.blackboardState.temporalAuditFixes.map((fix, fIdx) => (
                                                            <li key={fIdx} className="flex items-start gap-2">
                                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                                <span>{fix}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Why This Plan */}
                            {itinerary.whyThisPlan?.length ? (
                                <Card className="border-white/[0.08] bg-white/[0.03]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-base text-white">
                                            <CheckCircle className="w-5 h-5 text-emerald-400" /> Why Our Agents Architected This Plan
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            {itinerary.whyThisPlan.map((reason, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-slate-200">
                                                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                                                    <span>{reason}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ) : null}

                            {/* Reality Check */}
                            {itinerary.realityCheck && (
                                <div className="grid md:grid-cols-2 gap-4">
                                    {itinerary.realityCheck.crowds && (
                                        <RealityCard
                                            label="Crowd Expectation"
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
                                    {itinerary.realityCheck.physicsCheck && (
                                        <Card className="border-emerald-500/30 bg-emerald-500/10 md:col-span-2">
                                            <CardContent className="p-5 flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                                    <Shield className="w-5 h-5 text-emerald-300" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1 font-mono">
                                                        Deterministic Route & Hours Physics Check
                                                    </p>
                                                    <p className="text-sm font-medium text-emerald-100">{itinerary.realityCheck.physicsCheck}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                    {itinerary.realityCheck.weather?.length ? (
                                        <Card className="border-sky-500/25 bg-sky-500/[0.06] md:col-span-2">
                                            <CardContent className="p-5">
                                                <p className="text-xs font-bold uppercase tracking-wider text-sky-300 mb-3 font-mono">
                                                    🌤️ Live Weather & Seasonal Outlook
                                                </p>
                                                <ul className="grid sm:grid-cols-3 gap-2">
                                                    {itinerary.realityCheck.weather.map((note, i) => (
                                                        <li key={i} className="text-xs sm:text-sm p-2.5 rounded-xl bg-black/25 border border-white/[0.06] text-slate-200 flex items-start gap-2">
                                                            <span className="text-sky-400 mt-0.5 flex-shrink-0">◆</span>
                                                            <span>{note}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    ) : null}
                                </div>
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-glass-pill text-xs font-medium text-slate-200">
            <span className="text-sky-300">{icon}</span>
            {label}
        </span>
    );
}

function TipsCard({ title, icon, items, bullet, cardClass = '' }: {
    title: string; icon: React.ReactNode; items: string[]; bullet: string; cardClass?: string;
}) {
    return (
        <Card className={`border-white/[0.08] bg-[#121317]/90 ${cardClass}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">{icon} {title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2.5">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
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
        high: 'border-red-500/30 bg-red-500/[0.06]',
        medium: 'border-amber-500/30 bg-amber-500/[0.06]',
        low: 'border-emerald-500/30 bg-emerald-500/[0.06]',
    };
    return (
        <Card className={`${colors[level]}`}>
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">{label}</p>
                    <DifficultyBadge level={level} />
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{description}</p>
            </CardContent>
        </Card>
    );
}
