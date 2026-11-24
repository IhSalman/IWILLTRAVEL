/**
 * POST /api/bookings/quote
 * Step 1 of HITL Transactional Saga Booking Engine (Thesis Section 6.6.1):
 * Locks an offer quote, generates a time-bounded cryptographic consent token,
 * and records an auditable `awaiting_consent` state before any funds or tickets move.
 */

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { requireAuth } from '@/utils/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { setCache } from '@/utils/cache';

const QuoteRequestSchema = z.object({
    itineraryId: z.string().uuid().optional(),
    bookingType: z.enum(['flight', 'hotel', 'activity']),
    offerId: z.string().min(1),
    itemTitle: z.string().min(2).max(200),
    amount: z.number().nonnegative(),
    currency: z.string().min(3).max(4).optional().default('USD'),
    provider: z.string().optional().default('amadeus'),
    itemDetails: z.record(z.string(), z.any()).optional().default({}),
});

export async function POST(req: Request) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { user } = auth;

    try {
        const body = await req.json();
        const parsed = QuoteRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid booking quote payload', details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        const bookingId = crypto.randomUUID();
        const consentToken = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString(); // 15-min price lock

        const executionMode =
            process.env.DUFFEL_TOKEN && data.offerId.startsWith('off_')
                ? 'live_duffel'
                : process.env.STRIPE_SECRET_KEY
                ? 'stripe_manual_capture'
                : 'hitl_sandbox_saga';

        const quoteRecord = {
            id: bookingId,
            user_id: user.id,
            itinerary_id: data.itineraryId || null,
            booking_type: data.bookingType,
            provider: executionMode === 'live_duffel' ? 'duffel' : data.provider,
            offer_id: data.offerId,
            item_title: data.itemTitle,
            item_details: data.itemDetails,
            amount: data.amount,
            currency: data.currency,
            state: 'awaiting_consent',
            consent_token: consentToken,
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
            audit_trail: [
                {
                    from_state: null,
                    to_state: 'awaiting_consent',
                    actor: 'saga_orchestrator',
                    timestamp: new Date().toISOString(),
                    note: `Quote locked (${data.currency} ${data.amount.toFixed(2)}) in ${executionMode} mode.`,
                },
            ],
        };

        // Cache quote for fast Saga verification during /api/bookings/confirm
        await setCache(`booking_quote_${bookingId}`, quoteRecord);

        // Persist to public.bookings if table exists (non-fatal if migration pending)
        const supabase = createAdminClient();
        try {
            const { error: dbErr } = await supabase.from('bookings').insert({
                id: bookingId,
                user_id: user.id,
                itinerary_id: data.itineraryId || null,
                booking_type: data.bookingType,
                provider: quoteRecord.provider,
                offer_id: data.offerId,
                item_title: data.itemTitle,
                item_details: data.itemDetails,
                amount: data.amount,
                currency: data.currency,
                state: 'awaiting_consent',
                consent_token: consentToken,
                expires_at: expiresAt,
            });
            if (!dbErr) {
                await supabase.from('booking_audit_logs').insert({
                    booking_id: bookingId,
                    user_id: user.id,
                    from_state: null,
                    to_state: 'awaiting_consent',
                    actor: 'saga_orchestrator',
                    metadata: { executionMode, expiresAt },
                });
            }
        } catch {
            // Handled seamlessly via cache + inline itinerary fallback on confirm
        }

        return NextResponse.json({
            bookingId,
            consentToken,
            expiresAt,
            amount: data.amount,
            currency: data.currency,
            itemTitle: data.itemTitle,
            bookingType: data.bookingType,
            executionMode,
            cancellationPolicy:
                data.bookingType === 'hotel'
                    ? 'Free cancellation up to 48 hours prior to check-in; HITL rollback enabled if provider confirmation fails.'
                    : '24-hour void window supported; payment authorization automatically released if airline PNR issuance fails.',
        });
    } catch (err: any) {
        console.error('[POST /api/bookings/quote] Error:', err);
        return NextResponse.json({ error: err.message || 'Quote creation failed' }, { status: 500 });
    }
}
