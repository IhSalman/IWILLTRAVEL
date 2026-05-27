'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ItineraryTabs from '@/components/itinerary/ItineraryTabs';

// ── Defensive normalizer ─────────────────────────────────────────────────────
// Ensures every field ItineraryTabs reads is always a safe default (array/string),
// guarding against old or partial DB records.
function normalizeItinerary(raw: any): any {
    if (!raw || typeof raw !== 'object') return null;

    const ensureArray = (val: any): any[] => Array.isArray(val) ? val : [];
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

    // Unpacked content fields
    const [itineraryData, setItineraryData] = useState<any>(null);
    const [flights, setFlights] = useState<any[]>([]);
    const [hotels, setHotels] = useState<any[]>([]);
    const [flightAnalysis, setFlightAnalysis] = useState<any>(null);
    const [meta, setMeta] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function fetchItinerary() {
            try {
                const res = await fetch(`/api/itineraries/${params.id}`);
                if (!res.ok) {
                    console.error('Failed to fetch itinerary, status:', res.status);
                    return;
                }
                const record = await res.json();

                // DB stores content as: { itinerary, flights, hotels, flightAnalysis }
                // Some older records may store the itinerary directly in content
                const content = record.content;
                const rawItinerary = content?.itinerary ?? content;

                setItineraryData(normalizeItinerary(rawItinerary));
                setFlights(Array.isArray(content?.flights) ? content.flights : []);
                setHotels(Array.isArray(content?.hotels) ? content.hotels : []);
                setFlightAnalysis(content?.flightAnalysis ?? null);
                setMeta(record);
            } catch (err) {
                console.error('Error loading itinerary:', err);
            } finally {
                setIsLoading(false);
            }
        }
        if (params.id) fetchItinerary();
    }, [params.id]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!itineraryData || !Array.isArray(itineraryData.days)) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center space-y-4 text-center px-4">
                <span className="text-5xl">🗺️</span>
                <h1 className="text-2xl font-bold">Itinerary not found</h1>
                <p className="text-muted-foreground text-sm max-w-md">
                    This trip could not be loaded. It may have been saved in an older format or deleted.
                </p>
                <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </div>
        );
    }

    // Label maps matching what plan-trip sends to the DB
    const budgetLabel: Record<string, string> = {
        budget: 'Backpacker', moderate: 'Mid-range', luxury: 'Luxury', custom: 'Custom'
    };
    const travelerLabel: Record<string, string> = {
        single: 'Solo', couple: 'Couple', family: 'Family', friends: 'Friends'
    };
    const transportLabel: Record<string, string> = {
        public: 'Public Transit', rental: 'Rental Car', walking: 'Walking / Uber'
    };
    const paceLabel: Record<string, string> = {
        relaxed: 'Relaxed', balanced: 'Moderate', adventure: 'Packed', moderate: 'Moderate'
    };

    // Derive destination from city_id (e.g. "tokyo-japan" → "Tokyo Japan")
    const destination =
        meta?.city_id
            ?.split('-')
            ?.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ') ||
        itineraryData.title ||
        'Destination';

    return (
        <div className="container max-w-5xl py-10 min-h-screen">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="rounded-full mb-8 -ml-2"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

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
                    await new Promise(r => setTimeout(r, 500));
                    setIsSaving(false);
                    alert('✅ This trip is already saved to your account!');
                }}
                onRegenerate={() => router.push('/plan-trip')}
                isSaving={isSaving}
            />
        </div>
    );
}
