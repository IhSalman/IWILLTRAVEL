/**
 * Itinerary PDF export.
 *
 *   POST /api/itinerary-pdf   body: { itinerary, meta?, flights?, hotels?, itineraryId? }
 *        → application/pdf (download). Multi-page A4 document with photos, route
 *          maps and clickable Google Maps links for every place.
 *        For a saved trip the user owns, a copy is also stored privately in
 *        Supabase Storage (bucket `trip-documents`) so it stays in their account.
 *
 *   GET  /api/itinerary-pdf?itineraryId=…
 *        → { url } short-lived signed link to the stored copy, if one exists.
 *
 * Access: signed-in users on a plan with PDF export (see plan-limits), or admins.
 */
import React from 'react';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { requireAuth } from '@/utils/auth';
import { getUserPlan } from '@/utils/usage';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSiteUrl } from '@/utils/site-url';
import { buildItineraryPdfModel } from '@/lib/pdf/build-model';
import { loadPdfAssets } from '@/lib/pdf/load-assets';
import { ItineraryDocument, registerPdfFonts } from '@/lib/pdf/ItineraryDocument';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BUCKET = 'trip-documents';
const MAX_BODY_BYTES = 3 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function canExportPdf(userId: string): Promise<boolean> {
    const [plan, { data: profile }] = await Promise.all([
        getUserPlan(userId),
        createAdminClient().from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
    ]);
    return plan.limits.canExportPDF || profile?.is_admin === true;
}

async function ownsItinerary(userId: string, itineraryId: string): Promise<boolean> {
    if (!UUID_RE.test(itineraryId)) return false;
    const { data } = await createAdminClient()
        .from('itineraries')
        .select('id')
        .eq('id', itineraryId)
        .eq('user_id', userId)
        .maybeSingle();
    return !!data;
}

const slugify = (s: string) =>
    s
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'trip';

export async function POST(req: Request) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { user } = auth;

    if (!(await canExportPdf(user.id))) {
        return NextResponse.json(
            { error: 'PDF export is included in the Starter and Pro plans.', upgradeRequired: true },
            { status: 403 }
        );
    }

    const len = Number(req.headers.get('content-length') || 0);
    if (len > MAX_BODY_BYTES) return NextResponse.json({ error: 'Itinerary too large' }, { status: 413 });

    const body = await req.json().catch(() => null);
    const itinerary = body?.itinerary;
    if (!itinerary || typeof itinerary !== 'object' || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
        return NextResponse.json({ error: 'A valid itinerary with at least one day is required.' }, { status: 400 });
    }

    const siteUrl = getSiteUrl();
    const itineraryId: string | undefined = typeof body?.itineraryId === 'string' ? body.itineraryId : undefined;
    const owned = itineraryId ? await ownsItinerary(user.id, itineraryId) : false;

    try {
        registerPdfFonts(new URL(req.url).origin);

        const model = buildItineraryPdfModel({
            itinerary,
            meta: body?.meta,
            flights: Array.isArray(body?.flights) ? body.flights : [],
            hotels: Array.isArray(body?.hotels) ? body.hotels : [],
            tripUrl: owned ? `${siteUrl}/itineraries/${itineraryId}` : undefined,
            siteUrl,
        });
        const assets = await loadPdfAssets(model);

        const pdf = await renderToBuffer(React.createElement(ItineraryDocument, { model }) as any);
        const filename = `${slugify(model.title)}.pdf`;

        // Keep a private copy in the user's account for saved trips (best effort).
        let saved = false;
        if (owned && itineraryId) {
            const { error } = await createAdminClient()
                .storage.from(BUCKET)
                .upload(`${user.id}/${itineraryId}.pdf`, pdf, { contentType: 'application/pdf', upsert: true });
            saved = !error;
            if (error) console.warn('[itinerary-pdf] Storage upload skipped:', error.message);
        }

        return new Response(new Uint8Array(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
                'X-Pdf-Pages-Days': String(model.days.length),
                'X-Pdf-Photos': String(assets.photos),
                'X-Pdf-Maps': String(assets.maps),
                'X-Saved-Copy': saved ? '1' : '0',
            },
        });
    } catch (err) {
        console.error('[itinerary-pdf] Render failed:', err);
        return NextResponse.json({ error: 'Could not create the PDF. Please try again.' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const itineraryId = new URL(req.url).searchParams.get('itineraryId') || '';
    if (!(await ownsItinerary(auth.user.id, itineraryId))) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { data, error } = await createAdminClient()
        .storage.from(BUCKET)
        .createSignedUrl(`${auth.user.id}/${itineraryId}.pdf`, 600, { download: true });
    if (error || !data?.signedUrl) return NextResponse.json({ error: 'No saved PDF yet' }, { status: 404 });
    return NextResponse.json({ url: data.signedUrl });
}
