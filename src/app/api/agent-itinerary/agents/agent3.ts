/**
 * Agent 3: Research Agent
 * Fetches real flights (Duffel -> Amadeus -> Estimate fallback),
 * real hotels (Amadeus -> Estimate fallback), live weather, currency rates,
 * and verified Google Places metadata + Air Quality (Thesis Section 3.4.3 & 4.6).
 */

import {
    googlePlaceDetails,
    resolveIATACode,
    amadeus,
    duffelSearchFlights,
    openWeatherForecast,
    getCurrencyRates,
    googleGeocode,
} from '../tools';
import type { AgentInput, PlanResult, ResearchResult, Flight, Hotel, PlaceDetail } from '../types';

// ─── Pricing & Deep-Link Helpers (Fallback when live inventory unavailable) ──

function estimateFlightPrices(budget: string): [number, number, number] {
    const bands: Record<string, [number, number, number]> = {
        budget: [120, 220, 350],
        moderate: [200, 380, 580],
        luxury: [450, 800, 1400],
        custom: [200, 380, 580],
    };
    const [cheap, mid, prem] = bands[budget] || bands.moderate;
    return [cheap, mid, prem];
}

function estimateHotelPrices(budget: string): [number, number, number] {
    const perNight: Record<string, [number, number, number]> = {
        budget: [35, 65, 95],
        moderate: [90, 145, 220],
        luxury: [220, 390, 650],
        custom: [90, 145, 220],
    };
    const [cheap, mid, prem] = perNight[budget] || perNight.moderate;
    return [cheap, mid, prem];
}

export function buildFlightLinks(origin: string, destination: string, dep: string, ret?: string) {
    const depShort = dep.replace(/-/g, '');
    return {
        googleFlights: `https://www.google.com/travel/flights?q=Flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(destination)}+on+${dep}`,
        skyscanner: `https://www.skyscanner.com/transport/flights/${origin.slice(0, 3).toLowerCase()}/${destination.slice(0, 3).toLowerCase()}/${depShort.slice(2)}/?adults=1`,
        kayak: `https://www.kayak.com/flights/${encodeURIComponent(origin)}-${encodeURIComponent(destination)}/${dep}${ret ? '/' + ret : ''}?sort=bestflight_a`,
    };
}

export function buildHotelLinks(destination: string, checkIn: string, checkOut: string) {
    return {
        bookingCom: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}&checkin=${checkIn}&checkout=${checkOut}&group_adults=1`,
        agoda: `https://www.agoda.com/search?city=${encodeURIComponent(destination)}&checkIn=${checkIn}&checkOut=${checkOut}`,
        hotelscom: `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(destination)}&q-check-in=${checkIn}&q-check-out=${checkOut}`,
        tripadvisor: `https://www.tripadvisor.com/Search?searchAll=true&q=${encodeURIComponent(destination)}+hotels`,
    };
}

export function generateSmartFlights(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    budget: string;
}): Flight[] {
    const { origin, destination, departureDate, returnDate, budget } = params;
    const [bp, vp, pp] = estimateFlightPrices(budget);
    const links = buildFlightLinks(origin, destination, departureDate, returnDate);
    return [
        {
            id: `est_flt_budget_${departureDate}`,
            from: origin,
            to: destination,
            price: bp,
            date: departureDate,
            airline: 'Finnair / Regional Economy Saver',
            duration: '~4h 30m',
            stops: 1,
            source: 'Market Estimate',
            isEstimate: true,
            tier: 'budget',
            bookingUrl: links.googleFlights,
            comparisonLinks: links,
        },
        {
            id: `est_flt_value_${departureDate}`,
            from: origin,
            to: destination,
            price: vp,
            date: departureDate,
            airline: 'Lufthansa / Finnair Direct',
            duration: '~2h 50m',
            stops: 0,
            source: 'Market Estimate',
            isEstimate: true,
            tier: 'value',
            bookingUrl: links.skyscanner,
            comparisonLinks: links,
        },
        {
            id: `est_flt_prem_${departureDate}`,
            from: origin,
            to: destination,
            price: pp,
            date: departureDate,
            airline: 'Nordic Business Flex',
            duration: '~2h 45m',
            stops: 0,
            cabin: 'Business Class',
            source: 'Market Estimate',
            isEstimate: true,
            tier: 'premium',
            bookingUrl: links.kayak,
            comparisonLinks: links,
        },
    ];
}

export function generateSmartHotels(params: {
    destination: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    budget: string;
}): Hotel[] {
    const { destination, checkIn, checkOut, budget } = params;
    const [bp, mp, lp] = estimateHotelPrices(budget);
    const links = buildHotelLinks(destination, checkIn, checkOut);
    const city = destination.split(',')[0].trim();
    return [
        {
            id: `est_htl_budget_${city.toLowerCase()}`,
            city,
            name: `${city} Central Boutique Inn`,
            price: bp,
            rating: 8.0,
            stars: 3,
            roomType: 'Standard Room',
            source: 'Market Estimate',
            isEstimate: true,
            tier: 'budget',
            tag: 'cheapest',
            amenities: ['WiFi', 'Central Location'],
            bookingUrl: links.bookingCom,
            comparisonLinks: links,
        },
        {
            id: `est_htl_mid_${city.toLowerCase()}`,
            city,
            name: `Scandic / Grand ${city} Hotel`,
            price: mp,
            rating: 8.7,
            stars: 4,
            roomType: 'Superior Room',
            source: 'Market Estimate',
            isEstimate: true,
            tier: 'mid-range',
            tag: 'best-value',
            amenities: ['WiFi', 'Breakfast included', 'Sauna & Gym', 'AC'],
            bookingUrl: links.bookingCom,
            comparisonLinks: links,
        },
        {
            id: `est_htl_lux_${city.toLowerCase()}`,
            city,
            name: `The ${city} Waterfront Spa & Resort`,
            price: lp,
            rating: 9.3,
            stars: 5,
            roomType: 'Deluxe Panorama Suite',
            source: 'Market Estimate',
            isEstimate: true,
            tier: 'luxury',
            tag: 'best-rated',
            amenities: ['WiFi', 'Breakfast', 'Spa', 'Pool', 'Concierge'],
            bookingUrl: links.agoda,
            comparisonLinks: links,
        },
    ];
}

/**
 * Tiered Live Flight Procurement: Duffel -> Amadeus -> Market Estimate Fallback.
 */
export async function procureFlights(params: {
    originCity: string;
    destinationCity: string;
    departureDate: string;
    returnDate?: string;
    adults?: number;
    budget?: string;
    currency?: string;
}): Promise<Flight[]> {
    const { originCity, destinationCity, departureDate, returnDate, adults = 1, budget = 'moderate', currency = 'USD' } = params;
    const links = buildFlightLinks(originCity, destinationCity, departureDate, returnDate);

    try {
        const [originCode, destCode] = await Promise.all([
            originCity.length === 3 ? Promise.resolve(originCity.toUpperCase()) : resolveIATACode(originCity),
            destinationCity.length === 3 ? Promise.resolve(destinationCity.toUpperCase()) : resolveIATACode(destinationCity),
        ]);

        // Tier 1: Duffel Live Offers (supports instant transactional booking)
        if (originCode && destCode) {
            const duffelOffers = await duffelSearchFlights({
                originCode,
                destinationCode: destCode,
                departureDate,
                adults,
            });
            if (Array.isArray(duffelOffers) && duffelOffers.length > 0) {
                return duffelOffers.map((o: any, idx: number) => ({
                    ...o,
                    id: o.offerId || `duffel_${idx}`,
                    tier: idx === 0 ? 'budget' : idx === 1 ? 'value' : 'premium',
                    comparisonLinks: links,
                }));
            }
        }

        // Tier 2: Amadeus Live Flight Offers Search
        if (amadeus && originCode && destCode && originCode.length === 3 && destCode.length === 3) {
            const response = await amadeus.shopping.flightOffersSearch.get({
                originLocationCode: originCode,
                destinationLocationCode: destCode,
                departureDate,
                adults,
                max: 5,
                currencyCode: currency,
            });
            const data = response?.data || [];
            if (data.length > 0) {
                return data.map((f: any, idx: number): Flight => {
                    const firstSeg = f.itineraries?.[0]?.segments?.[0];
                    const lastSeg = f.itineraries?.[0]?.segments?.slice(-1)?.[0];
                    const carrier = f.validatingAirlineCodes?.[0] || firstSeg?.carrierCode || 'Airline';
                    const fltNum = firstSeg?.number ? `${carrier}${firstSeg.number}` : undefined;
                    return {
                        id: `amadeus_flt_${f.id || idx}`,
                        offerId: `amadeus_flt_${f.id || idx}`,
                        flightIata: fltNum,
                        from: firstSeg?.departure?.iataCode || originCode,
                        to: lastSeg?.arrival?.iataCode || destCode,
                        price: parseFloat(f.price?.total || '0'),
                        currency: f.price?.currency || currency,
                        date: departureDate,
                        departureTime: firstSeg?.departure?.at,
                        arrivalTime: lastSeg?.arrival?.at,
                        airline: carrier,
                        duration: f.itineraries?.[0]?.duration || 'N/A',
                        stops: Math.max(0, (f.itineraries?.[0]?.segments?.length || 1) - 1),
                        source: 'Amadeus Live GDS',
                        isEstimate: false,
                        tier: idx === 0 ? 'budget' : idx === 1 ? 'value' : 'premium',
                        bookingUrl: links.googleFlights,
                        comparisonLinks: links,
                    };
                });
            }
        }
    } catch (err: any) {
        console.warn('[Agent 3: Flights] Live GDS lookup fell back to estimate:', err?.message || err);
    }

    return generateSmartFlights({
        origin: originCity,
        destination: destinationCity,
        departureDate,
        returnDate,
        budget,
    });
}

/**
 * Tiered Live Hotel Procurement: Amadeus Hotel Offers -> Market Estimate Fallback.
 */
export async function procureHotels(params: {
    destinationCity: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    adults?: number;
    budget?: string;
    currency?: string;
}): Promise<Hotel[]> {
    const { destinationCity, checkIn, checkOut, nights, adults = 1, budget = 'moderate', currency = 'USD' } = params;
    const cityClean = destinationCity.split(',')[0].trim();
    const links = buildHotelLinks(destinationCity, checkIn, checkOut);

    try {
        const cityCode = destinationCity.length === 3
            ? destinationCity.toUpperCase()
            : await resolveIATACode(cityClean);

        if (amadeus && cityCode && cityCode.length === 3) {
            const hotelList = await amadeus.referenceData.locations.hotels.byCity.get({
                cityCode,
                radius: 25,
                radiusUnit: 'KM',
                hotelSource: 'ALL',
            });
            const hotelIds = (hotelList?.data || [])
                .slice(0, 10)
                .map((h: any) => h.hotelId)
                .filter(Boolean)
                .join(',');

            if (hotelIds) {
                const offersRes = await amadeus.shopping.hotelOffersSearch.get({
                    hotelIds,
                    adults,
                    checkInDate: checkIn,
                    ...(checkOut ? { checkOutDate: checkOut } : {}),
                    roomQuantity: 1,
                    currency,
                });
                const offersData = offersRes?.data || [];
                if (offersData.length > 0) {
                    return offersData.slice(0, 5).map((h: any, idx: number): Hotel => {
                        const offer = h.offers?.[0];
                        const total = parseFloat(offer?.price?.total || '120');
                        const perNight = nights > 0 ? Math.round(total / nights) : total;
                        return {
                            id: `amadeus_htl_${offer?.id || h.hotel?.hotelId || idx}`,
                            offerId: offer?.id || h.hotel?.hotelId,
                            city: cityClean,
                            name: h.hotel?.name || `${cityClean} Hotel`,
                            price: perNight,
                            currency: offer?.price?.currency || currency,
                            rating: 8.5,
                            stars: 4,
                            roomType: offer?.room?.typeEstimated?.category || offer?.room?.description?.text?.slice(0, 48) || 'Standard Room',
                            source: 'Amadeus Live GDS',
                            isEstimate: false,
                            tier: idx === 0 ? 'budget' : idx === 1 ? 'mid-range' : 'luxury',
                            tag: idx === 0 ? 'cheapest' : 'best-value',
                            bookingUrl: links.bookingCom,
                            comparisonLinks: links,
                        };
                    });
                }
            }
        }
    } catch (err: any) {
        console.warn('[Agent 3: Hotels] Live GDS lookup fell back to estimate:', err?.message || err);
    }

    return generateSmartHotels({
        destination: destinationCity,
        checkIn,
        checkOut,
        nights,
        budget,
    });
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

export async function researchAgent(plan: PlanResult, input: AgentInput): Promise<ResearchResult> {
    console.log('[Agent 3: Research] Starting market & venue research...');

    if (!plan.plan.length) {
        return { flights: [], hotels: [], placeDetails: {}, error: 'missing_required_data', details: 'No plan provided' };
    }

    const placeDetails: Record<string, PlaceDetail> = {};
    const allCities = new Set(plan.plan.map((d) => d.city));
    const allActivities = Array.from(new Set(plan.plan.flatMap((d) => d.activities))).slice(0, 20);

    const depDate = input.startDate || new Date(Date.now() + 14 * 86400_000).toISOString().split('T')[0];
    const checkOutDate =
        input.endDate ||
        new Date(new Date(`${depDate}T12:00:00Z`).getTime() + Math.max(1, input.days) * 86400_000)
            .toISOString()
            .split('T')[0];

    try {
        const originLabel = input.originCity?.trim() || 'HEL';
        const [flights, hotels, weather, currency, geoList] = await Promise.all([
            input.includeFlights
                ? procureFlights({
                      originCity: originLabel,
                      destinationCity: input.destination,
                      departureDate: depDate,
                      returnDate: checkOutDate,
                      budget: input.budget,
                      currency: input.currency || 'USD',
                  })
                : Promise.resolve(
                      generateSmartFlights({
                          origin: originLabel,
                          destination: input.destination,
                          departureDate: depDate,
                          returnDate: checkOutDate,
                          budget: input.budget,
                      })
                  ),
            input.includeHotels
                ? procureHotels({
                      destinationCity: input.destination,
                      checkIn: depDate,
                      checkOut: checkOutDate,
                      nights: Math.max(1, input.days - 1),
                      budget: input.budget,
                      currency: input.currency || 'USD',
                  })
                : Promise.resolve(
                      generateSmartHotels({
                          destination: input.destination,
                          checkIn: depDate,
                          checkOut: checkOutDate,
                          nights: Math.max(1, input.days - 1),
                          budget: input.budget,
                      })
                  ),
            openWeatherForecast(input.destination).catch(() => null),
            getCurrencyRates(input.currency || 'USD').catch(() => null),
            googleGeocode(input.destination).catch(() => null),
        ]);

        // Build lookup map of known placeIds from Agent 1's Truth Pool to skip redundant searchText calls
        const knownPlaceIdMap = new Map<string, string>();
        for (const v of input.discoveredVenues || []) {
            if (v?.name && v?.placeId) {
                knownPlaceIdMap.set(String(v.name).toLowerCase().trim(), String(v.placeId));
            }
        }

        // Fetch verified Google Places details + Air Quality in bounded parallel batches
        const activityCityMap: Record<string, string> = {};
        plan.plan.forEach((day) => {
            day.activities.forEach((act) => {
                activityCityMap[act] = day.city;
            });
        });

        const BATCH_SIZE = 10;
        for (let i = 0; i < allActivities.length; i += BATCH_SIZE) {
            const batch = allActivities.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map(async (activity) => {
                    const city = activityCityMap[activity] || input.destination;
                    const knownId = knownPlaceIdMap.get(activity.toLowerCase().trim());
                    const detail = await googlePlaceDetails(activity, city, knownId);
                    if (detail) {
                        placeDetails[activity] = detail as PlaceDetail;
                    }
                })
            );
        }

        const firstGeo = Array.isArray(geoList) && geoList[0] ? { lat: geoList[0].lat, lng: geoList[0].lon } : undefined;

        console.log(
            `[Agent 3: Research] Found ${flights.length} flights, ${hotels.length} hotels, ${Object.keys(placeDetails).length} place details, weather=${Boolean(weather)}.`
        );

        return {
            flights,
            hotels,
            placeDetails,
            weather: weather || undefined,
            currency: currency || undefined,
            locationCoords: firstGeo,
            details: `Acquired market data for ${allCities.size} city/cities and ${Object.keys(placeDetails).length} verified venues.`,
        };
    } catch (error: any) {
        console.error('[Agent 3: Research] Failed:', error);
        return { flights: [], hotels: [], placeDetails: {}, error: 'research_failure', details: error.message };
    }
}
