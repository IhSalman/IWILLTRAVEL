/**
 * GET /api/airports/:iata/services?kind=lounge|food|pharmacy|money|hotel
 *
 * Real places in or near an airport from Google Places (cached 14 days per query by
 * googleTextSearch). Loaded on demand from the airport page so crawlers don't trigger billing.
 */
import { NextResponse } from 'next/server';
import { getAirport } from '@/lib/airports';
import { googleTextSearch } from '@/app/api/agent-itinerary/tools';
import { distanceNm } from '@/components/flights/geo';

const KINDS: Record<string, (name: string) => string> = {
    lounge: n => `airport lounge at ${n}`,
    food: n => `restaurants and cafes at ${n}`,
    pharmacy: n => `pharmacy at ${n}`,
    money: n => `currency exchange or ATM at ${n}`,
    hotel: n => `hotels near ${n}`,
};

export async function GET(req: Request, { params }: { params: Promise<{ iata: string }> }) {
    const { iata } = await params;
    const airport = getAirport(iata);
    const kind = new URL(req.url).searchParams.get('kind') || '';
    if (!airport || !KINDS[kind]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const results = (await googleTextSearch(KINDS[kind](airport.name))) ?? [];
    // Keep places that are actually at/near the airport (Places text search can wander).
    const maxNm = kind === 'hotel' ? 6 : 2.5;
    const places = (results as any[])
        .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number' && distanceNm(airport.lat, airport.lon, p.lat, p.lng) <= maxNm)
        .slice(0, 8)
        .map(p => ({ name: p.name, address: p.address, rating: p.rating || null, ratings: p.totalRatings || 0, openNow: p.openNow, placeId: p.placeId ?? null }));

    return NextResponse.json({ places }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } });
}
