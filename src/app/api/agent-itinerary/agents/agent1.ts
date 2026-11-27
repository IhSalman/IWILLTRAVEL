/**
 * Agent 1: Discovery Agent (Grounding First)
 * Deterministic data acquisition from verified sources (Google Places API),
 * with automated multi-tier fallbacks (Foursquare -> OpenStreetMap Nominatim)
 * to prevent 0% grounding regressions on API timeouts (Thesis Section 6.3.3 & 7.3).
 */

import { googleTextSearch, foursquareSearch } from '../tools';
import { DiscoveryResultSchema } from '../schemas';
import type { AgentInput, DiscoveryResult } from '../types';

async function nominatimFallbackSearch(destination: string): Promise<any[]> {
    const categories = ['museum', 'park', 'attraction', 'restaurant', 'historic'];
    const found: any[] = [];
    await Promise.all(
        categories.map(async (cat) => {
            try {
                const q = encodeURIComponent(`${cat} in ${destination}`);
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&addressdetails=1`,
                    {
                        headers: { 'User-Agent': 'IWillTravelDGIS/2.0 (academic-thesis-grounding)' },
                        signal: AbortSignal.timeout(4000),
                    }
                );
                if (!res.ok) return;
                const items = await res.json();
                for (const item of items || []) {
                    const name = item.name || item.display_name?.split(',')[0]?.trim();
                    if (name) {
                        found.push({
                            name,
                            placeId: `osm_${item.osm_id}`,
                            address: item.display_name || destination,
                            // OpenStreetMap has no ratings — leave empty rather than invent one
                            types: [item.type || cat],
                            lat: parseFloat(item.lat),
                            lng: parseFloat(item.lon),
                        });
                    }
                }
            } catch {
                // ignore individual category timeout
            }
        })
    );
    return found;
}

export async function discoveryAgent(input: AgentInput): Promise<DiscoveryResult> {
    console.log('[Agent 1: Discovery] Starting grounding search...');

    const t = Date.now();
    const destination = input.destination;
    const interestHints = input.interests.slice(0, 2).map((interest) => `best ${interest} in ${destination}`);

    // Multi-category discovery queries to build a rich venue pool
    const discoveryQueries = [
        `top attractions in ${destination}`,
        `best things to do in ${destination}`,
        `highly rated restaurants in ${destination}`,
        `popular museums and cultural sites in ${destination}`,
        `hidden gems in ${destination}`,
        ...interestHints,
    ];

    const venueMap = new Map<string, any>();
    const addVenues = (list: any[]) => {
        for (const v of list) {
            if (v && v.name && typeof v.name === 'string') {
                const key = (v.placeId || v.name).toLowerCase().trim();
                if (!venueMap.has(key)) {
                    venueMap.set(key, v);
                }
            }
        }
    };

    let source = 'Google Places API (New)';
    let fallbackUsed = false;

    try {
        const results = await Promise.all(
            discoveryQueries.map((q) => googleTextSearch(q).catch(() => null))
        );
        addVenues(results.filter(Boolean).flat());

        // Tier 2 Fallback: Foursquare Places API if Google Places timed out or returned sparse results
        if (venueMap.size < 4) {
            console.warn('[Agent 1: Discovery] Primary Places pool sparse; invoking Foursquare fallback...');
            const fsqResults = await Promise.all([
                foursquareSearch('attractions', destination).catch(() => null),
                foursquareSearch('restaurants', destination).catch(() => null),
            ]);
            const fsqFlat = fsqResults.filter(Boolean).flat();
            if (fsqFlat.length > 0) {
                addVenues(
                    fsqFlat.map((p: any) => ({
                        name: p.name,
                        address: p.address || destination,
                        rating: p.rating ?? undefined,
                        totalRatings: p.totalRatings ?? undefined,
                        types: p.categories || ['attraction'],
                    }))
                );
                source = venueMap.size === fsqFlat.length ? 'Foursquare Fallback' : 'Google Places + Foursquare';
                fallbackUsed = true;
            }
        }

        // Tier 3 Fallback: OpenStreetMap Nominatim (zero-key deterministic geographic grounding)
        if (venueMap.size < 4) {
            console.warn('[Agent 1: Discovery] Invoking OpenStreetMap Nominatim grounding fallback...');
            const osmVenues = await nominatimFallbackSearch(destination);
            if (osmVenues.length > 0) {
                addVenues(osmVenues);
                source = source.includes('Google') ? `${source} + OpenStreetMap` : 'OpenStreetMap Nominatim';
                fallbackUsed = true;
            }
        }

        const discoveredVenues = Array.from(venueMap.values());
        const output: DiscoveryResult = {
            venues: discoveredVenues,
            source,
            fallbackUsed,
            timestamp: new Date().toISOString(),
        };

        const validated = DiscoveryResultSchema.safeParse(output);
        if (!validated.success) {
            console.warn('[Agent 1: Discovery] Schema normalization warning:', validated.error.issues);
        }

        console.log(
            `[Agent 1: Discovery] Completed in ${Date.now() - t}ms. Found ${discoveredVenues.length} verified venues via ${source}.`
        );

        return output;
    } catch (error: any) {
        console.error('[Agent 1: Discovery] Failed:', error);
        return {
            venues: Array.from(venueMap.values()),
            error: error.message,
            source: 'Error Fallback',
            fallbackUsed: true,
            timestamp: new Date().toISOString(),
        };
    }
}
