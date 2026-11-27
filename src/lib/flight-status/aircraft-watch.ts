/**
 * Aircraft-model alerts (Pro): "email me when an A380 is due at LHR" or "…flies near my home".
 *
 *  scheduled mode  every 3h, read each watched airport's board once (shared by every user
 *                  watching that airport) and match arriving/departing aircraft models.
 *  live mode       every run, one free adsb.lol area query per distinct watch area.
 *
 * Each match is emailed once per watch (aircraft_watch_hits primary key).
 */
import { createAdminClient } from '@/utils/supabase/admin';
import { notifyUser } from '@/lib/notify';
import { getSiteUrl } from '@/utils/site-url';
import { getAircraftNear, type LiveAircraft } from '@/lib/flights';
import { getAirport } from '@/lib/airports';
import { familyForCode, familyForModelName } from '@/lib/aircraft-types';
import { fetchAirportBoard } from './provider';
import { localClock } from './types';
import type { BoardFlight } from './types';

export interface AircraftWatchRow {
    id: string;
    user_id: string;
    label: string;
    type_codes: string[];
    airport_iata: string | null;
    lat: number | null;
    lon: number | null;
    radius_nm: number;
    mode: 'scheduled' | 'live';
    last_run_at: string | null;
}

const SCHEDULED_EVERY_MS = 3 * 3600_000;

/** True when a schedule entry's aircraft belongs to one of the watched ICAO types. */
export function boardFlightMatches(f: BoardFlight, typeCodes: string[]): boolean {
    const fam = familyForModelName(f.aircraftModel);
    return !!fam && fam.codes.some(c => typeCodes.includes(c));
}

interface Hit { watch: AircraftWatchRow; key: string; line: string }

async function scheduledHits(watches: AircraftWatchRow[], now: number): Promise<Hit[]> {
    const due = watches.filter(w => w.airport_iata && (!w.last_run_at || now - Date.parse(w.last_run_at) >= SCHEDULED_EVERY_MS - 5 * 60_000));
    const byAirport = new Map<string, AircraftWatchRow[]>();
    for (const w of due) byAirport.set(w.airport_iata!, [...(byAirport.get(w.airport_iata!) ?? []), w]);

    const hits: Hit[] = [];
    for (const [iata, list] of Array.from(byAirport.entries())) {
        // Now → +12h covers the next run's 3h gap with room for schedule changes.
        const board = await fetchAirportBoard(iata, 0, 720, 30 * 60_000).catch(() => null);
        if (!board) continue;
        for (const w of list) {
            for (const [dir, flights] of [['arrives', board.arrivals], ['departs', board.departures]] as const) {
                for (const f of flights) {
                    if (!boardFlightMatches(f, w.type_codes) || f.status === 'cancelled') continue;
                    const time = localClock(f.revisedLocal) ?? localClock(f.scheduledLocal) ?? '';
                    const other = f.otherAirport.city ?? f.otherAirport.iata ?? f.otherAirport.name;
                    hits.push({
                        watch: w,
                        key: `sched:${dir}:${f.number}:${f.scheduledUtc ?? time}`,
                        line: `${f.aircraftModel} ${dir === 'arrives' ? 'lands at' : 'leaves'} ${iata} at ${time} local time — ${f.airline ?? ''} ${f.number} ${dir === 'arrives' ? 'from' : 'to'} ${other}${f.aircraftReg ? ` (${f.aircraftReg})` : ''}.`,
                    });
                }
            }
        }
    }
    return hits;
}

async function liveHits(watches: AircraftWatchRow[], now: number): Promise<Hit[]> {
    const live = watches.filter(w => w.mode === 'live');
    const byArea = new Map<string, { lat: number; lon: number; r: number; list: AircraftWatchRow[] }>();
    for (const w of live) {
        const ap = w.airport_iata ? getAirport(w.airport_iata) : null;
        const lat = ap?.lat ?? w.lat, lon = ap?.lon ?? w.lon;
        if (lat === null || lon === null) continue;
        const key = `${lat.toFixed(1)},${lon.toFixed(1)},${w.radius_nm}`;
        const area = byArea.get(key) ?? { lat, lon, r: w.radius_nm, list: [] };
        area.list.push(w);
        byArea.set(key, area);
    }

    const bucket = Math.floor(now / (6 * 3600_000)); // at most one alert per aircraft per 6h
    const hits: Hit[] = [];
    for (const area of Array.from(byArea.values())) {
        let aircraft: LiveAircraft[];
        try {
            aircraft = await getAircraftNear(area.lat, area.lon, area.r);
        } catch {
            continue;
        }
        for (const w of area.list) {
            for (const ac of aircraft) {
                if (!ac.type || !w.type_codes.includes(ac.type)) continue;
                const fam = familyForCode(ac.type);
                const what = ac.ground ? 'is on the ground' : `is flying at ${ac.alt?.toLocaleString('en') ?? '?'} ft`;
                hits.push({
                    watch: w,
                    key: `live:${ac.hex}:${bucket}`,
                    line: `${fam?.name ?? ac.type} ${ac.flightNo ?? ac.callsign ?? ac.reg ?? ac.hex} ${what} within ${w.radius_nm} nm${w.airport_iata ? ` of ${w.airport_iata}` : ''}. Track it: ${getSiteUrl()}/en/flights?flight=${encodeURIComponent(ac.callsign ?? ac.hex)}`,
                });
            }
        }
    }
    return hits;
}

/** Run all active aircraft watches; returns how many alerts were emailed. */
export async function runAircraftWatches(now = Date.now()): Promise<{ watches: number; hits: number; emails: number }> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('aircraft_watches')
        .select('id, user_id, label, type_codes, airport_iata, lat, lon, radius_nm, mode, last_run_at')
        .eq('active', true)
        .limit(500);
    if (error || !data?.length) return { watches: 0, hits: 0, emails: 0 };
    const watches = data as AircraftWatchRow[];

    const scheduled = watches.filter(w => w.mode === 'scheduled');
    const hits = [...await scheduledHits(scheduled, now), ...await liveHits(watches, now)];

    // Keep only hits not sent before (primary key on watch_id + hit_key).
    const fresh: Hit[] = [];
    if (hits.length) {
        const { data: inserted } = await supabase
            .from('aircraft_watch_hits')
            .upsert(hits.map(h => ({ watch_id: h.watch.id, hit_key: h.key })), { onConflict: 'watch_id,hit_key', ignoreDuplicates: true })
            .select('watch_id, hit_key');
        const keys = new Set((inserted ?? []).map((r: { watch_id: string; hit_key: string }) => `${r.watch_id}|${r.hit_key}`));
        for (const h of hits) if (keys.has(`${h.watch.id}|${h.key}`)) fresh.push(h);
    }

    // One email per user per run, grouped by watch.
    const byUser = new Map<string, Hit[]>();
    for (const h of fresh) byUser.set(h.watch.user_id, [...(byUser.get(h.watch.user_id) ?? []), h]);
    let emails = 0;
    for (const [userId, list] of Array.from(byUser.entries())) {
        const labels = Array.from(new Set(list.map(h => h.watch.label)));
        const res = await notifyUser(userId, {
            subject: list.length === 1 ? `Spotted: ${list[0].line.split(' — ')[0]}` : `${list.length} aircraft on your watch list`,
            heading: labels.length === 1 ? labels[0] : 'Your aircraft watches',
            paragraphs: [...list.slice(0, 20).map(h => h.line), 'Schedules can change; times are local to the airport.'],
            cta: { label: 'Open the live map', url: `${getSiteUrl()}/en/flights` },
        });
        if (res.email || res.telegram) emails++;
    }

    const ranScheduled = scheduled.filter(w => w.airport_iata && (!w.last_run_at || now - Date.parse(w.last_run_at) >= SCHEDULED_EVERY_MS - 5 * 60_000)).map(w => w.id);
    const ranLive = watches.filter(w => w.mode === 'live').map(w => w.id);
    const ran = Array.from(new Set([...ranScheduled, ...ranLive]));
    if (ran.length) await supabase.from('aircraft_watches').update({ last_run_at: new Date(now).toISOString() }).in('id', ran);

    return { watches: watches.length, hits: fresh.length, emails };
}
