/**
 * GET /api/flights/details?callsign=BAW123&hex=400A0F
 *
 * Route (origin/destination airports, airline) and airframe details (type, registration, photo).
 */
import { NextResponse } from 'next/server';
import { CALLSIGN_RE, HEX_RE, getFlightDetails } from '@/lib/flights';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const callsignRaw = (url.searchParams.get('callsign') || '').trim().toUpperCase();
    const hexRaw = (url.searchParams.get('hex') || '').trim().toUpperCase();
    const callsign = CALLSIGN_RE.test(callsignRaw) ? callsignRaw : null;
    const hex = HEX_RE.test(hexRaw) ? hexRaw : null;

    if (!callsign && !hex) {
        return NextResponse.json({ error: 'Provide a callsign or hex code' }, { status: 400 });
    }

    const details = await getFlightDetails(callsign, hex);
    return NextResponse.json(details, {
        headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600' },
    });
}
