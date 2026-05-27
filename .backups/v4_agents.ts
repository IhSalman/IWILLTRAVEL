/**
 * 4-Agent Itinerary System (V4)
 * 
 * 1. Orchestrator: The Manager.
 * 2. Flight & Lodging Scout: Real-time search (Duffel, Amadeus, Airbnb).
 * 3. POI Curator: High-quality interests (Google Places).
 * 4. Routing & Logistics: Geographic clustering and sequencing.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
    googleTextSearch, googlePlaceDetails, 
    kiwiSearchFlights, kiwiSearchHotels, 
    generateComparisonLinks, generateHotelComparisonLinks, 
    generateTravelpayoutsAffiliateLink,
    resolveIATACode, amadeus, amadeusErrorHandler, executeTool 
} from './tools';
import { getActiveModel, extractTokens } from '@/utils/ai-config';
import { calculateItineraryESG, type TravelSegment } from '@/lib/esg-calculator';
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

/**
 * Robustly extracts JSON from a string that might contain markdown block markers.
 */
function cleanJSON(text: string): any {
    try {
        const cleaned = text
            .replace(/^```(?:json)?\s*/i, '') // Remove start markers
            .replace(/\s*```$/i, '')           // Remove end markers
            .trim();
        return JSON.parse(cleaned);
    } catch (err) {
        try {
            // Second pass: attempt to fix common LLM JSON mishaps
            const repaired = text
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/i, '')
                .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
                .replace(/(\w+):/g, '"$1":')    // Ensure keys are quoted (if missing)
                .trim();
            return JSON.parse(repaired);
        } catch (repairErr) {
            console.error('[JSON Cleanup] Failed both initial and repaired parse:', err);
            throw err;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 1: STRATEGY PLANNER (The Manager)
// ═══════════════════════════════════════════════════════════════════════════════

export async function strategyPlannerAgent(input: AgentInput, scout: { flights: Flight[], hotels: Hotel[] }): Promise<any> {
    console.log('[Strategy Planner] Managing travel request with actual flight/hotel data...');
    
    // This agent looks at reality (scout data) and builds a strategy string.
    
    const genAI = getGemini();
    const activeModelName = await getActiveModel();
    const model = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: { 
            responseMimeType: 'application/json',
            maxOutputTokens: 2048
        },
    });

    const bestHotel = scout.hotels[0]?.name || 'Unknown Hotel';
    const hotelLocation = scout.hotels[0]?.location || 'Unknown Location';
    const arriveTime = scout.flights[0]?.arrivalTime || 'Flexible';
    const departTime = scout.flights[scout.flights.length-1]?.departureTime || 'Flexible';

    const prompt = `You are the Lead Strategic Planner for an elite travel agency.
    Build a strategy taking into account the user's ACTUAL flight and hotel info.
    
    DESTINATION: ${input.destination}
    DAYS: ${input.days}
    INTERESTS: ${input.interests.join(', ')}
    EXPECTED ARRIVAL: ${arriveTime}
    EXPECTED DEPARTURE: ${departTime}
    CHOSEN HOTEL: ${bestHotel} (Location: ${hotelLocation})
    
    OUTPUT JSON SCHEMA:
    {
      "mission": "Briefly state the goal to sub-agents, considering arrival times and hotel location",
      "focusAreas": ["area 1", "area 2"],
      "strategicNotes": "Specific advice. E.g. 'Since they land at 4PM, keep day 1 near the hotel.'"
    }`;

    try {
        const result = await model.generateContent(prompt);
        return cleanJSON(result.response.text());
    } catch (err) {
        console.error('[Strategy Planner] Error:', err);
        return { mission: 'Plan a trip to ' + input.destination, focusAreas: [input.destination] };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 2: DATA FETCHER (Flights & Hotels)
// ═══════════════════════════════════════════════════════════════════════════════

/** Generate realistic price estimates based on route type and budget tier */
function estimateFlightPrices(origin: string, destination: string, budget: string): number[] {
    const bands: Record<string, [number, number, number]> = {
        budget: [120, 220, 350],
        moderate: [200, 380, 580],
        luxury: [450, 800, 1400],
        custom: [200, 380, 580],
    };
    const [cheap, mid, prem] = bands[budget] || bands.moderate;
    const vary = (base: number) => Math.round((base + (Math.random() * base * 0.25 - base * 0.1)) / 5) * 5;
    return [vary(cheap), vary(mid), vary(prem)];
}

function estimateHotelPrices(budget: string, nights: number): number[] {
    const perNight: Record<string, [number, number, number]> = {
        budget: [25, 55, 90],
        moderate: [80, 140, 220],
        luxury: [200, 380, 650],
        custom: [80, 140, 220],
    };
    const [cheap, mid, prem] = perNight[budget] || perNight.moderate;
    const vary = (base: number) => Math.round((base + (Math.random() * base * 0.2 - base * 0.05)) / 5) * 5;
    return [vary(cheap), vary(mid), vary(prem)];
}

function buildComparisonLinks(origin: string, destination: string, departureDate: string, returnDate?: string) {
    const dep = departureDate;
    const depShort = dep.replace(/-/g, '');
    const retShort = returnDate ? returnDate.replace(/-/g, '') : '';
    return {
        googleFlights: `https://www.google.com/travel/flights?q=Flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(destination)}+on+${dep}`,
        skyscanner: `https://www.skyscanner.com/transport/flights/${encodeURIComponent(origin.slice(0, 3).toLowerCase())}/${encodeURIComponent(destination.slice(0, 3).toLowerCase())}/${depShort.slice(2)}/?adults=1`,
        kayak: `https://www.kayak.com/flights/${encodeURIComponent(origin)}-${encodeURIComponent(destination)}/${dep}${returnDate ? '/'+returnDate : ''}?sort=bestflight_a`,
    };
}

function buildHotelLinks(destination: string, checkIn: string, checkOut: string) {
    return {
        bookingCom: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}&checkin=${checkIn}&checkout=${checkOut}&group_adults=1`,
        agoda: `https://www.agoda.com/search?city=${encodeURIComponent(destination)}&checkIn=${checkIn}&checkOut=${checkOut}`,
        hotelscom: `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(destination)}&q-check-in=${checkIn}&q-check-out=${checkOut}`,
        tripadvisor: `https://www.tripadvisor.com/Search?searchAll=true&q=${encodeURIComponent(destination)}+hotels`,
    };
}

function generateSmartFlightCards(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    budget: string;
}): Flight[] {
    const { origin, destination, departureDate, returnDate, budget } = params;
    const [budgetPrice, valuePrice, premiumPrice] = estimateFlightPrices(origin, destination, budget);
    const comparisonLinks = buildComparisonLinks(origin, destination, departureDate, returnDate);

    const airlines = {
        budget: ['Ryanair', 'EasyJet', 'Wizz Air', 'Spirit Airlines', 'Frontier', 'IndiGo', 'AirAsia'],
        value: ['Turkish Airlines', 'Emirates', 'Qatar Airways', 'Air France', 'KLM', 'Lufthansa', 'Delta'],
        premium: ['Emirates Business', 'Qatar Airways Business', 'Lufthansa Business', 'Singapore Airlines'],
    };
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    return [
        {
            from: origin, to: destination, price: budgetPrice, date: departureDate,
            airline: pick(airlines.budget), duration: '~8h 30m', stops: 1,
            source: 'Estimate', isEstimate: true, tier: 'budget',
            bookingUrl: comparisonLinks.googleFlights,
            comparisonLinks,
        },
        {
            from: origin, to: destination, price: valuePrice, date: departureDate,
            airline: pick(airlines.value), duration: '~6h 15m', stops: 0,
            source: 'Estimate', isEstimate: true, tier: 'value',
            bookingUrl: comparisonLinks.skyscanner,
            comparisonLinks,
        },
        {
            from: origin, to: destination, price: premiumPrice, date: departureDate,
            airline: pick(airlines.premium), duration: '~6h 00m', stops: 0, cabin: 'Business Class',
            source: 'Estimate', isEstimate: true, tier: 'premium',
            bookingUrl: comparisonLinks.kayak,
            comparisonLinks,
        },
    ];
}

function generateSmartHotelCards(params: {
    destination: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    budget: string;
}): Hotel[] {
    const { destination, checkIn, checkOut, nights, budget } = params;
    const [budgetPrice, midPrice, luxPrice] = estimateHotelPrices(budget, nights);
    const comparisonLinks = buildHotelLinks(destination, checkIn, checkOut);
    const cityName = destination.split(',')[0].trim();
    
    return [
        {
            city: cityName, name: `Budget Stay in ${cityName}`, price: budgetPrice,
            rating: 7.2, stars: 2, roomType: 'Standard Room', source: 'Estimate',
            isEstimate: true, tier: 'budget', tag: 'cheapest',
            amenities: ['WiFi', 'Breakfast available'],
            bookingUrl: comparisonLinks.bookingCom,
            comparisonLinks,
        },
        {
            city: cityName, name: `${cityName} City Hotel`, price: midPrice,
            rating: 8.4, stars: 3, roomType: 'Superior Room', source: 'Estimate',
            isEstimate: true, tier: 'mid-range', tag: 'best-value',
            amenities: ['WiFi', 'Breakfast included', 'Gym', 'AC'],
            bookingUrl: comparisonLinks.bookingCom,
            comparisonLinks,
        },
        {
            city: cityName, name: `${cityName} Luxury Resort`, price: luxPrice,
            rating: 9.1, stars: 5, roomType: 'Deluxe Suite', source: 'Estimate',
            isEstimate: true, tier: 'luxury', tag: 'best-rated',
            amenities: ['WiFi', 'Breakfast', 'Spa', 'Pool', 'Concierge', 'Gym'],
            bookingUrl: comparisonLinks.agoda,
            comparisonLinks,
        },
    ];
}

export async function dataFetcherAgent(input: AgentInput): Promise<{ flights: Flight[], hotels: Hotel[] }> {
    console.log('[Data Fetcher] Searching for flights and lodging...');
    let flights: Flight[] = [];
    let hotels: Hotel[] = [];

    const checkOut = input.endDate || (() => {
        const d = new Date(input.startDate!);
        d.setDate(d.getDate() + input.days);
        return d.toISOString().split('T')[0];
    })();

    // ─── FLIGHTS ────────────────────────────────────────────────────
    if (input.includeFlights && input.originCity && input.startDate) {
        const compLinks = buildComparisonLinks(input.originCity, input.destination, input.startDate, checkOut);

        // Tier 0: Travelpayouts (Monetized Data - High Priority)
        try {
            const originCode = await resolveIATACode(input.originCity);
            const destCode = await resolveIATACode(input.destination);
            console.log(`[Scout] Trying Travelpayouts Flights: ${originCode} -> ${destCode}`);
            const tpResult = await executeTool('searchTravelpayoutsFlights', {
                origin: originCode.toUpperCase(),
                destination: destCode.toUpperCase(),
                departureDate: input.startDate,
                currency: input.currency || 'USD'
            });
            if (tpResult.status === 'success' && tpResult.flights?.length > 0) {
                flights.push(...tpResult.flights.map((f: any) => ({ ...f, comparisonLinks: compLinks })));
                console.log(`[Scout] Travelpayouts flights found: ${tpResult.flights.length}`);
            }
        } catch (e) {
            console.warn('[Scout] Travelpayouts flight search failed:', e);
        }

        // Tier 1: Try Amadeus (Live Data)
        if (amadeus) {
            try {
                const originCode = await resolveIATACode(input.originCity);
                const destCode = await resolveIATACode(input.destination);
                console.log(`[Scout] Trying Amadeus Flights: ${originCode} -> ${destCode}`);
                const response = await amadeus.shopping.flightOffersSearch.get({
                    originLocationCode: originCode.toUpperCase(),
                    destinationLocationCode: destCode.toUpperCase(),
                    departureDate: input.startDate,
                    adults: 1,
                    max: 5,
                    currencyCode: 'USD',
                });
                if (response?.data?.length > 0) {
                    const amadeusFlights = response.data.map((f: any) => {
                        const seg0 = f.itineraries?.[0]?.segments?.[0];
                        const lastSeg = f.itineraries?.[0]?.segments?.slice(-1)?.[0];
                        return {
                            from: seg0?.departure?.iataCode || input.originCity,
                            to: lastSeg?.arrival?.iataCode || input.destination,
                            price: parseFloat(f.price?.total || '0'),
                            date: input.startDate!,
                            airline: f.validatingAirlineCodes?.[0] || 'Unknown',
                            duration: f.itineraries?.[0]?.duration?.replace('PT','').replace('H','h ').replace('M','m').toLowerCase() || 'N/A',
                            stops: (f.itineraries?.[0]?.segments?.length || 1) - 1,
                            departureTime: seg0?.departure?.at?.substring(11, 16) || '',
                            arrivalTime: lastSeg?.arrival?.at?.substring(11, 16) || '',
                            source: 'Amadeus' as const,
                            isEstimate: false,
                            bookingUrl: compLinks.googleFlights,
                            comparisonLinks: compLinks,
                        };
                    });
                    flights.push(...amadeusFlights);
                    console.log(`[Scout] Amadeus flights found: ${amadeusFlights.length}`);
                }
            } catch (e: any) {
                console.warn('[Scout] Amadeus flight search failed:', amadeusErrorHandler(e));
            }
        }

        // Tier 2: Try Kiwi (Fallback/Extra)
        if (flights.length < 3) {
            try {
                const kiwiResult = await executeTool('searchKiwiFlights', {
                    flyFrom: input.originCity,
                    flyTo: input.destination,
                    dateFrom: input.startDate.split('-').reverse().join('/'),
                    curr: input.currency || 'USD',
                });
                if (kiwiResult.status === 'success' && kiwiResult.flights?.length > 0) {
                    flights.push(...kiwiResult.flights.map((f: any) => ({ ...f, comparisonLinks: compLinks })));
                    console.log(`[Scout] Kiwi flights added: ${kiwiResult.flights.length}`);
                }
            } catch (e) { console.warn('[Scout] Kiwi failed:', e); }
        }

        // Tier 3: Try Duffel (no key = mock; skip mock data)
        if (flights.length === 0) {
            try {
                const originCode = await resolveIATACode(input.originCity);
                const destCode = await resolveIATACode(input.destination);
                const duffelResult = await executeTool('searchDuffelFlights', {
                    originCode, destinationCode: destCode, departureDate: input.startDate, adults: 1
                });
                if (duffelResult.status === 'success' && duffelResult.flights?.length > 0) {
                    const realFlights = duffelResult.flights.filter((f: any) => f.source !== 'Mock' && f.airline !== 'Mock Air');
                    if (realFlights.length > 0) {
                        flights.push(...realFlights.map((f: any) => ({ ...f, comparisonLinks: compLinks })));
                        console.log(`[Scout] Duffel flights: ${realFlights.length}`);
                    }
                }
            } catch (e) { console.warn('[Scout] Duffel failed:', e); }
        }

        // Tier 4: Smart estimated fallback (always useful, with REAL booking links)
        if (flights.length === 0) {
            console.log('[Scout] No real flights found → generating smart estimate cards');
            flights = generateSmartFlightCards({
                origin: input.originCity,
                destination: input.destination,
                departureDate: input.startDate,
                returnDate: checkOut,
                budget: input.budget,
            });
        }
    }

    // ─── HOTELS ─────────────────────────────────────────────────────
    if (input.includeHotels && input.startDate) {
        const hotelLinks = buildHotelLinks(input.destination, input.startDate, checkOut);

        // Tier 0: Travelpayouts (Monetized Hotels)
        try {
            console.log(`[Scout] Trying Travelpayouts Hotels for ${input.destination}...`);
            const tpResult = await executeTool('searchTravelpayoutsHotels', {
                cityName: input.destination,
                checkIn: input.startDate,
                checkOut: checkOut
            });
            if (tpResult.status === 'success' && tpResult.hotels?.length > 0) {
                hotels.push(...tpResult.hotels.map((h: any) => ({ ...h, comparisonLinks: hotelLinks })));
                console.log(`[Scout] Travelpayouts hotels found: ${tpResult.hotels.length}`);
            }
        } catch (e) {
            console.warn('[Scout] Travelpayouts hotel search failed:', e);
        }

        // Tier 1: Try Amadeus (Live Data)
        if (amadeus) {
            try {
                const cityCode = await resolveIATACode(input.destination);
                console.log(`[Scout] Trying Amadeus Hotels for ${cityCode}...`);
                
                // Note: Amadeus hotel search is usually a 2-step process (list by city, then get offers)
                const hotelList = await amadeus.referenceData.locations.hotels.byCity.get({
                    cityCode: cityCode.toUpperCase()
                });

                if (hotelList.data?.length > 0) {
                    const hotelIds = hotelList.data.slice(0, 10).map((h: any) => h.hotelId).join(',');
                    const offers = await amadeus.shopping.hotelOffersSearch.get({
                        hotelIds, adults: 1, checkInDate: input.startDate, checkOutDate: checkOut
                    });

                    if (offers.data?.length > 0) {
                        const amadeusHotels = offers.data.map((o: any) => ({
                            city: input.destination,
                            name: o.hotel?.name || 'Hotel',
                            price: parseFloat(o.offers?.[0]?.price?.total || '0'),
                            rating: 4,
                            stars: 4,
                            location: o.hotel?.address?.lines?.join(', ') || input.destination,
                            roomType: o.offers?.[0]?.room?.typeEstimated?.category || 'Standard',
                            amenities: o.hotel?.amenities || ['WiFi', 'Breakfast'],
                            imageUrl: '',
                            bookingUrl: hotelLinks.bookingCom,
                            source: 'Amadeus' as const,
                            isEstimate: false,
                            comparisonLinks: hotelLinks,
                        }));
                        hotels.push(...amadeusHotels);
                        console.log(`[Scout] Amadeus hotels found: ${amadeusHotels.length}`);
                    }
                }
            } catch (e: any) {
                console.warn('[Scout] Amadeus hotel search failed:', amadeusErrorHandler(e));
            }
        }

        // Tier 2: Try Airbnb via RapidAPI
        if (hotels.length === 0) {
            try {
                const airbnbResult = await executeTool('searchAirbnb', {
                    location: input.destination, checkIn: input.startDate, checkOut, adults: 1
                });
                if (airbnbResult.status === 'success' && airbnbResult.hotels?.length > 0) {
                    hotels.push(...airbnbResult.hotels.map((h: any) => ({ ...h, comparisonLinks: hotelLinks })));
                    console.log(`[Scout] Airbnb hotels: ${airbnbResult.hotels.length}`);
                }
            } catch (e) { console.warn('[Scout] Airbnb failed:', e); }
        }

        // Tier 3: Kiwi hotels
        if (hotels.length === 0) {
            try {
                const kiwiHotelResult = await executeTool('searchKiwiHotels', {
                    cityName: input.destination, checkIn: input.startDate, checkOut, curr: input.currency || 'USD'
                });
                if (kiwiHotelResult.status === 'success' && kiwiHotelResult.hotels?.length > 0) {
                    hotels.push(...kiwiHotelResult.hotels.map((h: any) => ({ ...h, comparisonLinks: hotelLinks })));
                    console.log(`[Scout] Kiwi hotels: ${kiwiHotelResult.hotels.length}`);
                }
            } catch (e) { console.warn('[Scout] Kiwi hotels failed:', e); }
        }

        // Tier 3: Smart estimated hotel cards (always useful)
        if (hotels.length === 0) {
            console.log('[Scout] No real hotels found → generating smart estimate cards');
            hotels = generateSmartHotelCards({
                destination: input.destination,
                checkIn: input.startDate,
                checkOut,
                nights: input.days,
                budget: input.budget,
            });
        }
    }

    console.log(`[Data Fetcher] Final results → ${flights.length} flights, ${hotels.length} hotels`);
    return {
        flights: flights.sort((a, b) => a.price - b.price),
        hotels: hotels.sort((a, b) => a.price - b.price),
    };
}


// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 3: LOCAL GUIDE (POI Curator)
// ═══════════════════════════════════════════════════════════════════════════════

export async function localGuideAgent(input: AgentInput, mission: any, hotels: Hotel[]): Promise<PlaceDetail[]> {
    console.log('[Local Guide] Generating target search queries and curating POIs...');
    
    const bestHotelLocation = hotels[0]?.location || input.destination;
    
    // Instead of raw text search, we will use the LLM to write 3 optimal Google Places queries, then scrape them.
    const genAI = getGemini();
    const activeModelName = await getActiveModel();
    const model = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are an expert Local Guide. 
    The user is staying near: ${bestHotelLocation}.
    Strategy: ${mission.mission || 'General tourism'}.
    Interests: ${input.interests.join(', ')}
    
    Task: Output 3 specific Google Maps text search queries that will yield incredible POIs.
    Query 1: Should be close to the hotel.
    Query 2: Should be about their main interests.
    Query 3: Should be a famous local hidden gem.
    
    OUTPUT JSON SCHEMA:
    { "queries": ["query 1", "query 2", "query 3"] }`;

    let queries: string[] = [`${input.interests.join(' ')} attractions near ${bestHotelLocation}`];
    try {
        const res = await model.generateContent(prompt);
        queries = cleanJSON(res.response.text()).queries || queries;
    } catch(e) { }

    const detailedPOIs: PlaceDetail[] = [];
    for (const query of queries) {
        const searchResult = await googleTextSearch(query);
        if (searchResult) {
            const limited = searchResult.slice(0, 5); // 5 from each query = ~15 total
            for (const poi of limited) {
                if (!detailedPOIs.find(p => p.name === poi.name)) {
                   const details = await googlePlaceDetails(poi.name, input.destination);
                   if (details) detailedPOIs.push(details as PlaceDetail);
                }
            }
        }
    }
    console.log(`[Local Guide] Gathered ${detailedPOIs.length} detailed POIs from targeted queries`);
    return detailedPOIs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 4: ROUTE PLANNER (Logistics)
// ═══════════════════════════════════════════════════════════════════════════════

export async function routePlannerAgent(pois: PlaceDetail[], input: AgentInput, mission: any, scout: { flights: Flight[], hotels: Hotel[] }, critique?: any): Promise<PlanResult> {
    console.log(critique ? '[Route Planner] Refinement Pass (fixing critique)...' : '[Route Planner] Draft 1: Clustering and sequencing route...');
    
    const genAI = getGemini();
    const activeModelName = await getActiveModel();
    const model = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: { 
            responseMimeType: 'application/json',
            maxOutputTokens: 4096 
        },
    });

    const bestHotel = scout.hotels[0]?.name || 'Unknown Hotel';
    const hotelLocation = scout.hotels[0]?.location || 'their accommodation';
    const arriveTime = scout.flights[0]?.arrivalTime || 'Flexible';
    const departTime = scout.flights[scout.flights.length-1]?.departureTime || 'Flexible';

    const critiqueAddition = critique ? `\nCRITIQUE TO FIX:\n${JSON.stringify(critique)}\nYou MUST fix all logical, spatial, and timing errors mentioned above in your newly generated plan.\n` : '';

    const prompt = `You are a Senior Route Planner.
    You have a list of ${pois.length} places with their coordinates.
    Organize them into a ${input.days}-day itinerary.
    
    RULES:
    1. The user sleeps at ${bestHotel} near ${hotelLocation}. VERY IMPORTANT: Start the day near the hotel and end the day near the hotel.
    2. The user arrives at ${arriveTime} on Day 1. DO NOT plan morning activities on Day 1 if they land late!
    3. The user departs at ${departTime} on the last day. DO NOT plan evening activities on the last day if they fly early!
    4. Cluster points tightly by geography.
    5. Max 3-4 activities per day.
    3. Respect realistic travel velocity. Verify if two places can actually be visited within a logical timeframe.
    4. Provide the exact coordinates for EACH place.
    5. Ensure all coordinates (lat, lng) are NUMBERS.
    6. Output ONLY valid JSON.
    ${critiqueAddition}
    PLACES:
    ${pois.map(p => `- ${p.name} (Lat: ${p.lat}, Lng: ${p.lng})`).join('\n')}
    
    OUTPUT SCHEMA:
    {
      "plan": [
        {
          "day": 1,
          "city": "${input.destination}",
          "activities": [
             { "name": "Place Name", "sequence": 1, "lat": 0.0, "lng": 0.0 },
             { "name": "Place Name", "sequence": 2, "lat": 0.0, "lng": 0.0 }
          ]
        }
      ]
    }`;

    try {
        const result = await model.generateContent(prompt);
        const parsed = cleanJSON(result.response.text());
        
        // Convert to standard PlanResult format but keep the coordinates
        return {
            plan: parsed.plan.map((d: any) => ({
                day: d.day,
                city: d.city,
                activities: d.activities.sort((a: any, b: any) => a.sequence - b.sequence).map((a: any) => a.name),
                _enrichedActivities: d.activities // Hidden property for Composer
            }))
        };
    } catch (err: any) {
        console.warn('[Route Planner] AI cluster failed, using deterministic fallback:', err.message);
        
        // Deterministic Fallback: Divide POIs across the requested days
        const plan: PlanDay[] = [];
        const perDay = Math.ceil(pois.length / input.days);
        
        for (let i = 0; i < input.days; i++) {
            const start = i * perDay;
            const end = start + perDay;
            const dayPois = pois.slice(start, end);
            
            if (dayPois.length > 0) {
                plan.push({
                    day: i + 1,
                    city: input.destination,
                    activities: dayPois.map(p => p.name),
                    _enrichedActivities: dayPois.map((p, idx) => ({
                        name: p.name,
                        sequence: idx + 1,
                        lat: p.lat,
                        lng: p.lng
                    }))
                });
            }
        }
        
        return { plan };
    }
}

// Note: Legacy agents have been replaced.

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 5: THE REVIEWER (QA Critic)
// ═══════════════════════════════════════════════════════════════════════════════

export async function reviewerAgent(plan: PlanResult, pois: PlaceDetail[], input: AgentInput, scout: { flights: Flight[], hotels: Hotel[] }): Promise<{ isValid: boolean, critique: string }> {
    console.log('[Reviewer] Scrutinizing the drafted itinerary for physics/logic/timing violations...');
    const genAI = getGemini();
    const activeModelName = await getActiveModel();
    // Use an ultra-fast/smart model if available for review, default back to active
    const model = genAI.getGenerativeModel({
        model: activeModelName,
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1024 },
    });

    const arriveTime = scout.flights[0]?.arrivalTime || 'Flexible';
    const hotelLocation = scout.hotels[0]?.location || 'Unknown Location';

    const prompt = `You are a strict QA Travel Reviewer. 
    Review this drafted itinerary for temporal or spatial impossibilities.
    
    TRUTH: 
    - Arrival: ${arriveTime}. (If Day 1 has activities BEFORE this time, clearly REJECT).
    - Hotel: ${hotelLocation}. (If Day 1 starts very far from here immediately after landing, REJECT).
    
    DRAFT PLAN:
    ${JSON.stringify(plan.plan, null, 2)}
    
    OUTPUT SCHEMA:
    {
      "isValid": false, // true if strictly perfect, false if there are physical/logical violations
      "critique": "If false, strictly explain which days/places violate constraints. If true, say 'Approved'."
    }`;

    try {
        const result = await model.generateContent(prompt);
        return cleanJSON(result.response.text());
    } catch(e) {
        console.warn('[Reviewer] Failed to review, assuming valid to prevent blockage.', e);
        return { isValid: true, critique: 'Approved' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 6: ITINERARY WRITER (Final Assembly)
// ═══════════════════════════════════════════════════════════════════════════════

export async function itineraryWriterAgent(data: {
    input: AgentInput;
    plan: PlanResult;
    scout: { flights: Flight[], hotels: Hotel[] };
    pois: PlaceDetail[];
}): Promise<FinalItinerary> {
    const { input, plan, scout, pois } = data;
    console.log('[Itinerary Writer] Finalizing itinerary assembly...');

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
    const allActivities = plan.plan.flatMap((d: PlanDay) => d.activities);
    const placeNames = allActivities.slice(0, 15);

    const creativePrompt = `You are a Senior Travel Writer & Concierge with 5 years of elite luxury experience.
    Generate creative, high-converting text for a flawless ${input.days}-day trip to ${input.destination} for a ${input.travelerType} (${input.travelStyle} pace, interests: ${input.interests.join(', ')}).
    Your copy should make the user want to immediately book this highly accurate, physically-verified itinerary.

Return ONLY valid JSON with this EXACT structure:
{
  "title": "Evocative 5-8 word trip title",
  "overview": "2-3 sentence compelling overview",
  "bestTimeToVisit": "Best season/months",
  "whyThisPlan": ["Reason 1", "Reason 2", "Reason 3"],
  "travelTips": ["Tip 1", "Tip 2", "Tip 3"],
  "localCustoms": ["Custom 1", "Custom 2"],
  "safetyAdvice": ["Safety tip 1", "Safety tip 2"],
  "budgetTips": ["Money tip 1", "Money tip 2"],
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

CRITICAL: Return ONLY valid JSON. No markdown backticks, no text before or after correctly formatted object.

Places to describe (use these EXACT names as keys in activityDescriptions):
${placeNames.map((n: string, i: number) => `${i + 1}. ${n}`).join('\n')}

Output ONLY the JSON object.`;

    let creative: any = {};
    try {
        const result = await model.generateContent(creativePrompt);
        creative = cleanJSON(result.response.text());
        creative._tokens = extractTokens(result.response);
        
        // Ensure critical fields exist
        if (!creative.title || !creative.activityDescriptions) {
             throw new Error('Incomplete AI response');
        }
    } catch (err: any) {
        console.warn('[Itinerary Writer] LLM call or parse failed, using robust fallback:', err.message);
        creative = {
            title: `${input.days}-Day trip to ${input.destination}`,
            overview: `A curated ${input.days}-day adventure in ${input.destination} designed for a ${input.travelerType}.`,
            bestTimeToVisit: "Depends on local seasonality",
            whyThisPlan: ["Optimized for " + input.travelStyle, "Focuses on interests: " + input.interests.join(', ')],
            travelTips: ["Check local weather", "Carry some local currency"],
            localCustoms: ["Varies by region"],
            safetyAdvice: ["Standard traveler precautions"],
            budgetTips: ["Monitor local spending"],
            dayThemes: Array(input.days).fill(0).map((_, i) => `Exploring ${input.destination} - Day ${i + 1}`),
            activityDescriptions: {} // Will be filled by poiDetail fallback
        };
    }

    // ── Create the day-by-day structure ──
    const timeSlots = ['Morning', 'Late Morning', 'Afternoon', 'Early Evening', 'Evening'];
    const actDescs = creative.activityDescriptions || {};

    const days = plan.plan.map((planDay: PlanDay, idx: number) => {
        const enriched = (planDay as any)._enrichedActivities || [];
        
        const activities = planDay.activities.map((actName, actIdx) => {
            const poiDetail = pois.find(p => p.name === actName);
            const enrichedAct = enriched.find((ea: any) => ea.name === actName);
            const desc = actDescs[actName] || {};

            return {
                time: timeSlots[actIdx] || 'Activity',
                title: actName,
                description: desc.description || poiDetail?.summary || `Explore ${actName}.`,
                highlights: desc.highlights || [],
                photoUrl: poiDetail?.photoUrl || null,
                editorialSummary: poiDetail?.summary || '',
                duration: desc.duration || '2 hours',
                cost: desc.cost || 'Varies',
                tip: desc.tip || '',
                rating: poiDetail?.rating || 0,
                totalRatings: poiDetail?.totalRatings || 0,
                address: poiDetail?.address || '',
                openingHours: poiDetail?.openingHours || [],
                source: poiDetail ? 'Google Maps' : 'AI Output',
                transportNote: `Use ${input.transport} to reach ${actName}.`,
                bookingUrl: generateTravelpayoutsAffiliateLink(`https://www.getyourguide.com/s/?q=${encodeURIComponent(actName)}&lc=${encodeURIComponent(input.destination)}`),
                lat: enrichedAct?.lat || poiDetail?.lat,
                lng: enrichedAct?.lng || poiDetail?.lng,
            };
        });

        return {
            day: planDay.day,
            theme: (creative.dayThemes || [])[idx] || `Exploring ${planDay.city}`,
            areaFocus: planDay.city,
            difficulty: 'medium' as const,
            pace: (input.travelStyle === 'relaxed' ? 'easy' : input.travelStyle === 'adventure' ? 'packed' : 'moderate') as any,
            activities,
            dayResources: {
                whereToEat: [], // Simplified for now
                experiences: [],
                transportTip: `Getting around ${planDay.city} via ${input.transport}.`,
            },
        };
    });

    // ── Build Final Itinerary ──
    const itinerary: FinalItinerary = {
        title: creative.title || `${input.days}-Day ${input.destination} Trip`,
        overview: creative.overview || '',
        bestTimeToVisit: creative.bestTimeToVisit || 'All year round',
        whyThisPlan: creative.whyThisPlan || [],
        travelTips: creative.travelTips || [],
        localCustoms: creative.localCustoms || [],
        safetyAdvice: creative.safetyAdvice || [],
        budgetTips: creative.budgetTips || [],
        realityCheck: {
            crowds: { level: 'medium', description: 'Moderate presence' },
            physical: { level: 'medium', description: 'Standard walking' },
            weather: ['Check forecast'],
        },
        days,
        budgetBreakdown: {
            totalEstimate: scout.flights.length > 0 ? `Est. flights from $${scout.flights[0].price}` : 'Varies',
            savingTips: [],
        },
        flightInfo: scout.flights.length > 0 ? {
            bestOption: scout.flights[0],
            analysis: `Found ${scout.flights.length} flights. Cheapest is $${scout.flights[0].price} via ${scout.flights[0].source}.`
        } : undefined,
        hotelInfo: scout.hotels.length > 0 ? scout.hotels : [],
    };

    // ESG Calculation
    try {
        const segments: TravelSegment[] = [];
        const firstPoi = pois[0];
        if (firstPoi && firstPoi.lat !== undefined && firstPoi.lng !== undefined) {
            segments.push({
                mode: 'flight_medium',
                origin_lat: firstPoi.lat + 5, // Mock origin
                origin_lon: firstPoi.lng + 5,
                dest_lat: firstPoi.lat,
                dest_lon: firstPoi.lng,
                passengers: 1
            });
        }
        itinerary.esgReport = calculateItineraryESG(segments);
    } catch (e) {
        console.warn('ESG calculation failed:', e);
    }

    return itinerary;
}
