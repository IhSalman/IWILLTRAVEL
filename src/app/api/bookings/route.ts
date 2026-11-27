/**
 * GET /api/bookings
 * Lists traveler's HITL bookings and audit trail (Thesis Section 6.6.1).
 * Merges `public.bookings` table records with inline `itineraries.content._bookings` fallback.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: Request) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const url = new URL(req.url);
    const itineraryId = url.searchParams.get('itineraryId');
    const supabase = createAdminClient();

    // 1. Try dedicated bookings table
    let dbBookings: any[] = [];
    try {
        let q = supabase
            .from('bookings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (itineraryId) q = q.eq('itinerary_id', itineraryId);
        const { data } = await q;
        if (Array.isArray(data)) dbBookings = data;
    } catch {
        // Fallback when migration hasn't been executed yet
    }

    // 2. Also read inline _bookings stored inside itineraries.content JSONB
    let inlineBookings: any[] = [];
    try {
        let iq = supabase.from('itineraries').select('id, content').eq('user_id', user.id);
        if (itineraryId) iq = iq.eq('id', itineraryId);
        const { data: itins } = await iq;
        for (const row of itins || []) {
            const c = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
            if (Array.isArray(c?._bookings)) {
                inlineBookings.push(...c._bookings);
            }
        }
    } catch {
        // ignore
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const combined: any[] = [];
    for (const b of [...dbBookings, ...inlineBookings]) {
        if (b?.id && !seen.has(b.id)) {
            seen.add(b.id);
            combined.push(b);
        }
    }

    return NextResponse.json({ bookings: combined });
}
