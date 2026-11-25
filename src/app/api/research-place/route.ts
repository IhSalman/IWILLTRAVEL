import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { getCache, setCache } from '@/utils/cache';

export const dynamic = 'force-dynamic';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PlaceReview {
    author: string;
    rating: number;
    text: string;
    time: string;
    relativeTime: string;
}

interface NearbyPlace {
    name: string;
    type: string;
    rating: number;
    priceLevel?: string;
    address?: string;
    lat?: number;
    lng?: number;
    googleMapsUri?: string;
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
    primaryType?: string;
    // New fields from Places API (New)
    internationalPhone?: string;
    website?: string;
    priceLevel?: string;
    currentStatus?: string;
    lat?: number;
    lng?: number;
    // Aerial View
    aerialVideoUrl?: string;
    airQuality?: {
        aqi: number;
        category: string;
        dominantPollutant: string;
        color: string;
    };
}

// ─── Places API (New) — Text Search ────────────────────────────────────────────
// Uses POST with FieldMask to only pay for the fields we actually request

async function searchPlaceNew(destination: string, apiKey: string) {
    const url = 'https://places.googleapis.com/v1/places:searchText';
    const fieldMask = [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.primaryType',
        'places.currentOpeningHours',
        'places.priceLevel',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.businessStatus',
        'places.editorialSummary',
        'places.photos',
        'places.reviews',
        'places.accessibilityOptions',
    ].join(',');

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify({
            textQuery: destination,
            languageCode: 'en',
            maxResultCount: 1,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('[Places API New] Text search failed:', err);
        return null;
    }

    const data = await res.json();
    return data.places?.[0] || null;
}

// ─── Places API (New) — Nearby Search ──────────────────────────────────────────

async function getNearbyPlacesNew(
    lat: number, lng: number, type: string, apiKey: string
): Promise<NearbyPlace[]> {
    const url = 'https://places.googleapis.com/v1/places:searchNearby';
    const fieldMask = [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.primaryType',
        'places.googleMapsUri',
    ].join(',');

    // Map legacy types to Places API (New) includedTypes
    const typeMap: Record<string, string> = {
        tourist_attraction: 'tourist_attraction',
        restaurant: 'restaurant',
        museum: 'museum',
        park: 'park',
        cafe: 'cafe',
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify({
            includedTypes: [typeMap[type] || type],
            maxResultCount: 8,
            locationRestriction: {
                circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: 2000,
                },
            },
            rankPreference: 'POPULARITY',
        }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.places || []).map((p: any) => ({
        name: p.displayName?.text || 'Unknown',
        type: p.primaryType?.replace(/_/g, ' ') || type,
        rating: p.rating || 0,
        priceLevel: p.priceLevel?.replace('PRICE_LEVEL_', '').toLowerCase() || undefined,
        address: p.formattedAddress || '',
        lat: p.location?.latitude,
        lng: p.location?.longitude,
        googleMapsUri: p.googleMapsUri,
    }));
}

// ─── Photo URL Builder (Places API New) ─────────────────────────────────────────

// Photos are served through /api/place-photo so the API key never reaches the browser.
function getPhotoUrlNew(photoName: string, _apiKey?: string, maxWidthPx = 1200): string {
    // photoName format: "places/{placeId}/photos/{photoId}"
    return `/api/place-photo?name=${encodeURIComponent(photoName)}&w=${maxWidthPx}`;
}



// ─── Air Quality API ──────────────────────────────────────────────────────
async function getAirQualityData(lat: number, lng: number, apiKey: string): Promise<{
    aqi: number; category: string; dominantPollutant: string; color: string;
} | null> {
    try {
        const res = await fetch('https://airquality.googleapis.com/v1/currentConditions:lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
            body: JSON.stringify({
                location: { latitude: lat, longitude: lng },
                extraComputations: ['DOMINANT_POLLUTANT_CONCENTRATION'],
                languageCode: 'en',
            }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const indexes = data.indexes || [];
        const idx = indexes.find((i: any) => i.code === 'uaqi') || indexes[0];
        if (!idx) return null;
        console.log(`[Air Quality API] ✅ AQI ${idx.aqi} (${idx.category})`);
        return {
            aqi: idx.aqi || 0,
            category: idx.category || 'Unknown',
            dominantPollutant: data.dominantPollutant || idx.dominantPollutant || 'N/A',
            color: idx.color
                ? `rgb(${Math.round((idx.color.red||0)*255)},${Math.round((idx.color.green||0)*255)},${Math.round((idx.color.blue||0)*255)})`
                : '#4CAF50',
        };
    } catch (e) {
        return null;
    }
}

// ─── Pros/Cons from Reviews ───────────────────────────────────────────────────

function generateProsConsFromReviews(reviews: any[]): { pros: string[]; cons: string[] } {
    const pros: string[] = [];
    const cons: string[] = [];
    const positiveKeywords = ['amazing', 'beautiful', 'great', 'wonderful', 'excellent', 'fantastic', 'loved', 'stunning', 'perfect', 'breathtaking', 'incredible', 'gorgeous'];
    const negativeKeywords = ['crowded', 'expensive', 'queue', 'long wait', 'overpriced', 'noisy', 'disappointing', 'dirty', 'tourist trap', 'slow', 'rude'];

    for (const review of reviews) {
        const text = review.text?.text?.toLowerCase() || review.originalText?.text?.toLowerCase() || '';
        const rawText = review.text?.text || review.originalText?.text || '';
        for (const kw of positiveKeywords) {
            if (text.includes(kw) && pros.length < 4) {
                const sentence = rawText.split(/[.!?]/).find((s: string) => s.toLowerCase().includes(kw));
                if (sentence && !pros.includes(sentence.trim())) pros.push(sentence.trim());
            }
        }
        for (const kw of negativeKeywords) {
            if (text.includes(kw) && cons.length < 3) {
                const sentence = rawText.split(/[.!?]/).find((s: string) => s.toLowerCase().includes(kw));
                if (sentence && !cons.includes(sentence.trim())) cons.push(sentence.trim());
            }
        }
    }

    return {
        pros: pros.length ? pros : ['Highly rated by visitors', 'Popular destination', 'Memorable experience'],
        cons: cons.length ? cons : ['Can get busy during peak season', 'Book tickets in advance'],
    };
}

// ─── Main Route Handler ────────────────────────────────────────────────────────

export async function GET(req: Request) {
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

        // Normalize cache key
        const cacheKey = `research_place_v2_${destination.toLowerCase().trim().replace(/\s+/g, '_')}`;
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return NextResponse.json(cachedData);
        }

        const apiKey = process.env.GOOGLE_PLACES_API_KEY;

        if (!apiKey) {
            console.warn('GOOGLE_PLACES_API_KEY not configured — returning fallback data');
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

        // ── Step 1: Text Search with Places API (New) ──────────────────────────
        const place = await searchPlaceNew(destination, apiKey);
        if (!place) {
            return NextResponse.json({ error: `Could not find "${destination}" on Google Maps` }, { status: 404 });
        }

        const lat = place.location?.latitude;
        const lng = place.location?.longitude;
        const placeId = place.id;

        // ── Step 2: Fetch nearby places + aerial video + air quality in parallel ─────
        const formattedAddress = place.formattedAddress || destination;
        const [attractions, restaurants, airQuality] = await Promise.all([
            getNearbyPlacesNew(lat, lng, 'tourist_attraction', apiKey),
            getNearbyPlacesNew(lat, lng, 'restaurant', apiKey),
            getAirQualityData(lat, lng, apiKey),
        ]);

        // ── Step 3: Build photo URLs from Places API (New) photo names ─────────
        const photoUrls: string[] = (place.photos || [])
            .slice(0, 12)
            .map((p: any) => getPhotoUrlNew(p.name, apiKey, 1200));

        // ── Step 4: Map reviews (Places API New has richer review format) ──────
        const rawReviews = place.reviews || [];
        const reviews: PlaceReview[] = rawReviews.slice(0, 5).map((r: any) => ({
            author: r.authorAttribution?.displayName || r.authorName || 'Anonymous',
            rating: r.rating || 0,
            text: r.text?.text || r.originalText?.text || '',
            time: r.publishTime ? new Date(r.publishTime).toLocaleDateString() : '',
            relativeTime: r.relativePublishTimeDescription || '',
        }));

        const { pros, cons } = generateProsConsFromReviews(rawReviews);

        // ── Step 5: Map opening hours ──────────────────────────────────────────
        const openingHours: string[] = place.currentOpeningHours?.weekdayDescriptions || [];

        // ── Step 6: Map price level ────────────────────────────────────────────
        const priceLevelMap: Record<string, string> = {
            PRICE_LEVEL_FREE: 'Free',
            PRICE_LEVEL_INEXPENSIVE: 'Inexpensive ($)',
            PRICE_LEVEL_MODERATE: 'Moderate ($$)',
            PRICE_LEVEL_EXPENSIVE: 'Expensive ($$$)',
            PRICE_LEVEL_VERY_EXPENSIVE: 'Very Expensive ($$$$)',
        };
        const priceLevel = priceLevelMap[place.priceLevel || ''] || undefined;

        // ── Step 7: Accessibility ──────────────────────────────────────────────
        const acc = place.accessibilityOptions;
        let accessibilityInfo = 'Accessibility info not available.';
        if (acc) {
            const notes = [];
            if (acc.wheelchairAccessibleParking) notes.push('Wheelchair-accessible parking');
            if (acc.wheelchairAccessibleEntrance) notes.push('Wheelchair-accessible entrance');
            if (acc.wheelchairAccessibleRestroom) notes.push('Wheelchair-accessible restroom');
            if (acc.wheelchairAccessibleSeating) notes.push('Wheelchair-accessible seating');
            accessibilityInfo = notes.length > 0 ? notes.join('. ') + '.' : 'Limited accessibility information available.';
        }

        // ── Step 8: Assemble final response ───────────────────────────────────
        const research: PlaceResearch = {
            placeId,
            name: place.displayName?.text || destination,
            rating: place.rating || 0,
            totalRatings: place.userRatingCount || 0,
            address: place.formattedAddress || '',
            summary: place.editorialSummary?.text || `${place.displayName?.text} is a remarkable destination known for its unique character and memorable experiences.`,
            photoUrls,
            reviews,
            nearbyAttractions: attractions,
            nearbyRestaurants: restaurants,
            openingHours,
            pros,
            cons,
            safetyNotes: [
                'Keep your valuables secure in crowded areas',
                'Use registered taxis or rideshare apps for transport',
                'Stay informed about local emergency numbers',
            ].filter(Boolean),
            bestTimeToVisit: 'Spring (March–May) and Autumn (September–November) offer the best weather and fewer crowds.',
            accessibilityInfo,
            googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
            primaryType: place.primaryType?.replace(/_/g, ' '),
            internationalPhone: place.nationalPhoneNumber,
            website: place.websiteUri,
            priceLevel,
            currentStatus: place.businessStatus === 'OPERATIONAL' ? 'Open' : place.businessStatus || undefined,
            lat,
            lng,
            ...(airQuality ? { airQuality } : {}),
        };

        await setCache(cacheKey, research);
        return NextResponse.json(research);

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to research place';
        console.error('Research Place Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
