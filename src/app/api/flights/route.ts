/**
 * POST /api/flights
 * Live flight search endpoint for Next.js Web & Flutter Mobile (`AppConfig.flightsEndpoint`).
 * Uses DGIS Agent 3 tiered procurement: Duffel -> Amadeus GDS -> Market Estimate fallback.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { procureFlights } from '@/app/api/agent-itinerary/agents/agent3';

const FlightSearchSchema = z.object({
    origin: z.string().min(2),
    destination: z.string().min(2),
    departureDate: z.string().min(8),
    returnDate: z.string().optional(),
    adults: z.number().int().min(1).max(9).optional().default(1),
    budget: z.enum(['budget', 'moderate', 'luxury', 'custom']).optional().default('moderate'),
    currency: z.string().optional().default('USD'),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = FlightSearchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid flight search query', details: parsed.error.flatten() }, { status: 400 });
        }

        const flights = await procureFlights({
            originCity: parsed.data.origin,
            destinationCity: parsed.data.destination,
            departureDate: parsed.data.departureDate,
            returnDate: parsed.data.returnDate,
            adults: parsed.data.adults,
            budget: parsed.data.budget,
            currency: parsed.data.currency,
        });

        return NextResponse.json({
            flights,
            count: flights.length,
            liveInventory: flights.some((f) => !f.isEstimate),
        });
    } catch (err: any) {
        console.error('[POST /api/flights] Error:', err);
        return NextResponse.json({ error: err.message || 'Flight search failed' }, { status: 500 });
    }
}
