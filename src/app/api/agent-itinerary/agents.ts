/**
 * 9-Agent Itinerary System
 * 
 * Each agent is a typed async function with strict input/output contracts.
 * Agents 1,3,9 use Gemini LLM. Agents 4,5,6 are pure code. Agent 2 uses tools directly.
 * Agents 7+8 are merged into Agent 9 (Final Composer).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { googleTextSearch, googlePlaceDetails, kiwiSearchFlights, kiwiSearchHotels, generateComparisonLinks, generateHotelComparisonLinks, resolveIATACode, amadeus } from './tools';
import { getActiveModel, extractTokens } from '@/utils/ai-config';
import type {
    AgentInput, PlanResult, PlanDay,
    ResearchResult, Flight, Hotel, PlaceDetail,
    ExperienceResult, ExperienceDay, PlaceSearchResult,
    FlightAnalysis, BudgetResult, OptimizedRoute,
    ComposerInput, FinalItinerary,
} from './types';

// ─── Shared Gemini instance ─────────────────────────────────────────────────

function getGemini() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not configured');
    return new GoogleGenerativeAI(key);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 1: TRAVEL PLANNING AGENT (LLM — Structure Engine)
// ═══════════════════════════════════════════════════════════════════════════════

export async function travelPlanningAgent(input: AgentInput): Promise<PlanResult> {
    console.log('[Agent 1: Planning] Starting...');

    if (!input.destination) return { plan: [], error: 'missing_required_data', details: 'destination is required' };
    if (input.days < 1) return { plan: [], error: 'missing_required_data', details: 'duration_days must be >= 1' };
    if (!input.interests.length) {
        input.interests = ['Sightseeing'];
    }

    const genAI = getGemini();
    const activeModelName = await getActiveModel();
    const model = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: { 
            responseMimeType: 'application/json',
            maxOutputTokens: 8192 
        },
    });

    const prompt = `You are the Travel Planning Agent. Generate a day-by-day travel structure.

RULES:
- Output ONLY valid JSON matching the schema below
- Assign 2-4 activities per day based on the pace
- Group nearby attractions together (no zig-zag)
- DO NOT include hotels, flights, prices, or restaurants
- Activities must align with the user's interests
- For multi-city destinations, allocate days proportionally

INPUT:
- Destination: ${input.destination}
- Duration: ${input.days} days
- Interests: ${input.interests.join(', ')}
- Pace: ${input.travelStyle} (${input.travelStyle === 'relaxed' ? '2-3 activities/day' : input.travelStyle === 'adventure' ? '4-5 activities/day' : '3-4 activities/day'})
- Traveler: ${input.travelerType}

OUTPUT SCHEMA:
{
  "plan": [
    {
      "day": 1,
      "city": "City name",
      "activities": ["Activity 1 - specific place name", "Activity 2 - specific place name"]
    }
  ],
  "researchPlan": [
    "Step 1: Check weather for [City] in [Month] to optimize indoor/outdoor balance",
    "Step 2: Check currency exchange from [Base] to [Local] for accurate budget advice",
    "Step 3: Resolve coordinates for [City] for map planning"
  ]
}

CRITICAL GEO-ACCURACY RULES (NEVER VIOLATE):
- ALL activities MUST be physically located within or very near the requested destination: ${input.destination}
- If the destination is a CITY (e.g. "Paris"), every activity must be reachable within 1-2 hours from the city center. DO NOT add activities in other countries or distant cities.
- If the destination is a COUNTRY (e.g. "Japan"), distribute across major cities WITH logical transit routes between them. Do not jump between cities that are impossible to travel between in one day.
- NEVER add activities from a DIFFERENT COUNTRY than the destination's country.
- NEVER mix cities that require flights to reach (e.g. don't put Tokyo and Osaka activities on the same day)
- Each day's activities must be in the SAME city or within walking/short transit distance of each other.`;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        const tokens = extractTokens(result.response);
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

        let parsed: any;
        try {
            parsed = JSON.parse(text);
        } catch (e: any) {
            console.error('[Agent 1: Planning] JSON Parse Error. Raw text length:', text.length);
            console.error('[Agent 1: Planning] Raw snippet:', text.substring(0, 200) + '...', text.substring(text.length - 200));
            return { plan: [], error: 'invalid_data', details: 'LLM returned malformed JSON' };
        }

        if (!parsed.plan || !Array.isArray(parsed.plan)) {
            return { plan: [], error: 'invalid_data', details: 'LLM did not return valid plan structure' };
        }

        console.log(`[Agent 1: Planning] Generated ${parsed.plan.length}-day plan`);
        const planResult = parsed as PlanResult;
        (planResult as any)._tokens = tokens;
        return planResult;
    } catch (err: any) {
        console.error('[Agent 1: Planning] Error:', err.message);
        return { plan: [], error: 'invalid_data', details: err.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 2: TRAVEL RESEARCH AGENT (Tools — Flights + Hotels + Place Details)
// ═══════════════════════════════════════════════════════════════════════════════

export async function travelResearchAgent(plan: PlanResult, input: AgentInput): Promise<ResearchResult> {
    console.log('[Agent 2: Research] Starting...');

    if (!plan.plan.length) {
        return { flights: [], hotels: [], placeDetails: {}, error: 'missing_required_data', details: 'No plan provided' };
    }

    const flights: Flight[] = [];
    const hotels: Hotel[] = [];
    const placeDetails: Record<string, PlaceDetail> = {};

    const allActivities: string[] = [];
    const allCities = new Set<string>();
    for (const day of plan.plan) {
        allCities.add(day.city);
        allActivities.push(...day.activities);
    }

    const detailPromises: Promise<void>[] = [];
    const uniqueActivities = Array.from(new Set(allActivities)).slice(0, 15);
    const { executeTool } = await import('./tools');

    // -- 2.a Regional Research (Weather, Currency, Coords) --
    let weatherData: any = null;
    let currencyData: any = null;
    let locationCoords: any = null;

    try {
        const city = Array.from(allCities)[0] || input.destination;
        const [w, c, g] = await Promise.all([
            executeTool('getWeatherForecast', { city }),
            executeTool('getCurrencyConversion', { base: 'USD' }), // Default to USD for calculation
            executeTool('geocodeLocation', { text: city }),
        ]);
        if (w.status === 'success') weatherData = w.forecast;
        if (c.status === 'success') currencyData = { base: c.base, rates: c.rates };
        if (g.status === 'success' && g.locations?.length) {
            locationCoords = { lat: g.locations[0].lat, lng: g.locations[0].lon };
        }
    } catch (err) {
        console.warn('[Agent 2: Research] Regional research failed:', err);
    }

    // -- 2.b Place Details --
    for (const activity of uniqueActivities) {
        const day = plan.plan.find(d => d.activities.includes(activity));
        const city = day?.city || input.destination;

        detailPromises.push(
            googlePlaceDetails(activity, city).then(details => {
                if (details) {
                    placeDetails[activity] = {
                        name: details.name,
                        address: details.address,
                        rating: details.rating,
                        totalRatings: details.totalRatings,
                        summary: details.summary,
                        photoUrl: details.photoUrl,
                        openingHours: details.openingHours,
                        types: details.types,
                        lat: details.lat,
                        lng: details.lng,
                    };
                }
            }).catch(err => {
                console.warn(`[Agent 2: Research] Place detail failed for "${activity}":`, err.message);
            })
        );
    }

    // -- 2.c Flights (Amadeus + Kiwi in parallel) --
    if (input.originCity && input.startDate) {
        const kiwiDateFrom = input.startDate.split('-').reverse().join('/'); // YYYY-MM-DD → DD/MM/YYYY
        const currency = input.currency || 'USD';

        const [amadeusFlightResult, kiwiFlightResult] = await Promise.all([
            // Amadeus flight search
            (async () => {
                if (!amadeus) return null;
                try {
                    const originCode = await resolveIATACode(input.originCity!);
                    const destCode = await resolveIATACode(input.destination);
                    const response = await amadeus.shopping.flightOffersSearch.get({
                        originLocationCode: originCode,
                        destinationLocationCode: destCode,
                        departureDate: input.startDate,
                        adults: 1,
                        max: 5,
                        currencyCode: currency,
                    });
                    return (response.data || []).map((f: any) => ({
                        from: f.itineraries?.[0]?.segments?.[0]?.departure?.iataCode || input.originCity,
                        to: f.itineraries?.[0]?.segments?.slice(-1)?.[0]?.arrival?.iataCode || input.destination,
                        price: parseFloat(String(f.price?.total).replace(/[^0-9.]/g, '')) || 0,
                        date: input.startDate!,
                        airline: f.validatingAirlineCodes?.[0] || 'Unknown',
                        duration: f.itineraries?.[0]?.duration,
                        stops: (f.itineraries?.[0]?.segments?.length || 1) - 1,
                        departureTime: f.itineraries?.[0]?.segments?.[0]?.departure?.at?.substring(11, 16),
                        source: 'Amadeus' as const,
                        bookingUrl: '',
                    }));
                } catch (err: any) {
                    console.warn('[Agent 2] Amadeus flights failed:', err.message);
                    return null;
                }
            })(),
            // Kiwi flight search
            kiwiSearchFlights({
                flyFrom: input.originCity!,
                flyTo: input.destination,
                dateFrom: kiwiDateFrom,
                curr: currency,
                limit: 10,
            }),
        ]);

        // Merge results from both sources
        if (amadeusFlightResult) flights.push(...amadeusFlightResult);
        if (kiwiFlightResult) flights.push(...kiwiFlightResult);

        // Deduplicate by airline + price (keep the one with booking URL)
        const seen = new Map<string, typeof flights[number]>();
        for (const f of flights) {
            const key = `${f.airline}-${f.price}-${f.stops}`;
            const existing = seen.get(key);
            if (!existing || (f.bookingUrl && !existing.bookingUrl)) {
                seen.set(key, f);
            }
        }
        flights.length = 0;
        flights.push(...Array.from(seen.values()));

        // Sort by price
        flights.sort((a, b) => a.price - b.price);
        console.log(`[Agent 2] Merged ${flights.length} flights from Amadeus + Kiwi`);
    }

    // -- 2.d Hotels (Amadeus + Kiwi in parallel) --
    if (input.startDate) {
        const currency = input.currency || 'USD';
        const checkOutDate = input.endDate || (() => {
            const d = new Date(input.startDate!);
            d.setDate(d.getDate() + input.days);
            return d.toISOString().split('T')[0];
        })();

        const [amadeusHotelResult, kiwiHotelResult] = await Promise.all([
            // Amadeus hotel search
            (async () => {
                if (!amadeus) return null;
                try {
                    const destCode = await resolveIATACode(input.destination);
                    const hotelList = await amadeus.referenceData.locations.hotels.byCity.get({
                        cityCode: destCode,
                        radius: 30,
                        radiusUnit: 'KM',
                        hotelSource: 'ALL',
                    });
                    const hotelIds = (hotelList.data || []).slice(0, 8).map((h: any) => h.hotelId).join(',');
                    if (!hotelIds) return null;
                    const offers = await amadeus.shopping.hotelOffersSearch.get({
                        hotelIds,
                        adults: 1,
                        checkInDate: input.startDate,
                        roomQuantity: 1,
                        currency: currency,
                    });
                    return (offers.data || []).map((h: any) => ({
                        city: input.destination,
                        name: h.hotel?.name || 'Unknown Hotel',
                        price: parseFloat(String(h.offers?.[0]?.price?.total).replace(/[^0-9.]/g, '')) || 0,
                        rating: h.hotel?.rating ? parseFloat(h.hotel.rating) / 2 : 0,
                        roomType: h.offers?.[0]?.room?.description?.text || 'Standard Room',
                        source: 'Amadeus' as const,
                        bookingUrl: '',
                        stars: h.hotel?.rating ? parseInt(h.hotel.rating) : 0,
                    }));
                } catch (err: any) {
                    console.warn('[Agent 2] Amadeus hotels failed:', err.message);
                    return null;
                }
            })(),
            // Kiwi hotel search
            kiwiSearchHotels({
                cityName: input.destination,
                checkIn: input.startDate!,
                checkOut: checkOutDate,
                curr: currency,
                limit: 10,
            }),
        ]);

        if (amadeusHotelResult) hotels.push(...amadeusHotelResult);
        if (kiwiHotelResult) hotels.push(...kiwiHotelResult);

        // Sort by price
        hotels.sort((a, b) => a.price - b.price);
        console.log(`[Agent 2] Merged ${hotels.length} hotels from Amadeus + Kiwi`);
    }

    await Promise.all(detailPromises);

    console.log(`[Agent 2: Research] Found ${flights.length} flights, ${hotels.length} hotels, ${Object.keys(placeDetails).length} place details`);
    return { flights, hotels, placeDetails, weather: weatherData, currency: currencyData, locationCoords };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 3: LOCAL EXPERIENCE AGENT (Tools + LLM — Activities & Restaurants)
// ═══════════════════════════════════════════════════════════════════════════════

export async function localExperienceAgent(plan: PlanResult, input: AgentInput): Promise<ExperienceResult> {
    console.log('[Agent 3: Experience] Starting...');

    if (!plan.plan.length) {
        return { experiences: [], error: 'missing_required_data', details: 'No plan provided' };
    }

    const experiences: ExperienceDay[] = [];
    const usedRestaurants = new Set<string>();
    const usedActivities = new Set<string>();

    const restaurantQuality = input.budget === 'luxury' ? 'fine dining' :
        input.budget === 'budget' ? 'affordable local food' : 'good';

    for (const day of plan.plan) {
        const interestQuery = input.interests.length > 0
            ? `${input.interests.slice(0, 2).join(' and ')} in ${day.city}`
            : `top attractions in ${day.city}`;

        const { executeTool } = await import('./tools');

        const [activityResults, restaurantResults, fsResults] = await Promise.all([
            googleTextSearch(interestQuery),
            googleTextSearch(`best ${restaurantQuality} restaurants in ${day.city}`),
            executeTool('searchFoursquare', { query: interestQuery, near: day.city }),
        ]);

        const activities: PlaceSearchResult[] = (activityResults || [])
            .filter((p: any) => !usedActivities.has(p.name))
            .slice(0, 2)
            .map((p: any) => {
                usedActivities.add(p.name);
                return {
                    name: p.name,
                    address: p.address,
                    rating: p.rating,
                    totalRatings: p.totalRatings,
                    priceLevel: p.priceLevel,
                    types: p.types,
                    lat: p.lat,
                    lng: p.lng,
                };
            });

        const restaurants: PlaceSearchResult[] = (restaurantResults || [])
            .filter((p: any) => !usedRestaurants.has(p.name))
            .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 1)
            .map((p: any) => {
                usedRestaurants.add(p.name);
                return {
                    name: p.name,
                    address: p.address,
                    rating: p.rating,
                    totalRatings: p.totalRatings,
                    priceLevel: p.priceLevel,
                    types: p.types,
                    lat: p.lat,
                    lng: p.lng,
                };
            });

        experiences.push({
            day: day.day,
            activities,
            restaurants,
        });
    }

    console.log(`[Agent 3: Experience] Enriched ${experiences.length} days with local experiences`);
    return { experiences };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 4: FLIGHT ANALYSIS AGENT (Pure Code — Pricing Analysis)
// ═══════════════════════════════════════════════════════════════════════════════

export function flightAnalysisAgent(flights: Flight[]): FlightAnalysis {
    console.log('[Agent 4: Flight Analysis] Starting...');

    if (flights.length < 1) {
        return {
            cheapestDay: null,
            averagePrice: 0,
            lowestPrice: 0,
            bestOption: null,
            recommendation: 'No flight data available. Consider searching manually on Skyscanner or Google Flights.',
        };
    }

    const prices = flights.map(f => f.price).filter(p => p > 0);
    const lowestPrice = Math.min(...prices);
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const cheapest = flights.reduce((best, f) => f.price < best.price ? f : best, flights[0]);

    const byDate: Record<string, number[]> = {};
    for (const f of flights) {
        const date = f.date || 'unknown';
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(f.price);
    }

    let cheapestDay: string | null = null;
    let cheapestDayAvg = Infinity;
    for (const [date, datePrices] of Object.entries(byDate)) {
        const avg = datePrices.reduce((a, b) => a + b, 0) / datePrices.length;
        if (avg < cheapestDayAvg) {
            cheapestDayAvg = avg;
            cheapestDay = date;
        }
    }

    // Find best overall option: cheapest with fewest stops
    let bestOption = cheapest;
    for (const f of flights) {
        if (f.price <= bestOption.price * 1.05) { // within 5% of cheapest
            const fStops = f.stops ?? 99;
            const bestStops = bestOption.stops ?? 99;
            if (fStops < bestStops) bestOption = f;
            if (fStops === bestStops && f.bookingUrl && !bestOption.bookingUrl) bestOption = f;
        }
    }

    // Find fastest option
    const fastest = [...flights].sort((a, b) => {
        const aDur = parseDurationMinutes(a.duration);
        const bDur = parseDurationMinutes(b.duration);
        return aDur - bDur;
    })[0];

    const sources = Array.from(new Set(flights.map(f => f.source).filter(Boolean))).join(' & ');

    const recommendation = lowestPrice > 0
        ? `Best value: ${bestOption.airline || 'Unknown airline'} at $${lowestPrice.toFixed(0)}${bestOption.stops ? ` (${bestOption.stops} stop${bestOption.stops > 1 ? 's' : ''})` : ' (direct)'}${bestOption.source ? ` via ${bestOption.source}` : ''}. Average: $${averagePrice.toFixed(0)}. Data from ${sources || 'AI'}.${fastest && fastest !== bestOption ? ` Fastest: ${fastest.airline} (${fastest.duration}).` : ''}`
        : 'Flight pricing data unavailable.';

    console.log(`[Agent 4: Flight Analysis] ${flights.length} flights analyzed. Lowest: $${lowestPrice}, Sources: ${sources}`);
    return { cheapestDay, averagePrice, lowestPrice, bestOption, recommendation };
}

// Helper to parse duration strings like "PT2H30M" or "2h 30m" to minutes
function parseDurationMinutes(dur?: string): number {
    if (!dur) return 9999;
    // ISO format: PT2H30M
    const isoMatch = dur.match(/PT(\d+)H(?:(\d+)M)?/);
    if (isoMatch) return parseInt(isoMatch[1]) * 60 + (parseInt(isoMatch[2] || '0'));
    // Human format: 2h 30m
    const humanMatch = dur.match(/(\d+)h\s*(\d+)?m?/i);
    if (humanMatch) return parseInt(humanMatch[1]) * 60 + (parseInt(humanMatch[2] || '0'));
    return 9999;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 5: BUDGET OPTIMIZATION AGENT (Pure Code — Constraint Check)
// ═══════════════════════════════════════════════════════════════════════════════

export function budgetOptimizationAgent(
    flights: Flight[],
    hotels: Hotel[],
    budgetLevel: string,
    days: number,
    customBudget?: number,
    currency?: string,
): BudgetResult {
    console.log('[Agent 5: Budget] Starting...');

    // Determine total budget — custom or preset
    let totalBudget: number;
    const currLabel = currency || 'USD';

    if (customBudget && customBudget > 0) {
        totalBudget = customBudget;
    } else {
        const dailyBudgets: Record<string, number> = {
            budget: 80,
            moderate: 150,
            luxury: 400,
            custom: 150, // fallback
        };
        const dailyBudget = dailyBudgets[budgetLevel] || 150;
        totalBudget = dailyBudget * days;
    }

    const flightsCost = flights.length > 0
        ? Math.min(...flights.map(f => f.price || 0))
        : 0;

    const hotelsCost = hotels.length > 0
        ? Math.min(...hotels.map(h => h.price || 0)) * Math.max(1, days - 1)
        : 0;

    const totalCost = flightsCost + hotelsCost;
    const isWithinBudget = totalCost <= totalBudget;
    const dailyBudgetRemaining = Math.max(0, (totalBudget - totalCost) / days);

    const adjustments: string[] = [];
    if (!isWithinBudget) {
        adjustments.push(`Total estimated cost (${currLabel} ${totalCost.toFixed(0)}) exceeds your budget (${currLabel} ${totalBudget.toFixed(0)} for ${days} days)`);
        if (hotelsCost > totalBudget * 0.5) adjustments.push('Consider cheaper accommodation — try hostels, Airbnb, or booking further in advance');
        if (flightsCost > totalBudget * 0.3) adjustments.push('Consider alternative travel dates or nearby airports for cheaper flights');
        adjustments.push('Reduce number of city changes to save on transit');
    } else {
        adjustments.push(`Budget on track: ~${currLabel} ${dailyBudgetRemaining.toFixed(0)}/day remaining for food and activities`);
        if (dailyBudgetRemaining > 100) adjustments.push('You have room for 1-2 premium experiences (nice dinner, show, guided tour)');
    }

    console.log(`[Agent 5: Budget] Total: ${currLabel} ${totalCost.toFixed(0)}, Budget: ${currLabel} ${totalBudget.toFixed(0)}, OK: ${isWithinBudget}`);
    return { isWithinBudget, totalCost, flightsCost, hotelsCost, dailyBudgetRemaining, adjustments };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 6: ROUTE OPTIMIZATION AGENT (Pure Code — Geography Logic)
// ═══════════════════════════════════════════════════════════════════════════════

export function routeOptimizationAgent(plan: PlanResult): OptimizedRoute {
    console.log('[Agent 6: Route] Starting...');

    if (!plan.plan.length) {
        return { optimizedRoute: [], removedBacktracks: 0, routeChanged: false };
    }

    const citySequence: string[] = plan.plan.map(d => d.city);
    const optimized: string[] = [];
    let removedBacktracks = 0;

    for (let i = 0; i < citySequence.length; i++) {
        const city = citySequence[i];
        if (optimized.length > 0 && optimized[optimized.length - 1] === city) {
            continue;
        }
        const previousIndex = optimized.indexOf(city);
        if (previousIndex !== -1 && previousIndex < optimized.length - 1) {
            removedBacktracks++;
            continue;
        }
        optimized.push(city);
    }

    const routeChanged = removedBacktracks > 0;
    console.log(`[Agent 6: Route] Cities: ${optimized.join(' → ')}, Backtracks removed: ${removedBacktracks}`);
    return { optimizedRoute: optimized, removedBacktracks, routeChanged };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 9: FINAL ITINERARY COMPOSER (Code-First + LLM for creative text only)
// Includes: Agent 7 (Personalization) + Agent 8 (Safety & Risk)
// ═══════════════════════════════════════════════════════════════════════════════

export async function finalComposerAgent(data: ComposerInput): Promise<FinalItinerary> {
    console.log('[Agent 9: Composer] Starting final assembly...');

    const { input, plan, research, experiences, flightAnalysis, budgetCheck } = data;

    // ── Step 1: Call LLM ONLY for creative text (small, focused output) ─────
    const genAI = getGemini();
    const activeModelName = await getActiveModel();
    const model = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: { 
            responseMimeType: 'application/json',
            maxOutputTokens: 8192 
        },
    });

    // Build a compact list of place names for the LLM to describe
    const placeNames = plan.plan.flatMap((d: PlanDay) => d.activities).slice(0, 12);

    const weatherContext = research.weather ? JSON.stringify(research.weather).substring(0, 500) : 'No weather data';
    const currencyContext = research.currency ? `Base: ${research.currency.base}. Rates: EUR:${research.currency.rates.EUR}, BDT:${research.currency.rates.BDT}` : 'No currency data';

    const creativePrompt = `You are a travel writer. Generate creative text for a ${input.days}-day trip to ${input.destination} for a ${input.travelerType} (${input.travelStyle} pace, interests: ${input.interests.join(', ')}).

Return ONLY valid JSON with this EXACT structure (no markdown, no backticks):
{
  "title": "Evocative 5-8 word trip title",
  "overview": "2-3 sentence compelling overview",
  "bestTimeToVisit": "Best season/months",
  "whyThisPlan": ["Reason 1", "Reason 2", "Reason 3"],
  "travelTips": ["Tip 1", "Tip 2", "Tip 3"],
  "localCustoms": ["Custom 1", "Custom 2"],
  "safetyAdvice": ["Safety tip 1", "Safety tip 2"],
  "budgetTips": ["Money tip 1", "Money tip 2"],
  "weatherForecast": "A summary of weather impact on this plan",
  "currencyAdvice": "Exchange rate info and local payment tips",
  "dayThemes": [${plan.plan.map((_: PlanDay, i: number) => `"Theme for day ${i + 1}"`).join(', ')}],
  "activityDescriptions": {
    "Place Name": {
      "description": "Vivid, deeply immersive, and highly detailed 4-5 sentence description detailing the experience, history, and atmosphere",
      "highlights": ["Meaningful highlight 1", "Meaningful highlight 2", "Meaningful highlight 3", "Meaningful highlight 4"],
      "cost": "$X",
      "duration": "X hours",
      "tip": "Insider tip"
    }
  }
}

Places to describe (use these EXACT names as keys in activityDescriptions):
${placeNames.map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}

Keep descriptions highly detailed, immersive, and comprehensive. Provide 3-4 meaningful highlights max per place. 

CONTEXTUAL DATA FOR YOUR ACCURACY:
Weather: ${weatherContext}
Currency: ${currencyContext}

Output ONLY the JSON object.`;

    let creative: any = {};
    try {
        const result = await model.generateContent(creativePrompt);
        const finishReason = result.response.candidates?.[0]?.finishReason;
        console.log(`[Agent 9: Composer] LLM finishReason: ${finishReason}`);

        let text = result.response.text();
        // Strip markdown backticks if present
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

        try {
            creative = JSON.parse(text);
            creative._tokens = extractTokens(result.response);
            console.log('[Agent 9: Composer] Creative text parsed successfully');
        } catch (parseErr: any) {
            console.error('[Agent 9: Composer] Creative JSON parse failed, using defaults. Length:', text.length);
            console.error('[Agent 9: Composer] Snippet:', text.substring(0, 200));
            // Don't crash — use defaults instead
            creative = {};
        }
    } catch (err: any) {
        console.warn('[Agent 9: Composer] LLM call failed, using defaults:', err.message);
        creative = {};
    }

    // ── Step 2: Build the full itinerary structure in pure code ──────────
    const timeSlots = ['Morning', 'Late Morning', 'Afternoon', 'Early Evening', 'Evening'];
    const dayThemes: string[] = creative.dayThemes || [];
    const actDescs: Record<string, any> = creative.activityDescriptions || {};

    const days = plan.plan.map((planDay: PlanDay, dayIndex: number) => {
        const expDay = experiences.experiences.find((e: ExperienceDay) => e.day === planDay.day);

        const activities = planDay.activities.map((actName: string, actIndex: number) => {
            const detail = research.placeDetails[actName];
            const desc = actDescs[actName] || {};

            return {
                time: timeSlots[actIndex] || timeSlots[timeSlots.length - 1],
                title: actName,
                description: desc.description || detail?.summary || `Visit ${actName} in ${planDay.city}.`,
                highlights: desc.highlights || [],
                photoUrl: detail?.photoUrl || null,
                editorialSummary: detail?.summary || '',
                duration: desc.duration || '2 hours',
                cost: desc.cost || 'Varies',
                tip: desc.tip || '',
                rating: detail?.rating || 0,
                totalRatings: detail?.totalRatings || 0,
                address: detail?.address || '',
                openingHours: detail?.openingHours || [],
                source: detail ? 'Google Maps' : 'AI Output',
                transportNote: `Use ${input.transport} to reach ${actName}.`,
                lat: detail?.lat,
                lng: detail?.lng,
            };
        });

        const whereToEat = (expDay?.restaurants || []).map((r: PlaceSearchResult) => ({
            label: r.name,
            url: `https://maps.google.com/?q=${encodeURIComponent(r.name + ' ' + (r.address || planDay.city))}`,
            photoUrl: undefined,
            rating: r.rating || 0,
            lat: r.lat,
            lng: r.lng,
        }));

        const experienceLinks = (expDay?.activities || []).map((a: PlaceSearchResult) => ({
            label: a.name,
            url: `https://maps.google.com/?q=${encodeURIComponent(a.name + ' ' + (a.address || planDay.city))}`,
            lat: a.lat,
            lng: a.lng,
        }));

        return {
            day: planDay.day,
            theme: dayThemes[dayIndex] || `Exploring ${planDay.city}`,
            areaFocus: planDay.city,
            difficulty: 'medium' as const,
            pace: (input.travelStyle === 'relaxed' ? 'easy' : input.travelStyle === 'adventure' ? 'packed' : 'moderate') as 'easy' | 'moderate' | 'packed',
            activities,
            dayResources: {
                whereToEat,
                experiences: experienceLinks,
                transportTip: `Use ${input.transport} to get around ${planDay.city}.`,
            },
        };
    });

    // ── Step 3: Assemble the final itinerary object ─────────────────────
    const itinerary: FinalItinerary = {
        title: creative.title || `${input.days}-Day ${input.destination} Adventure`,
        overview: creative.overview || `A ${input.days}-day ${input.travelStyle} trip to ${input.destination} designed for ${input.travelerType} travelers.`,
        bestTimeToVisit: creative.bestTimeToVisit || 'Check local weather forecasts',
        whyThisPlan: creative.whyThisPlan || ['Tailored to your interests', 'Optimized route', 'Budget-friendly picks'],
        travelTips: creative.travelTips || ['Pack comfortable walking shoes', 'Carry a reusable water bottle'],
        localCustoms: creative.localCustoms || ['Research local customs before your trip'],
        safetyAdvice: creative.safetyAdvice || ['Stay aware of your surroundings', 'Keep copies of important documents'],
        budgetTips: creative.budgetTips || budgetCheck.adjustments,
        realityCheck: {
            crowds: { level: 'medium', description: 'Expect moderate crowds at popular attractions.' },
            physical: { level: input.travelStyle === 'adventure' ? 'high' : 'medium', description: `This ${input.travelStyle} itinerary involves ${input.travelStyle === 'relaxed' ? 'light' : 'moderate to significant'} walking.` },
            weather: ['Check the forecast before packing', 'Bring layers for changing weather'],
        },
        days,
        budgetBreakdown: {
            totalEstimate: budgetCheck.totalCost > 0
                ? `$${budgetCheck.totalCost.toFixed(0)}–$${(budgetCheck.totalCost * 1.3).toFixed(0)} per person for ${input.days} days`
                : `$${(budgetCheck.dailyBudgetRemaining * input.days * 0.5).toFixed(0)}–$${(budgetCheck.dailyBudgetRemaining * input.days).toFixed(0)} per person for ${input.days} days`,
            savingTips: creative.budgetTips || ['Book attractions online for discounts', 'Eat where locals eat'],
        },
    };

    // Inject weather & currency insights
    itinerary.weatherForecast = creative.weatherForecast || 'Sunny intervals expected.';
    itinerary.budgetBreakdown.currencyCode = research.currency?.base === 'USD' ? 'USD' : 'LOCAL';
    itinerary.budgetBreakdown.conversionRate = research.currency?.rates?.['EUR']; // Example

    // Inject flight info if available
    if (flightAnalysis.bestOption) {
        itinerary.flightInfo = {
            bestOption: flightAnalysis.bestOption,
            analysis: flightAnalysis.recommendation,
        };
    }

    // Inject hotel info if available
    if (research.hotels.length > 0) {
        itinerary.hotelInfo = research.hotels;
    }

    console.log(`[Agent 9: Composer] Final itinerary: "${itinerary.title}" with ${itinerary.days.length} days`);
    return itinerary;
}
