/**
 * Agent 1: Discovery Agent (Grounding First)
 * Deterministic data acquisition from verified sources (Google Places API).
 */

import { googleTextSearch } from '../tools';
import type { AgentInput, DiscoveryResult } from '../types';

export async function discoveryAgent(input: AgentInput): Promise<DiscoveryResult> {
    console.log('[Agent 1: Discovery] Starting grounding search...');
    
    const t = Date.now();
    const destination = input.destination;
    
    // Multi-category discovery queries to build a rich venue pool
    const discoveryQueries = [
        `top attractions in ${destination}`,
        `best things to do in ${destination}`,
        `highly rated restaurants in ${destination}`,
        `popular tourist spots in ${destination}`,
        `hidden gems in ${destination}`
    ];
    
    try {
        const results = await Promise.all(
            discoveryQueries.map(q => googleTextSearch(q))
        );
        
        // Flatten and filter unique venues by place_id or name
        const venueMap = new Map();
        results.flat().forEach(v => {
            if (v && v.name) {
                const key = v.placeId || v.name.toLowerCase();
                if (!venueMap.has(key)) {
                    venueMap.set(key, v);
                }
            }
        });
        
        const discoveredVenues = Array.from(venueMap.values());
        
        console.log(`[Agent 1: Discovery] Completed in ${Date.now() - t}ms. Found ${discoveredVenues.length} verified venues.`);
        
        return {
            venues: discoveredVenues,
            source: 'Google Places API (New)',
            timestamp: new Date().toISOString()
        };
    } catch (error: any) {
        console.error('[Agent 1: Discovery] Failed:', error);
        return {
            venues: [],
            error: error.message,
            source: 'Error Fallback',
            timestamp: new Date().toISOString()
        };
    }
}
