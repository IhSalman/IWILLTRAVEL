/**
 * Turn a generated itinerary into a clean, print-ready PDF model.
 * Pure (no network): images and maps are attached afterwards by load-assets.ts.
 */
import type { ItineraryPdfModel, PdfDay, PdfFlight, PdfHotel, PdfLink, PdfStop, PdfWeatherDay } from './types';

export interface BuildPdfInput {
    itinerary: any;
    meta?: {
        destination?: string;
        startDate?: string;
        endDate?: string;
        companions?: string;
        budget?: string;
        pace?: string;
        transportation?: string;
    };
    flights?: any[];
    hotels?: any[];
    tripUrl?: string;
    siteUrl: string;
}

const MAX_DAYS = 30;
const MAX_STOPS_PER_DAY = 12;

/** Google sometimes uses narrow no-break / thin spaces in times ("9:00 AM"). */
const clean = (s: unknown): string =>
    typeof s === 'string' ? s.replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim() : '';

const list = (v: unknown, max = 8): string[] =>
    Array.isArray(v) ? v.map(clean).filter(Boolean).slice(0, max) : [];

const isHttpUrl = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\//i.test(u);

export function mapsSearchUrl(name: string, where?: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, where].filter(Boolean).join(', '))}`;
}

const MODE: Record<string, string> = { WALK: 'walking', TRANSIT: 'transit', DRIVE: 'driving', BICYCLE: 'bicycling' };

function directionsUrl(a: { lat?: number; lng?: number }, b: { lat?: number; lng?: number }, mode?: string): string | undefined {
    if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return undefined;
    const travelmode = MODE[String(mode || 'WALK').toUpperCase()] || 'walking';
    return `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&travelmode=${travelmode}`;
}

/** Whole-day route: first stop → last stop via up to 8 waypoints (Google's URL limit is 9). */
function dayRouteUrl(stops: PdfStop[], mode?: string): string | undefined {
    const pts = stops.filter((s) => s.lat != null && s.lng != null);
    if (pts.length < 2) return undefined;
    const coord = (s: PdfStop) => `${s.lat},${s.lng}`;
    const waypoints = pts.slice(1, -1).slice(0, 8).map(coord).join('|');
    const travelmode = MODE[String(mode || 'WALK').toUpperCase()] || 'walking';
    return `https://www.google.com/maps/dir/?api=1&origin=${coord(pts[0])}&destination=${coord(pts[pts.length - 1])}${
        waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''
    }&travelmode=${travelmode}`;
}

function hoursForWeekday(openingHours: unknown, weekday?: string): { text?: string; closed?: boolean } {
    if (!weekday || !Array.isArray(openingHours)) return {};
    const line = openingHours.map(clean).find((l) => l.toLowerCase().startsWith(weekday.toLowerCase()));
    if (!line) return {};
    const text = line.slice(line.indexOf(':') + 1).trim();
    return { text, closed: /closed/i.test(text) };
}

function addDaysIso(iso: string, n: number): string | undefined {
    const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function weekdayOf(iso: string): string | undefined {
    const d = new Date(`${iso}T12:00:00Z`);
    return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
}

function formatDate(iso?: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }): string | undefined {
    if (!iso) return undefined;
    const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
    return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
}

/** "14–16 May 2026", "30 May – 2 Jun 2026", "30 Dec 2026 – 2 Jan 2027". */
function dateRange(start?: string, end?: string): string | undefined {
    const parse = (iso?: string) => {
        if (!iso) return null;
        const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
        return Number.isNaN(d.getTime()) ? null : d;
    };
    const a = parse(start);
    const b = parse(end);
    const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' });
    if (a && b && a.getTime() !== b.getTime()) {
        if (a.getUTCFullYear() !== b.getUTCFullYear())
            return `${fmt(a, { day: 'numeric', month: 'short', year: 'numeric' })} – ${fmt(b, { day: 'numeric', month: 'short', year: 'numeric' })}`;
        if (a.getUTCMonth() !== b.getUTCMonth())
            return `${fmt(a, { day: 'numeric', month: 'short' })} – ${fmt(b, { day: 'numeric', month: 'short', year: 'numeric' })}`;
        return `${a.getUTCDate()}–${fmt(b, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    const one = a || b;
    return one ? fmt(one, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;
}

function money(price: unknown, currency?: string): string {
    const n = typeof price === 'number' ? price : parseFloat(String(price));
    if (!Number.isFinite(n) || n <= 0) return 'See link';
    const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' || !currency ? '$' : `${currency} `;
    return `${sym}${Math.round(n)}`;
}

/** Trim to about `max` characters, ending at a sentence (or word) boundary. */
function clamp(text: string | undefined, max: number): string | undefined {
    if (!text || text.length <= max) return text || undefined;
    const cut = text.slice(0, max);
    const sentence = cut.lastIndexOf('. ');
    if (sentence > max * 0.55) return cut.slice(0, sentence + 1);
    return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/**
 * Older trips packed time + name + a sentence into the title, e.g.
 * "09:30 - 11:30: Kuopio Market Square (Kauppatori) - Immerse yourselves in…".
 * Split that back into time, a clean place name and an optional blurb.
 */
function splitLegacyTitle(raw: string): { title: string; time?: string; blurb?: string } {
    let title = raw;
    let time: string | undefined;
    const t = title.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*:\s*(.+)$/);
    if (t) {
        time = `${t[1]}–${t[2]}`;
        title = t[3];
    }
    let blurb: string | undefined;
    const dash = title.search(/\s[-–]\s/);
    if (dash >= 3) {
        blurb = title.slice(dash + 3).replace(/\s*\([^)]*\)\s*\.?$/, '').trim() || undefined;
        title = title.slice(0, dash).trim();
    }
    return { title, time, blurb };
}

function buildStop(a: any, i: number, day: any, city: string): PdfStop {
    const parsed = splitLegacyTitle(clean(a?.title) || `Stop ${i + 1}`);
    const title = parsed.title;
    const label = clean(a?.time);
    const time = parsed.time ? [parsed.time, label].filter(Boolean).join('  ·  ') : label || undefined;
    const hours = hoursForWeekday(a?.openingHours, day?.weekday);
    const description = clean(a?.description) || clean(a?.editorialSummary) || parsed.blurb;
    return {
        index: i + 1,
        time,
        title,
        category: clean(a?.category) || undefined,
        rating: typeof a?.rating === 'number' && a.rating > 0 ? a.rating : undefined,
        totalRatings: typeof a?.totalRatings === 'number' && a.totalRatings > 0 ? a.totalRatings : undefined,
        address: clean(a?.address) || undefined,
        mapsUrl: mapsSearchUrl(title, clean(a?.address) || city),
        hoursToday: hours.text,
        closedToday: hours.closed,
        duration: clamp(clean(a?.duration), 60),
        cost: clamp(clean(a?.cost), 60),
        // Keep cards to a scannable size so they never outgrow a page; full detail is online.
        description: clamp(description, 430),
        highlights: list(a?.highlights, 3),
        tip: clamp(clean(a?.tip), 220),
        mealNearby: clamp(clean(a?.mealNearby), 150),
        accessibility: clamp(clean(a?.accessibilityNote), 150),
        verified: a?.source === 'Google Maps',
        photoUrl: typeof a?.photoUrl === 'string' ? a.photoUrl : null,
        lat: typeof a?.lat === 'number' ? a.lat : undefined,
        lng: typeof a?.lng === 'number' ? a.lng : undefined,
    };
}

function links(v: unknown, max = 6): PdfLink[] {
    if (!Array.isArray(v)) return [];
    return v
        .filter((x: any) => x?.label && isHttpUrl(x?.url))
        .slice(0, max)
        .map((x: any) => ({
            label: clean(x.label),
            url: x.url,
            note: typeof x.rating === 'number' && x.rating > 0 ? `${x.rating.toFixed(1)} / 5` : undefined,
        }));
}

export function buildItineraryPdfModel(input: BuildPdfInput): ItineraryPdfModel {
    const it = input.itinerary || {};
    const meta = input.meta || {};
    const destination = clean(meta.destination) || clean(it.title).split(':')[0] || 'Your trip';
    const city = destination.split(',')[0];
    const transportMode = String(meta.transportation || '').toLowerCase().includes('car')
        ? 'DRIVE'
        : String(meta.transportation || '').toLowerCase().includes('transit')
        ? 'TRANSIT'
        : 'WALK';

    const days: PdfDay[] = (Array.isArray(it.days) ? it.days : []).slice(0, MAX_DAYS).map((rawDay: any, di: number) => {
        // Older trips don't store per-day dates: derive them from the trip start date
        // so each day gets its date and the right weekday's opening hours.
        const derivedDate = !rawDay?.date && meta.startDate ? addDaysIso(meta.startDate, di) : undefined;
        const d = derivedDate
            ? { ...rawDay, date: derivedDate, weekday: rawDay?.weekday || weekdayOf(derivedDate) }
            : rawDay;
        const stops = (Array.isArray(d?.activities) ? d.activities : [])
            .slice(0, MAX_STOPS_PER_DAY)
            .map((a: any, i: number) => buildStop(a, i, d, city));

        // Transit to the next stop + direction links.
        const raw = Array.isArray(d?.activities) ? d.activities : [];
        let totalMin = 0;
        let totalKm = 0;
        stops.forEach((s: PdfStop, i: number) => {
            const next = stops[i + 1];
            if (!next) return;
            const a = raw[i] || {};
            const minutes = typeof a.transitToNextMinutes === 'number' ? a.transitToNextMinutes : undefined;
            const km = typeof a.transitToNextKm === 'number' ? a.transitToNextKm : undefined;
            const mode = a.transitToNextMode || transportMode;
            if (minutes) totalMin += minutes;
            if (km) totalKm += km;
            s.transitNext = { minutes, km, mode, url: directionsUrl(s, next, mode) };
        });

        const dayNo = typeof d?.day === 'number' ? d.day : di + 1;
        return {
            day: dayNo,
            anchor: `day-${dayNo}`,
            weekday: clean(d?.weekday) || undefined,
            dateLabel: formatDate(d?.date, { weekday: 'long', day: 'numeric', month: 'long' }),
            title: clean(d?.theme) || `Day ${dayNo} in ${city}`,
            area: clean(d?.neighborhood) || clean(d?.areaFocus) || undefined,
            summary: clean(d?.neighborhoodDescription) || clean(d?.transitBetweenActivities) || undefined,
            stops,
            totalTransitMinutes: totalMin,
            totalKm: Math.round(totalKm * 10) / 10,
            routeUrl: dayRouteUrl(stops, transportMode),
            eat: links(d?.dayResources?.whereToEat),
            more: links(d?.dayResources?.experiences),
            transportTip: clean(d?.dayResources?.transportTip) || undefined,
        };
    });

    const weatherObj = it?.blackboardState?.weather;
    const weather: PdfWeatherDay[] =
        weatherObj && typeof weatherObj === 'object'
            ? Object.entries(weatherObj)
                  .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
                  .slice(0, 7)
                  .map(([date, w]: [string, any]) => {
                      const hi = typeof w?.temp === 'number' ? Math.round(w.temp) : null;
                      const lo = typeof w?.tempMin === 'number' ? Math.round(w.tempMin) : null;
                      const temps = hi != null ? (lo != null ? `${lo}–${hi}°C` : `${hi}°C`) : '';
                      return { date: formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' }) || date, label: [clean(w?.weather), temps].filter(Boolean).join(' · ') };
                  })
            : [];

    const flights: PdfFlight[] = (input.flights || []).slice(0, 6).map((f: any) => ({
        route: `${clean(f?.from)} → ${clean(f?.to)}`,
        date: formatDate(f?.date, { day: 'numeric', month: 'short' }),
        airline: clean(f?.airline) || undefined,
        duration: clean(f?.duration) || undefined,
        stops: typeof f?.stops === 'number' ? f.stops : undefined,
        price: money(f?.price, f?.currency),
        isEstimate: !!f?.isEstimate,
        url: isHttpUrl(f?.bookingUrl) ? f.bookingUrl : undefined,
        source: clean(f?.source) || undefined,
    }));

    const hotelSrc = (input.hotels && input.hotels.length ? input.hotels : it.hotelInfo) || [];
    const hotels: PdfHotel[] = (Array.isArray(hotelSrc) ? hotelSrc : []).slice(0, 6).map((h: any) => ({
        name: clean(h?.name) || 'Hotel',
        price: `${money(h?.price, h?.currency)} / night`,
        stars: typeof h?.stars === 'number' ? h.stars : undefined,
        roomType: clean(h?.roomType) || undefined,
        isEstimate: !!h?.isEstimate,
        url: isHttpUrl(h?.bookingUrl) ? h.bookingUrl : undefined,
        source: clean(h?.source) || undefined,
    }));

    // Cover: the best-rated stop that has a photo.
    const withPhotos = days.flatMap((d) => d.stops).filter((s) => s.photoUrl);
    const coverStop = [...withPhotos].sort((a, b) => (b.rating ?? 0) * Math.log10(10 + (b.totalRatings ?? 0)) - (a.rating ?? 0) * Math.log10(10 + (a.totalRatings ?? 0)))[0];

    const first = it.days?.[0]?.date;
    const last = it.days?.[it.days.length - 1]?.date;

    return {
        title: clean(it.title) || `${days.length} days in ${city}`,
        destination,
        dateRange: dateRange(meta.startDate || first, meta.endDate || last),
        travellers: clean(meta.companions) || undefined,
        budgetLevel: clean(meta.budget) || undefined,
        pace: clean(meta.pace) || undefined,
        transport: clean(meta.transportation) || undefined,
        overview: clean(it.overview) || undefined,
        bestTime: clean(it.bestTimeToVisit) || undefined,
        whyThisPlan: list(it.whyThisPlan, 5),
        budgetEstimate: clean(it.budgetBreakdown?.totalEstimate) || undefined,
        budgetTips: list(it.budgetTips?.length ? it.budgetTips : it.budgetBreakdown?.savingTips, 6),
        travelTips: list(it.travelTips, 8),
        localCustoms: list(it.localCustoms, 6),
        safetyAdvice: list(it.safetyAdvice, 6),
        crowds: clean(it.realityCheck?.crowds?.description) || undefined,
        physical: clean(it.realityCheck?.physical?.description) || undefined,
        weather,
        days,
        flights,
        hotels,
        esg: it.esgReport ? { grade: clean(it.esgReport.grade) || undefined, co2Kg: Number(it.esgReport.total_co2_kg) || undefined } : undefined,
        coverUrl: coverStop?.photoUrl ?? null,
        totalStops: days.reduce((n, d) => n + d.stops.length, 0),
        generatedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        verifiedAt: formatDate(it.blackboardState?.lastVerifiedAt, { day: 'numeric', month: 'long', year: 'numeric' }),
        tripUrl: input.tripUrl,
        siteUrl: input.siteUrl,
    };
}
