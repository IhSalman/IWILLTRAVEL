/**
 * Agent 5: Local Experience Agent
 * Fetches local activities and top-3 restaurants per day via Google Places.
 */

import { googleTextSearch } from '../tools';
import type { AgentInput, PlanResult, ExperienceResult, ExperienceDay, PlaceSearchResult } from '../types';

export async function localExperienceAgent(plan: PlanResult, input: AgentInput): Promise<ExperienceResult> {
    console.log('[Agent 5: Local Experience] Starting enrichment...');

    if (!plan.plan.length) return { experiences: [], error: 'missing_required_data', details: 'No plan provided' };

    const restaurantQuality = input.budget === 'luxury'
        ? 'fine dining'
        : input.budget === 'budget'
        ? 'affordable local food'
        : 'highly rated';

    // Deduplicate queries by (city + neighborhood) and fallback to city pool so we don't fire N identical calls
    const uniqueAreas = Array.from(
        new Set(plan.plan.map((d) => `${d.neighborhood || d.city} in ${d.city}`))
    );

    const areaCache = new Map<string, { activities: PlaceSearchResult[]; restaurants: PlaceSearchResult[] }>();

    await Promise.all(
        uniqueAreas.map(async (areaLabel) => {
            const interestQuery = input.interests.length > 0
                ? `${input.interests.slice(0, 2).join(' and ')} near ${areaLabel}`
                : `top attractions near ${areaLabel}`;

            const [activityResults, restaurantResults] = await Promise.all([
                googleTextSearch(interestQuery).catch(() => null),
                googleTextSearch(`best ${restaurantQuality} restaurants near ${areaLabel}`).catch(() => null),
            ]);

            const activities: PlaceSearchResult[] = (activityResults || [])
                .map((p: any): PlaceSearchResult => ({
                    name: p.name, address: p.address, rating: p.rating,
                    totalRatings: p.totalRatings, priceLevel: p.priceLevel, types: p.types,
                    lat: p.lat, lng: p.lng,
                }));

            const restaurants: PlaceSearchResult[] = (restaurantResults || [])
                .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
                .map((p: any): PlaceSearchResult => ({
                    name: p.name, address: p.address, rating: p.rating,
                    totalRatings: p.totalRatings, priceLevel: p.priceLevel, types: p.types,
                    lat: p.lat, lng: p.lng,
                }));

            areaCache.set(areaLabel, { activities, restaurants });
        })
    );

    const usedRestaurants = new Set<string>();
    const experiences: ExperienceDay[] = plan.plan.map((day) => {
        const areaLabel = `${day.neighborhood || day.city} in ${day.city}`;
        const pool = areaCache.get(areaLabel) || { activities: [], restaurants: [] };

        const dayRestaurants: PlaceSearchResult[] = [];
        for (const r of pool.restaurants) {
            const key = r.name.toLowerCase();
            if (!usedRestaurants.has(key)) {
                usedRestaurants.add(key);
                dayRestaurants.push(r);
                if (dayRestaurants.length >= 3) break;
            }
        }
        if (dayRestaurants.length < 3) {
            for (const r of pool.restaurants) {
                if (!dayRestaurants.some((d) => d.name === r.name)) {
                    dayRestaurants.push(r);
                    if (dayRestaurants.length >= 3) break;
                }
            }
        }

        return {
            day: day.day,
            activities: pool.activities.slice(0, 2),
            restaurants: dayRestaurants,
        };
    });

    console.log(`[Agent 5: Local Experience] Enriched ${experiences.length} days (${uniqueAreas.length} unique areas).`);
    return { experiences };
}
