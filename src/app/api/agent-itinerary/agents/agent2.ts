/**
 * Agent 2: Strategic Planning Agent
 * LLM-powered itinerary skeleton generator with strict geo-clustering,
 * Zod runtime schema enforcement, and self-healing Truth Pool grounding check
 * (Thesis Section 3.4.2 & Section 4.5, Figure 5).
 */

import { generateStructuredWithRetry } from '@/utils/ai-config';
import { Agent2LLMOutputSchema } from '../schemas';
import { resolveTripDayDate } from '@/lib/agents/temporal-scheduler';
import {
    areaCandidates,
    assignClustersToDays,
    clusterVenues,
    maxSpreadForTransport,
    nearestUnused,
    repairDay,
} from '@/lib/agents/geo-cluster';
import type { AgentInput, PlanResult } from '../types';

export async function planningAgent(input: AgentInput): Promise<PlanResult> {
    console.log('[Agent 2: Planning] Starting skeleton generation...');

    if (!input.destination) return { plan: [], error: 'missing_required_data', details: 'destination is required' };
    if (input.days < 1) return { plan: [], error: 'missing_required_data', details: 'duration_days must be >= 1' };

    const venues = input.discoveredVenues || [];

    const paceGuide = input.travelStyle === 'relaxed'
        ? '2-3 activities/day — long visits, leisurely lunch breaks, no rushing'
        : input.travelStyle === 'adventure'
        ? '4-5 activities/day — packed schedule with tight transitions'
        : '3-4 activities/day — balanced mix of depth and variety';

    const dayCalendarLines = Array.from({ length: input.days }, (_, idx) => {
        const { date, weekday } = resolveTripDayDate(input.startDate, idx);
        return `Day ${idx + 1}: ${weekday}${date ? ` (${date})` : ''}`;
    }).join(', ');

    // Deterministic geo-clustering: one area per day, so the LLM chooses and
    // orders within an area instead of guessing geography from names alone.
    const perDay = input.travelStyle === 'relaxed' ? 3 : input.travelStyle === 'adventure' ? 5 : 4;
    const minPerDay = perDay - 1;
    const dayAreas = assignClustersToDays(clusterVenues(venues, input.days), input.days, perDay);
    const clusteredNames = new Set(dayAreas.flatMap((a) => a.venues.map((v) => v.name.toLowerCase())));
    const unlocatedVenues = venues.filter((v: any) => v?.name && !clusteredNames.has(String(v.name).toLowerCase()));

    const venueLine = (v: any) => `- ${v.name} (${v.types?.[0] || 'Venue'})`;
    const venuesContext = !venues.length
        ? ''
        : dayAreas.length
        ? `\nVERIFIED VENUE POOL, GROUPED BY AREA (select activities EXCLUSIVELY from these venues).
Each day has a recommended area; keep that day's activities inside it so travellers don't cross town.
${dayAreas
    .map(
        (area, i) =>
            // Small areas are topped up with the nearest venues so every day has enough options.
            `DAY ${i + 1} AREA (plan ${perDay} activities):\n${areaCandidates(area, venues, perDay + 3)
                .slice(0, 10)
                .map(venueLine)
                .join('\n')}`
    )
    .join('\n\n')}${
              unlocatedVenues.length
                  ? `\n\nOTHER VERIFIED VENUES (location unknown — use sparingly):\n${unlocatedVenues
                        .slice(0, 10)
                        .map(venueLine)
                        .join('\n')}`
                  : ''
          }\n`
        : `\nVERIFIED VENUE POOL (YOU MUST SELECT ACTIVITIES EXCLUSIVELY FROM THIS VERIFIED POOL):\n${venues
              .slice(0, 45)
              .map((v: any) => `- ${v.name} (${v.types?.[0] || 'Venue'}) — ${v.address || input.destination}`)
              .join('\n')}\n`;

    const prompt = `You are the world's most precise Strategic Planning Agent. Your output powers a production data-grounded travel system (DGIS).

MISSION: Build a ${input.days}-day itinerary skeleton that is:
1. GEOGRAPHICALLY FLAWLESS — every activity on a given day must be within the SAME neighborhood or district.
2. HYPER-SPECIFIC — use exact real place names, not generic descriptions.
3. GROUNDED — select venues strictly from the VERIFIED VENUE POOL below. Do NOT invent or hallucinate locations.

${venuesContext}

INPUT:
- Destination: ${input.destination}
- Duration: ${input.days} days (${dayCalendarLines})
- Interests: ${input.interests.join(', ') || 'general sightseeing, local culture, food'}
- Travel Style: ${input.travelStyle} (${paceGuide})
- Traveler Type: ${input.travelerType}
- Budget Level: ${input.budget}

OUTPUT SCHEMA (return ONLY this JSON):
{
  "plan": [
    {
      "day": 1,
      "city": "Exact city name",
      "neighborhood": "Specific district",
      "neighborhoodDescription": "1 sentence logic",
      "activities": ["Exact Real Place Name 1", "Exact Real Place Name 2"],
      "transitNote": "Transit logic"
    }
  ],
  "researchPlan": ["Tasks for Agent 3"]
}

STRICT RULES:
- Return exactly ${input.days} day objects in "plan" (numbered 1 to ${input.days}).
- If the VERIFIED VENUE POOL is non-empty, every activity name MUST match a venue in the pool.`;

    const normalizedPool = venues
        .map((v: any) => String(v?.name || '').toLowerCase().trim())
        .filter(Boolean);

    const matchesTruthPool = (candidate: string): boolean => {
        if (normalizedPool.length === 0) return true;
        const c = candidate.toLowerCase().trim();
        return normalizedPool.some(
            (poolName) => poolName === c || poolName.includes(c) || c.includes(poolName)
        );
    };

    try {
        const result = await generateStructuredWithRetry(prompt, Agent2LLMOutputSchema, {
            role: 'planner',
            maxRetries: 2,
            customValidator: (data) => {
                if (data.plan.length !== input.days) {
                    return `Expected exactly ${input.days} days in "plan", but received ${data.plan.length}.`;
                }
                // Thin days: only enforce when the pool is big enough to fill them.
                if (venues.length >= input.days * minPerDay) {
                    const thin = data.plan.filter((d) => d.activities.length < minPerDay);
                    if (thin.length) {
                        return `${thin
                            .map((d) => `Day ${d.day} has only ${d.activities.length} activities`)
                            .join('; ')}. Plan ${perDay} activities per day (at least ${minPerDay}), chosen from that day's area.`;
                    }
                }
                if (normalizedPool.length >= Math.min(6, input.days * 2)) {
                    const ungrounded: string[] = [];
                    for (const d of data.plan) {
                        for (const act of d.activities) {
                            if (!matchesTruthPool(act)) {
                                ungrounded.push(act);
                            }
                        }
                    }
                    const totalActs = data.plan.reduce((acc, d) => acc + d.activities.length, 0);
                    // Require >= 85% match on retry check, then deterministically snap/filter any stragglers
                    if (ungrounded.length > Math.max(1, Math.floor(totalActs * 0.15))) {
                        return `These activities are NOT in the VERIFIED VENUE POOL: ${ungrounded
                            .slice(0, 5)
                            .join(', ')}. Replace them with exact venue names from the VERIFIED VENUE POOL.`;
                    }
                }
                return null;
            },
        });

        // Enrich dates and deterministically snap/replace any remaining ungrounded item from the pool.
        // Replacements come from the day's own area (nearest unused venue), not just any venue.
        const usedLower = new Set<string>();
        const groundedPlan = result.data.plan.map((day, idx) => {
            const areaCentre = dayAreas[idx]?.centroid;
            const { date } = resolveTripDayDate(input.startDate, idx);
            const cleanedActivities = day.activities.map((act) => {
                if (normalizedPool.length === 0) return act;
                const exactOrPartial = venues.find((v: any) => {
                    const vn = String(v?.name || '').toLowerCase().trim();
                    const cn = act.toLowerCase().trim();
                    return vn === cn || vn.includes(cn) || cn.includes(vn);
                });
                if (exactOrPartial) {
                    usedLower.add(String(exactOrPartial.name).toLowerCase());
                    return String(exactOrPartial.name);
                }
                // Deterministic replacement from unused Truth Pool venues so 100% grounding holds:
                // nearest to the day's area when known, otherwise the next unused venue.
                const fallbackVenue =
                    (areaCentre ? nearestUnused(areaCentre, venues, usedLower) : null) ||
                    venues.find((v: any) => v?.name && !usedLower.has(String(v.name).toLowerCase()));
                if (fallbackVenue) {
                    usedLower.add(String(fallbackVenue.name).toLowerCase());
                    return String(fallbackVenue.name);
                }
                return act;
            });

            return {
                ...day,
                day: idx + 1,
                ...(date ? { date } : {}),
                activities: cleanedActivities,
            };
        });

        // Single-day repair: if a day's stops are spread too far for the chosen transport,
        // swap the outliers for the nearest unused verified venues. Only that day changes.
        const byName = new Map<string, any>();
        for (const v of venues) if (v?.name) byName.set(String(v.name).toLowerCase(), v);
        const allUsed = new Set(groundedPlan.flatMap((d) => d.activities.map((a) => a.toLowerCase())));

        // Safety net for thin days: top up with the nearest unused verified venues
        // to that day's area (or its own stops), so no day ends up with 1–2 stops.
        let toppedUp = 0;
        for (let i = 0; i < groundedPlan.length; i++) {
            const day = groundedPlan[i];
            if (day.activities.length >= minPerDay) continue;
            const located = day.activities
                .map((a) => byName.get(a.toLowerCase()))
                .filter((v: any) => typeof v?.lat === 'number' && typeof v?.lng === 'number');
            const centre =
                located.length > 0
                    ? { lat: located.reduce((s: number, v: any) => s + v.lat, 0) / located.length, lng: located.reduce((s: number, v: any) => s + v.lng, 0) / located.length }
                    : dayAreas[i]?.centroid;
            if (!centre) continue;
            const extra: string[] = [];
            while (day.activities.length + extra.length < minPerDay) {
                const v = nearestUnused(centre, venues, allUsed);
                if (!v) break;
                allUsed.add(v.name.toLowerCase());
                extra.push(v.name);
            }
            if (extra.length) {
                groundedPlan[i] = { ...day, activities: [...day.activities, ...extra] };
                toppedUp += extra.length;
            }
        }
        const maxKm = maxSpreadForTransport(input.transport);
        let repairedDays = 0;
        let replacedStops = 0;
        for (let i = 0; i < groundedPlan.length; i++) {
            const fix = repairDay({
                activities: groundedPlan[i].activities,
                lookup: (n) => byName.get(n.toLowerCase()),
                pool: venues,
                used: allUsed,
                maxKm,
                areaCentre: dayAreas[i]?.centroid,
            });
            if (fix.replaced.length) {
                groundedPlan[i] = { ...groundedPlan[i], activities: fix.activities };
                repairedDays++;
                replacedStops += fix.replaced.length;
                console.log(
                    `[Agent 2: Planning] Day ${i + 1} repaired (${fix.spreadBeforeKm.toFixed(1)} → ${fix.spreadAfterKm.toFixed(1)} km):`,
                    fix.replaced
                );
            }
        }

        const areaNote = dayAreas.length ? ` across ${new Set(dayAreas.map((a) => a.id)).size} areas` : '';
        const repairNote =
            (repairedDays ? `; repaired ${repairedDays} day(s), ${replacedStops} far stop(s) swapped` : '') +
            (toppedUp ? `; added ${toppedUp} nearby stop(s) to thin days` : '');
        return {
            plan: groundedPlan,
            researchPlan: result.data.researchPlan || [],
            details: `Generated ${groundedPlan.length} schema-verified days (${result.attempts} attempt(s)) from ${venues.length} verified spots${areaNote}${repairNote}.`,
            _tokens: result.usage,
        };
    } catch (error: any) {
        console.error('[Agent 2: Planning] Error:', error);
        return { plan: [], error: 'llm_failure', details: error.message };
    }
}
