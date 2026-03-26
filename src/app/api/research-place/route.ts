import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { getCache, setCache } from '@/utils/cache';

export const dynamic = 'force-dynamic';

interface PlacePhoto {
    photoReference: string;
    url: string;
}

interface PlaceReview {
    author: string;
    rating: number;
    text: string;
    time: string;
}

interface NearbyPlace {
    name: string;
    type: string;
    rating: number;
    priceLevel?: number;
    address?: string;
}

export interface PlaceResearch {
    placeId: string;
    name: string;
    rating: number;
    totalRatings: number;
    address: string;
    summary: string;
    photoUrls: string[];
    reviews: PlaceReview[];
    nearbyAttractions: NearbyPlace[];
    nearbyRestaurants: NearbyPlace[];
    openingHours: string[];
    pros: string[];
    cons: string[];
    safetyNotes: string[];
    bestTimeToVisit: string;
    accessibilityInfo: string;
    googleMapsUrl: string;
}

async function searchPlace(destination: string, apiKey: string) {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(destination)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    return data.results[0];
}

async function getPlaceDetails(placeId: string, apiKey: string) {
    const fields = 'name,rating,user_ratings_total,formatted_address,editorial_summary,photos,reviews,opening_hours,wheelchair_accessible_entrance';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') return null;
    return data.result;
}

async function getNearbyPlaces(lat: number, lng: number, type: string, apiKey: string): Promise<NearbyPlace[]> {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${type}&rankby=prominence&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') return [];
    return (data.results || []).slice(0, 8).map((p: any) => ({
        name: p.name,
        type: p.types?.[0]?.replace(/_/g, ' ') || type,
        rating: p.rating || 0,
        priceLevel: p.price_level,
        address: p.vicinity,
    }));
}

function getPhotoUrl(photoRef: string, apiKey: string, maxWidth = 800): string {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoRef}&key=${apiKey}`;
}

function generateProsConsFromReviews(reviews: any[]): { pros: string[]; cons: string[] } {
    const pros: string[] = [];
    const cons: string[] = [];

    const positiveKeywords = ['amazing', 'beautiful', 'great', 'wonderful', 'excellent', 'fantastic', 'loved', 'stunning', 'perfect', 'breathtaking'];
    const negativeKeywords = ['crowded', 'expensive', 'queue', 'long wait', 'overpriced', 'noisy', 'disappointing', 'dirty', 'tourist trap'];

    for (const review of reviews) {
        const text = review.text?.toLowerCase() || '';
        for (const kw of positiveKeywords) {
            if (text.includes(kw) && pros.length < 4) {
                const sentence = review.text?.split(/[.!?]/).find((s: string) => s.toLowerCase().includes(kw));
                if (sentence && !pros.includes(sentence.trim())) pros.push(sentence.trim());
            }
        }
        for (const kw of negativeKeywords) {
            if (text.includes(kw) && cons.length < 3) {
                const sentence = review.text?.split(/[.!?]/).find((s: string) => s.toLowerCase().includes(kw));
                if (sentence && !cons.includes(sentence.trim())) cons.push(sentence.trim());
            }
        }
    }

    return {
        pros: pros.length ? pros : ['Highly rated by visitors', 'Popular destination', 'Memorable experience'],
        cons: cons.length ? cons : ['Can get busy during peak season', 'Book tickets in advance'],
    };
}

export async function GET(req: Request) {
    // Require authentication to protect Google Places API credits
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
        const { searchParams } = new URL(req.url);
        const destination = searchParams.get('destination');

        if (!destination || typeof destination !== 'string') {
            return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
        }

        if (destination.length > 200) {
            return NextResponse.json({ error: 'Destination name is too long (max 200 characters)' }, { status: 400 });
        }

        // Normalize cache key to avoid collisions from casing/whitespace
        const cacheKey = `research_place_${destination.toLowerCase().trim().replace(/\s+/g, '_')}`;
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return NextResponse.json(cachedData);
        }

        const apiKey = process.env.GOOGLE_PLACES_API_KEY;

        // Graceful fallback if no API key configured
        if (!apiKey) {
            console.warn('GOOGLE_PLACES_API_KEY not configured — returning empty research data');
            const fallback: PlaceResearch = {
                placeId: '',
                name: destination,
                rating: 0,
                totalRatings: 0,
                address: '',
                summary: `Exploring ${destination} — one of the world's remarkable destinations.`,
                photoUrls: [],
                reviews: [],
                nearbyAttractions: [],
                nearbyRestaurants: [],
                openingHours: [],
                pros: ['Beautiful scenery', 'Rich cultural experiences', 'Memorable landmarks'],
                cons: ['Can be crowded during peak season', 'Book popular attractions in advance'],
                safetyNotes: ['Stay aware of your surroundings', 'Keep copies of important documents', 'Use registered transport services'],
                bestTimeToVisit: 'Spring and early autumn for pleasant weather and fewer crowds.',
                accessibilityInfo: 'Varies by location. Check individual attraction websites for accessibility information.',
                googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(destination)}`,
            };
            return NextResponse.json(fallback);
        }

        const searchResult = await searchPlace(destination, apiKey);
        if (!searchResult) {
            return NextResponse.json({ error: `Could not find "${destination}" on Google Maps` }, { status: 404 });
        }

        const { place_id, geometry } = searchResult;
        const { lat, lng } = geometry.location;

        const [details, attractions, restaurants] = await Promise.all([
            getPlaceDetails(place_id, apiKey),
            getNearbyPlaces(lat, lng, 'tourist_attraction', apiKey),
            getNearbyPlaces(lat, lng, 'restaurant', apiKey),
        ]);

        if (!details) {
            return NextResponse.json({ error: 'Could not fetch place details' }, { status: 500 });
        }

        const photoUrls: string[] = (details.photos || [])
            .slice(0, 12)
            .map((p: any) => getPhotoUrl(p.photo_reference, apiKey));

        const reviews: PlaceReview[] = (details.reviews || []).slice(0, 5).map((r: any) => ({
            author: r.author_name,
            rating: r.rating,
            text: r.text,
            time: new Date(r.time * 1000).toLocaleDateString(),
        }));

        const { pros, cons } = generateProsConsFromReviews(details.reviews || []);

        const research: PlaceResearch = {
            placeId: place_id,
            name: details.name || destination,
            rating: details.rating || 0,
            totalRatings: details.user_ratings_total || 0,
            address: details.formatted_address || '',
            summary: details.editorial_summary?.overview || `${details.name} is a remarkable destination known for its unique character and memorable experiences.`,
            photoUrls,
            reviews,
            nearbyAttractions: attractions,
            nearbyRestaurants: restaurants,
            openingHours: details.opening_hours?.weekday_text || [],
            pros,
            cons,
            safetyNotes: [
                'Keep your valuables secure in crowded areas',
                'Use registered taxis or rideshare apps for transport',
                'Stay informed about local emergency numbers',
                details.wheelchair_accessible_entrance ? 'Wheelchair accessible entrance available' : '',
            ].filter(Boolean),
            bestTimeToVisit: 'Spring (March–May) and Autumn (September–November) offer the best weather and fewer crowds.',
            accessibilityInfo: details.wheelchair_accessible_entrance
                ? 'Wheelchair accessible entrance available at this location.'
                : 'Accessibility varies. Check individual sites for specific information.',
            googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place_id}`,
        };

        await setCache(cacheKey, research);

        return NextResponse.json(research);

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to research place';
        console.error('Research Place Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
