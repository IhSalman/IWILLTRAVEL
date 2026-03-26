'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ItineraryTabs from '@/components/itinerary/ItineraryTabs';

export default function ItineraryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [itineraryData, setItineraryData] = useState<any>(null);
    const [meta, setMeta] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function fetchItinerary() {
            try {
                const res = await fetch(`/api/itineraries/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    // data.content is the full AI itinerary object
                    setItineraryData(data.content);
                    setMeta(data); // store full record for metadata badges
                } else {
                    console.error('Failed to fetch itinerary');
                }
            } catch (err) {
                console.error('Error:', err);
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

    if (!itineraryData) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center space-y-4">
                <h1 className="text-2xl font-bold">Itinerary not found</h1>
                <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
            </div>
        );
    }

    // Map DB meta back to display labels
    const budgetLabel: Record<string, string> = { budget: 'Backpacker', moderate: 'Mid-range', luxury: 'Luxury' };
    const travelerLabel: Record<string, string> = { single: 'Solo', couple: 'Couple', family: 'Family' };
    const transportLabel: Record<string, string> = { public: 'Public Transit', rental: 'Rental Car' };
    const paceLabel: Record<string, string> = { relaxed: 'Relaxed', moderate: 'Moderate', packed: 'Packed' };

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
                destination={meta?.city_id?.replace(/-/g, ' ') || 'Destination'}
                companions={travelerLabel[meta?.traveler_type] || 'Solo'}
                budget={budgetLabel[meta?.budget] || 'Mid-range'}
                pace={paceLabel[meta?.pace] || 'Moderate'}
                transportation={transportLabel[meta?.travel_style] || 'Public Transit'}
                onSave={async () => {
                    setIsSaving(true);
                    await new Promise(r => setTimeout(r, 500));
                    setIsSaving(false);
                    alert('✅ This trip is already saved to your account!');
                }}
                onRegenerate={() => {
                    router.push('/plan-trip');
                }}
                isSaving={isSaving}
            />
        </div>
    );
}
