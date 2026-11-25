/**
 * Live Itinerary Environmental & Operational Monitor (Thesis Section 6.6.2)
 * - GET: Triggered by Vercel Cron to scan all active trips.
 * - POST: Triggered on-demand by a traveler from Web or Flutter Mobile for a specific `itineraryId`.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuth } from '@/utils/auth';
import { scanItineraryLiveConditions } from '@/app/api/agents/disruption-sentinel';

// Scans up to 25 active trips; each scan can call weather/LLM APIs.
export const maxDuration = 300;

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    // Fail closed: without CRON_SECRET this endpoint must not be publicly callable.
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    try {
        const supabase = createAdminClient();
        const { data: activeTrips, error } = await supabase
            .from('itineraries')
            .select('id, user_id, city_id, title, content, start_date, status')
            .eq('status', 'active')
            .limit(25);

        if (error || !activeTrips?.length) {
            return NextResponse.json({ scannedTrips: 0, alertsCreated: 0, message: 'No active trips queued.' });
        }

        let totalAlerts = 0;
        for (const trip of activeTrips) {
            const res = await scanItineraryLiveConditions(trip);
            totalAlerts += res.alertsCreated;
        }

        return NextResponse.json({
            scannedTrips: activeTrips.length,
            alertsCreated: totalAlerts,
        });
    } catch (err: any) {
        console.error('[LiveTripMonitor Cron] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { user } = auth;

    try {
        const { itineraryId } = await req.json();
        if (!itineraryId) {
            return NextResponse.json({ error: 'itineraryId is required' }, { status: 400 });
        }

        const supabase = createAdminClient();
        const { data: trip, error } = await supabase
            .from('itineraries')
            .select('*')
            .eq('id', itineraryId)
            .eq('user_id', user.id)
            .single();

        if (error || !trip) {
            return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });
        }

        const scanResult = await scanItineraryLiveConditions(trip);

        // Fetch latest unresolved alerts for immediate UI refresh
        const { data: alerts } = await supabase
            .from('disruption_alerts')
            .select('*')
            .eq('itinerary_id', itineraryId)
            .eq('user_id', user.id)
            .eq('resolved', false)
            .order('created_at', { ascending: false });

        return NextResponse.json({
            ...scanResult,
            alerts: alerts || [],
        });
    } catch (err: any) {
        console.error('[LiveTripMonitor OnDemand] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
