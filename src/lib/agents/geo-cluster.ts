/**
 * Deterministic geographic clustering for the venue Truth Pool.
 *
 * Why: the planner LLM only saw venue *names*, so it could not reliably keep a
 * day inside one area, and ungrounded picks were replaced by any unused venue
 * (often across town). Here we group verified venues by coordinates first,
 * give each day an area, and repair days whose stops are too far apart.
 *
 * Pure functions, no I/O — safe to unit test.
 */

export interface GeoVenue {
    name: string;
    lat?: number;
    lng?: number;
    rating?: number;
    totalRatings?: number;
    types?: string[];
    placeId?: string;
    address?: string;
}

export interface LatLng {
    lat: number;
    lng: number;
}

export interface VenueCluster {
    id: number;
    centroid: LatLng;
    venues: GeoVenue[]; // best first
}

export function haversineKm(a: LatLng, b: LatLng): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}

const hasCoords = (v: GeoVenue): v is GeoVenue & LatLng =>
    typeof v.lat === 'number' && typeof v.lng === 'number' && Number.isFinite(v.lat) && Number.isFinite(v.lng) &&
    !(v.lat === 0 && v.lng === 0);

const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Popularity score used to rank venues and seed clusters deterministically. */
export function venueScore(v: GeoVenue): number {
    const rating = v.rating ?? 0;
    const count = v.totalRatings ?? 0;
    return rating * Math.log10(10 + count);
}

export function centroidOf(points: LatLng[]): LatLng | null {
    if (!points.length) return null;
    return {
        lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
        lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
    };
}

/**
 * Drop venues far from the pool's median centre (search noise such as a
 * same-named place in another city). Venues without coordinates are kept out
 * of clustering but remain usable elsewhere.
 */
export function filterOutliers<T extends GeoVenue>(venues: T[], maxKm = 60): (T & LatLng)[] {
    const located = venues.filter(hasCoords) as (T & LatLng)[];
    if (located.length < 3) return located;
    const center = { lat: median(located.map(v => v.lat)), lng: median(located.map(v => v.lng)) };
    return located.filter(v => haversineKm(center, v) <= maxKm);
}

/**
 * K-means with deterministic farthest-point seeding (starting from the most
 * popular venue), so the same pool always yields the same areas.
 */
export function clusterVenues(venues: GeoVenue[], k: number, iterations = 20): VenueCluster[] {
    const pts = filterOutliers(venues);
    if (!pts.length || k < 1) return [];
    const kk = Math.min(k, pts.length);

    // Seeding: most popular venue, then repeatedly the venue farthest from all seeds.
    const byScore = [...pts].sort((a, b) => venueScore(b) - venueScore(a));
    const seeds: LatLng[] = [{ lat: byScore[0].lat, lng: byScore[0].lng }];
    while (seeds.length < kk) {
        let best = byScore[0];
        let bestDist = -1;
        for (const p of byScore) {
            const d = Math.min(...seeds.map(s => haversineKm(s, p)));
            if (d > bestDist) {
                bestDist = d;
                best = p;
            }
        }
        seeds.push({ lat: best.lat, lng: best.lng });
    }

    let centroids = seeds;
    let assignment = new Array<number>(pts.length).fill(0);
    for (let it = 0; it < iterations; it++) {
        const next = pts.map(p => {
            let bi = 0;
            let bd = Infinity;
            centroids.forEach((c, i) => {
                const d = haversineKm(c, p);
                if (d < bd) {
                    bd = d;
                    bi = i;
                }
            });
            return bi;
        });
        const changed = next.some((a, i) => a !== assignment[i]);
        assignment = next;
        centroids = centroids.map((c, i) => centroidOf(pts.filter((_, j) => assignment[j] === i)) ?? c);
        if (!changed && it > 0) break;
    }

    return centroids
        .map((centroid, id) => ({
            id,
            centroid,
            venues: pts
                .filter((_, j) => assignment[j] === id)
                .sort((a, b) => venueScore(b) - venueScore(a)),
        }))
        .filter(c => c.venues.length > 0);
}

/**
 * Give each trip day an area. Larger areas can host more than one day; areas
 * are visited in a nearest-neighbour order so consecutive days are close.
 */
export function assignClustersToDays(clusters: VenueCluster[], days: number, perDay: number): VenueCluster[] {
    if (!clusters.length || days < 1) return [];

    // Capacity: how many days each area can fill on its own.
    const slots: VenueCluster[] = [];
    const sorted = [...clusters].sort((a, b) => b.venues.length - a.venues.length);
    for (const c of sorted) {
        const capacity = Math.max(1, Math.floor(c.venues.length / Math.max(1, perDay)));
        for (let i = 0; i < capacity; i++) slots.push(c);
    }
    // Not enough distinct capacity → reuse the biggest areas.
    let i = 0;
    while (slots.length < days) slots.push(sorted[i++ % sorted.length]);

    const chosen = slots.slice(0, days);

    // Order days by nearest-neighbour from the first (largest) area.
    const ordered: VenueCluster[] = [chosen[0]];
    const rest = chosen.slice(1);
    while (rest.length) {
        const last = ordered[ordered.length - 1].centroid;
        let bi = 0;
        rest.forEach((c, idx) => {
            if (haversineKm(last, c.centroid) < haversineKm(last, rest[bi].centroid)) bi = idx;
        });
        ordered.push(rest.splice(bi, 1)[0]);
    }
    return ordered;
}

/**
 * Candidate venues for one day: the area's own venues, topped up with the
 * nearest venues from the rest of the pool until there are at least `min`.
 * Small areas (e.g. a district with only 2 verified sights) would otherwise
 * starve the planner and produce thin days.
 */
export function areaCandidates(area: VenueCluster, pool: GeoVenue[], min: number): GeoVenue[] {
    if (area.venues.length >= min) return area.venues;
    const own = new Set(area.venues.map((v) => v.name.toLowerCase()));
    const extra = pool
        .filter((v) => v.name && !own.has(v.name.toLowerCase()) && hasCoords(v))
        .map((v) => ({ v, d: haversineKm(area.centroid, v as LatLng) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, min - area.venues.length)
        .map((x) => x.v);
    return [...area.venues, ...extra];
}

/** Nearest venue to `near` that has not been used yet. */
export function nearestUnused(near: LatLng, pool: GeoVenue[], used: Set<string>): GeoVenue | null {
    let best: GeoVenue | null = null;
    let bestD = Infinity;
    for (const v of pool) {
        if (!v.name || used.has(v.name.toLowerCase()) || !hasCoords(v)) continue;
        const d = haversineKm(near, v);
        if (d < bestD) {
            bestD = d;
            best = v;
        }
    }
    return best;
}

/** Max distance (km) of a day's stops from that day's centre. */
export function daySpreadKm(points: LatLng[]): number {
    const c = centroidOf(points);
    if (!c) return 0;
    return Math.max(0, ...points.map(p => haversineKm(c, p)));
}

/** How far a single day's stops may stray from its centre before we repair it. */
export function maxSpreadForTransport(transport: string | undefined): number {
    if (transport === 'rental') return 25;
    if (transport === 'walking') return 2.5;
    return 6; // public transport
}

export interface DayRepairResult {
    activities: string[];
    replaced: Array<{ from: string; to: string; km: number }>;
    spreadBeforeKm: number;
    spreadAfterKm: number;
}

/**
 * Single-day repair: replace stops that sit too far from the day's centre with
 * the nearest unused verified venue. Uses the day's own median position (robust
 * to the outlier) or the assigned area centre when the day has <2 located stops.
 */
export function repairDay(params: {
    activities: string[];
    lookup: (name: string) => GeoVenue | undefined;
    pool: GeoVenue[];
    used: Set<string>;
    maxKm: number;
    areaCentre?: LatLng | null;
}): DayRepairResult {
    const { activities, lookup, pool, used, maxKm, areaCentre } = params;
    const located = activities
        .map(name => ({ name, v: lookup(name) }))
        .filter((x): x is { name: string; v: GeoVenue & LatLng } => !!x.v && hasCoords(x.v));

    const centre: LatLng | null =
        located.length >= 2
            ? { lat: median(located.map(x => x.v.lat)), lng: median(located.map(x => x.v.lng)) }
            : areaCentre ?? null;

    const spreadBeforeKm = daySpreadKm(located.map(x => x.v));
    if (!centre) return { activities, replaced: [], spreadBeforeKm, spreadAfterKm: spreadBeforeKm };

    const replaced: DayRepairResult['replaced'] = [];
    const out = activities.map(name => {
        const v = lookup(name);
        if (!v || !hasCoords(v)) return name;
        const km = haversineKm(centre, v);
        if (km <= maxKm) return name;
        const sub = nearestUnused(centre, pool, used);
        if (!sub || !hasCoords(sub) || haversineKm(centre, sub) >= km) return name;
        used.add(sub.name.toLowerCase());
        replaced.push({ from: name, to: sub.name, km: Math.round(km * 10) / 10 });
        return sub.name;
    });

    const after = out.map(n => lookup(n)).filter((v): v is GeoVenue & LatLng => !!v && hasCoords(v));
    return { activities: out, replaced, spreadBeforeKm, spreadAfterKm: daySpreadKm(after) };
}
