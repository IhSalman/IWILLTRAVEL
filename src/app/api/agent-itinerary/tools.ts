/**
 * Agent Tool Definitions for Itinerary Generation
 * 
 * These tools wrap real APIs (Amadeus, Google Places) so the Gemini LLM
 * can call them during its reasoning loop to gather real-world data.
 */

// @ts-ignore — no types for amadeus package
const Amadeus = require('amadeus');

// ─── Amadeus Client ───
export let amadeus: any;
if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
    amadeus = new Amadeus({
        clientId: process.env.AMADEUS_CLIENT_ID,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET,
        hostname: 'test',
    });
}

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY || '';
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY || '';
const FOURSQUARE_KEY = process.env.FOURSQUARE_API_KEY || '';
const KIWI_API_KEY = process.env.KIWI_API_KEY || '';

// ─── Geoapify Helpers ───
async function geoapifyGeocode(text: string) {
    if (!GEOAPIFY_KEY) return null;
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text)}&apiKey=${GEOAPIFY_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.features?.length) return null;
    return data.features.map((f: any) => ({
        name: f.properties.formatted,
        lat: f.properties.lat,
        lon: f.properties.lon,
        city: f.properties.city,
        country: f.properties.country,
        type: f.properties.result_type,
    }));
}

async function geoapifyReverseGeocode(lat: number, lon: number) {
    if (!GEOAPIFY_KEY) return null;
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.features?.[0]?.properties || null;
}

// ─── OpenWeatherMap Helpers ───
async function openWeatherForecast(city: string) {
    if (!OPENWEATHER_KEY) return null;
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHER_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.cod !== '200') return null;
    
    // Simplify for LLM: group by day
    const daily: Record<string, any> = {};
    data.list.forEach((item: any) => {
        const date = item.dt_txt.split(' ')[0];
        if (!daily[date]) {
            daily[date] = {
                temp: item.main.temp,
                weather: item.weather[0].main,
                description: item.weather[0].description,
                wind: item.wind.speed,
            };
        }
    });
    return daily;
}

// ─── Foursquare Helpers ───
async function foursquareSearch(query: string, near: string) {
    if (!FOURSQUARE_KEY) return null;
    const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}&near=${encodeURIComponent(near)}&limit=10&fields=name,location,rating,description,tel,website,photos,stats`;
    const res = await fetch(url, {
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
async function getCurrencyRates(base: string = 'USD') {
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
        const res = await fetch(url.toString(), {
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
        const locRes = await fetch(locUrl, { headers: { 'apikey': KIWI_API_KEY } });
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

        const res = await fetch(hotelUrl.toString(), {
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

// ─── IATA Code Resolution ───
// Converts a city name like "Paris" or "Kuopio" into the correct IATA code
const iataCache = new Map<string, string>();

export async function resolveIATACode(cityName: string): Promise<string> {
    const key = cityName.trim().toLowerCase();
    if (iataCache.has(key)) return iataCache.get(key)!;

    if (amadeus) {
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
            console.warn(`[IATA] Amadeus lookup failed for "${cityName}":`, err.message);
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

    const fallback = KNOWN[key] || cityName.trim().substring(0, 3).toUpperCase();
    iataCache.set(key, fallback);
    console.log(`[IATA] Fallback for "${cityName}" → ${fallback}`);
    return fallback;
}

// ─── Google Places Helper Functions ───
// Exported for direct use by agents (bypassing Gemini function calling)

export async function googleTextSearch(query: string) {
    if (!GOOGLE_PLACES_KEY) return null;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    return data.results.slice(0, 8).map((p: any) => ({
        name: p.name,
        address: p.formatted_address,
        rating: p.rating || 0,
        totalRatings: p.user_ratings_total || 0,
        priceLevel: p.price_level ?? null,
        types: p.types?.slice(0, 3)?.map((t: string) => t.replace(/_/g, ' ')) || [],
        openNow: p.opening_hours?.open_now ?? null,
        lat: p.geometry?.location?.lat,
        lng: p.geometry?.location?.lng,
    }));
}

export async function googleNearbySearch(lat: number, lng: number, type: string, keyword?: string) {
    if (!GOOGLE_PLACES_KEY) return [];
    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=${type}&rankby=prominence&key=${GOOGLE_PLACES_KEY}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') return [];
    return (data.results || []).slice(0, 8).map((p: any) => ({
        name: p.name,
        rating: p.rating || 0,
        totalRatings: p.user_ratings_total || 0,
        priceLevel: p.price_level ?? null,
        address: p.vicinity || '',
        lat: p.geometry?.location?.lat,
        lng: p.geometry?.location?.lng,
    }));
}

export async function googlePlaceDetails(placeName: string, city: string) {
    if (!GOOGLE_PLACES_KEY) return null;
    // Step 1: Find the place to get its place_id
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(placeName + ' ' + city)}&inputtype=textquery&fields=place_id&key=${GOOGLE_PLACES_KEY}`;
    const findRes = await fetch(findUrl);
    const findData = await findRes.json();
    const placeId = findData.candidates?.[0]?.place_id;
    if (!placeId) return null;

    // Step 2: Get full details including photos and reviews
    const fields = 'name,rating,user_ratings_total,formatted_address,editorial_summary,reviews,photos,opening_hours,price_level,types,geometry';
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_PLACES_KEY}`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();
    if (detailData.status !== 'OK') return null;

    const place = detailData.result;
    // Build photo URL from the first (best) photo reference
    let photoUrl = null;
    if (place.photos?.length > 0) {
        const photoRef = place.photos[0].photo_reference;
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_PLACES_KEY}`;
    }

    // Extract top review snippets
    const topReviews = (place.reviews || []).slice(0, 3).map((r: any) => ({
        author: r.author_name,
        rating: r.rating,
        text: (r.text || '').substring(0, 200),
        timeAgo: r.relative_time_description,
    }));

    return {
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        totalRatings: place.user_ratings_total,
        summary: place.editorial_summary?.overview || '',
        photoUrl,
        photoCount: place.photos?.length || 0,
        openingHours: place.opening_hours?.weekday_text || [],
        isOpenNow: place.opening_hours?.open_now ?? null,
        priceLevel: place.price_level ?? null,
        types: place.types?.slice(0, 4)?.map((t: string) => t.replace(/_/g, ' ')) || [],
        topReviews,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
    };
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
];

// ─── Tool Executor ───
// Takes a tool name and args, calls the right API, and returns results

export async function executeTool(name: string, args: Record<string, any>): Promise<any> {
    try {
        switch (name) {
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
                const results = await geoapifyGeocode(args.text);
                if (!results) return { status: 'error', message: 'Could not resolve location coordinates.' };
                return { status: 'success', locations: results, source: 'Geoapify' };
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

            default:
                return { status: 'error', message: `Unknown tool: ${name}` };
        }
    } catch (err: any) {
        console.error(`[Tool:${name}] Error:`, err.message);
        return { status: 'error', message: err.message || 'Tool execution failed.' };
    }
}
