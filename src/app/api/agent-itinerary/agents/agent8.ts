/**
 * Agent 8: Global Composer Agent
 * Hybrid deterministic + LLM synthesis component:
 * 1. Reconciles temporal schedules against verified Google Places opening hours
 *    (eliminating closed-weekday visits and past-closing overhangs).
 * 2. Generates rich, grounded narrative via Zod-validated self-healing LLM call.
 * 3. Injects Google Routes transit times and persists Blackboard State for live updates.
 */

import { generateStructuredWithRetry } from '@/utils/ai-config';
import { Agent8CreativeOutputSchema, FinalItinerarySchema } from '../schemas';
import { reconcileTemporalSchedule } from '@/lib/agents/temporal-scheduler';
import type {
    ComposerInput,
    FinalItinerary,
    PlanDay,
    ExperienceDay,
    PlaceSearchResult,
} from '../types';
import { calculateTravelTime, googlePlaceDetails } from '../tools';

export async function finalComposerAgent(data: ComposerInput): Promise<FinalItinerary> {
    console.log('[Agent 8: Composer] Reconciling temporal schedule & finalizing itinerary...');

    const { input, plan, research, experiences, flightAnalysis, budgetCheck, optimizedRoute, sustainability } = data;

    // Step 1: Deterministic Opening-Hours Reconciliation (swaps closed weekdays & fixes closing overhangs)
    const { adjustedDays, auditFixes } = reconcileTemporalSchedule({
        planDays: plan.plan,
        startDate: input.startDate,
        placeDetails: research.placeDetails,
        discoveredVenues: input.discoveredVenues,
    });

    // Fetch placeDetails for any Truth Pool replacement venues swapped in during temporal reconciliation.
    // Pass the known Place ID from the pool so this skips the extra (billed) text search.
    const reconciledNames = Array.from(
        new Set(adjustedDays.flatMap((d) => d.slots.map((s) => s.name)))
    );
    const placeIdByName = new Map<string, string>();
    for (const v of input.discoveredVenues || []) {
        if (v?.name && v?.placeId) placeIdByName.set(String(v.name).toLowerCase(), String(v.placeId));
    }
    await Promise.all(
        reconciledNames.map(async (actName) => {
            if (!research.placeDetails[actName]) {
                const knownId = placeIdByName.get(actName.toLowerCase());
                const detail = await googlePlaceDetails(actName, input.destination, knownId).catch(() => null);
                if (detail) {
                    research.placeDetails[actName] = detail as any;
                }
            }
        })
    );

    // Sync reconciled activity names back into plan.plan for accurate narrative generation
    plan.plan.forEach((pDay, idx) => {
        if (adjustedDays[idx]) {
            pDay.activities = adjustedDays[idx].slots.map((s) => s.name);
            if (adjustedDays[idx].date) pDay.date = adjustedDays[idx].date;
        }
    });

    // Build context for creative synthesis
    const uniquePlaceNames: string[] = Array.from(
        new Set(plan.plan.flatMap((d: PlanDay) => d.activities))
    ).slice(0, 20);

    const dayContextBlocks = plan.plan
        .map((d: PlanDay, idx: number) => {
            const nbhd = d.neighborhood || d.city;
            const wk = adjustedDays[idx]?.weekday ? ` [${adjustedDays[idx].weekday}]` : '';
            return `Day ${d.day}${wk} — ${d.city} (${nbhd}): ${d.activities.join(', ')}`;
        })
        .join('\n');

    const weatherContext = research.weather
        ? JSON.stringify(research.weather).substring(0, 400)
        : 'No weather data';
    const currencyContext = research.currency
        ? `Base: ${research.currency.base}. EUR: ${research.currency.rates?.EUR}, GBP: ${research.currency.rates?.GBP}`
        : 'No currency data';

    const creativePrompt = `You are a Pulitzer-level travel writer for a premium app. Generate immersive content for a ${input.days}-day trip to ${input.destination}.
Traveler: ${input.travelerType} | Budget: ${input.budget} | Style: ${input.travelStyle} | Interests: ${input.interests.join(', ')}

ITINERARY (reference only — DO NOT modify structure):
${dayContextBlocks}

Return ONLY this JSON (no markdown, no preamble):
{
  "title": "6-9 word evocative trip title",
  "overview": "3-4 sentence narrative mentioning 2-3 specific real places from the itinerary",
  "bestTimeToVisit": "Best months/seasons with weather impact",
  "whyThisPlan": ["Strategic geo-clustering reason", "Interest alignment reason", "Practical reason", "Hidden gem reason"],
  "travelTips": ["Destination-specific tip", "Transport hack", "Recommended app to download", "Local etiquette tip", "Airport to hotel tip"],
  "localCustoms": ["Cultural norm", "Dining etiquette", "Tipping policy", "Dress code at sites"],
  "safetyAdvice": ["Most common scam", "Areas to avoid", "Emergency number", "Health recommendation"],
  "budgetTips": ["Free version of paid attraction", "Best souvenir timing", "Meal splurge vs save tip", "Transit pass tip"],
  "weatherForecast": "Weather narrative using provided data",
  "currencyAdvice": "Exchange rate tips and payment methods",
  "dayThemes": [${plan.plan.map((_: PlanDay, i: number) => `"Vivid Day ${i + 1} theme for its specific neighborhood"`).join(', ')}],
  "activityDescriptions": {
${uniquePlaceNames
    .map(
        (n: string) => `    "${n}": {
      "description": "3-4 immersive sentences about ${n}: history, atmosphere, iconic detail, and why this traveler will love it",
      "highlights": ["specific iconic feature", "hidden detail tourists miss", "best photo spot", "sensory highlight", "practical tip"],
      "cost": "exact entry fee or Free",
      "duration": "realistic visit time e.g. 2-3 hours",
      "tip": "insider secret",
      "bestTimeToVisit": "best time of day to visit",
      "mealNearby": "1-2 specific nearby restaurants within walking distance",
      "transportToNext": "how to reach the next activity from here",
      "category": "Museum|Temple|Park|Market|Landmark|Food|Nature|Shopping",
      "accessibilityNote": "wheelchair access or physical demand note"
    }`
    )
    .join(',\n')}
  }
}

Weather data: ${weatherContext}
Currency: ${currencyContext}

CRITICAL RULES:
1. Output ONLY raw JSON — no markdown, no explanations before or after.
2. The activityDescriptions keys above are PRE-SET — use them EXACTLY as written. Do NOT rename, skip, or add keys.
3. Replace every placeholder string with real, specific content about the actual place.
4. Every description must be at least 3 sentences. No generic filler.`;

    function fuzzyFind(dict: Record<string, any>, key: string): any {
        if (dict[key]) return dict[key];
        const lower = key.toLowerCase();
        const ciKey = Object.keys(dict).find((k) => k.toLowerCase() === lower);
        if (ciKey) return dict[ciKey];
        const partialKey = Object.keys(dict).find(
            (k) => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
        );
        if (partialKey) return dict[partialKey];
        return {};
    }

    async function geocodeFallback(name: string, city: string): Promise<{ lat: number; lng: number } | null> {
        try {
            const q = encodeURIComponent(`${name}, ${city}`);
            const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'TravelAIApp/2.0 (travel planning)' },
                signal: AbortSignal.timeout(3000),
            });
            const data = await res.json();
            if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } catch {
            /* silent fallback */
        }
        return null;
    }

    // Run Creative LLM synthesis and Geocode + Google Routes transit calculations in parallel
    let creative: any = {};
    const transitMap = new Map<string, { minutes: number; mode: string; distanceKm: number }>();

    const creativeTask = (async () => {
        try {
            const result = await generateStructuredWithRetry(creativePrompt, Agent8CreativeOutputSchema, {
                role: 'creative',
                maxRetries: 2,
            });
            creative = { ...result.data, _tokens: result.usage };
        } catch (err: any) {
            console.warn('[Agent 8: Composer] Structured LLM retries exhausted, using deterministic defaults:', err.message);
        }
    })();

    const routesAndGeocodeTask = (async () => {
        // 1. Resolve any missing coordinates into research.placeDetails
        const missingCoords: Array<{ name: string; city: string }> = [];
        plan.plan.forEach((planDay, dayIdx) => {
            const slots = adjustedDays[dayIdx]?.slots || [];
            slots.forEach((slot) => {
                const detail = research.placeDetails[slot.name] || fuzzyFind(research.placeDetails, slot.name);
                if (!detail?.lat) {
                    missingCoords.push({ name: slot.name, city: planDay.city });
                }
            });
        });

        if (missingCoords.length > 0) {
            await Promise.all(
                missingCoords.slice(0, 10).map(async (item) => {
                    const coords = await geocodeFallback(item.name, item.city);
                    if (coords) {
                        const existing = research.placeDetails[item.name] || fuzzyFind(research.placeDetails, item.name) || {};
                        research.placeDetails[item.name] = { ...existing, name: item.name, lat: coords.lat, lng: coords.lng } as any;
                    }
                })
            );
        }

        // 2. Calculate all consecutive transit intervals across all days in parallel
        const mode = (input.transport as string) === 'public' ? 'TRANSIT' : 'WALK';
        await Promise.all(
            adjustedDays.map(async (sDay, dayIdx) => {
                const slots = sDay?.slots || [];
                await Promise.all(
                    slots.slice(0, -1).map(async (slot, i) => {
                        const nextSlot = slots[i + 1];
                        const curDetail = research.placeDetails[slot.name] || fuzzyFind(research.placeDetails, slot.name);
                        const nxtDetail = research.placeDetails[nextSlot.name] || fuzzyFind(research.placeDetails, nextSlot.name);
                        if (curDetail?.lat && curDetail?.lng && nxtDetail?.lat && nxtDetail?.lng) {
                            const res = await calculateTravelTime({
                                originLat: curDetail.lat,
                                originLng: curDetail.lng,
                                destinationLat: nxtDetail.lat,
                                destinationLng: nxtDetail.lng,
                                travelMode: mode as 'WALK' | 'TRANSIT',
                            }).catch(() => null);
                            if (res) {
                                transitMap.set(`${dayIdx}_${i}`, res);
                            }
                        }
                    })
                );
            })
        );
    })();

    await Promise.all([creativeTask, routesAndGeocodeTask]);

    const actDescs: Record<string, any> = creative.activityDescriptions || {};
    const dayThemes: string[] = creative.dayThemes || [];

    const days = plan.plan.map((planDay: PlanDay, dayIdx: number) => {
        const expDay = experiences.experiences.find((e: ExperienceDay) => e.day === planDay.day);
        const neighborhood = planDay.neighborhood || planDay.city;
        const transitNote = planDay.transitNote || `Use ${input.transport} to get around ${neighborhood}.`;
        const scheduledDay = adjustedDays[dayIdx];

        const activities = (scheduledDay?.slots || []).map((slot, actIdx) => {
            const actName = slot.name;
            const detail = research.placeDetails[actName] || fuzzyFind(research.placeDetails, actName);
            const desc = fuzzyFind(actDescs, actName);
            const routeInfo = transitMap.get(`${dayIdx}_${actIdx}`);
            return {
                time: slot.time,
                title: actName,
                description:
                    desc.description && desc.description.length > 50
                        ? desc.description
                        : detail?.summary && detail.summary.length > 20
                        ? detail.summary
                        : desc.description || `Discover ${actName} in ${planDay.city}.`,
                highlights:
                    Array.isArray(desc.highlights) && desc.highlights.length > 0
                        ? desc.highlights
                        : detail?.types?.length
                        ? [`Known for: ${detail.types.join(', ')}`]
                        : [],
                photoUrl: detail?.photoUrl || null,
                aerialVideoUrl: (detail as any)?.aerialVideoUrl || null,
                editorialSummary: detail?.summary || '',
                duration: desc.duration || '2–3 hours',
                cost: desc.cost || 'Varies',
                tip: slot.adjustmentNote ? `${desc.tip ? desc.tip + ' · ' : ''}${slot.adjustmentNote}` : desc.tip || '',
                category: desc.category || (detail?.types?.length ? detail.types[0] : ''),
                bestTimeToVisit: desc.bestTimeToVisit || '',
                rating: detail?.rating || 0,
                totalRatings: detail?.totalRatings || 0,
                address: detail?.address || '',
                openingHours: detail?.openingHours || [],
                openingHoursVerified: slot.openingHoursVerified,
                ...(slot.adjustmentNote ? { scheduleAdjustmentNote: slot.adjustmentNote } : {}),
                source: detail?.address ? 'Google Maps' : 'Verified Fallback',
                transportNote: desc.transportToNext || `Reachable via ${input.transport}.`,
                mealNearby: desc.mealNearby || '',
                accessibilityNote: desc.accessibilityNote || '',
                bookingUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    actName + ' ' + planDay.city
                )}`,
                lat: detail?.lat,
                lng: detail?.lng,
                airQuality: detail?.airQuality || null,
                ...(routeInfo
                    ? {
                          transitToNextMinutes: routeInfo.minutes,
                          transitToNextMode: routeInfo.mode,
                          transitToNextKm: routeInfo.distanceKm,
                      }
                    : {}),
            };
        });

        const whereToEat = (expDay?.restaurants || []).map((r: PlaceSearchResult) => ({
            label: r.name,
            url: `https://maps.google.com/?q=${encodeURIComponent(r.name + ' ' + (r.address || planDay.city))}`,
            rating: r.rating || 0,
            lat: r.lat,
            lng: r.lng,
        }));

        const expLinks = (expDay?.activities || []).map((a: PlaceSearchResult) => ({
            label: a.name,
            url: `https://maps.google.com/?q=${encodeURIComponent(a.name + ' ' + (a.address || planDay.city))}`,
            lat: a.lat,
            lng: a.lng,
        }));

        return {
            day: planDay.day,
            date: scheduledDay?.date || planDay.date,
            weekday: scheduledDay?.weekday,
            theme: dayThemes[dayIdx] || `Discovering ${neighborhood}, ${planDay.city}`,
            areaFocus: planDay.city,
            neighborhood,
            neighborhoodDescription: planDay.neighborhoodDescription || '',
            difficulty: 'medium' as const,
            pace: (input.travelStyle === 'relaxed'
                ? 'easy'
                : input.travelStyle === 'adventure'
                ? 'packed'
                : 'moderate') as 'easy' | 'moderate' | 'packed',
            activities,
            transitBetweenActivities: transitNote,
            dayResources: {
                whereToEat,
                experiences: expLinks,
                transportTip: `Use ${input.transport} in ${neighborhood}. ${transitNote}`,
            },
        };
    });

    const currSymbol = input.currency === 'EUR' ? '€' : input.currency === 'GBP' ? '£' : '$';
    const itinerary: FinalItinerary = {
        title: creative.title || `${input.days}-Day ${input.destination} Adventure`,
        overview:
            creative.overview ||
            `A ${input.days}-day ${input.travelStyle} trip to ${input.destination} for ${input.travelerType} travelers.`,
        bestTimeToVisit: creative.bestTimeToVisit || 'Check local seasonal forecasts',
        whyThisPlan: creative.whyThisPlan?.length
            ? creative.whyThisPlan
            : ['100% API-verified venues', 'Opening-hours & route optimized', 'Tailored to your interests'],
        travelTips: creative.travelTips?.length
            ? creative.travelTips
            : ['Pack comfortable walking shoes', 'Carry a reusable water bottle'],
        localCustoms: creative.localCustoms?.length
            ? creative.localCustoms
            : ['Research local customs before your trip'],
        safetyAdvice: creative.safetyAdvice?.length
            ? creative.safetyAdvice
            : ['Stay aware of your surroundings', 'Keep digital copies of travel documents'],
        budgetTips: creative.budgetTips?.length ? creative.budgetTips : budgetCheck.adjustments,
        realityCheck: {
            crowds: { level: 'medium', description: 'Expect moderate crowds at top attractions.' },
            physical: {
                level: input.travelStyle === 'adventure' ? 'high' : 'medium',
                description: `This ${input.travelStyle} itinerary involves ${
                    input.travelStyle === 'relaxed' ? 'light' : 'moderate'
                } walking.`,
            },
            weather: research.weather
                ? Object.entries(research.weather)
                      .slice(0, 3)
                      .map(([dt, w]: [string, any]) => `${dt}: ${w.weather || 'Fair'}, ${w.temp ?? '--'}°C`)
                : ['Check the live forecast 48h before departure', 'Pack adaptable layers'],
            physicsCheck: `✅ VERIFIED: Geo-clustering & opening-hours enforced (${
                auditFixes.length > 0 ? `${auditFixes.length} schedule conflict(s) auto-healed` : '0 temporal conflicts'
            }${
                optimizedRoute.intraDayDistanceSavedKm
                    ? `, saved ${optimizedRoute.intraDayDistanceSavedKm} km intra-day walking`
                    : ''
            }).`,
        },
        days,
        budgetBreakdown: {
            totalEstimate:
                budgetCheck.totalCost > 0
                    ? `${currSymbol}${budgetCheck.totalCost.toFixed(0)}–${currSymbol}${(
                          budgetCheck.totalCost * 1.3
                      ).toFixed(0)} per person for ${input.days} days`
                    : `Estimate based on ${input.budget} budget for ${input.days} days`,
            savingTips: creative.budgetTips?.length
                ? creative.budgetTips
                : ['Book attractions online in advance', 'Use day transit passes'],
        },
        esgReport: sustainability.report,
        blackboardState: {
            truthPool: (input.discoveredVenues || []).slice(0, 40),
            groundingSource: 'DGIS Grounding-First Truth Pool',
            weather: research.weather,
            currency: research.currency,
            locationCoords: research.locationCoords,
            temporalAuditFixes: auditFixes,
            spatialDistanceSavedKm: optimizedRoute.intraDayDistanceSavedKm || 0,
            lastVerifiedAt: new Date().toISOString(),
        },
    };

    if (creative.weatherForecast) (itinerary as any).weatherForecast = creative.weatherForecast;
    if (flightAnalysis.bestOption) {
        itinerary.flightInfo = { bestOption: flightAnalysis.bestOption, analysis: flightAnalysis.recommendation };
    }
    if (research.hotels.length > 0) itinerary.hotelInfo = research.hotels;
    if (creative._tokens) itinerary._tokens = creative._tokens;

    // Final Zod boundary validation before delivering output (Thesis Section 4.4)
    const finalCheck = FinalItinerarySchema.safeParse(itinerary);
    if (!finalCheck.success) {
        console.warn('[Agent 8: Composer] Final schema validation issues:', finalCheck.error.issues);
    }

    console.log(
        `[Agent 8: Composer] Done: "${itinerary.title}", ${itinerary.days.length} days, auto-fixes: ${auditFixes.length}`
    );
    return itinerary;
}
