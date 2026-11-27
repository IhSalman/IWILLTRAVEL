/**
 * Agent 6: Logistics & Route Optimization Agent
 * Pure deterministic code:
 * 1. Detects and removes geographic backtracks in inter-city sequence.
 * 2. Optimizes intra-day venue ordering using Nearest-Neighbor + 2-Opt on GPS coordinates
 *    to minimize neighborhood zig-zagging (Thesis Section 3.4.4).
 */

import { optimizeIntraDayActivities } from '@/lib/agents/temporal-scheduler';
import type { PlanResult, OptimizedRoute, PlaceDetail } from '../types';

export function routeOptimizationAgent(
    plan: PlanResult,
    placeDetails?: Record<string, PlaceDetail>,
    discoveredVenues?: any[]
): OptimizedRoute {
    console.log('[Agent 6: Logistics] Optimizing inter-city & intra-day spatial routes...');

    if (!plan.plan.length) {
        return { optimizedRoute: [], removedBacktracks: 0, routeChanged: false };
    }

    // 1. Inter-city backtrack elimination
    const citySequence = plan.plan.map((d) => d.city);
    const optimized: string[] = [];
    let removedBacktracks = 0;

    for (const city of citySequence) {
        if (optimized.length > 0 && optimized[optimized.length - 1] === city) continue;
        const prevIdx = optimized.indexOf(city);
        if (prevIdx !== -1 && prevIdx < optimized.length - 1) {
            removedBacktracks++;
            continue;
        }
        optimized.push(city);
    }

    // 2. Intra-day GPS Nearest-Neighbor + 2-Opt venue ordering
    const coordLookup = (name: string) => {
        if (placeDetails?.[name]?.lat && placeDetails?.[name]?.lng) {
            return placeDetails[name];
        }
        const lower = name.toLowerCase();
        if (placeDetails) {
            const pKey = Object.keys(placeDetails).find(
                (k) => k.toLowerCase() === lower || k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())
            );
            if (pKey && placeDetails[pKey].lat) return placeDetails[pKey];
        }
        if (Array.isArray(discoveredVenues)) {
            const found = discoveredVenues.find((v: any) => {
                const vn = String(v?.name || '').toLowerCase();
                return vn === lower || vn.includes(lower) || lower.includes(vn);
            });
            if (found?.lat && found?.lng) return found;
        }
        return undefined;
    };

    const optimizedDayActivities: Record<number, string[]> = {};
    let totalSavedKm = 0;
    let intraDayChanged = false;

    for (const day of plan.plan) {
        const { ordered, distanceSavedKm } = optimizeIntraDayActivities(day.activities, coordLookup);
        if (JSON.stringify(ordered) !== JSON.stringify(day.activities)) {
            intraDayChanged = true;
        }
        day.activities = ordered;
        optimizedDayActivities[day.day] = ordered;
        totalSavedKm += distanceSavedKm;
    }

    console.log(
        `[Agent 6: Route] Cities: ${optimized.join(' → ')}, backtracks removed: ${removedBacktracks}, intra-day saved: ${totalSavedKm.toFixed(2)} km`
    );

    return {
        optimizedRoute: optimized,
        removedBacktracks,
        routeChanged: removedBacktracks > 0 || intraDayChanged,
        optimizedDayActivities,
        intraDayDistanceSavedKm: Number(totalSavedKm.toFixed(2)),
    };
}
