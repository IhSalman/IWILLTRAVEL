import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/utils/auth';
import { createAdminClient } from '@/utils/supabase/admin';

const PatchItinerarySchema = z.object({
    status: z.enum(['planned', 'saved', 'active', 'completed']).optional(),
    title: z.string().min(1).max(200).optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    flight_iata: z.string().max(20).optional(),
    rollback: z.boolean().optional(),
    itinerary: z.any().optional(),
});

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { user } = auth;

    try {
        const { id } = await params;
        const supabase = createAdminClient();

        const { data: itinerary, error } = await supabase
            .from('itineraries')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error || !itinerary) {
            return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });
        }

        return NextResponse.json(itinerary);
    } catch (err: any) {
        console.error('Error in GET /api/itineraries/[id]:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { user } = auth;

    try {
        const { id } = await params;
        const body = await req.json();
        const parsed = PatchItinerarySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid update payload', details: parsed.error.flatten() }, { status: 400 });
        }

        const supabase = createAdminClient();
        const { data: existing, error: findErr } = await supabase
            .from('itineraries')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (findErr || !existing) {
            return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });
        }

        const rawContent =
            typeof existing.content === 'string'
                ? JSON.parse(existing.content)
                : structuredClone(existing.content || {});
        const isWrapped = Boolean(rawContent?.itinerary);
        let itinObj = isWrapped ? rawContent.itinerary : rawContent;

        const updates: Record<string, any> = {};
        if (parsed.data.status) updates.status = parsed.data.status;
        if (parsed.data.title) updates.title = parsed.data.title;
        if (parsed.data.start_date !== undefined) updates.start_date = parsed.data.start_date;
        if (parsed.data.end_date !== undefined) updates.end_date = parsed.data.end_date;

        // Link external flight IATA for Live Sentinel monitoring inside content JSONB (schema-safe)
        if (parsed.data.flight_iata) {
            const cleanFlight = parsed.data.flight_iata.replace(/\s+/g, '').toUpperCase();
            const monitored = Array.isArray(rawContent.monitoredFlights) ? rawContent.monitoredFlights : [];
            if (!monitored.includes(cleanFlight)) {
                monitored.push(cleanFlight);
            }
            rawContent.monitoredFlights = monitored;
            updates.status = parsed.data.status || 'active';
            updates.content = rawContent;
        }

        // 1-Click Rollback to previous version snapshot
        if (parsed.data.rollback) {
            const versions = Array.isArray(rawContent._versions) ? rawContent._versions : [];
            if (versions.length === 0) {
                return NextResponse.json({ error: 'No previous version available to rollback' }, { status: 400 });
            }
            const lastSnap = versions.pop();
            itinObj = {
                ...itinObj,
                days: lastSnap.daysSnapshot,
            };
            updates.content = isWrapped
                ? { ...rawContent, itinerary: itinObj, _versions: versions }
                : { ...itinObj, _versions: versions };
        } else if (parsed.data.itinerary) {
            const versions = Array.isArray(rawContent._versions) ? rawContent._versions : [];
            versions.push({
                version: versions.length + 1,
                timestamp: new Date().toISOString(),
                source: 'manual_edit',
                summary: 'Traveler schedule update',
                daysSnapshot: structuredClone(itinObj.days),
            });
            itinObj = parsed.data.itinerary;
            updates.content = isWrapped
                ? { ...rawContent, itinerary: itinObj, _versions: versions.slice(-10) }
                : { ...itinObj, _versions: versions.slice(-10) };
        }

        const { data: updated, error: updateErr } = await supabase
            .from('itineraries')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (updateErr) {
            return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        return NextResponse.json({
            record: updated,
            itinerary: isWrapped ? updated.content?.itinerary : updated.content,
        });
    } catch (err: any) {
        console.error('Error in PATCH /api/itineraries/[id]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
