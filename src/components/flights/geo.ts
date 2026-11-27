/** Small geodesy helpers for the live flight map (nautical miles, degrees). */

const R_NM = 3440.065;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial great-circle bearing from point 1 to point 2, degrees 0–360. */
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = toRad(lat1), φ2 = toRad(lat2), Δλ = toRad(lon2 - lon1);
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest absolute difference between two headings, 0–180. */
export function headingDiff(a: number, b: number): number {
    const d = Math.abs(((a - b) % 360 + 360) % 360);
    return d > 180 ? 360 - d : d;
}

/** Point reached after travelling `distNm` from (lat, lon) on initial bearing `bearingDeg`. */
export function destinationPoint(lat: number, lon: number, bearingDeg: number, distNm: number): [number, number] {
    const δ = distNm / R_NM;
    const θ = toRad(bearingDeg);
    const φ1 = toRad(lat);
    const λ1 = toRad(lon);
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
    return [toDeg(φ2), ((toDeg(λ2) + 540) % 360) - 180];
}

/**
 * Great-circle path between two points as [lon, lat] pairs. Longitudes are
 * "unwrapped" (may exceed ±180) so lines crossing the antimeridian draw continuously.
 */
export function greatCircle(lat1: number, lon1: number, lat2: number, lon2: number, steps = 64): [number, number][] {
    const φ1 = toRad(lat1), λ1 = toRad(lon1), φ2 = toRad(lat2), λ2 = toRad(lon2);
    const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
    if (!Number.isFinite(d) || d < 1e-9) return [[lon1, lat1], [lon2, lat2]];

    const pts: [number, number][] = [];
    let prevLon = lon1;
    for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);
        const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
        const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
        const z = A * Math.sin(φ1) + B * Math.sin(φ2);
        let lon = toDeg(Math.atan2(y, x));
        const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
        while (lon - prevLon > 180) lon -= 360;
        while (lon - prevLon < -180) lon += 360;
        prevLon = lon;
        pts.push([lon, lat]);
    }
    return pts;
}

/** Circle polygon ring of `radiusNm` around a point, as [lon, lat] pairs. */
export function circleRing(lat: number, lon: number, radiusNm: number, steps = 96): [number, number][] {
    const ring: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
        const [la, lo] = destinationPoint(lat, lon, (i / steps) * 360, radiusNm);
        ring.push([lo, la]);
    }
    return ring;
}
