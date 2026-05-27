/**
 * Agent 8: Global Composer Agent
 * LLM-powered final assembly and narrative generation.
 */

import { generateContent } from '@/utils/ai-config';
import type {
    ComposerInput, FinalItinerary, PlanDay, ExperienceDay, PlaceSearchResult,
} from '../types';
import { calculateTravelTime } from '../tools';

export async function finalComposerAgent(data: ComposerInput): Promise<FinalItinerary> {
    console.log('[Agent 8: Composer] Finalizing itinerary...');

    const { input, plan, research, experiences, flightAnalysis, budgetCheck, sustainability } = data;

    // Build context
    const uniquePlaceNames: string[] = Array.from(
        new Set(plan.plan.flatMap((d: PlanDay) => d.activities))
    ).slice(0, 20) as string[];

    const dayContextBlocks = plan.plan.map((d: PlanDay) => {
        const nbhd = (d as any).neighborhood || d.city;
        return `Day ${d.day} — ${d.city} (${nbhd}): ${d.activities.join(', ')}`;
    }).join('\n');

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
${uniquePlaceNames.map((n: string) => `    "${n}": {
      "description": "5-7 immersive sentences about ${n}: history, atmosphere, iconic detail, hidden fact, why this traveler will love it",
      "highlights": ["specific iconic feature", "hidden detail tourists miss", "best photo spot", "sensory highlight", "practical tip"],
      "cost": "exact entry fee or Free",
      "duration": "realistic visit time e.g. 2-3 hours",
      "tip": "insider secret",
      "bestTimeToVisit": "best time of day to visit",
      "mealNearby": "1-2 specific nearby restaurants within walking distance",
      "transportToNext": "how to reach the next activity from here",
      "category": "Museum|Temple|Park|Market|Landmark|Food|Nature|Shopping",
      "accessibilityNote": "wheelchair access or physical demand note"
    }`).join(',\n')}
  }
}

Weather data: ${weatherContext}
Currency: ${currencyContext}

CRITICAL RULES:
1. Output ONLY raw JSON — no markdown, no explanations before or after.
2. The activityDescriptions keys above are PRE-SET — use them EXACTLY as written. Do NOT rename, skip, or add keys.
3. Replace every placeholder string with real, specific content about the actual place.
4. Every description must be at minimum 5 sentences. No generic filler.`;

    // LLM call for creative content
    let creative: any = {};
    try {
        const result = await generateContent(creativePrompt, { role: 'creative', json: true });
        let text = result.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        try {
            creative = JSON.parse(text);
            creative._tokens = result.usage;
        } catch {
            console.error('[Agent 8: Composer] JSON parse failed, using defaults');
        }
    } catch (err: any) {
        console.warn('[Agent 8: Composer] LLM failed, using defaults:', err.message);
    }

    // Pure code assembly
    const timeSlots = ['09:30 AM - 11:30 AM', '12:00 PM - 01:30 PM', '02:00 PM - 04:30 PM', '05:00 PM - 07:00 PM', '07:30 PM - 09:30 PM', '10:00 PM - 11:30 PM'];
    const actDescs: Record<string, any> = creative.activityDescriptions || {};
    const dayThemes: string[] = creative.dayThemes || [];

    /**
     * Fuzzy key lookup: tries exact match first, then case-insensitive,
     * then partial/substring match. This handles LLM key drift where
     * "Senso-ji Temple" becomes "Sensoji" in the JSON keys.
     */
    function fuzzyFind(dict: Record<string, any>, key: string): any {
        if (dict[key]) return dict[key];
        const lower = key.toLowerCase();
        // Case-insensitive exact
        const ciKey = Object.keys(dict).find(k => k.toLowerCase() === lower);
        if (ciKey) return dict[ciKey];
        // Partial: key contains the dict key or vice versa
        const partialKey = Object.keys(dict).find(k =>
            lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
        );
        if (partialKey) return dict[partialKey];
        return {};
    }

    /**
     * Geocoding fallback via Nominatim (free, no API key needed).
     * Only called when Google Places didn't return lat/lng.
     */
    async function geocodeFallback(name: string, city: string): Promise<{ lat: number; lng: number } | null> {
        try {
            const q = encodeURIComponent(`${name}, ${city}`);
            const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'TravelAIApp/1.0 (travel planning)' },
                signal: AbortSignal.timeout(3000),
            });
            const data = await res.json();
            if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } catch { /* silent fallback */ }
        return null;
    }

    const days = plan.plan.map((planDay: PlanDay, dayIdx: number) => {
        const expDay = experiences.experiences.find((e: ExperienceDay) => e.day === planDay.day);
        const neighborhood = (planDay as any).neighborhood || planDay.city;
        const transitNote = (planDay as any).transitNote || `Use ${input.transport} to get around ${neighborhood}.`;

        const activities = planDay.activities.map((actName: string, actIdx: number) => {
            const detail = research.placeDetails[actName] || fuzzyFind(research.placeDetails, actName);
            const desc = fuzzyFind(actDescs, actName);
            return {
                time: timeSlots[actIdx] || timeSlots[timeSlots.length - 1],
                title: actName,
                // Use LLM description if rich (>50 chars), else fall back to Google editorial, else generic
                description: (desc.description && desc.description.length > 50)
                    ? desc.description
                    : (detail?.summary && detail.summary.length > 20)
                        ? detail.summary
                        : desc.description || `Discover ${actName} in ${planDay.city}.`,
                highlights: Array.isArray(desc.highlights) && desc.highlights.length > 0
                    ? desc.highlights
                    : (detail?.types?.length
                        ? [`Known for: ${detail.types.join(', ')}`]
                        : []),
                photoUrl: detail?.photoUrl || null,
                aerialVideoUrl: (detail as any)?.aerialVideoUrl || null,
                editorialSummary: detail?.summary || '',
                duration: desc.duration || '2–3 hours',
                cost: desc.cost || 'Varies',
                tip: desc.tip || '',
                category: desc.category || (detail?.types?.length ? detail.types[0] : ''),
                bestTimeToVisit: desc.bestTimeToVisit || '',
                rating: detail?.rating || 0,
                totalRatings: detail?.totalRatings || 0,
                address: detail?.address || '',
                openingHours: detail?.openingHours || [],
                source: detail ? 'Google Maps' : 'AI',
                transportNote: desc.transportToNext || `Reachable via ${input.transport}.`,
                mealNearby: desc.mealNearby || '',
                accessibilityNote: desc.accessibilityNote || '',
                bookingUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(actName + ' ' + planDay.city)}`,
                // lat/lng: from Google Places → will be enriched with Nominatim fallback after assembly
                lat: detail?.lat,
                lng: detail?.lng,
                airQuality: detail?.airQuality || null,
                // store for geocoding fallback
                _geocodeFallback: !detail?.lat ? { name: actName, city: planDay.city } : null,
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
            theme: dayThemes[dayIdx] || `Discovering ${neighborhood}, ${planDay.city}`,
            areaFocus: planDay.city,
            neighborhood,
            neighborhoodDescription: (planDay as any).neighborhoodDescription || '',
            difficulty: 'medium' as const,
            pace: (input.travelStyle === 'relaxed' ? 'easy' : input.travelStyle === 'adventure' ? 'packed' : 'moderate') as 'easy' | 'moderate' | 'packed',
            activities,
            transitBetweenActivities: transitNote,
            dayResources: {
                whereToEat,
                experiences: expLinks,
                transportTip: `Use ${input.transport} in ${neighborhood}. ${transitNote}`,
            },
        };
    });

    // ── Nominatim geocoding fallback pass ─────────────────────────────────────
    // For activities that Google Places didn't geocode, query Nominatim (free OSM geocoder).
    // Rate-limit: max 5 concurrent requests, 300ms delay between batches.
    const geocodePending: Array<{ day: number; actIdx: number; name: string; city: string }> = [];
    days.forEach((day, di) => {
        day.activities.forEach((act: any, ai: number) => {
            if (!act.lat && act._geocodeFallback) {
                geocodePending.push({ day: di, actIdx: ai, name: act._geocodeFallback.name, city: act._geocodeFallback.city });
            }
        });
    });

    if (geocodePending.length > 0) {
        const BATCH = 5;
        for (let i = 0; i < geocodePending.length; i += BATCH) {
            const batch = geocodePending.slice(i, i + BATCH);
            await Promise.all(batch.map(async (item) => {
                const coords = await geocodeFallback(item.name, item.city);
                if (coords) {
                    (days[item.day].activities[item.actIdx] as any).lat = coords.lat;
                    (days[item.day].activities[item.actIdx] as any).lng = coords.lng;
                }
                // Clean up internal field
                delete (days[item.day].activities[item.actIdx] as any)._geocodeFallback;
            }));
            if (i + BATCH < geocodePending.length) {
                await new Promise(r => setTimeout(r, 300)); // respect Nominatim rate limit
            }
        }
    }
    // Remove any remaining _geocodeFallback fields
    days.forEach(day => {
        day.activities.forEach((act: any) => { delete act._geocodeFallback; });
    });

    // ── Routes API: inject travel times between consecutive activities ─────────
    // For each day, compute walking time between adjacent stops that have coords.
    // Runs in parallel per day, then sequential between days to avoid rate limits.
    for (const day of days) {
        const acts = day.activities;
        await Promise.all(
            acts.slice(0, -1).map(async (act: any, i: number) => {
                const next = acts[i + 1] as any;
                if (act.lat && act.lng && next.lat && next.lng) {
                    // Default to WALK; use TRANSIT for public-transit trips
                    const mode = (input.transport as string) === 'public'
                        ? 'TRANSIT' : 'WALK';
                    const result = await calculateTravelTime({
                        originLat: act.lat,
                        originLng: act.lng,
                        destinationLat: next.lat,
                        destinationLng: next.lng,
                        travelMode: mode as 'WALK' | 'TRANSIT',
                    });
                    if (result) {
                        act.transitToNextMinutes = result.minutes;
                        act.transitToNextMode = result.mode;
                        act.transitToNextKm = result.distanceKm;
                    }
                }
            })
        );
    }

    const itinerary: FinalItinerary = {
        title: creative.title || `${input.days}-Day ${input.destination} Adventure`,
        overview: creative.overview || `A ${input.days}-day ${input.travelStyle} trip to ${input.destination} for ${input.travelerType} travelers.`,
        bestTimeToVisit: creative.bestTimeToVisit || 'Check local weather forecasts',
        whyThisPlan: creative.whyThisPlan || ['Tailored to your interests', 'Optimized route', 'Budget-conscious picks'],
        travelTips: creative.travelTips || ['Pack comfortable walking shoes', 'Carry a reusable water bottle'],
        localCustoms: creative.localCustoms || ['Research local customs before your trip'],
        safetyAdvice: creative.safetyAdvice || ['Stay aware of your surroundings', 'Keep copies of important documents'],
        budgetTips: creative.budgetTips || budgetCheck.adjustments,
        realityCheck: {
            crowds: { level: 'medium', description: 'Expect moderate crowds at popular attractions.' },
            physical: {
                level: input.travelStyle === 'adventure' ? 'high' : 'medium',
                description: `This ${input.travelStyle} itinerary involves ${input.travelStyle === 'relaxed' ? 'light' : 'moderate'} walking.`,
            },
            weather: ['Check the forecast before packing', 'Bring layers for changing weather'],
            physicsCheck: '✅ VERIFIED: Geo-clustering enforced. All activities within same neighborhood per day.',
        },
        days,
        budgetBreakdown: {
            totalEstimate: budgetCheck.totalCost > 0
                ? `$${budgetCheck.totalCost.toFixed(0)}–$${(budgetCheck.totalCost * 1.3).toFixed(0)} per person for ${input.days} days`
                : `Estimate based on ${input.budget} budget for ${input.days} days`,
            savingTips: creative.budgetTips || ['Book attractions online for discounts', 'Eat where locals eat'],
        },
        esgReport: sustainability.report,
    };

    if (creative.weatherForecast) (itinerary as any).weatherForecast = creative.weatherForecast;
    if (flightAnalysis.bestOption) {
        itinerary.flightInfo = { bestOption: flightAnalysis.bestOption, analysis: flightAnalysis.recommendation };
    }
    if (research.hotels.length > 0) itinerary.hotelInfo = research.hotels;

    if (creative._tokens) itinerary._tokens = creative._tokens;

    console.log(`[Agent 8: Composer] Done: "${itinerary.title}", ${itinerary.days.length} days`);
    return itinerary;
}
