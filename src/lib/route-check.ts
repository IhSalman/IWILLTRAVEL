/**
 * Sanity-checks a published route (origin → destination for a callsign) against where the
 * aircraft actually is. adsbdb routes are the airline's *usual* schedule for a callsign, so on
 * any given day they can be wrong (re-used callsigns, charters, positioning flights).
 *
 * Pure function: used by the map in the browser and by tests.
 */
import { bearingDeg, distanceNm, headingDiff } from '@/components/flights/geo';

export type RouteConfidence = 'confirmed' | 'likely' | 'unverified';

export interface RouteCheckInput {
    origin: { lat: number; lon: number };
    destination: { lat: number; lon: number };
    aircraft: { lat: number; lon: number; track: number | null; ground: boolean };
}

export interface RouteCheck {
    confidence: RouteConfidence;
    reason: string;
}

/** Near an airport, aircraft circle, climb out and fly approach patterns, so heading says little. */
const DEPARTURE_ZONE_NM = 40;
const ARRIVAL_ZONE_NM = 60;

export function checkRoute({ origin, destination, aircraft }: RouteCheckInput): RouteCheck {
    const total = distanceNm(origin.lat, origin.lon, destination.lat, destination.lon);
    const fromOrigin = distanceNm(origin.lat, origin.lon, aircraft.lat, aircraft.lon);
    const toDest = distanceNm(aircraft.lat, aircraft.lon, destination.lat, destination.lon);

    if (total < 5) return { confidence: 'unverified', reason: 'Origin and destination are the same place' };

    if (aircraft.ground) {
        if (fromOrigin < 5) return { confidence: 'likely', reason: 'On the ground at the departure airport' };
        if (toDest < 5) return { confidence: 'confirmed', reason: 'On the ground at the destination airport' };
        return { confidence: 'unverified', reason: 'On the ground away from both airports on this route' };
    }

    // How far off the direct path the aircraft is: 1.0 = exactly on the great circle.
    const detour = (fromOrigin + toDest) / total;
    // Short hops have proportionally bigger departure/arrival detours.
    const slack = total < 300 ? 0.15 : 0;

    const nearEnds = fromOrigin < DEPARTURE_ZONE_NM || toDest < ARRIVAL_ZONE_NM;
    let headingOff: number | null = null;
    if (aircraft.track !== null && !nearEnds) {
        headingOff = headingDiff(aircraft.track, bearingDeg(aircraft.lat, aircraft.lon, destination.lat, destination.lon));
    }

    if (detour <= 1.1 + slack && (headingOff === null || headingOff <= 45)) {
        return { confidence: 'confirmed', reason: 'Aircraft is on the expected path and heading to the destination' };
    }
    if (detour <= 1.35 + slack && (headingOff === null || headingOff <= 100)) {
        return { confidence: 'likely', reason: 'Aircraft is near the expected path' };
    }
    if (headingOff !== null && headingOff > 100) {
        return { confidence: 'unverified', reason: 'Aircraft is heading away from the scheduled destination' };
    }
    return { confidence: 'unverified', reason: 'Aircraft is far from the scheduled route' };
}
