/**
 * Agent Tool Definitions for Itinerary Generation
 * 
 * These tools wrap real APIs (Amadeus, Google Places) so the Gemini LLM
 * can call them during its reasoning loop to gather real-world data.
 */

// @ts-ignore — no types for amadeus package
import Amadeus from 'amadeus';
import axios from 'axios';
import { cityToIata } from '@/lib/airports';
export let amadeus: any;
if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
    if (process.env.AMADEUS_CLIENT_ID === process.env.AMADEUS_CLIENT_SECRET) {
        console.warn('[Amadeus] WARNING: AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are identical. This usually causes AuthenticationError.');
    }
    console.log('[Amadeus] Initializing client...');
    amadeus = new Amadeus({
        clientId: process.env.AMADEUS_CLIENT_ID,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET,
        hostname: 'test', // 'test' or 'production'
    });
} else {
    console.warn('[Amadeus] Missing AMADEUS_CLIENT_ID or AMADEUS_CLIENT_SECRET.');
}

/**
 * Robustly parses Amadeus SDK errors (ResponseError, AuthenticationError, etc.)
 */
export function amadeusErrorHandler(err: any): string {
    if (!err) return 'Unknown Amadeus error';
    
    // 1. Check for specific code (e.g., 'AuthenticationError')
    const code = err.code || (err.constructor ? err.constructor.name : 'Error');
    
    // 2. Extract detail from description (often an array of API errors)
    let details = '';
    if (err.description && Array.isArray(err.description)) {
        details = err.description.map((d: any) => `${d.title}: ${d.detail}`).join(' | ');
    } else if (err.description) {
        details = String(err.description);
    } else if (err.response?.result?.errors) {
        details = err.response.result.errors.map((e: any) => e.detail).join(' | ');
    }
    
    return `[${code}] ${details || err.message || 'No details'}`;
}

import { cached, DAY_MS } from '@/utils/cache';
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY || '';
const FOURSQUARE_KEY = process.env.FOURSQUARE_API_KEY || '';
const KIWI_API_KEY = process.env.KIWI_API_KEY || '';
const DUFFEL_TOKEN = process.env.DUFFEL_TOKEN || '';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_TOKEN || '';
const TRAVELPAYOUTS_MARKER = process.env.TRAVELPAYOUTS_MARKER || '515463';
const APIFY_API_KEY = process.env.APIFY_API_KEY || '';

/**
 * Exponential backoff utility for robust API calls (as specified in thesis section 4.9)
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 2,
    delay: number = 1000,
    context: string = 'API'
): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        if (retries <= 0) throw err;
        console.warn(`[${context}] Error: ${err.message}. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 2, context);
    }
}

/**
 * Enhanced fetch with integrated retry logic for server errors and rate limits.
 */
async function fetchWithRetry(url: string, options?: RequestInit, retries: number = 2): Promise<Response> {
    return withRetry(async () => {
        const res = await fetch(url, options);
        if (!res.ok) {
            // Retry on server errors (5xx) or rate limits (429)
            if (res.status >= 500 || res.status === 429) {
                throw new Error(`HTTP ${res.status}`);
            }
        }
        return res;
    }, retries, 1000, `Fetch ${new URL(url).hostname}`);
}

// ─── Google Geocoding API Helpers ─────────────────────────────────────────────
// Uses GOOGLE_PLACES_API_KEY — no extra key needed.
export async function googleGeocode(text: string) {
    if (!GOOGLE_PLACES_KEY) return null;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${GOOGLE_PLACES_KEY}`;
    try {
        const res = await fetchWithRetry(url);
        const data = await res.json();
        if (data.status !== 'OK' || !data.results?.length) return null;
        return data.results.map((r: any) => {
            const comps = r.address_components || [];
            const get = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name || '';
            return {
                name: r.formatted_address,
                lat: r.geometry.location.lat,
                lon: r.geometry.location.lng,
                city: get('locality') || get('administrative_area_level_1'),
                country: get('country'),
                type: r.types?.[0] || 'address',
            };
        });
    } catch (err: any) {
        console.warn('[Geocoding API] Error:', err.message);
        return null;
    }
}

async function googleReverseGeocode(lat: number, lon: number) {
    if (!GOOGLE_PLACES_KEY) return null;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_PLACES_KEY}`;
    try {
        const res = await fetchWithRetry(url);
        const data = await res.json();
        const result = data.results?.[0];
        if (!result) return null;
        const comps = result.address_components || [];
        const get = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name || '';
        return {
            formatted: result.formatted_address,
            city: get('locality') || get('administrative_area_level_1'),
            country: get('country'),
            postcode: get('postal_code'),
        };
    } catch (err: any) {
        console.warn('[Geocoding API] Reverse error:', err.message);
        return null;
    }
}


// ─── Google Weather API Helper ────────────────────────────────────────────────
// Uses GOOGLE_PLACES_API_KEY — no separate key needed.
// Returns a clean daily forecast summary for the AI composer agent.
export async function openWeatherForecast(city: string) {
    if (!GOOGLE_PLACES_KEY) return null;

    try {
        // Step 1: Geocode city
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${GOOGLE_PLACES_KEY}`;
        const geoRes = await fetchWithRetry(geoUrl);
        const geoData = await geoRes.json();
        const loc = geoData.results?.[0]?.geometry?.location;
        
        if (!loc) {
            console.warn('[Google Weather API] Geocoding failed for city:', city, 'Status:', geoData.status);
            return null;
        }

        // Step 2: Call Google Weather API
        const wxUrl = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${GOOGLE_PLACES_KEY}&location.latitude=${loc.lat}&location.longitude=${loc.lng}&days=7&pageSize=7`;
        const wxRes = await fetchWithRetry(wxUrl);
        if (!wxRes.ok) {
            const errText = await wxRes.text();
            console.warn('[Google Weather API] Failed:', wxRes.status, errText.substring(0, 200));
            return null;
        }
        const wxData = await wxRes.json();

        const daily: Record<string, any> = {};
        (wxData.forecastDays || wxData.dailyForecasts || []).forEach((day: any) => {
            const date = day.interval?.startTime?.split('T')[0] ||
                         day.forecastTime?.split('T')[0] ||
                         `day_${Object.keys(daily).length}`;
            daily[date] = {
                temp: day.maxTemp?.degrees ?? day.daytimeForecast?.temperature?.degrees ?? day.temperatureMax?.value ?? null,
                tempMin: day.minTemp?.degrees ?? day.temperatureMin?.value ?? null,
                weather: day.daytimeForecast?.weatherCondition?.description?.text ||
                         day.weatherCondition?.description?.text || 'Partly Cloudy',
                precipitation: day.daytimeForecast?.precipitationProbability ?? day.precipitationProbability ?? 0,
                humidity: day.daytimeForecast?.relativeHumidity ?? day.relativeHumidity ?? null,
                wind: day.daytimeForecast?.wind?.speed?.value ?? day.windSpeed?.value ?? null,
                uvIndex: day.maxUvIndex ?? day.uvIndex ?? null,
            };
        });
        return Object.keys(daily).length > 0 ? daily : null;
    } catch (err: any) {
        console.warn('[Google Weather API] Error:', err.message);
        return null;
    }
}

// ─── Air Quality API Helper ───────────────────────────────────────────────────
// Uses GOOGLE_PLACES_API_KEY — no separate key needed.
// Returns AQI index, category, and dominant pollutant for the location.
// Memoized by ~11km grid cell (0.1 deg) so 20 venues in one city only trigger 1 API call.
const aqiCache = new Map<string, { aqi: number; category: string; dominantPollutant: string; color: string }>();

export async function getAirQuality(lat: number, lng: number): Promise<{
    aqi: number;
    category: string;
    dominantPollutant: string;
    color: string;
} | null> {
    if (!GOOGLE_PLACES_KEY) return null; // no data → show nothing, never a made-up reading
    const cacheKey = `${lat.toFixed(1)},${lng.toFixed(1)}`;
    if (aqiCache.has(cacheKey)) {
        return aqiCache.get(cacheKey)!;
    }
    try {
        const url = 'https://airquality.googleapis.com/v1/currentConditions:lookup';
        const res = await fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
            },
            body: JSON.stringify({
                location: { latitude: lat, longitude: lng },
                extraComputations: ['DOMINANT_POLLUTANT_CONCENTRATION', 'POLLUTANT_ADDITIONAL_INFO'],
                languageCode: 'en',
            }),
        });
        if (!res.ok) {
            return null; // no data → show nothing, never a made-up reading
        }
        const data = await res.json();
        const indexes = data.indexes || [];
        const uaqiIndex = indexes.find((i: any) => i.code === 'uaqi') || indexes[0];
        if (!uaqiIndex) {
            return null; // no data → show nothing, never a made-up reading
        }
        const result = {
            aqi: uaqiIndex.aqi || 0,
            category: uaqiIndex.category || 'Unknown',
            dominantPollutant: data.dominantPollutant || uaqiIndex.dominantPollutant || 'N/A',
            color: uaqiIndex.color
                ? `rgb(${Math.round((uaqiIndex.color.red || 0) * 255)},${Math.round((uaqiIndex.color.green || 0) * 255)},${Math.round((uaqiIndex.color.blue || 0) * 255)})`
                : '#4CAF50',
        };
        aqiCache.set(cacheKey, result);
        return result;
    } catch (err: any) {
        console.warn('[Air Quality API] Error:', err.message);
        return null; // no data → show nothing, never a made-up reading
    }
}



// ─── Foursquare Helpers ───
export async function foursquareSearch(query: string, near: string) {
    if (!FOURSQUARE_KEY) return null;
    const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}&near=${encodeURIComponent(near)}&limit=10&fields=name,location,rating,description,tel,website,photos,stats`;
    const res = await fetchWithRetry(url, {
        headers: { 'Authorization': FOURSQUARE_KEY, 'Accept': 'application/json' }
    });
    const data = await res.json();
    return (data.results || []).map((p: any) => ({
        name: p.name,
        address: p.location?.formatted_address,
        rating: (p.rating ? p.rating / 2 : null), // Foursquare is 0-10
        totalRatings: p.stats?.total_ratings || 0,
        distance: p.distance,
        categories: p.categories?.map((c: any) => c.name) || [],
    }));
}

// ─── Currency Helpers ───
export async function getCurrencyRates(base: string = 'USD') {
    // Using open.er-api.com as it truly requires no key for simple lookups
    const url = `https://open.er-api.com/v6/latest/${base.toUpperCase()}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.result !== 'success') return null;
    return {
        base: data.base_code,
        rates: data.rates,
        lastUpdate: data.time_last_update_utc,
    };
}

// ─── Kiwi Tequila Flight Search ───
export async function kiwiSearchFlights(params: {
    flyFrom: string;      // city name or IATA
    flyTo: string;        // city name or IATA
    dateFrom: string;     // DD/MM/YYYY
    dateTo?: string;
    returnFrom?: string;
    returnTo?: string;
    adults?: number;
    curr?: string;        // currency code
    limit?: number;
}) {
    if (!KIWI_API_KEY) return null;

    const url = new URL('https://api.tequila.kiwi.com/v2/search');
    url.searchParams.set('fly_from', params.flyFrom);
    url.searchParams.set('fly_to', params.flyTo);
    url.searchParams.set('date_from', params.dateFrom);
    if (params.dateTo) url.searchParams.set('date_to', params.dateTo);
    if (params.returnFrom) url.searchParams.set('return_from', params.returnFrom);
    if (params.returnTo) url.searchParams.set('return_to', params.returnTo);
    url.searchParams.set('adults', String(params.adults || 1));
    url.searchParams.set('curr', params.curr || 'USD');
    url.searchParams.set('limit', String(params.limit || 10));
    url.searchParams.set('sort', 'price');
    url.searchParams.set('max_stopovers', '2');

    try {
        const res = await fetchWithRetry(url.toString(), {
            headers: { 'apikey': KIWI_API_KEY, 'Accept': 'application/json' },
        });
        if (!res.ok) {
            console.warn('[Kiwi Flights] API error:', res.status, await res.text().catch(() => ''));
            return null;
        }
        const data = await res.json();
        return (data.data || []).slice(0, 10).map((f: any) => {
            const route0 = f.route?.[0];
            return {
                from: f.cityFrom || route0?.cityFrom || params.flyFrom,
                to: f.cityTo || f.route?.slice(-1)?.[0]?.cityTo || params.flyTo,
                price: f.price || 0,
                date: params.dateFrom,
                airline: f.airlines?.join(', ') || route0?.airline || 'Multiple',
                duration: f.fly_duration || '',
                stops: Math.max(0, (f.route?.length || 1) - 1),
                departureTime: route0?.local_departure?.substring(11, 16) || '',
                arrivalTime: f.route?.slice(-1)?.[0]?.local_arrival?.substring(11, 16) || '',
                source: 'Kiwi',
                bookingUrl: f.deep_link || `https://www.kiwi.com/deep?from=${params.flyFrom}&to=${params.flyTo}`,
            };
        });
    } catch (err: any) {
        console.warn('[Kiwi Flights] Error:', err.message);
        return null;
    }
}

// ─── Kiwi Tequila Hotel Search ───
export async function kiwiSearchHotels(params: {
    cityName: string;
    checkIn: string;   // YYYY-MM-DD
    checkOut: string;  // YYYY-MM-DD
    adults?: number;
    curr?: string;
    limit?: number;
}) {
    if (!KIWI_API_KEY) return null;

    // Step 1: Resolve city to Kiwi location id
    const locUrl = `https://api.tequila.kiwi.com/locations/query?term=${encodeURIComponent(params.cityName)}&location_types=city&limit=1`;
    try {
        const locRes = await fetchWithRetry(locUrl, { headers: { 'apikey': KIWI_API_KEY } });
        if (!locRes.ok) return null;
        const locData = await locRes.json();
        const cityId = locData.locations?.[0]?.id;
        if (!cityId) return null;

        // Step 2: Search hotels
        const hotelUrl = new URL('https://api.tequila.kiwi.com/stays/search');
        hotelUrl.searchParams.set('location_id', cityId);
        hotelUrl.searchParams.set('checkin', params.checkIn);
        hotelUrl.searchParams.set('checkout', params.checkOut);
        hotelUrl.searchParams.set('adults', String(params.adults || 1));
        hotelUrl.searchParams.set('currency', params.curr || 'USD');
        hotelUrl.searchParams.set('limit', String(params.limit || 10));
        hotelUrl.searchParams.set('order_by', 'price');

        const res = await fetchWithRetry(hotelUrl.toString(), {
            headers: { 'apikey': KIWI_API_KEY, 'Accept': 'application/json' },
        });
        if (!res.ok) {
            console.warn('[Kiwi Hotels] API error:', res.status);
            return null;
        }
        const data = await res.json();
        return (data.results || data.data || []).slice(0, 10).map((h: any) => ({
            city: params.cityName,
            name: h.hotel_name || h.name || 'Hotel',
            price: h.price || h.price_raw || 0,
            rating: h.review_score ? h.review_score / 2 : (h.class || 0),
            roomType: h.room_name || 'Standard Room',
            source: 'Kiwi',
            bookingUrl: h.url || h.deep_link || '',
            stars: h.class || h.stars || 0,
            reviewScore: h.review_score || 0,
            location: h.address || h.district || '',
            amenities: [],
            imageUrl: h.main_photo_url || h.photo || '',
        }));
    } catch (err: any) {
        console.warn('[Kiwi Hotels] Error:', err.message);
        return null;
    }
}

// ─── Comparison Deep-Link Generators ───
export function generateComparisonLinks(params: {
    origin: string;
    destination: string;
    departureDate: string; // YYYY-MM-DD
    returnDate?: string;
}) {
    const { origin, destination, departureDate, returnDate } = params;
    const depParts = departureDate.split('-');
    const depYMD = depParts.join('');
    const retYMD = returnDate ? returnDate.split('-').join('') : '';

    return {
        skyscanner: `https://www.skyscanner.com/transport/flights/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}/${depParts[0].slice(2)}${depParts[1]}${depParts[2]}/${retYMD ? `${returnDate!.slice(2, 4)}${returnDate!.slice(5, 7)}${returnDate!.slice(8, 10)}` : ''}?adults=1`,
        googleFlights: `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(destination)}+on+${departureDate}${returnDate ? `+returning+${returnDate}` : ''}`,
        kayak: `https://www.kayak.com/flights/${encodeURIComponent(origin)}-${encodeURIComponent(destination)}/${departureDate}${returnDate ? `/${returnDate}` : ''}?sort=bestflight_a`,
    };
}

export function generateHotelComparisonLinks(params: {
    city: string;
    checkIn: string;
    checkOut: string;
}) {
    const { city, checkIn, checkOut } = params;
    return {
        bookingCom: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkIn}&checkout=${checkOut}`,
        hotelscom: `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(city)}&q-check-in=${checkIn}&q-check-out=${checkOut}`,
        tripadvisor: `https://www.tripadvisor.com/Hotels-g-${encodeURIComponent(city)}-Hotels.html`,
        agoda: `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}`,
    };
}

// ─── Travelpayouts Tool Helpers ───

/**
 * Travelpayouts v3 Flight Data API (Cached Prices)
 */
export async function travelpayoutsSearchFlights(params: {
    origin: string;
    destination: string;
    departureDate: string; // YYYY-MM
    returnDate?: string;
    currency?: string;
}) {
    if (!TRAVELPAYOUTS_TOKEN) return null;

    const url = new URL('https://api.travelpayouts.com/v3/prices_for_dates');
    url.searchParams.set('origin', params.origin);
    url.searchParams.set('destination', params.destination);
    url.searchParams.set('departure_at', params.departureDate.substring(0, 7)); // API expects YYYY-MM
    if (params.returnDate) url.searchParams.set('return_at', params.returnDate.substring(0, 7));
    url.searchParams.set('currency', params.currency || 'USD');
    url.searchParams.set('token', TRAVELPAYOUTS_TOKEN);
    url.searchParams.set('sorting', 'price');
    url.searchParams.set('limit', '10');

    try {
        const res = await fetchWithRetry(url.toString());
        const data = await res.json();
        if (!data.success || !data.data?.length) return null;

        return data.data.map((f: any) => ({
            from: f.origin || params.origin,
            to: f.destination || params.destination,
            price: f.price,
            date: f.departure_at,
            airline: f.airline,
            duration: `${f.duration}m`,
            stops: f.transfers,
            source: 'Travelpayouts',
            bookingUrl: `https://tp.media/r?marker=${TRAVELPAYOUTS_MARKER}&trs=1&p=1&u=https%3A%2F%2Fwww.aviasales.com%2Fsearch%2F${f.origin}${f.departure_at.replace(/-/g, '')}${f.destination}${f.transfers > 0 ? '1' : '0'}`
        }));
    } catch (err: any) {
        console.warn('[Travelpayouts Flights] Error:', err.message);
        return null;
    }
}

/**
 * Travelpayouts Hotellook Cache API
 */
export async function travelpayoutsSearchHotels(params: {
    cityName: string;
    checkIn: string;
    checkOut: string;
    currency?: string;
}) {
    if (!TRAVELPAYOUTS_TOKEN) return null;

    // Use Hotellook lookup to find locationId first
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(params.cityName)}&lang=en&lookFor=city&limit=1`;
    try {
        const lookupRes = await fetchWithRetry(lookupUrl);
        const lookupData = await lookupRes.json();
        const locationId = lookupData.results?.locations?.[0]?.id;
        if (!locationId) return null;

        // Fetch cached offers for this location
        const searchUrl = `https://engine.hotellook.com/api/v2/cache.json?location=${locationId}&checkIn=${params.checkIn}&checkOut=${params.checkOut}&currency=${params.currency || 'USD'}&limit=10&token=${TRAVELPAYOUTS_TOKEN}`;
        const res = await fetchWithRetry(searchUrl);
        const data = await res.json();
        
        return (data || []).map((h: any) => ({
            city: params.cityName,
            name: h.hotelName || 'Hotel',
            price: h.price || 0,
            rating: h.stars || 3,
            roomType: 'Standard',
            source: 'Travelpayouts',
            bookingUrl: `https://tp.media/r?marker=${TRAVELPAYOUTS_MARKER}&trs=1&p=1&u=https%3A%2F%2Fsearch.hotellook.com%2Fhotels%3FlocationId%3D${locationId}%26checkIn%3D${params.checkIn}%26checkOut%3D${params.checkOut}%26adults%3D1`,
            stars: h.stars || 0,
            location: params.cityName,
            amenities: [],
        }));
    } catch (err: any) {
        console.warn('[Travelpayouts Hotels] Error:', err.message);
        return null;
    }
}

/**
 * Generates an affiliate link for any travel URL
 */
export function generateTravelpayoutsAffiliateLink(targetUrl: string): string {
    return `https://tp.media/r?marker=${TRAVELPAYOUTS_MARKER}&trs=1&p=1&u=${encodeURIComponent(targetUrl)}`;
}

// ─── IATA Code Resolution ───
// Converts a city name like "Paris" or "Kuopio" into the correct IATA code
const iataCache = new Map<string, string>();

export async function resolveIATACode(cityName: string): Promise<string> {
    const key = cityName.trim().toLowerCase();
    if (iataCache.has(key)) return iataCache.get(key)!;

    // Local OurAirports dataset: no network call. Amadeus self-service was shut down in July 2026,
    // so Amadeus is only tried (enterprise credentials) when the local data has no answer.
    const local = cityToIata(cityName);

    if (amadeus && !local) {
        try {
            const response = await amadeus.referenceData.locations.get({
                keyword: cityName.trim(),
                subType: 'CITY,AIRPORT',
                'page[limit]': 1,
            });
            const topResult = response?.data?.[0];
            if (topResult) {
                const code = topResult.iataCode?.toUpperCase();
                if (code) {
                    iataCache.set(key, code);
                    console.log(`[IATA] Resolved "${cityName}" → ${code}`);
                    return code;
                }
            }
        } catch (err: any) {
            console.warn(`[IATA] Amadeus lookup failed for "${cityName}":`, amadeusErrorHandler(err));
        }
    }

    // Fallback: well-known city mappings
    const KNOWN: Record<string, string> = {
        'new york': 'NYC', 'los angeles': 'LAX', 'san francisco': 'SFO',
        'london': 'LON', 'paris': 'PAR', 'rome': 'ROM', 'milan': 'MIL',
        'tokyo': 'TYO', 'osaka': 'OSA', 'bangkok': 'BKK', 'singapore': 'SIN',
        'dubai': 'DXB', 'istanbul': 'IST', 'madrid': 'MAD', 'barcelona': 'BCN',
        'berlin': 'BER', 'munich': 'MUC', 'amsterdam': 'AMS', 'brussels': 'BRU',
        'vienna': 'VIE', 'prague': 'PRG', 'warsaw': 'WAW', 'budapest': 'BUD',
        'athens': 'ATH', 'lisbon': 'LIS', 'helsinki': 'HEL', 'stockholm': 'STO',
        'oslo': 'OSL', 'copenhagen': 'CPH', 'dublin': 'DUB', 'zurich': 'ZRH',
        'hong kong': 'HKG', 'seoul': 'SEL', 'beijing': 'PEK', 'shanghai': 'SHA',
        'mumbai': 'BOM', 'delhi': 'DEL', 'sydney': 'SYD', 'melbourne': 'MEL',
        'toronto': 'YTO', 'vancouver': 'YVR', 'montreal': 'YMQ',
        'cairo': 'CAI', 'johannesburg': 'JNB', 'nairobi': 'NBO',
        'mexico city': 'MEX', 'sao paulo': 'SAO', 'buenos aires': 'BUE',
        'kuopio': 'KUO',
    };

    // Metro codes (LON, PAR, NYC) cover every airport in a city, so they win for fare searches.
    const fallback = KNOWN[key] || local || cityName.trim().substring(0, 3).toUpperCase();
    iataCache.set(key, fallback);
    console.log(`[IATA] Fallback for "${cityName}" → ${fallback}`);
    return fallback;
}

// ─── Google Places API (New) Helper Functions ──────────────────────────────────
// Uses the modern Places API (New) with POST + FieldMask for cost efficiency.
// Exported for direct use by agents (bypassing Gemini function calling)

/**
 * Text Search using Places API (New)
 * POST https://places.googleapis.com/v1/places:searchText
 * Only pays for the specific fields requested via X-Goog-FieldMask header.
 */
/** Cached Places text search (14 days): venue lists change slowly and each call is billed. */
export async function googleTextSearch(query: string) {
    if (!GOOGLE_PLACES_KEY) return null;
    const key = `gts:v1:${query.trim().toLowerCase()}`;
    return cached(key, 14 * DAY_MS, () => googleTextSearchUncached(query));
}

async function googleTextSearchUncached(query: string) {
    const fieldMask = [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.primaryType',
        'places.currentOpeningHours.openNow',
    ].join(',');

    try {
        const res = await fetchWithRetry('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
                'X-Goog-FieldMask': fieldMask,
            },
            body: JSON.stringify({ textQuery: query, languageCode: 'en', maxResultCount: 8 }),
        });
        if (!res.ok) {
            console.warn('[Places API New] Text search failed:', res.status);
            return null;
        }
        const data = await res.json();
        return (data.places || []).map((p: any) => ({
            placeId: p.id || undefined,
            name: p.displayName?.text || '',
            address: p.formattedAddress || '',
            rating: p.rating || 0,
            totalRatings: p.userRatingCount || 0,
            priceLevel: p.priceLevel?.replace('PRICE_LEVEL_', '').toLowerCase() || null,
            types: p.primaryType ? [p.primaryType.replace(/_/g, ' ')] : [],
            openNow: p.currentOpeningHours?.openNow ?? null,
            lat: p.location?.latitude,
            lng: p.location?.longitude,
        }));
    } catch (err: any) {
        console.warn('[Places API New] Text search error:', err.message);
        return null;
    }
}

/**
 * Nearby Search using Places API (New)
 * POST https://places.googleapis.com/v1/places:searchNearby
 */
/** Cached Places nearby search (14 days), keyed by ~100 m grid cell. */
export async function googleNearbySearch(lat: number, lng: number, type: string, keyword?: string) {
    if (!GOOGLE_PLACES_KEY) return [];
    const key = `gns:v1:${lat.toFixed(3)},${lng.toFixed(3)}:${type}:${(keyword || '').toLowerCase()}`;
    return cached(key, 14 * DAY_MS, () => googleNearbySearchUncached(lat, lng, type, keyword));
}

async function googleNearbySearchUncached(lat: number, lng: number, type: string, keyword?: string) {
    const fieldMask = [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.primaryType',
    ].join(',');

    // Build included types — keyword maps to a type if present
    const includedTypes = keyword ? [keyword.toLowerCase().replace(/\s+/g, '_')] : [type];

    try {
        const res = await fetchWithRetry('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
                'X-Goog-FieldMask': fieldMask,
            },
            body: JSON.stringify({
                includedTypes,
                maxResultCount: 8,
                locationRestriction: {
                    circle: {
                        center: { latitude: lat, longitude: lng },
                        radius: 5000,
                    },
                },
                rankPreference: 'POPULARITY',
            }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.places || []).map((p: any) => ({
            name: p.displayName?.text || '',
            rating: p.rating || 0,
            totalRatings: p.userRatingCount || 0,
            priceLevel: p.priceLevel?.replace('PRICE_LEVEL_', '').toLowerCase() || null,
            address: p.formattedAddress || '',
            lat: p.location?.latitude,
            lng: p.location?.longitude,
        }));
    } catch (err: any) {
        console.warn('[Places API New] Nearby search error:', err.message);
        return [];
    }
}

/**
 * Place Details using Places API (New), cached for 3 days (opening hours can change).
 * Two-step on a miss: Text Search to find the Place ID (skipped when known) → Details.
 * Live-only fields are never served from cache: air quality is looked up fresh
 * (memoised per ~11 km cell) and "open now" is dropped, since it is meaningless
 * for a future trip day.
 */
export async function googlePlaceDetails(placeName: string, city: string, knownPlaceId?: string) {
    if (!GOOGLE_PLACES_KEY) {
        console.error('[Places] GOOGLE_PLACES_API_KEY is missing — place details unavailable');
        return null;
    }
    const validId = knownPlaceId && !knownPlaceId.startsWith('osm_') ? knownPlaceId : null;
    const key = validId
        ? `gpd:v1:id:${validId}`
        : `gpd:v1:q:${placeName.trim().toLowerCase()}|${city.trim().toLowerCase()}`;

    const detail = await cached(key, 3 * DAY_MS, () => googlePlaceDetailsUncached(placeName, city, knownPlaceId));
    if (!detail) return null;

    const airQuality = detail.lat && detail.lng ? await getAirQuality(detail.lat, detail.lng) : null;
    return { ...detail, isOpenNow: null, ...(airQuality ? { airQuality } : {}) };
}

async function googlePlaceDetailsUncached(placeName: string, city: string, knownPlaceId?: string) {
    if (!GOOGLE_PLACES_KEY) {
        // No key → no verified data. Never fabricate ratings, hours or air quality.
        console.error('[Places] GOOGLE_PLACES_API_KEY is missing — place details unavailable');
        return null;
    }

    // Step 1: Use knownPlaceId from Agent 1 Truth Pool if available, otherwise Text Search
    const searchFieldMask = 'places.id,places.displayName,places.location';
    let placeId: string | null = (knownPlaceId && !knownPlaceId.startsWith('osm_')) ? knownPlaceId : null;
    let displayName = placeName;
    let location: { latitude: number; longitude: number } | null = null;

    if (!placeId) {
        try {
            const searchRes = await fetchWithRetry('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
                    'X-Goog-FieldMask': searchFieldMask,
                },
                body: JSON.stringify({
                    textQuery: `${placeName} in ${city}`,
                    maxResultCount: 1,
                }),
            });
            if (!searchRes.ok) return null;
            const searchData = await searchRes.json();
            const firstPlace = searchData.places?.[0];
            if (!firstPlace) return null;
            placeId = firstPlace.id;
            displayName = firstPlace.displayName?.text || placeName;
            location = firstPlace.location || null;
        } catch (err: any) {
            console.warn('[Places API New] Step 1 search failed:', err.message);
            return null;
        }
    }

    if (!placeId) return null;

    // Step 2: Get Place Details by ID with comprehensive FieldMask
    const detailFieldMask = [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'editorialSummary',
        'photos',
        'reviews',
        'currentOpeningHours',
        'priceLevel',
        'primaryType',
        'types',
        'nationalPhoneNumber',
        'websiteUri',
        'accessibilityOptions',
    ].join(',');

    try {
        const detailRes = await fetchWithRetry(`https://places.googleapis.com/v1/places/${placeId}`, {
            headers: {
                'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
                'X-Goog-FieldMask': detailFieldMask,
            },
        });
        if (!detailRes.ok) return null;
        const place = await detailRes.json();

        // Build photo URL from first photo using Places API (New) media endpoint
        let photoUrl: string | null = null;
        if (place.photos?.length > 0) {
            const photoName = place.photos[0].name; // e.g. 'places/{id}/photos/{ref}'
            // Served via our proxy so the API key never reaches the browser or saved itineraries.
            photoUrl = `/api/place-photo?name=${encodeURIComponent(photoName)}&w=1200`;
        }

        // Reviews in Places API (New) format
        const topReviews = (place.reviews || []).slice(0, 3).map((r: any) => ({
            author: r.authorAttribution?.displayName || 'Anonymous',
            rating: r.rating || 0,
            text: (r.text?.text || r.originalText?.text || '').substring(0, 250),
            timeAgo: r.relativePublishTimeDescription || '',
        }));

        const lat = place.location?.latitude ?? location?.latitude;
        const lng = place.location?.longitude ?? location?.longitude;
        const formattedAddress = place.formattedAddress || `${placeName}, ${city}`;

        return {
            name: place.displayName?.text || displayName,
            address: formattedAddress,
            rating: place.rating || 0,
            totalRatings: place.userRatingCount || 0,
            summary: place.editorialSummary?.text || '',
            photoUrl,
            photoCount: place.photos?.length || 0,
            openingHours: place.currentOpeningHours?.weekdayDescriptions || [],
            isOpenNow: place.currentOpeningHours?.openNow ?? null,
            priceLevel: place.priceLevel?.replace('PRICE_LEVEL_', '') || null,
            types: (place.types || []).slice(0, 4).map((t: string) => t.replace(/_/g, ' ')),
            topReviews,
            lat,
            lng,
        };
    } catch (err: any) {
        console.warn('[Places API New] Details fetch failed:', err.message);
        return null;
    }
}

/**
 * Calculate travel time between two points using Routes API (New)
 * POST https://routes.googleapis.com/directions/v2:computeRoutes
 * Returns duration in minutes for walking, driving, and transit modes.
 */
export async function calculateTravelTime(params: {
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    travelMode?: 'WALK' | 'DRIVE' | 'TRANSIT' | 'BICYCLE';
}): Promise<{ minutes: number; distanceKm: number; mode: string } | null> {
    if (!GOOGLE_PLACES_KEY) return null;
    const mode = params.travelMode || 'WALK';
    const r = (n: number) => n.toFixed(4); // ~11 m
    const key = `route:v1:${mode}:${r(params.originLat)},${r(params.originLng)}>${r(params.destinationLat)},${r(params.destinationLng)}`;
    // Walking/cycling/transit times are stable; driving depends on traffic.
    const ttl = mode === 'DRIVE' ? 7 * DAY_MS : 30 * DAY_MS;
    return cached(key, ttl, () => calculateTravelTimeUncached(params, mode));
}

async function calculateTravelTimeUncached(
    params: { originLat: number; originLng: number; destinationLat: number; destinationLng: number },
    mode: string
): Promise<{ minutes: number; distanceKm: number; mode: string } | null> {
    try {
        const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
            },
            body: JSON.stringify({
                origin: { location: { latLng: { latitude: params.originLat, longitude: params.originLng } } },
                destination: { location: { latLng: { latitude: params.destinationLat, longitude: params.destinationLng } } },
                travelMode: mode,
                routingPreference: mode === 'DRIVE' ? 'TRAFFIC_AWARE' : undefined,
                computeAlternativeRoutes: false,
                languageCode: 'en-US',
            }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const route = data.routes?.[0];
        if (!route) return null;
        // Duration is a string like '1234s'
        const seconds = parseInt(route.duration?.replace('s', '') || '0', 10);
        const distanceKm = (route.distanceMeters || 0) / 1000;
        return { minutes: Math.round(seconds / 60), distanceKm: Math.round(distanceKm * 10) / 10, mode };
    } catch (err: any) {
        console.warn('[Routes API] Travel time error:', err.message);
        return null;
    }
}

// ─── Tool Declarations for Gemini Function Calling ───
// These map directly to Google Generative AI's functionDeclaration format

export const toolDeclarations = [
    {
        name: 'searchPlaces',
        description: 'Search Google Maps for real restaurants, attractions, museums, parks, cafes, bars, or any POI in a city. Returns real names, ratings, addresses.',
        parameters: {
            type: 'object' as const,
            properties: {
                query: { type: 'string' as const, description: 'e.g. "best restaurants in Helsinki" or "museums in Tampere"' },
            },
            required: ['query'],
        },
    },
    {
        name: 'getNearbyPlaces',
        description: 'Find nearby POIs around a lat/lng. Good for discovering things near a hotel or specific spot.',
        parameters: {
            type: 'object' as const,
            properties: {
                lat: { type: 'number' as const, description: 'Latitude' },
                lng: { type: 'number' as const, description: 'Longitude' },
                type: { type: 'string' as const, description: 'Type: restaurant, tourist_attraction, museum, park, cafe, bar, spa, shopping_mall' },
                keyword: { type: 'string' as const, description: 'Optional keyword filter e.g. sauna, vegan, sushi' },
            },
            required: ['lat', 'lng', 'type'],
        },
    },
    {
        name: 'searchFlights',
        description: 'Search real flights between airports via Amadeus. Use IATA codes (e.g. HEL, LHR, JFK). Returns prices, airlines, times.',
        parameters: {
            type: 'object' as const,
            properties: {
                originCode: { type: 'string' as const, description: '3-letter IATA airport code' },
                destinationCode: { type: 'string' as const, description: '3-letter IATA airport code' },
                departureDate: { type: 'string' as const, description: 'YYYY-MM-DD format' },
                adults: { type: 'number' as const, description: 'Number of adults (default 1)' },
            },
            required: ['originCode', 'destinationCode', 'departureDate'],
        },
    },
    {
        name: 'searchHotels',
        description: 'Search real hotel offers in a city via Amadeus. Use IATA city codes (e.g. HEL, PAR, TYO). Returns hotel names, prices.',
        parameters: {
            type: 'object' as const,
            properties: {
                cityCode: { type: 'string' as const, description: '3-letter IATA city code' },
                checkInDate: { type: 'string' as const, description: 'YYYY-MM-DD format' },
                adults: { type: 'number' as const, description: 'Number of adults (default 1)' },
            },
            required: ['cityCode', 'checkInDate'],
        },
    },
    {
        name: 'getPlacePhotosAndDetails',
        description: 'Get detailed info about a specific place: real photo URL, editorial summary, visitor reviews, opening hours, and what visitors can expect. Use this to ENRICH each activity in the itinerary with a photo and detailed highlights. Call this for EVERY major attraction and restaurant in the itinerary.',
        parameters: {
            type: 'object' as const,
            properties: {
                placeName: { type: 'string' as const, description: 'The exact name of the place (e.g. "Eiffel Tower", "Senso-ji Temple")' },
                city: { type: 'string' as const, description: 'The city name (e.g. "Paris", "Tokyo")' },
            },
            required: ['placeName', 'city'],
        },
    },
    {
        name: 'geocodeLocation',
        description: 'Convert a city or place name into exact coordinates (lat/lng). Essential for showing places on a map.',
        parameters: {
            type: 'object' as const,
            properties: {
                text: { type: 'string' as const, description: 'City name or address' },
            },
            required: ['text'],
        },
    },
    {
        name: 'getWeatherForecast',
        description: 'Get a 5-day weather forecast for a city. Use this to plan outdoor vs indoor activities.',
        parameters: {
            type: 'object' as const,
            properties: {
                city: { type: 'string' as const, description: 'City name' },
            },
            required: ['city'],
        },
    },
    {
        name: 'searchFoursquare',
        description: 'Search Foursquare for specialized recommendations, restaurants, and hidden local spots with ratings.',
        parameters: {
            type: 'object' as const,
            properties: {
                query: { type: 'string' as const, description: 'Search term (e.g. "rooftop bar", "museum")' },
                near: { type: 'string' as const, description: 'City name' },
            },
            required: ['query', 'near'],
        },
    },
    {
        name: 'getCurrencyConversion',
        description: 'Get real-time exchange rates. Default base is USD.',
        parameters: {
            type: 'object' as const,
            properties: {
                base: { type: 'string' as const, description: 'Base currency code (e.g. USD, EUR, GBP)' },
            },
            required: ['base'],
        },
    },
    {
        name: 'searchKiwiFlights',
        description: 'Search flights via Kiwi Tequila API — supports city names (not just IATA), returns prices, airlines, times, and direct booking links.',
        parameters: {
            type: 'object' as const,
            properties: {
                flyFrom: { type: 'string' as const, description: 'Origin city name or IATA code' },
                flyTo: { type: 'string' as const, description: 'Destination city name or IATA code' },
                dateFrom: { type: 'string' as const, description: 'DD/MM/YYYY format' },
                curr: { type: 'string' as const, description: 'Currency code (default USD)' },
            },
            required: ['flyFrom', 'flyTo', 'dateFrom'],
        },
    },
    {
        name: 'searchKiwiHotels',
        description: 'Search hotels via Kiwi Tequila API — returns hotel names, prices, ratings, booking links.',
        parameters: {
            type: 'object' as const,
            properties: {
                cityName: { type: 'string' as const, description: 'City name' },
                checkIn: { type: 'string' as const, description: 'YYYY-MM-DD' },
                checkOut: { type: 'string' as const, description: 'YYYY-MM-DD' },
                curr: { type: 'string' as const, description: 'Currency code (default USD)' },
            },
            required: ['cityName', 'checkIn', 'checkOut'],
        },
    },
    {
        name: 'searchDuffelFlights',
        description: 'Search premium flights via Duffel API. Returns real-time pricing and deep links.',
        parameters: {
            type: 'object' as const,
            properties: {
                originCode: { type: 'string' as const, description: 'IATA code for origin' },
                destinationCode: { type: 'string' as const, description: 'IATA code for destination' },
                departureDate: { type: 'string' as const, description: 'YYYY-MM-DD' },
                adults: { type: 'number' as const, description: 'Number of passengers' },
            },
            required: ['originCode', 'destinationCode', 'departureDate'],
        },
    },
    {
        name: 'searchAirbnb',
        description: 'Search Airbnb listings via RapidAPI for unique stays and dynamic pricing.',
        parameters: {
            type: 'object' as const,
            properties: {
                location: { type: 'string' as const, description: 'City or region name' },
                checkIn: { type: 'string' as const, description: 'YYYY-MM-DD' },
                checkOut: { type: 'string' as const, description: 'YYYY-MM-DD' },
                adults: { type: 'number' as const, description: 'Number of guests' },
            },
            required: ['location', 'checkIn', 'checkOut'],
        },
    },
    {
        name: 'searchTravelpayoutsFlights',
        description: 'Search for multi-carrier flight prices and trends via Travelpayouts. Returns monetizable affiliate links for commission-based booking.',
        parameters: {
            type: 'object' as const,
            properties: {
                origin: { type: 'string' as const, description: '3-letter IATA code' },
                destination: { type: 'string' as const, description: '3-letter IATA code' },
                departureDate: { type: 'string' as const, description: 'YYYY-MM format' },
                currency: { type: 'string' as const, description: 'Preferred currency (e.g. USD)' },
            },
            required: ['origin', 'destination', 'departureDate'],
        },
    },
    {
        name: 'searchTravelpayoutsHotels',
        description: 'Find affordable hotel offers and deals in a city via Travelpayouts/Hotellook. Returns monetizable links for commissions.',
        parameters: {
            type: 'object' as const,
            properties: {
                cityName: { type: 'string' as const, description: 'City name' },
                checkIn: { type: 'string' as const, description: 'YYYY-MM-DD' },
                checkOut: { type: 'string' as const, description: 'YYYY-MM-DD' },
            },
            required: ['cityName', 'checkIn', 'checkOut'],
        },
    },
    {
        name: 'calculateTravelTime',
        description: 'Calculate realistic travel time between two GPS coordinates using Google Routes API. Use this to ensure itinerary stops are physically reachable and to show travelers how long it takes to walk/drive between activities.',
        parameters: {
            type: 'object' as const,
            properties: {
                originLat: { type: 'number' as const, description: 'Origin latitude' },
                originLng: { type: 'number' as const, description: 'Origin longitude' },
                destinationLat: { type: 'number' as const, description: 'Destination latitude' },
                destinationLng: { type: 'number' as const, description: 'Destination longitude' },
                travelMode: { type: 'string' as const, enum: ['WALK', 'DRIVE', 'TRANSIT', 'BICYCLE'], description: 'Mode of transport (default: WALK)' },
            },
            required: ['originLat', 'originLng', 'destinationLat', 'destinationLng'],
        },
    },
];


// ─── Duffel Search ───
export async function duffelSearchFlights(params: any) {
    const DUFFEL_TOKEN = process.env.DUFFEL_TOKEN;

    try {
        // ✅ If no API key → use fallback (prevents crash)
        if (!DUFFEL_TOKEN) {
            return []; // not configured → caller uses labelled price estimates
        }

        // ✅ Dynamic import (safe for Next.js)
        const { Duffel } = await import('@duffel/api');
        const duffel = new Duffel({ token: DUFFEL_TOKEN });

        const response = await duffel.offerRequests.create({
            slices: [{
                origin: params.originCode,
                destination: params.destinationCode,
                departure_date: params.departureDate,
            } as any],
            passengers: Array(params.adults || 1).fill({ type: 'adult' }),
            cabin_class: 'economy',
        });

        return response.data.offers.slice(0, 5).map((offer: any) => ({
            from: params.originCode,
            to: params.destinationCode,
            price: parseFloat(offer.total_amount),
            date: params.departureDate,
            airline: offer.owner?.name || "Unknown",
            duration: offer.slices?.[0]?.duration || "N/A",
            stops: (offer.slices?.[0]?.segments?.length || 1) - 1,
            source: 'Duffel',
            bookingUrl: `https://duffel.com/book/${offer.id}`,
        }));

    } catch (err: any) {
        console.warn('[Duffel] Search failed:', err.message);

        return []; // caller falls back to labelled price estimates
    }
}

// ─── RapidAPI Airbnb Search ───
async function rapidApiSearchAirbnb(params: any) {
    if (!RAPIDAPI_KEY) return null;

    try {
        const options = {
            method: 'GET',
            url: 'https://airbnb13.p.rapidapi.com/search-location',
            params: {
                location: params.location,
                checkin: params.checkIn,
                checkout: params.checkOut,
                adults: params.adults || 1,
                page: '1'
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'airbnb13.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        return (response.data.results || []).slice(0, 5).map((item: any) => ({
            city: params.location,
            name: item.name,
            price: item.price.total,
            rating: item.rating,
            roomType: item.type,
            source: 'Airbnb',
            bookingUrl: item.url,
            imageUrl: item.images[0],
            location: item.address,
        }));
    } catch (err: any) {
        console.warn('[Airbnb RapidAPI] Search failed:', err.message);
        return null;
    }
}



async function searchGoogleFlightsApify(params: any) {
    return null;
}

async function searchGoogleHotelsApify(params: any) {
    return null;
}

// ─── Tool Executor ───
// Takes a tool name and args, calls the right API, and returns results

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
    try {
        switch (name) {
            case 'searchGoogleFlights': {
                const results = await searchGoogleFlightsApify({
                    origin: args.origin,
                    destination: args.destination,
                    departureDate: args.departureDate,
                    returnDate: args.returnDate,
                    currency: args.currency
                });
                if (!results) return { status: 'unavailable', message: 'Apify Google Flights search failed.' };
                return { status: 'success', flights: results, source: 'Google Flights (Apify)' };
            }

            case 'searchGoogleHotels': {
                const results = await searchGoogleHotelsApify({
                    location: args.location,
                    checkIn: args.checkIn,
                    checkOut: args.checkOut,
                    currency: args.currency
                });
                if (!results) return { status: 'unavailable', message: 'Apify Google Hotels search failed.' };
                return { status: 'success', hotels: results, source: 'Google Hotels (Apify)' };
            }
            case 'searchPlaces': {
                const results = await googleTextSearch(args.query);
                if (!results) return { status: 'error', message: 'No places found for this query.' };
                return { status: 'success', places: results, source: 'Google Maps' };
            }

            case 'getNearbyPlaces': {
                const results = await googleNearbySearch(args.lat, args.lng, args.type, args.keyword);
                if (results.length === 0) return { status: 'success', places: [], message: 'No nearby places found.' };
                return { status: 'success', places: results, source: 'Google Maps Nearby' };
            }

            case 'searchFlights': {
                if (!amadeus) return { status: 'unavailable', message: 'Flight search not configured. Use approximate data.' };
                const response = await amadeus.shopping.flightOffersSearch.get({
                    originLocationCode: (args.originCode || '').toUpperCase(),
                    destinationLocationCode: (args.destinationCode || '').toUpperCase(),
                    departureDate: args.departureDate,
                    adults: args.adults || 1,
                    max: 5,
                    currencyCode: 'USD',
                });
                const flights = (response.data || []).map((f: any) => ({
                    price: f.price?.total ? `$${f.price.total}` : 'N/A',
                    airline: f.validatingAirlineCodes?.[0] || 'Unknown',
                    departure: f.itineraries?.[0]?.segments?.[0]?.departure?.iataCode,
                    arrival: f.itineraries?.[0]?.segments?.slice(-1)?.[0]?.arrival?.iataCode,
                    departureTime: f.itineraries?.[0]?.segments?.[0]?.departure?.at,
                    stops: (f.itineraries?.[0]?.segments?.length || 1) - 1,
                    duration: f.itineraries?.[0]?.duration,
                }));
                return { status: 'success', flights };
            }

            case 'searchHotels': {
                if (!amadeus) return { status: 'unavailable', message: 'Hotel search not configured. Use approximate data.' };
                const hotelList = await amadeus.referenceData.locations.hotels.byCity.get({
                    cityCode: (args.cityCode || '').toUpperCase(),
                    radius: 30,
                    radiusUnit: 'KM',
                    hotelSource: 'ALL',
                });
                const hotelIds = (hotelList.data || []).slice(0, 8).map((h: any) => h.hotelId).join(',');
                if (!hotelIds) return { status: 'success', hotels: [], message: 'No hotels found.' };
                const offers = await amadeus.shopping.hotelOffersSearch.get({
                    hotelIds,
                    adults: args.adults || 1,
                    checkInDate: args.checkInDate,
                    roomQuantity: 1,
                    currency: 'USD',
                });
                const hotels = (offers.data || []).map((h: any) => ({
                    name: h.hotel?.name || 'Unknown Hotel',
                    pricePerNight: h.offers?.[0]?.price?.total ? `$${h.offers[0].price.total}` : 'N/A',
                    roomType: h.offers?.[0]?.room?.description?.text || 'Standard Room',
                }));
                return { status: 'success', hotels };
            }

            case 'getPlacePhotosAndDetails': {
                const details = await googlePlaceDetails(args.placeName, args.city);
                if (!details) return { status: 'error', message: `Could not find details for "${args.placeName}" in ${args.city}.` };
                return { status: 'success', ...details, source: 'Google Maps' };
            }

            case 'geocodeLocation': {
                const results = await googleGeocode(args.text);
                if (!results) return { status: 'error', message: 'Could not resolve location coordinates.' };
                return { status: 'success', locations: results, source: 'Google Maps' };
            }

            case 'getWeatherForecast': {
                const forecast = await openWeatherForecast(args.city);
                if (!forecast) return { status: 'error', message: 'Weather data unavailable.' };
                return { status: 'success', forecast, source: 'OpenWeatherMap' };
            }

            case 'searchFoursquare': {
                const results = await foursquareSearch(args.query, args.near);
                if (!results) return { status: 'error', message: 'Foursquare search failed.' };
                return { status: 'success', places: results, source: 'Foursquare' };
            }

            case 'getCurrencyConversion': {
                const data = await getCurrencyRates(args.base);
                if (!data) return { status: 'error', message: 'Currency rates unavailable.' };
                return { status: 'success', ...data, source: 'Exchangerate Host' };
            }

            case 'searchKiwiFlights': {
                const results = await kiwiSearchFlights({
                    flyFrom: args.flyFrom,
                    flyTo: args.flyTo,
                    dateFrom: args.dateFrom,
                    curr: args.curr,
                });
                if (!results) return { status: 'unavailable', message: 'Kiwi flight search not available (key missing or API error).' };
                return { status: 'success', flights: results, source: 'Kiwi' };
            }

            case 'searchKiwiHotels': {
                const results = await kiwiSearchHotels({
                    cityName: args.cityName,
                    checkIn: args.checkIn,
                    checkOut: args.checkOut,
                    curr: args.curr,
                });
                if (!results) return { status: 'unavailable', message: 'Kiwi hotel search not available.' };
                return { status: 'success', hotels: results, source: 'Kiwi' };
            }

            case 'searchDuffelFlights': {
                const results = await duffelSearchFlights(args);
                if (!results) return { status: 'unavailable', message: 'Duffel flight search failed.' };
                return { status: 'success', flights: results, source: 'Duffel' };
            }

            case 'searchAirbnb': {
                const results = await rapidApiSearchAirbnb(args);
                if (!results) return { status: 'unavailable', message: 'Airbnb search failed.' };
                return { status: 'success', hotels: results, source: 'Airbnb' };
            }

            case 'searchTravelpayoutsFlights': {
                const results = await travelpayoutsSearchFlights({
                    origin: args.origin,
                    destination: args.destination,
                    departureDate: args.departureDate,
                    currency: args.currency,
                });
                if (!results) return { status: 'unavailable', message: 'Travelpayouts flight search failed or returned no data.' };
                return { status: 'success', flights: results, source: 'Travelpayouts' };
            }

            case 'searchTravelpayoutsHotels': {
                const results = await travelpayoutsSearchHotels({
                    cityName: args.cityName,
                    checkIn: args.checkIn,
                    checkOut: args.checkOut,
                });
                if (!results) return { status: 'unavailable', message: 'Travelpayouts hotel search failed.' };
                return { status: 'success', hotels: results, source: 'Travelpayouts' };
            }


            case 'calculateTravelTime': {
                const result = await calculateTravelTime({
                    originLat: args.originLat,
                    originLng: args.originLng,
                    destinationLat: args.destinationLat,
                    destinationLng: args.destinationLng,
                    travelMode: args.travelMode || 'WALK',
                });
                if (!result) return { status: 'unavailable', message: 'Routes API unavailable or coordinates invalid.' };
                return { status: 'success', ...result, source: 'Google Routes API' };
            }

            default:
                return { status: 'error', message: `Unknown tool: ${name}` };
        }
    } catch (err: any) {
        console.error(`[Tool:${name}] Error:`, err.message);
        return { status: 'error', message: err.message || 'Tool execution failed.' };
    }
}
