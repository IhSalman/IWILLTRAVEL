import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
// @ts-ignore — no types for amadeus package
const Amadeus = require('amadeus');

const VALID_SEARCH_TYPES = new Set(['flights', 'hotels', 'cars']);

let amadeus: any;
if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
    amadeus = new Amadeus({
        clientId: process.env.AMADEUS_CLIENT_ID,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET,
        hostname: 'test', // Change to 'production' for live environment
    });
}

export async function POST(req: Request) {
    // Require authentication to protect Amadeus API credentials
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
        const body = await req.json();
        const { type, origin, destination, date, adults = 1, cityCode } = body;

        if (!type || !VALID_SEARCH_TYPES.has(type)) {
            return NextResponse.json({ error: 'Invalid search type. Must be one of: flights, hotels, cars.' }, { status: 400 });
        }

        if (!amadeus) {
            return NextResponse.json({ error: 'Travel search service is not configured.' }, { status: 503 });
        }

        if (type === 'flights') {
            if (!origin || !destination || !date) {
                return NextResponse.json({ error: 'origin, destination, and date are required for flight search.' }, { status: 400 });
            }
            const response = await amadeus.shopping.flightOffersSearch.get({
                originLocationCode: origin,
                destinationLocationCode: destination,
                departureDate: date,
                adults: Number(adults) || 1,
                max: 5,
                currencyCode: 'USD',
            });
            return NextResponse.json(response.data);
        }

        if (type === 'hotels') {
            if (!cityCode) {
                return NextResponse.json({ error: 'cityCode is required for hotel search.' }, { status: 400 });
            }
            const hotelList = await amadeus.referenceData.locations.hotels.byCity.get({
                cityCode,
                radius: 30,
                radiusUnit: 'KM',
                hotelSource: 'ALL',
            });

            const hotelIds = hotelList.data.slice(0, 10).map((h: any) => h.hotelId).join(',');
            if (!hotelIds) return NextResponse.json([]);

            const offers = await amadeus.shopping.hotelOffersSearch.get({
                hotelIds,
                adults: Number(adults) || 1,
                checkInDate: date,
                roomQuantity: 1,
                currency: 'USD',
            });
            return NextResponse.json(offers.data);
        }

        if (type === 'cars') {
            // Test sandbox has limited car data; return estimates as fallback
            return NextResponse.json([
                { type: 'CAR_RENTAL', vehicle: 'Economy Car', price: '35', maxPassengers: 4, isEstimate: true },
                { type: 'CAR_RENTAL', vehicle: 'Compact Car', price: '50', maxPassengers: 5, isEstimate: true },
                { type: 'CAR_RENTAL', vehicle: 'SUV / Midsize', price: '75', maxPassengers: 7, isEstimate: true },
            ]);
        }

        return NextResponse.json({ error: 'Invalid search type' }, { status: 400 });

    } catch (error) {
        console.error('Amadeus API Error:', error);
        // Security: never leak internal error details to the client
        return NextResponse.json({ error: 'Travel search failed. Please try again.' }, { status: 500 });
    }
}
