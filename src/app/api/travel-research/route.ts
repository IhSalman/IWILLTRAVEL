import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { executeTool, resolveIATACode } from '../agent-itinerary/tools';
import { z } from 'zod';

const RequestSchema = z.object({
  destination: z.string().min(1),
  originCity: z.string().optional(),
  startDate: z.string().optional(),
  includeFlights: z.boolean().default(true),
  includeHotels: z.boolean().default(true),
  adults: z.number().int().min(1).default(1)
});

export const maxDuration = 60;

export async function POST(req: Request) {
  // Require authentication to protect Amadeus API credits
  const authResult = await requireAuth();
  if ('error' in authResult) return authResult.error;

  try {
    const body = await req.json();
    const result = RequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'invalid_request', details: result.error.issues }, { status: 400 });
    }

    const input = result.data;
    const response: { flights?: any[], hotels?: any[], meta?: any } = {};
    const meta: { destCode?: string, originCode?: string, warnings?: string[] } = {};
    const warnings: string[] = [];

    // Resolve destination IATA code
    const destCode = await resolveIATACode(input.destination);
    meta.destCode = destCode;

    // ── Flight Search ──
    if (input.includeFlights && input.originCity && input.startDate) {
      const originCode = await resolveIATACode(input.originCity);
      meta.originCode = originCode;

      console.log(`[Travel Research] Searching flights: ${originCode} → ${destCode} on ${input.startDate}`);

      const flightResult = await executeTool('searchFlights', {
        originCode,
        destinationCode: destCode,
        departureDate: input.startDate,
        adults: input.adults
      });
      
      if (flightResult.status === 'success' && flightResult.flights?.length) {
        response.flights = flightResult.flights.map((f: any) => ({
          from: f.departure || originCode,
          to: f.arrival || destCode,
          price: parseFloat(String(f.price).replace(/[^0-9.]/g, '')) || 0,
          date: input.startDate!,
          airline: f.airline,
          duration: f.duration,
          stops: f.stops ?? 0,
          departureTime: f.departureTime
            ? new Date(f.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            : undefined,
        }));
      } else if (flightResult.status === 'unavailable') {
        warnings.push('Flight search API is not configured. Please check your Amadeus credentials.');
        response.flights = [];
      } else {
        warnings.push(`No flights found for ${originCode} → ${destCode} on ${input.startDate}. Try different dates or nearby airports.`);
        response.flights = [];
      }
    }

    // ── Hotel Search ──
    if (input.includeHotels && input.startDate) {
      console.log(`[Travel Research] Searching hotels in ${destCode} on ${input.startDate}`);

      const hotelResult = await executeTool('searchHotels', {
        cityCode: destCode,
        checkInDate: input.startDate,
        adults: input.adults
      });
      
      if (hotelResult.status === 'success' && hotelResult.hotels?.length) {
        response.hotels = hotelResult.hotels.map((h: any) => ({
          name: h.name,
          city: input.destination,
          price: parseFloat(String(h.pricePerNight).replace(/[^0-9.]/g, '')) || 0,
          roomType: h.roomType || 'Standard Room',
        }));
      } else if (hotelResult.status === 'unavailable') {
        warnings.push('Hotel search API is not configured. Please check your Amadeus credentials.');
        response.hotels = [];
      } else {
        warnings.push(`No hotels found in ${input.destination} (${destCode}) for ${input.startDate}. Try a different date.`);
        response.hotels = [];
      }
    }

    if (warnings.length) meta.warnings = warnings;
    response.meta = meta;

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Travel Research API] Error:', error);
    // Security: never leak internal error details to the client
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
