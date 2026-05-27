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

    const experiences: ExperienceDay[] = await Promise.all(
        plan.plan.map(async (day) => {
            const interestQuery = input.interests.length > 0
                ? `${input.interests.slice(0, 2).join(' and ')} in ${day.city}`
                : `top attractions in ${day.city}`;

            const [activityResults, restaurantResults] = await Promise.all([
                googleTextSearch(interestQuery),
                googleTextSearch(`best ${restaurantQuality} restaurants in ${day.city}`),
            ]);

            const activities: PlaceSearchResult[] = (activityResults || [])
                .slice(0, 2)
                .map((p: any): PlaceSearchResult => ({
                    name: p.name, address: p.address, rating: p.rating,
                    totalRatings: p.totalRatings, priceLevel: p.priceLevel, types: p.types,
                    lat: p.lat, lng: p.lng,
                }));

            const restaurants: PlaceSearchResult[] = (restaurantResults || [])
                .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 3)
                .map((p: any): PlaceSearchResult => ({
                    name: p.name, address: p.address, rating: p.rating,
                    totalRatings: p.totalRatings, priceLevel: p.priceLevel, types: p.types,
                    lat: p.lat, lng: p.lng,
                }));

            return { day: day.day, activities, restaurants };
        })
    );

    console.log(`[Agent 5: Local Experience] Enriched ${experiences.length} days with verified data.`);
    return { experiences };
}
