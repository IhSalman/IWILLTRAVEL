'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Compass } from 'lucide-react';
import ItineraryTabs from '@/components/itinerary/ItineraryTabs';
import LiveTripCommandBar from '@/components/itinerary/LiveTripCommandBar';
import TripCopilotDrawer from '@/components/itinerary/TripCopilotDrawer';
import { toast } from 'sonner';

// ── Defensive normalizer ─────────────────────────────────────────────────────
// Ensures every field ItineraryTabs reads is always a safe default (array/string),
// guarding against old or partial DB records.
function normalizeItinerary(raw: any): any {
    if (!raw || typeof raw !== 'object') return null;

    const ensureArray = (val: any): any[] => (Array.isArray(val) ? val : []);
    const ensureString = (val: any, fallback = '') =>
        val && typeof val === 'string' ? val : fallback;

    const days = ensureArray(raw.days).map((day: any, i: number) => {
        if (!day || typeof day !== 'object') return { day: i + 1, theme: `Day ${i + 1}`, activities: [] };
        return {
            ...day,
            day: day.day ?? i + 1,
            theme: ensureString(day.theme, `Day ${i + 1}`),
            activities: ensureArray(day.activities),
            dayResources: day.dayResources ?? {
                whereToEat: ensureArray(day.dayLinks?.slice?.(0, 3)),
                experiences: ensureArray(day.dayLinks?.slice?.(3)),
                transportTip: '',
            },
        };
    });

    return {
        ...raw,
        title: ensureString(raw.title, 'Your Trip'),
        overview: ensureString(raw.overview, ''),
        days,
        travelTips: ensureArray(raw.travelTips),
        localCustoms: ensureArray(raw.localCustoms),
        safetyAdvice: ensureArray(raw.safetyAdvice),
        budgetTips: ensureArray(raw.budgetTips),
        whyThisPlan: ensureArray(raw.whyThisPlan),
        budgetBreakdown: raw.budgetBreakdown ?? { totalEstimate: '', savingTips: [] },
        realityCheck: raw.realityCheck ?? null,
    };
}

export default function ItineraryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tripId = String(params.id || '');

    // Unpacked content fields
    const [itineraryData, setItineraryData] = useState<any>(null);
    const [flights, setFlights] = useState<any[]>([]);
    const [hotels, setHotels] = useState<any[]>([]);
    const [flightAnalysis, setFlightAnalysis] = useState<any>(null);
    const [meta, setMeta] = useState<any>(null);
    const [canRollback, setCanRollback] = useState(false);
    const [isOfflineFallback, setIsOfflineFallback] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function fetchItinerary() {
            const cacheKey = `dgis_offline_trip_${tripId}`;
            try {
                const res = await fetch(`/api/itineraries/${tripId}`);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                const record = await res.json();

                // Cache full record locally for Offline Traveler Vault access
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(record));
                } catch {
                    // ignore storage quota errors
                }

                const content = record.content;
                const rawItinerary = content?.itinerary ?? content;

                setItineraryData(normalizeItinerary(rawItinerary));
                setFlights(Array.isArray(content?.flights) ? content.flights : []);
                setHotels(Array.isArray(content?.hotels) ? content.hotels : []);
                setFlightAnalysis(content?.flightAnalysis ?? null);
                setCanRollback(Array.isArray(content?._versions) && content._versions.length > 0);
                setMeta(record);
                setIsOfflineFallback(false);
            } catch (err) {
                console.warn('Network load failed, checking Offline Traveler Vault:', err);
                try {
                    const cachedStr = localStorage.getItem(cacheKey);
                    if (cachedStr) {
                        const record = JSON.parse(cachedStr);
                        const content = record.content;
                        const rawItinerary = content?.itinerary ?? content;
                        setItineraryData(normalizeItinerary(rawItinerary));
                        setFlights(Array.isArray(content?.flights) ? content.flights : []);
                        setHotels(Array.isArray(content?.hotels) ? content.hotels : []);
                        setFlightAnalysis(content?.flightAnalysis ?? null);
                        setMeta(record);
                        setIsOfflineFallback(true);
                    }
                } catch {
                    // no offline cache
                }
            } finally {
                setIsLoading(false);
            }
        }
        if (tripId) fetchItinerary();
    }, [tripId]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0b0c0f]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    <span className="text-sm text-slate-500">Loading your trip…</span>
                </div>
            </div>
        );
    }

    if (!itineraryData || !Array.isArray(itineraryData.days)) {
        return (
            <div className="min-h-screen bg-[#0b0c0f] text-slate-200 flex flex-col items-center justify-center px-4 relative">
                <div className="card-3d-minimal rounded-2xl p-10 max-w-md text-center space-y-4">
                    <Compass className="w-10 h-10 text-slate-400 mx-auto" />
                    <h1 className="font-serif text-2xl font-normal text-slate-200">Itinerary Not Found</h1>
                    <p className="text-slate-400 text-xs font-light">
                        This trip could not be loaded. It may have been saved in an older format or removed.
                    </p>
                    <Button
                        onClick={() => router.push('/dashboard')}
                        className="btn-3d-minimal text-xs px-5 py-2 rounded-full"
                    >
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    const budgetLabel: Record<string, string> = {
        budget: 'Backpacker',
        moderate: 'Mid-range',
        luxury: 'Luxury',
        custom: 'Custom',
    };
    const travelerLabel: Record<string, string> = {
        single: 'Solo',
        couple: 'Couple',
        family: 'Family',
        friends: 'Friends',
    };
    const transportLabel: Record<string, string> = {
        public: 'Public Transit',
        rental: 'Rental Car',
        walking: 'Walking / Uber',
    };
    const paceLabel: Record<string, string> = {
        relaxed: 'Relaxed',
        balanced: 'Moderate',
        adventure: 'Packed',
        moderate: 'Moderate',
    };

    const destination =
        meta?.city_id
            ?.split('-')
            ?.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ') ||
        itineraryData.title ||
        'Destination';

    const handleLiveItineraryPatch = (updated: any) => {
        const normalized = normalizeItinerary(updated);
        if (normalized) {
            setItineraryData(normalized);
            setCanRollback(true);
            try {
                const cacheKey = `dgis_offline_trip_${tripId}`;
                const prev = localStorage.getItem(cacheKey);
                if (prev) {
                    const parsed = JSON.parse(prev);
                    if (parsed.content?.itinerary) parsed.content.itinerary = normalized;
                    else parsed.content = normalized;
                    localStorage.setItem(cacheKey, JSON.stringify(parsed));
                }
            } catch {
                // ignore
            }
        }
    };

    return (
        <div className="min-h-screen bg-background text-slate-200 font-body relative overflow-x-clip">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-sunrise-300/[0.05] blur-[120px] pointer-events-none" />

            <div className="relative max-w-5xl mx-auto py-10 px-4 sm:px-6">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="rounded-full mb-6 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] text-xs font-mono"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                {/* DGIS 2.0 Live Sentinel, Weather/Hours Scanner & HITL Booking Wallet (§6.6.1 & §6.6.2) */}
                {tripId && (
                    <LiveTripCommandBar
                        itineraryId={tripId}
                        initialStatus={meta?.status || 'saved'}
                        flights={flights}
                        hotels={hotels}
                        isOfflineFallback={isOfflineFallback}
                        onItineraryUpdated={handleLiveItineraryPatch}
                    />
                )}

                <ItineraryTabs
                    itinerary={itineraryData}
                    research={null}
                    destination={destination}
                    companions={travelerLabel[meta?.traveler_type] || 'Solo'}
                    budget={budgetLabel[meta?.budget] || 'Mid-range'}
                    pace={paceLabel[meta?.travel_style] || 'Moderate'}
                    transportation={transportLabel[meta?.transport] || 'Public Transit'}
                    startDate={meta?.start_date}
                    endDate={meta?.end_date}
                    originCity={itineraryData?.originCity || ''}
                    flights={flights}
                    hotels={hotels}
                    flightAnalysis={flightAnalysis}
                    onSave={async () => {
                        setIsSaving(true);
                        await new Promise((r) => setTimeout(r, 300));
                        setIsSaving(false);
                        toast.success('Synced to your account & Offline Traveler Vault!');
                    }}
                    onRegenerate={() => router.push('/plan-trip')}
                    isSaving={isSaving}
                />

                {/* DGIS 2.0 Stateful Conversational Travel Co-Pilot (§6.6.3) */}
                {tripId && !isOfflineFallback && (
                    <TripCopilotDrawer
                        itineraryId={tripId}
                        destination={destination}
                        initialCanRollback={canRollback}
                        onItineraryUpdated={handleLiveItineraryPatch}
                    />
                )}
            </div>
        </div>
    );
}
