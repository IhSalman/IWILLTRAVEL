/**
 * Quality metrics for a generated itinerary — the thesis evaluation turned into
 * something we can run repeatedly to catch regressions after prompt/model changes.
 * Pure function: no I/O.
 */
import type { FinalItinerary } from '@/app/api/agent-itinerary/types';
import { getVenueHoursForWeekday } from '@/lib/agents/temporal-scheduler';
import { daySpreadKm, type LatLng } from '@/lib/agents/geo-cluster';

export interface ItineraryMetrics {
    daysRequested: number;
    daysGenerated: number;
    stops: number;
    /** Stops whose name is in the verified venue pool (Truth Pool). */
    groundingRate: number;
    /** Stops with live Google place details attached. */
    verifiedDetailsRate: number;
    /** Stops with known opening hours. */
    hoursKnownRate: number;
    /** Stops scheduled on a weekday the venue is closed (should be 0). */
    closedConflicts: number;
    avgDaySpreadKm: number;
    maxDaySpreadKm: number;
    avgTransitMinutes: number | null;
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function computeItineraryMetrics(itinerary: FinalItinerary, daysRequested: number): ItineraryMetrics {
    const days = Array.isArray(itinerary?.days) ? itinerary.days : [];
    const pool = new Set(
        (itinerary?.blackboardState?.truthPool || [])
            .map((v: any) => String(v?.name || '').toLowerCase().trim())
            .filter(Boolean)
    );

    let stops = 0;
    let grounded = 0;
    let verified = 0;
    let hoursKnown = 0;
    let closedConflicts = 0;
    const spreads: number[] = [];
    const transits: number[] = [];

    for (const day of days) {
        const acts = Array.isArray(day.activities) ? day.activities : [];
        const located: LatLng[] = [];
        for (const a of acts) {
            stops++;
            const name = String(a.title || '').toLowerCase().trim();
            if (pool.size === 0 || pool.has(name)) grounded++;
            if (a.source === 'Google Maps') verified++;
            if (Array.isArray(a.openingHours) && a.openingHours.length > 0) {
                hoursKnown++;
                if (day.weekday && getVenueHoursForWeekday(a.openingHours, day.weekday)?.isClosed) closedConflicts++;
            }
            if (typeof a.lat === 'number' && typeof a.lng === 'number') located.push({ lat: a.lat, lng: a.lng });
            if (typeof a.transitToNextMinutes === 'number') transits.push(a.transitToNextMinutes);
        }
        if (located.length >= 2) spreads.push(daySpreadKm(located));
    }

    const rate = (n: number) => (stops ? round(n / stops, 3) : 0);
    return {
        daysRequested,
        daysGenerated: days.length,
        stops,
        groundingRate: rate(grounded),
        verifiedDetailsRate: rate(verified),
        hoursKnownRate: rate(hoursKnown),
        closedConflicts,
        avgDaySpreadKm: spreads.length ? round(spreads.reduce((s, x) => s + x, 0) / spreads.length) : 0,
        maxDaySpreadKm: spreads.length ? round(Math.max(...spreads)) : 0,
        avgTransitMinutes: transits.length ? round(transits.reduce((s, x) => s + x, 0) / transits.length, 1) : null,
    };
}
