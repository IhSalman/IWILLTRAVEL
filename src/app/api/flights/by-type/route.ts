/**
 * GET /api/flights/by-type?types=A388,B748
 * GET /api/flights/by-type?family=a380
 * GET /api/flights/by-type?rare=1
 *
 * Every aircraft of the given models currently flying anywhere in the world (not limited
 * to the map viewport). Data: adsb.lol /v2/type.
 */
import { NextResponse } from 'next/server';
import { getAircraftByType, TYPE_CODE_RE } from '@/lib/flights';
import { RARE_TYPE_CODES, familyForCode, getFamily } from '@/lib/aircraft-types';

export async function GET(req: Request) {
    const url = new URL(req.url);
    let codes: string[] = [];

    const familyId = url.searchParams.get('family');
    if (familyId) {
        const fam = getFamily(familyId);
        if (!fam) return NextResponse.json({ error: 'Unknown aircraft family' }, { status: 400 });
        codes = fam.codes;
    } else if (url.searchParams.get('rare') === '1') {
        codes = RARE_TYPE_CODES;
    } else {
        codes = (url.searchParams.get('types') || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }

    // Only known designators: keeps the upstream fan-out bounded and the input safe for URL paths.
    codes = codes.filter(c => TYPE_CODE_RE.test(c) && familyForCode(c));
    if (codes.length === 0) return NextResponse.json({ error: 'Provide known ICAO type codes' }, { status: 400 });

    try {
        const aircraft = await getAircraftByType(codes.slice(0, 16));
        return NextResponse.json(
            { aircraft, codes, fetchedAt: Date.now() },
            // Worldwide model views refresh every 30s; one CDN entry serves every viewer.
            { headers: { 'Cache-Control': 'public, max-age=20, s-maxage=30, stale-while-revalidate=60' } },
        );
    } catch (err) {
        console.warn('[flights/by-type] failed:', err);
        return NextResponse.json({ error: 'Aircraft search is temporarily unavailable' }, { status: 502 });
    }
}
