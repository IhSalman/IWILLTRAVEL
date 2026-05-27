/**
 * POST /api/webhooks/flight-status
 * ─────────────────────────────────────────────────────────────
 * Aviationstack webhook endpoint.
 * Aviationstack sends a POST when a flight status changes.
 *
 * Secured with a shared WEBHOOK_SECRET to prevent spoofing.
 * Sets off the DisruptionSentinel agent pipeline.
 */

import { NextResponse } from 'next/server';
import { runDisruptionSentinel, FlightStatusPayload } from '@/app/api/agents/disruption-sentinel';

export async function POST(req: Request) {
  try {
    // ── Security: validate shared webhook secret ──
    const secret = req.headers.get('x-webhook-secret');
    const expectedSecret = process.env.AVIATIONSTACK_WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // ── Normalize Aviationstack payload ──
    const payload: FlightStatusPayload = {
      flight_iata: body?.flight?.iata ?? body?.flight_iata ?? '',
      airline_name: body?.airline?.name ?? body?.airline_name ?? 'Unknown Airline',
      departure_airport: body?.departure?.airport ?? body?.departure_airport ?? '',
      arrival_airport: body?.arrival?.airport ?? body?.arrival_airport ?? '',
      status: body?.flight_status ?? body?.status ?? 'active',
      delay_minutes: body?.departure?.delay ?? body?.delay_minutes ?? 0,
      scheduled_departure: body?.departure?.scheduled ?? body?.scheduled_departure ?? new Date().toISOString(),
      estimated_departure: body?.departure?.estimated ?? body?.estimated_departure,
    };

    if (!payload.flight_iata) {
      return NextResponse.json({ error: 'Missing flight_iata in payload' }, { status: 400 });
    }

    // ── Run the Sentinel agent (non-blocking is intentional) ──
    const result = await runDisruptionSentinel(payload);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[Webhook] flight-status handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Aviationstack also sends GET pings to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: 'IWILLTRAVEL Disruption Sentinel — Online ✈️' });
}
