/**
 * POST /api/hotels
 * Live hotel search endpoint for Next.js Web & Flutter Mobile (`AppConfig.hotelsEndpoint`).
 * Uses DGIS Agent 3 tiered procurement: Amadeus Hotel GDS -> Market Estimate fallback.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { procureHotels } from '@/app/api/agent-itinerary/agents/agent3';

const HotelSearchSchema = z.object({
    cityCode: z.string().min(2),
    checkIn: z.string().min(8),
    checkOut: z.string().min(8),
    adults: z.number().int().min(1).max(9).optional().default(1),
    budget: z.enum(['budget', 'moderate', 'luxury', 'custom']).optional().default('moderate'),
    currency: z.string().optional().default('USD'),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = HotelSearchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid hotel search query', details: parsed.error.flatten() }, { status: 400 });
        }

        const startMs = new Date(`${parsed.data.checkIn}T12:00:00Z`).getTime();
        const endMs = new Date(`${parsed.data.checkOut}T12:00:00Z`).getTime();
        const nights = !isNaN(startMs) && !isNaN(endMs)
            ? Math.max(1, Math.round((endMs - startMs) / 86_400_000))
            : 2;

        const hotels = await procureHotels({
            destinationCity: parsed.data.cityCode,
            checkIn: parsed.data.checkIn,
            checkOut: parsed.data.checkOut,
            nights,
            adults: parsed.data.adults,
            budget: parsed.data.budget,
            currency: parsed.data.currency,
        });

        return NextResponse.json({
            hotels,
            nights,
            count: hotels.length,
            liveInventory: hotels.some((h) => !h.isEstimate),
        });
    } catch (err: any) {
        console.error('[POST /api/hotels] Error:', err);
        return NextResponse.json({ error: err.message || 'Hotel search failed' }, { status: 500 });
    }
}
