/**
 * Aircraft-model alerts (Pro).
 *
 * GET  /api/aircraft-watches  → the user's watches
 * POST /api/aircraft-watches  { family: "a380" | typeCodes: ["A388"], airport?: "LHR", lat?, lon?, radiusNm?, mode? }
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuth } from '@/utils/auth';
import { requireFeature } from '@/utils/require-plan';
import { getAirport } from '@/lib/airports';
import { familyForCode, getFamily } from '@/lib/aircraft-types';
import { flightStatusEnabled } from '@/lib/flight-status/provider';

const MAX_WATCHES = 10;

const WatchSchema = z.object({
    family: z.string().max(20).optional(),
    typeCodes: z.array(z.string().regex(/^[A-Z0-9]{2,4}$/)).max(10).optional(),
    airport: z.string().regex(/^[A-Za-z]{3}$/).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
    radiusNm: z.number().int().min(5).max(100).optional(),
    mode: z.enum(['scheduled', 'live']).optional(),
});

export async function GET() {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { data, error } = await createAdminClient()
        .from('aircraft_watches')
        .select('id, label, type_codes, airport_iata, lat, lon, radius_nm, mode, active, created_at')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: 'Aircraft alerts are not set up on this server yet.' }, { status: 503 });
    return NextResponse.json({ watches: data ?? [] });
}

export async function POST(req: Request) {
    const gate = await requireFeature('hasAircraftWatches', 'Aircraft alerts are part of the Pro plan.');
    if ('error' in gate) return gate.error;

    const parsed = WatchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid aircraft alert' }, { status: 400 });
    const body = parsed.data;

    const family = body.family ? getFamily(body.family) : null;
    const codes = family ? family.codes : (body.typeCodes ?? []).filter(c => familyForCode(c));
    if (codes.length === 0) return NextResponse.json({ error: 'Choose an aircraft model' }, { status: 400 });

    const airport = body.airport ? getAirport(body.airport) : null;
    if (body.airport && !airport) return NextResponse.json({ error: 'Unknown airport' }, { status: 400 });
    if (!airport && (body.lat === undefined || body.lon === undefined)) {
        return NextResponse.json({ error: 'Choose an airport or a location' }, { status: 400 });
    }

    // Schedule-based alerts need the paid flight data feed; without it fall back to live sightings.
    const mode = body.mode === 'live' || !airport || !flightStatusEnabled() ? 'live' : 'scheduled';

    const supabase = createAdminClient();
    const { count } = await supabase.from('aircraft_watches').select('id', { count: 'exact', head: true }).eq('user_id', gate.user.id).eq('active', true);
    if ((count ?? 0) >= MAX_WATCHES) return NextResponse.json({ error: `You can have up to ${MAX_WATCHES} aircraft alerts.` }, { status: 403 });

    const modelName = family?.name ?? familyForCode(codes[0])?.name ?? codes.join('/');
    const { data, error } = await supabase
        .from('aircraft_watches')
        .insert({
            user_id: gate.user.id,
            label: `${modelName} ${airport ? `at ${airport.iata}` : 'near your location'}`,
            type_codes: codes,
            airport_iata: airport?.iata ?? null,
            lat: airport ? null : body.lat,
            lon: airport ? null : body.lon,
            radius_nm: body.radiusNm ?? 30,
            mode,
        })
        .select('id, label, type_codes, airport_iata, lat, lon, radius_nm, mode, active, created_at')
        .single();
    if (error) return NextResponse.json({ error: 'Could not save this alert' }, { status: 500 });
    return NextResponse.json({ watch: data }, { status: 201 });
}
