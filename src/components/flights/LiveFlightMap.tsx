'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GeoJSONSource, Map as MLMap, MapMouseEvent } from 'maplibre-gl';
import { cn } from '@/lib/utils';
import { Search, X, Plane, Loader2, LocateFixed, Sparkles, Globe2 } from 'lucide-react';
import { circleRing, destinationPoint, distanceNm, greatCircle } from './geo';
import { checkRoute, type RouteCheck } from '@/lib/route-check';
import { exactFamily, searchFamilies, type AircraftFamily } from '@/lib/aircraft-types';
import { AirportPanel, FlightPanel, aircraftLabel, fmt } from './FlightPanels';
import {
    STALE_DROP_S, STALE_FADE_S,
    type Aircraft, type Airport, type AirportLive, type FlightDetails, type Selection, type TrackedAircraft,
} from './types';

// ── Constants ────────────────────────────────────────────────────────────────

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const FONT = ['Noto Sans Regular'];
const MAX_RADIUS_NM = 250;
const POLL_MS = 10_000;
const MODEL_POLL_MS = 30_000;
const TICK_MS = 1_000;
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

const ALT_STOPS: [number, string][] = [
    [0, '#5eead4'],
    [8000, '#a3e635'],
    [20000, '#f3b87f'],
    [32000, '#e8853a'],
    [42000, '#f472b6'],
];
const GROUND_COLOR = '#8a8f98';

/** Model filter: one aircraft family, or the curated "rare planes" set. */
type ModelFilter = { kind: 'family'; family: AircraftFamily } | { kind: 'rare' };
const modelLabel = (m: ModelFilter) => (m.kind === 'rare' ? 'Rare planes' : m.family.name);

// Plane silhouette pointing north, drawn once into an SDF image so the map can tint it by altitude.
function planeImage(size = 48): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.scale(size / 38, size / 38);
    ctx.fillStyle = '#fff';
    ctx.fill(new Path2D('M 15 0 L -4 -2.2 L -9 -14 L -12.5 -14 L -9 -2.2 L -15 -1.8 L -17.5 -6.5 L -19.5 -6.5 L -18 0 L -19.5 6.5 L -17.5 6.5 L -15 1.8 L -9 2.2 L -12.5 14 L -9 14 L -4 2.2 Z'));
    return ctx.getImageData(0, 0, size, size);
}

/** Dead-reckon a position forward from its report time using ground speed and track (max 30 s). */
function extrapolate(ac: TrackedAircraft, now: number): [number, number] {
    const seconds = (now - ac.posAt) / 1000;
    if (ac.ground || !ac.speed || ac.track === null || seconds <= 0) return [ac.lat, ac.lon];
    return destinationPoint(ac.lat, ac.lon, ac.track, (ac.speed * Math.min(seconds, 30)) / 3600);
}

const wrapLon = (lon: number) => ((lon + 540) % 360) - 180;

function snapQuery(lat: number, lon: number, radius: number) {
    const step = radius > 120 ? 0.5 : radius > 40 ? 0.1 : 0.02;
    const sLat = Math.round(lat / step) * step;
    const sLon = Math.round(wrapLon(lon) / step) * step;
    const r = Math.min(MAX_RADIUS_NM, Math.max(25, Math.ceil((radius + step * 60) / 25) * 25));
    return { lat: +sLat.toFixed(3), lon: +sLon.toFixed(3), r };
}

/**
 * Upstream queries are circles of at most 250 nm. A small view needs one circle around the
 * centre; a wide view is split into 2×2 quadrants so more of the screen gets live traffic.
 */
function viewportQueries(map: MLMap) {
    const c = map.getCenter();
    const b = map.getBounds();
    const ne = b.getNorthEast();
    const needed = distanceNm(c.lat, c.lng, ne.lat, ne.lng);
    if (needed <= MAX_RADIUS_NM) return { queries: [snapQuery(c.lat, c.lng, needed)], partial: false };

    const sw = b.getSouthWest();
    const south = Math.max(-80, sw.lat), north = Math.min(80, ne.lat);
    const west = sw.lng, east = Math.min(ne.lng, sw.lng + 360);
    const midLat = (south + north) / 2, midLon = (west + east) / 2;
    const queries = [];
    let partial = false;
    for (const [la0, la1] of [[south, midLat], [midLat, north]]) {
        for (const [lo0, lo1] of [[west, midLon], [midLon, east]]) {
            const qLat = (la0 + la1) / 2, qLon = (lo0 + lo1) / 2;
            const r = distanceNm(qLat, qLon, la1, lo1);
            if (r > MAX_RADIUS_NM) partial = true;
            queries.push(snapQuery(qLat, qLon, r));
        }
    }
    return { queries, partial };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LiveFlightMap({ renderFlightActions, renderAirportActions }: {
    /** Optional extra buttons for the flight panel (e.g. "Get delay alerts"). */
    renderFlightActions?: (live: Aircraft | null, details: FlightDetails | null) => ReactNode;
    /** Optional extra buttons for the airport panel (e.g. "Aircraft alert"). */
    renderAirportActions?: (airport: Airport) => ReactNode;
} = {}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MLMap | null>(null);
    const aircraftRef = useRef<TrackedAircraft[]>([]);
    const selectedRef = useRef<Selection>(null);
    const detailsRef = useRef<FlightDetails | null>(null);
    const followRef = useRef(false);
    const airportsRef = useRef<Airport[]>([]);
    const modelRef = useRef<ModelFilter | null>(null);
    const trailRef = useRef<{ hex: string; coords: [number, number][] }>({ hex: '', coords: [] });
    const routeCheckRef = useRef<RouteCheck | null>(null);
    const fetchSeq = useRef(0);
    const lastFetchRef = useRef(0);

    const [ready, setReady] = useState(false);
    const [count, setCount] = useState(0);
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [partial, setPartial] = useState(false);
    const [airports, setAirports] = useState<Airport[]>([]);
    const [model, setModel] = useState<ModelFilter | null>(null);

    const [selection, setSelection] = useState<Selection>(null);
    const [selectedLive, setSelectedLive] = useState<TrackedAircraft | null>(null);
    const [details, setDetails] = useState<FlightDetails | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [routeCheck, setRouteCheck] = useState<RouteCheck | null>(null);
    const [airportLive, setAirportLive] = useState<AirportLive | null>(null);
    const [airportLoading, setAirportLoading] = useState(false);
    const [follow, setFollow] = useState(false);

    const [query, setQuery] = useState('');
    const [flightResults, setFlightResults] = useState<Aircraft[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    selectedRef.current = selection;
    detailsRef.current = details;
    followRef.current = follow;
    modelRef.current = model;

    // ── Render live layers (called every tick) ──────────────────────────────
    const render = useCallback(() => {
        const map = mapRef.current;
        if (!map || !map.getSource('aircraft')) return;
        const t = Date.now();
        const sel = selectedRef.current;
        const selHex = sel?.kind === 'flight' ? sel.hex : null;

        let selPos: [number, number] | null = null;
        let selAc: TrackedAircraft | null = null;
        const features: GeoJSON.Feature[] = [];
        for (const ac of aircraftRef.current) {
            const age = (t - ac.posAt) / 1000;
            if (age > STALE_DROP_S && ac.hex !== selHex) continue;
            const [lat, lon] = extrapolate(ac, t);
            if (ac.hex === selHex) { selPos = [lat, lon]; selAc = ac; }
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lon, lat] },
                properties: {
                    hex: ac.hex,
                    label: aircraftLabel(ac),
                    alt: ac.alt ?? 0,
                    ground: ac.ground,
                    track: ac.track ?? 0,
                    sel: ac.hex === selHex ? 1 : 0,
                    alert: ac.emergency ? 1 : 0,
                    stale: age > STALE_FADE_S ? 1 : 0,
                },
            });
        }
        (map.getSource('aircraft') as GeoJSONSource).setData({ type: 'FeatureCollection', features });

        // Route check against the live position; only a plausible route is drawn as a line.
        const route = detailsRef.current?.route;
        let check: RouteCheck | null = null;
        if (route && selAc && selPos) {
            const [pLat, pLon] = selPos as [number, number];
            check = checkRoute({ origin: route.origin, destination: route.destination, aircraft: { lat: pLat, lon: pLon, track: (selAc as TrackedAircraft).track, ground: (selAc as TrackedAircraft).ground } });
        }
        if (check?.confidence !== routeCheckRef.current?.confidence || check?.reason !== routeCheckRef.current?.reason) {
            routeCheckRef.current = check;
            setRouteCheck(check);
        }

        const routeSrc = map.getSource('route') as GeoJSONSource | undefined;
        if (routeSrc) {
            if (selHex && route && selPos && check && check.confidence !== 'unverified') {
                const [pLat, pLon] = selPos as [number, number];
                const flown = greatCircle(route.origin.lat, route.origin.lon, pLat, pLon);
                const ahead = greatCircle(pLat, pLon, route.destination.lat, route.destination.lon);
                // Keep the "ahead" segment continuous with wherever "flown" ended up after unwrapping.
                const shift = flown[flown.length - 1][0] - ahead[0][0];
                routeSrc.setData({
                    type: 'FeatureCollection',
                    features: [
                        { type: 'Feature', properties: { part: 'flown' }, geometry: { type: 'LineString', coordinates: flown } },
                        { type: 'Feature', properties: { part: 'ahead' }, geometry: { type: 'LineString', coordinates: ahead.map(([x, y]) => [x + shift, y]) } },
                        { type: 'Feature', properties: { part: 'end', label: route.origin.iata ?? route.origin.icao ?? '' }, geometry: { type: 'Point', coordinates: [route.origin.lon, route.origin.lat] } },
                        { type: 'Feature', properties: { part: 'end', label: route.destination.iata ?? route.destination.icao ?? '' }, geometry: { type: 'Point', coordinates: [route.destination.lon, route.destination.lat] } },
                    ],
                });
            } else {
                routeSrc.setData(EMPTY_FC);
            }
        }

        // Trail of reported positions since the flight was selected, joined to the live position.
        const trailSrc = map.getSource('trail') as GeoJSONSource | undefined;
        if (trailSrc) {
            const trail = trailRef.current;
            if (selHex && trail.hex === selHex && selPos && trail.coords.length > 0) {
                const [pLat, pLon] = selPos as [number, number];
                trailSrc.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [...trail.coords, [pLon, pLat]] } } as GeoJSON.Feature);
            } else {
                trailSrc.setData(EMPTY_FC);
            }
        }

        if (selPos && followRef.current) {
            const [lat, lon] = selPos as [number, number];
            map.easeTo({ center: [lon, lat], duration: 900, easing: x => x });
        }
    }, []);

    // ── Fetch live aircraft (viewport, or worldwide for a model filter) ──────
    const fetchLive = useCallback(async () => {
        const map = mapRef.current;
        if (!map || document.hidden) return;
        const seq = ++fetchSeq.current;
        lastFetchRef.current = Date.now();
        const filter = modelRef.current;
        const cov = map.getSource('coverage') as GeoJSONSource | undefined;

        setLoading(true);
        try {
            let fresh: Aircraft[];
            if (filter) {
                const url = filter.kind === 'rare' ? '/api/flights/by-type?rare=1' : `/api/flights/by-type?family=${filter.family.id}`;
                const res = await fetch(url);
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Aircraft search unavailable');
                fresh = json.aircraft;
                setPartial(false);
                cov?.setData(EMPTY_FC);
            } else {
                const { queries, partial: isPartial } = viewportQueries(map);
                setPartial(isPartial);
                cov?.setData(isPartial
                    ? { type: 'FeatureCollection', features: queries.map(q => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circleRing(q.lat, q.lon, q.r)] } })) } as GeoJSON.FeatureCollection
                    : EMPTY_FC);
                const results = await Promise.allSettled(queries.map(async q => {
                    const res = await fetch(`/api/flights/live?lat=${q.lat}&lon=${q.lon}&r=${q.r}`);
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || 'Live data unavailable');
                    return json.aircraft as Aircraft[];
                }));
                const ok = results.filter((r): r is PromiseFulfilledResult<Aircraft[]> => r.status === 'fulfilled');
                if (ok.length === 0) throw new Error('Live data unavailable');
                const byHex = new Map<string, Aircraft>();
                for (const r of ok) for (const ac of r.value) byHex.set(ac.hex, ac);
                fresh = Array.from(byHex.values());
            }
            if (seq !== fetchSeq.current) return; // a newer fetch (e.g. filter change) already landed

            // Keep tracking the selected flight even after it leaves the query area.
            const sel = selectedRef.current;
            if (sel?.kind === 'flight' && !fresh.some(a => a.hex === sel.hex)) {
                const r2 = await fetch(`/api/flights/search?q=${sel.hex}`).then(r => r.json()).catch(() => null);
                const found: Aircraft | undefined = r2?.aircraft?.find((a: Aircraft) => a.hex === sel.hex);
                if (found) fresh = [...fresh, found];
            }

            const t = Date.now();
            const next = new Map<string, TrackedAircraft>();
            for (const ac of fresh) next.set(ac.hex, { ...ac, posAt: t - (ac.seenPos ?? 0) * 1000 });
            // Aircraft that briefly drop out of a response stay (faded) until STALE_DROP_S.
            if (!filter) {
                for (const prev of aircraftRef.current) {
                    if (!next.has(prev.hex) && t - prev.posAt < STALE_DROP_S * 1000) next.set(prev.hex, prev);
                }
            }
            aircraftRef.current = Array.from(next.values());

            if (sel?.kind === 'flight') {
                const ac = next.get(sel.hex) ?? null;
                setSelectedLive(ac);
                const trail = trailRef.current;
                if (ac && trail.hex === sel.hex) {
                    const last = trail.coords[trail.coords.length - 1];
                    if (!last || last[0] !== ac.lon || last[1] !== ac.lat) trail.coords.push([ac.lon, ac.lat]);
                    if (trail.coords.length > 2000) trail.coords.splice(0, trail.coords.length - 2000);
                }
            }

            setCount(fresh.length);
            setUpdatedAt(t);
            setError(null);
            render();
        } catch (e) {
            if (seq === fetchSeq.current) setError(e instanceof Error ? e.message : 'Live data unavailable');
        } finally {
            if (seq === fetchSeq.current) setLoading(false);
        }
    }, [render]);

    // ── URL helpers ──────────────────────────────────────────────────────────
    const setUrlParam = (key: 'flight' | 'airport' | 'model', value: string | null) => {
        const url = new URL(window.location.href);
        if (key !== 'model') { url.searchParams.delete('flight'); url.searchParams.delete('airport'); }
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
        window.history.replaceState(null, '', url);
    };

    // ── Selection ────────────────────────────────────────────────────────────
    const selectFlight = useCallback((hex: string, extra?: Aircraft) => {
        if (extra && !aircraftRef.current.some(a => a.hex === hex)) {
            aircraftRef.current = [...aircraftRef.current, { ...extra, posAt: Date.now() - (extra.seenPos ?? 0) * 1000 }];
        }
        const ac = aircraftRef.current.find(a => a.hex === hex) ?? null;
        const sel: Selection = { kind: 'flight', hex };
        selectedRef.current = sel;
        trailRef.current = { hex, coords: ac ? [[ac.lon, ac.lat]] : [] };
        routeCheckRef.current = null;
        setRouteCheck(null);
        setSelection(sel);
        setSelectedLive(ac);
        setDetails(null);
        detailsRef.current = null;
        setAirportLive(null);
        setUrlParam('flight', ac?.flightNo ?? ac?.callsign ?? hex);
        render();

        const qs = new URLSearchParams({ hex });
        if (ac?.callsign) qs.set('callsign', ac.callsign);
        setDetailsLoading(true);
        fetch(`/api/flights/details?${qs}`)
            .then(r => r.json())
            .then((d: FlightDetails) => {
                if (selectedRef.current?.kind !== 'flight' || selectedRef.current.hex !== hex) return;
                detailsRef.current = d;
                setDetails(d);
                render();
            })
            .catch(() => {})
            .finally(() => setDetailsLoading(false));
    }, [render]);

    const loadAirportLive = useCallback((airport: Airport) =>
        fetch(`/api/flights/airport?icao=${encodeURIComponent(airport.icao || airport.iata)}&lat=${airport.lat}&lon=${airport.lon}`)
            .then(r => r.json())
            .then((d: AirportLive) => {
                const cur = selectedRef.current;
                if (cur?.kind === 'airport' && cur.airport.iata === airport.iata) setAirportLive(d);
            })
            .catch(() => {}), []);

    const selectAirport = useCallback((airport: Airport, fly: boolean) => {
        const sel: Selection = { kind: 'airport', airport };
        selectedRef.current = sel;
        setSelection(sel);
        setFollow(false);
        setDetails(null);
        detailsRef.current = null;
        setSelectedLive(null);
        setAirportLive(null);
        setUrlParam('airport', airport.iata);
        render();
        if (fly) mapRef.current?.flyTo({ center: [airport.lon, airport.lat], zoom: 8.5, duration: 1600 });

        setAirportLoading(true);
        loadAirportLive(airport).finally(() => setAirportLoading(false));
    }, [render, loadAirportLive]);

    const clearSelection = useCallback(() => {
        selectedRef.current = null;
        detailsRef.current = null;
        trailRef.current = { hex: '', coords: [] };
        setSelection(null);
        setSelectedLive(null);
        setDetails(null);
        setAirportLive(null);
        setFollow(false);
        setUrlParam('flight', null);
        render();
    }, [render]);

    // ── Model filter ─────────────────────────────────────────────────────────
    const applyModel = useCallback((m: ModelFilter | null) => {
        modelRef.current = m;
        setModel(m);
        aircraftRef.current = [];
        setCount(0);
        setUrlParam('model', m ? (m.kind === 'rare' ? 'rare' : m.family.id) : null);
        render();
        if (m) mapRef.current?.flyTo({ center: [10, 25], zoom: 1.6, duration: 1400 });
        void fetchLive();
    }, [fetchLive, render]);

    // ── Map setup ────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        let tick: ReturnType<typeof setInterval> | undefined;
        let poll: ReturnType<typeof setInterval> | undefined;
        let moveTimer: ReturnType<typeof setTimeout> | undefined;

        (async () => {
            const maplibregl = await import('maplibre-gl');
            if (cancelled || !containerRef.current) return;
            maplibregl.setWorkerUrl('/vendor/maplibre-gl-worker.mjs');

            const params = new URLSearchParams(window.location.search);
            const map = new maplibregl.Map({
                container: containerRef.current,
                style: MAP_STYLE,
                center: [-0.45, 51.47],
                zoom: 6,
                minZoom: 1.2,
                maxZoom: 15,
                attributionControl: false,
            });
            mapRef.current = map;
            map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');
            map.addControl(new maplibregl.AttributionControl({
                compact: true,
                customAttribution: 'Flights © <a href="https://adsb.lol" target="_blank" rel="noopener">adsb.lol</a> (ODbL) · Routes <a href="https://www.adsbdb.com" target="_blank" rel="noopener">adsbdb</a> · Photos <a href="https://www.planespotters.net" target="_blank" rel="noopener">Planespotters.net</a> · Airports <a href="https://ourairports.com" target="_blank" rel="noopener">OurAirports</a> · Weather NOAA AWC',
            }), 'bottom-left');

            // 'style.load' fires as soon as the style is parsed, so live layers appear while basemap tiles stream in.
            map.once('style.load', async () => {
                if (cancelled) return;
                map.addImage('plane', planeImage(), { sdf: true, pixelRatio: 2 });

                map.addSource('coverage', { type: 'geojson', data: EMPTY_FC });
                map.addLayer({ id: 'coverage-line', type: 'line', source: 'coverage', paint: { 'line-color': '#f3b87f', 'line-opacity': 0.3, 'line-width': 1, 'line-dasharray': [2, 3] } });

                map.addSource('airports', { type: 'geojson', data: EMPTY_FC });
                map.addLayer({
                    id: 'airports-dots', type: 'circle', source: 'airports',
                    // Hidden at world zoom so aircraft stay visible (1,100+ large airports would cover the map).
                    minzoom: 3,
                    filter: ['any', ['==', ['get', 'size'], 1], ['>=', ['zoom'], 5]],
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, ['match', ['get', 'size'], 1, 2.2, 1.4], 8, ['match', ['get', 'size'], 1, 5, 3.5]],
                        'circle-color': '#0b0c0f',
                        'circle-stroke-color': ['match', ['get', 'size'], 1, '#f3b87f', '#a8a29e'],
                        'circle-stroke-width': 1.4,
                    },
                });
                map.addLayer({
                    id: 'airports-labels', type: 'symbol', source: 'airports',
                    minzoom: 3.5,
                    filter: ['any', ['==', ['get', 'size'], 1], ['>=', ['zoom'], 7]],
                    layout: {
                        'text-field': ['get', 'iata'], 'text-font': FONT, 'text-size': 11,
                        'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-letter-spacing': 0.08,
                    },
                    paint: { 'text-color': '#d6d3d1', 'text-halo-color': '#0b0c0f', 'text-halo-width': 1.2 },
                });

                map.addSource('route', { type: 'geojson', data: EMPTY_FC });
                map.addLayer({ id: 'route-flown', type: 'line', source: 'route', filter: ['==', ['get', 'part'], 'flown'], layout: { 'line-cap': 'round' }, paint: { 'line-color': '#f3b87f', 'line-width': 1.4, 'line-opacity': 0.35 } });
                map.addLayer({ id: 'route-ahead', type: 'line', source: 'route', filter: ['==', ['get', 'part'], 'ahead'], paint: { 'line-color': '#f3b87f', 'line-width': 1.6, 'line-opacity': 0.6, 'line-dasharray': [2, 2] } });
                map.addLayer({
                    id: 'route-ends', type: 'symbol', source: 'route', filter: ['==', ['get', 'part'], 'end'],
                    layout: { 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 13, 'text-offset': [0, -1.2], 'text-allow-overlap': true },
                    paint: { 'text-color': '#fef6ee', 'text-halo-color': '#0b0c0f', 'text-halo-width': 1.5 },
                });

                // Actual path flown since selection (solid), drawn over the faint scheduled great circle.
                map.addSource('trail', { type: 'geojson', data: EMPTY_FC });
                map.addLayer({ id: 'trail', type: 'line', source: 'trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fef6ee', 'line-width': 2.2, 'line-opacity': 0.85 } });

                map.addSource('aircraft', { type: 'geojson', data: EMPTY_FC });
                map.addLayer({
                    id: 'aircraft', type: 'symbol', source: 'aircraft',
                    layout: {
                        'icon-image': 'plane',
                        'icon-rotate': ['get', 'track'],
                        'icon-rotation-alignment': 'map',
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true,
                        'icon-size': ['interpolate', ['linear'], ['zoom'], 1.5, 0.6, 4, 0.65, 6, 0.75, 10, 1.05, 14, 1.3],
                        'symbol-sort-key': ['+', ['get', 'sel'], ['/', ['get', 'alt'], 100000]],
                        'text-field': ['step', ['zoom'], '', 8, ['get', 'label']],
                        'text-font': FONT,
                        'text-size': 10,
                        'text-offset': [0, 1.5],
                        'text-anchor': 'top',
                        'text-optional': true,
                    },
                    paint: {
                        'icon-color': ['case',
                            ['==', ['get', 'alert'], 1], '#f43f5e',
                            ['get', 'ground'], GROUND_COLOR,
                            ['interpolate', ['linear'], ['get', 'alt'], ...ALT_STOPS.flat()],
                        ],
                        'icon-opacity': ['case', ['==', ['get', 'stale'], 1], 0.35, 1],
                        'icon-halo-color': ['case', ['==', ['get', 'sel'], 1], '#ffffff', 'rgba(11,12,15,0.85)'],
                        'icon-halo-width': ['case', ['==', ['get', 'sel'], 1], 2.5, 1],
                        'text-color': '#e7e5e4',
                        'text-opacity': ['case', ['==', ['get', 'stale'], 1], 0.4, 1],
                        'text-halo-color': '#0b0c0f',
                        'text-halo-width': 1.2,
                    },
                });

                const clickable = ['aircraft', 'airports-dots'];
                for (const id of clickable) {
                    map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
                    map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
                }
                map.on('click', (e: MapMouseEvent) => {
                    const pad = 6;
                    const hits = map.queryRenderedFeatures(
                        [[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]],
                        { layers: clickable },
                    );
                    const plane = hits.find(f => f.layer.id === 'aircraft');
                    if (plane) { selectFlight(String(plane.properties.hex)); return; }
                    const ap = hits.find(f => f.layer.id === 'airports-dots');
                    if (ap) {
                        const found = airportsRef.current.find(a => a.iata === ap.properties.iata);
                        if (found) selectAirport(found, false);
                        return;
                    }
                    clearSelection();
                });
                map.on('dragstart', () => setFollow(false));
                map.on('moveend', () => {
                    if (modelRef.current) return; // worldwide model results don't depend on the viewport
                    clearTimeout(moveTimer);
                    moveTimer = setTimeout(fetchLive, 350);
                });

                setReady(true);

                // Airports (static, ~250 KB, cached by the browser).
                try {
                    const rows: [string, string, string, string, string, number, number, 1 | 2][] = await fetch('/data/airports.json').then(r => r.json());
                    const list: Airport[] = rows.map(([iata, icao, name, city, country, lat, lon, size]) => ({ iata, icao, name, city, country, lat, lon, size }));
                    airportsRef.current = list;
                    setAirports(list);
                    (map.getSource('airports') as GeoJSONSource).setData({
                        type: 'FeatureCollection',
                        features: list.map(a => ({
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
                            properties: { iata: a.iata, size: a.size },
                        })),
                    });

                    // Deep links: ?airport=LHR, ?flight=BA123, ?model=a380 | rare
                    const apParam = params.get('airport')?.toUpperCase();
                    const ap = apParam ? list.find(a => a.iata === apParam || a.icao === apParam) : undefined;
                    if (ap) selectAirport(ap, true);
                } catch { /* airports are optional */ }

                const modelParam = params.get('model');
                const fam = modelParam && modelParam !== 'rare' ? exactFamily(modelParam) : null;
                if (modelParam === 'rare') applyModel({ kind: 'rare' });
                else if (fam) applyModel({ kind: 'family', family: fam });

                const flightParam = params.get('flight');
                if (flightParam) void openFlightSearch(flightParam);

                if (!modelRef.current) fetchLive();
            });

            tick = setInterval(() => { render(); setNow(Date.now()); }, TICK_MS);
            // Worldwide model views refresh every 30s (each is many upstream calls); the viewport every 10s.
            poll = setInterval(() => {
                if (modelRef.current && Date.now() - lastFetchRef.current < MODEL_POLL_MS - 2000) return;
                void fetchLive();
            }, POLL_MS);
        })();

        const onVisible = () => { if (!document.hidden) fetchLive(); };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            clearInterval(tick);
            clearInterval(poll);
            clearTimeout(moveTimer);
            document.removeEventListener('visibilitychange', onVisible);
            mapRef.current?.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refresh the open airport's weather and traffic every 30s.
    useEffect(() => {
        if (selection?.kind !== 'airport') return;
        const ap = selection.airport;
        const id = setInterval(() => { if (!document.hidden) void loadAirportLive(ap); }, 30_000);
        return () => clearInterval(id);
    }, [selection, loadAirportLive]);

    // Keep the selected flight/airport visible beside the detail panel (desktop) or above the sheet (mobile).
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;
        const desktop = window.matchMedia('(min-width: 640px)').matches;
        const padding = !selection
            ? { top: 0, right: 0, bottom: 0, left: 0 }
            : desktop
                ? { top: 0, right: 400, bottom: 0, left: 0 }
                // Mobile: clear the search box at the top and the bottom sheet (max 62dvh).
                : { top: 140, right: 0, bottom: Math.round(window.innerHeight * 0.6), left: 0 };
        const apply = () => map.easeTo({ padding, duration: 400 });
        // Don't interrupt a flyTo that the selection just started.
        if (map.isMoving()) map.once('moveend', apply);
        else apply();
    }, [selection, ready]);

    // ── Search ───────────────────────────────────────────────────────────────
    const familyMatches = useMemo(() => searchFamilies(query, 3), [query]);

    const airportMatches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) return [];
        const exact: Airport[] = [];
        const rest: Airport[] = [];
        for (const a of airports) {
            if (a.iata.toLowerCase() === q || a.icao.toLowerCase() === q) exact.push(a);
            else if (a.city.toLowerCase().startsWith(q) || a.name.toLowerCase().includes(q)) rest.push(a);
            if (exact.length + rest.length > 40) break;
        }
        return [...exact, ...rest.sort((x, y) => x.size - y.size)].slice(0, 6);
    }, [query, airports]);

    useEffect(() => {
        const q = query.trim().toUpperCase().replace(/\s+/g, '');
        if (!/^[A-Z0-9-]{3,10}$/.test(q)) { setFlightResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const json = await fetch(`/api/flights/search?q=${encodeURIComponent(q)}`).then(r => r.json());
                setFlightResults(json.aircraft ?? []);
            } catch {
                setFlightResults([]);
            } finally {
                setSearching(false);
            }
        }, 450);
        return () => clearTimeout(t);
    }, [query]);

    const goToFlight = useCallback((ac: Aircraft) => {
        setSearchOpen(false);
        setQuery('');
        selectFlight(ac.hex, ac);
        mapRef.current?.flyTo({ center: [ac.lon, ac.lat], zoom: Math.max(mapRef.current.getZoom(), 7), duration: 1600 });
    }, [selectFlight]);

    const chooseFamily = (family: AircraftFamily) => {
        setSearchOpen(false);
        setQuery('');
        applyModel({ kind: 'family', family });
    };

    async function openFlightSearch(q: string) {
        try {
            const json = await fetch(`/api/flights/search?q=${encodeURIComponent(q)}`).then(r => r.json());
            const ac: Aircraft | undefined = json.aircraft?.[0];
            if (ac) goToFlight(ac);
        } catch { /* ignore */ }
    }

    const onSearchEnter = () => {
        const exact = exactFamily(query);
        if (exact) return chooseFamily(exact);
        if (flightResults[0]) return goToFlight(flightResults[0]);
        if (familyMatches[0]) return chooseFamily(familyMatches[0]);
        if (airportMatches[0]) { selectAirport(airportMatches[0], true); setQuery(''); setSearchOpen(false); }
    };

    const locateMe = () => {
        navigator.geolocation?.getCurrentPosition(
            pos => {
                if (modelRef.current) applyModel(null);
                mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 8, duration: 1600 });
            },
            () => {},
            { timeout: 8000 },
        );
    };

    const secondsAgo = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
    const lastSeenS = selectedLive ? Math.max(0, Math.round((now - selectedLive.posAt) / 1000)) : null;
    const showResults = searchOpen && (airportMatches.length > 0 || flightResults.length > 0 || familyMatches.length > 0 || searching);
    const pill = 'inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#111216]/85 px-3 py-1.5 text-slate-300 backdrop-blur';

    return (
        <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-[#0b0c0f]">
            {/* MapLibre sets position:relative on its container, so size it from a positioned wrapper. */}
            <div className="absolute inset-0">
                <div ref={containerRef} className="h-full w-full" />
            </div>

            {!ready && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading map…
                </div>
            )}

            {/* Search + status */}
            <div className="absolute left-4 right-4 top-4 z-10 sm:right-auto sm:w-[380px]">
                <div className="rounded-2xl border border-white/[0.08] bg-[#111216]/90 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-2 px-3">
                        <Search className="h-4 w-4 shrink-0 text-slate-500" />
                        <input
                            value={query}
                            onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
                            onFocus={() => setSearchOpen(true)}
                            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') onSearchEnter();
                                if (e.key === 'Escape') setSearchOpen(false);
                            }}
                            placeholder="Flight (BA123), plane (A380), airport or city"
                            aria-label="Search flights, aircraft models and airports"
                            className="h-11 w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-200" aria-label="Clear search">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {showResults && (
                        <div className="max-h-[50vh] overflow-y-auto border-t border-white/[0.06] py-1">
                            {familyMatches.map(f => (
                                <button key={f.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => chooseFamily(f)}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.05]">
                                    <Globe2 className="h-4 w-4 text-sunrise-300" />
                                    <span className="text-sm text-slate-100">{f.name}</span>
                                    <span className="ml-auto shrink-0 text-xs text-slate-500">All flying now</span>
                                </button>
                            ))}
                            {flightResults.map(ac => (
                                <button key={ac.hex} type="button" onMouseDown={e => e.preventDefault()} onClick={() => goToFlight(ac)}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.05]">
                                    <Plane className="h-4 w-4 text-sunrise-300" />
                                    <span className="text-sm text-slate-100">{aircraftLabel(ac)}</span>
                                    {ac.flightNo && ac.callsign && <span className="text-xs text-slate-500">{ac.callsign}</span>}
                                    <span className="ml-auto text-xs text-slate-500">{ac.type ?? ''} {ac.ground ? 'on ground' : fmt(ac.alt, ' ft')}</span>
                                </button>
                            ))}
                            {searching && <div className="px-3 py-2 text-xs text-slate-500">Searching live flights…</div>}
                            {airportMatches.map(a => (
                                <button key={a.iata} type="button" onMouseDown={e => e.preventDefault()}
                                    onClick={() => { selectAirport(a, true); setQuery(''); setSearchOpen(false); }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.05]">
                                    <span className="w-10 font-mono text-xs text-sunrise-300">{a.iata}</span>
                                    <span className="min-w-0 truncate text-sm text-slate-200">{a.name}</span>
                                    <span className="ml-auto shrink-0 text-xs text-slate-500">{a.city}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {model ? (
                        <span className={cn(pill, 'border-sunrise-300/40 text-sunrise-100')}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', error ? 'bg-rose-400' : 'animate-pulse bg-emerald-400')} />
                            {error ? 'Reconnecting…' : `${modelLabel(model)} · ${count.toLocaleString()} flying now`}
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-slate-500" />}
                            <button type="button" onClick={() => applyModel(null)} aria-label="Clear aircraft filter" className="ml-0.5 text-slate-400 hover:text-white">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ) : (
                        <span className={pill}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', error ? 'bg-rose-400' : 'animate-pulse bg-emerald-400')} />
                            {error ? 'Reconnecting…' : `${count.toLocaleString()} aircraft live`}
                            {secondsAgo !== null && !error && <span className="text-slate-500">· {secondsAgo}s ago</span>}
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-slate-500" />}
                        </span>
                    )}
                    {model?.kind !== 'rare' && (
                        <button type="button" onClick={() => applyModel({ kind: 'rare' })} className={cn(pill, 'hover:text-slate-100')}>
                            <Sparkles className="h-3.5 w-3.5 text-sunrise-300" /> Rare planes
                        </button>
                    )}
                    <button type="button" onClick={locateMe} className={cn(pill, 'hover:text-slate-100')}>
                        <LocateFixed className="h-3.5 w-3.5" /> Near me
                    </button>
                </div>
                {model && (
                    <p className="mt-2 rounded-xl border border-white/[0.08] bg-[#111216]/85 px-3 py-2 text-xs text-slate-300 backdrop-blur">
                        {model.kind === 'rare'
                            ? 'Showing A380s, 747s, Belugas, An-124s and other rare aircraft flying anywhere in the world.'
                            : `Showing every ${model.family.name} flying anywhere in the world right now.`}
                    </p>
                )}
                {!model && partial && (
                    <p className="mt-2 rounded-xl border border-sunrise-300/20 bg-[#111216]/85 px-3 py-2 text-xs text-slate-300 backdrop-blur">
                        Live traffic covers the dashed circles. Zoom in for complete coverage of an area.
                    </p>
                )}
            </div>

            {/* Altitude legend */}
            <div className="pointer-events-none absolute bottom-10 right-14 z-10 hidden rounded-xl border border-white/[0.08] bg-[#111216]/85 px-3 py-2 backdrop-blur sm:block">
                <div className="eyebrow mb-1.5 !text-[10px] text-slate-500">Altitude (ft)</div>
                <div className="h-1.5 w-44 rounded-full" style={{ background: `linear-gradient(90deg, ${ALT_STOPS.map(([, c]) => c).join(', ')})` }} />
                <div className="mt-1 flex w-44 justify-between font-mono text-[10px] text-slate-500">
                    <span>0</span><span>10k</span><span>20k</span><span>30k</span><span>40k+</span>
                </div>
            </div>

            {/* Detail panel */}
            {selection && (
                <aside className="absolute inset-x-0 bottom-0 z-20 max-h-[62dvh] overflow-y-auto rounded-t-3xl border-t border-white/[0.08] bg-[#111216]/95 backdrop-blur-xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:max-h-[calc(100%-2rem)] sm:w-[380px] sm:rounded-3xl sm:border">
                    <button type="button" onClick={clearSelection} aria-label="Close"
                        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-slate-300 hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                    {selection.kind === 'flight' ? (
                        <FlightPanel
                            live={selectedLive}
                            details={details}
                            loading={detailsLoading}
                            follow={follow}
                            onFollow={() => setFollow(f => !f)}
                            routeCheck={routeCheck}
                            lastSeenS={lastSeenS}
                            actions={renderFlightActions?.(selectedLive, details)}
                        />
                    ) : (
                        <AirportPanel
                            airport={selection.airport}
                            live={airportLive}
                            loading={airportLoading}
                            onFlight={ac => goToFlight(ac)}
                            onZoom={() => mapRef.current?.flyTo({ center: [selection.airport.lon, selection.airport.lat], zoom: 9.5, duration: 1200 })}
                            actions={renderAirportActions?.(selection.airport)}
                        />
                    )}
                </aside>
            )}
        </div>
    );
}
