/**
 * GET /api/cron/trip-emails — daily traveller email sequence (Vercel Cron).
 *
 *   pre_7   7 days before departure: checklist (entry rules, offline copy, weather)
 *   pre_1   the day before: Day 1 at a glance
 *   post_1  the day after the trip ends: welcome back + feedback + plan the next one
 *
 * Each (itinerary, kind) is claimed in `trip_email_log` before sending, so a trip
 * never gets the same email twice even if the cron runs again.
 * Users who unsubscribed get no email (handled in notifyUser); Telegram still works.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { notifyUser, type NotifyMessage } from '@/lib/notify';
import { getSiteUrl } from '@/utils/site-url';
import { localClock, statusLabel, type FlightSnapshot } from '@/lib/flight-status/types';

export const maxDuration = 300;

type Kind = 'pre_7' | 'pre_1' | 'post_1';
const MAX_SENDS_PER_RUN = 200;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: string, n: number) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return ymd(d);
};

function cityName(trip: any): string {
    const raw = trip.city_id ? String(trip.city_id).replace(/-/g, ' ') : '';
    const fromTitle = String(trip.title || '').split(':')[0];
    const name = raw || fromTitle || 'your destination';
    return name.replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function endDateOf(trip: any): string | null {
    if (trip.end_date) return String(trip.end_date).slice(0, 10);
    if (trip.start_date && trip.days) return addDays(String(trip.start_date).slice(0, 10), Number(trip.days) - 1);
    return null;
}

function dayOneStops(trip: any): string[] {
    const itin = trip.content?.itinerary ?? trip.content;
    const day1 = Array.isArray(itin?.days) ? itin.days[0] : null;
    const acts = Array.isArray(day1?.activities) ? day1.activities : [];
    return acts
        .slice(0, 5)
        .map((a: any) => (a?.time ? `${String(a.time).split('-')[0].trim()} · ${a.title}` : a?.title))
        .filter(Boolean);
}

/** One line per tracked flight on this trip, e.g. "BA123 LHR → JFK: On time, departs 08:05 from terminal 5". */
function flightLines(flights: { flight_number: string; dep_iata: string | null; arr_iata: string | null; snapshot: FlightSnapshot | null }[]): string[] {
    return flights.map((f) => {
        const s = f.snapshot;
        const dep = s ? localClock(s.departure.revisedLocal) ?? localClock(s.departure.scheduledLocal) : null;
        const extra = [dep && `departs ${dep}`, s?.departure.terminal && `terminal ${s.departure.terminal}`, s?.departure.gate && `gate ${s.departure.gate}`].filter(Boolean).join(', ');
        return `• ${f.flight_number} ${f.dep_iata ?? ''} → ${f.arr_iata ?? ''}: ${statusLabel(s)}${extra ? `, ${extra}` : ''}`;
    });
}

function buildMessage(kind: Kind, trip: any, flights: Parameters<typeof flightLines>[0] = []): NotifyMessage {
    const city = cityName(trip);
    const tripUrl = `${getSiteUrl()}/itineraries/${trip.id}`;
    switch (kind) {
        case 'pre_7':
            return {
                subject: `One week until ${city}`,
                heading: `A week to go — ${city}`,
                paragraphs: [
                    'A few things worth doing this week:',
                    '• Check passport validity and entry rules for your nationality.',
                    '• Open your trip once on your phone so it’s saved for offline use.',
                    '• Look at the weather for your dates — we’ll alert you if a day needs a rain plan.',
                ],
                cta: { label: 'Open my trip', url: tripUrl },
                telegramText: `🧳 *One week until ${city}!*\nCheck entry rules, open your trip once for offline use, and watch the weather.\n${tripUrl}`,
            };
        case 'pre_1': {
            const stops = dayOneStops(trip);
            const flightInfo = flights.length ? ['Your flights (we’ll email you if anything changes):', ...flightLines(flights)] : [];
            return {
                subject: `Tomorrow: Day 1 in ${city}`,
                heading: `Tomorrow in ${city}`,
                paragraphs: [
                    ...flightInfo,
                    ...(stops.length
                        ? ['Here’s your first day:', ...stops.map((s) => `• ${s}`), 'Have a great trip!']
                        : ['Your trip starts tomorrow. Everything is in your plan — have a great trip!']),
                ],
                cta: { label: 'See the full day', url: tripUrl },
                telegramText: `✈️ *Tomorrow in ${city}*\n${stops.map((s) => `• ${s}`).join('\n')}\n${tripUrl}`,
            };
        }
        case 'post_1':
            return {
                subject: `Welcome back from ${city}`,
                heading: `Welcome back from ${city}`,
                paragraphs: [
                    'We hope it was a good one.',
                    'Tell us which stops were great — and which weren’t. Marking a place as closed or disappointing helps the next traveller.',
                ],
                cta: { label: 'Rate my stops', url: tripUrl },
                telegramText: `🏡 *Welcome back from ${city}!* How was it? Rate your stops: ${tripUrl}`,
            };
    }
}

export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const today = ymd(new Date());
    const in7 = addDays(today, 7);
    const in1 = addDays(today, 1);
    const yesterday = addDays(today, -1);

    // Trips starting within a week, or that started up to 31 days ago (for post-trip).
    const { data: trips, error } = await supabase
        .from('itineraries')
        .select('id, user_id, title, city_id, start_date, end_date, days, content')
        .not('user_id', 'is', null)
        .not('start_date', 'is', null)
        .gte('start_date', addDays(today, -31))
        .lte('start_date', in7)
        .limit(1000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const due: { trip: any; kind: Kind }[] = [];
    for (const trip of trips || []) {
        const start = String(trip.start_date).slice(0, 10);
        if (start === in7) due.push({ trip, kind: 'pre_7' });
        if (start === in1) due.push({ trip, kind: 'pre_1' });
        if (endDateOf(trip) === yesterday) due.push({ trip, kind: 'post_1' });
    }

    let sent = 0;
    let skipped = 0;
    for (const { trip, kind } of due.slice(0, MAX_SENDS_PER_RUN)) {
        // Claim first: the primary key (itinerary_id, kind) blocks duplicates.
        const { error: claimErr } = await supabase
            .from('trip_email_log')
            .insert({ itinerary_id: trip.id, kind, user_id: trip.user_id });
        if (claimErr) {
            skipped++;
            continue;
        }
        // Day-before email includes live status for flights tracked on this trip (if the table exists).
        let flights: Parameters<typeof flightLines>[0] = [];
        if (kind === 'pre_1') {
            const { data } = await supabase
                .from('tracked_flights')
                .select('flight_number, dep_iata, arr_iata, snapshot')
                .eq('itinerary_id', trip.id)
                .order('sched_dep_utc', { ascending: true })
                .limit(4);
            flights = data ?? [];
        }
        const result = await notifyUser(trip.user_id, buildMessage(kind, trip, flights));
        await supabase
            .from('trip_email_log')
            .update({ email_sent: result.email, telegram_sent: result.telegram })
            .eq('itinerary_id', trip.id)
            .eq('kind', kind);
        if (result.email || result.telegram) sent++;
    }

    return NextResponse.json({ date: today, due: due.length, sent, skipped });
}
