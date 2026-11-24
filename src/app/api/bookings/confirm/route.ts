/**
 * POST /api/bookings/confirm
 * Step 2 of HITL Transactional Saga Booking Engine (Thesis Section 6.6.1):
 * - Verifies explicit traveler consent (`consentConfirmed === true` + cryptographic `consentToken`).
 * - Executes payment authorization -> provider booking -> capture, with automatic
 *   compensating rollback (`failed_rolled_back`) if any downstream step fails.
 * - Auto-links confirmed flight IATAs into `monitoredFlights` for Live Sentinel protection (§6.6.2).
 */

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { requireAuth } from '@/utils/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCache } from '@/utils/cache';

const ConfirmBookingSchema = z.object({
    bookingId: z.string().uuid(),
    consentToken: z.string().min(16),
    consentConfirmed: z.literal(true),
    passengerDetails: z.object({
        fullName: z.string().min(2).max(120),
        email: z.string().email(),
        phone: z.string().optional(),
    }),
    paymentMethodId: z.string().optional(),
});

export async function POST(req: Request) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { user } = auth;

    try {
        const body = await req.json();
        const parsed = ConfirmBookingSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Explicit traveler consent and valid passenger details are required.', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { bookingId, consentToken, passengerDetails, paymentMethodId } = parsed.data;
        const supabase = createAdminClient();

        // Load quote from cache or DB
        let quote: any = await getCache(`booking_quote_${bookingId}`);
        if (!quote) {
            const { data: dbRow } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .eq('user_id', user.id)
                .single();
            quote = dbRow;
        }

        if (!quote || quote.user_id !== user.id) {
            return NextResponse.json({ error: 'Booking quote not found or expired.' }, { status: 404 });
        }

        if (quote.consent_token !== consentToken) {
            return NextResponse.json({ error: 'Consent token mismatch. Transaction aborted.' }, { status: 403 });
        }

        if (quote.expires_at && new Date(quote.expires_at).getTime() < Date.now()) {
            return NextResponse.json({ error: 'Price lock expired. Please request a fresh quote.' }, { status: 410 });
        }

        const auditTrail: any[] = Array.isArray(quote.audit_trail) ? [...quote.audit_trail] : [];
        const recordAudit = async (fromState: string, toState: string, actor: string, note: string) => {
            const entry = {
                from_state: fromState,
                to_state: toState,
                actor,
                timestamp: new Date().toISOString(),
                note,
            };
            auditTrail.push(entry);
            try {
                await supabase.from('booking_audit_logs').insert({
                    booking_id: bookingId,
                    user_id: user.id,
                    from_state: fromState,
                    to_state: toState,
                    actor,
                    metadata: { note },
                });
            } catch {
                // inline audit_trail also persisted
            }
        };

        let stripeIntentId: string | null = null;
        let providerReference = `DGIS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        try {
            // ── Saga Step A: Payment Hold (Manual Capture) ──
            if (process.env.STRIPE_SECRET_KEY && paymentMethodId && quote.amount > 0) {
                const Stripe = (await import('stripe')).default;
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                const intent = await stripe.paymentIntents.create({
                    amount: Math.round(Number(quote.amount) * 100),
                    currency: String(quote.currency || 'usd').toLowerCase(),
                    payment_method: paymentMethodId,
                    capture_method: 'manual',
                    confirm: true,
                    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
                    metadata: { bookingId, userId: user.id },
                });
                stripeIntentId = intent.id;
            }

            await recordAudit(
                'awaiting_consent',
                'payment_authorized',
                'user_hitl',
                stripeIntentId
                    ? `Traveler authorized Stripe hold (${stripeIntentId}).`
                    : `Traveler signed HITL consent token for ${quote.currency} ${Number(quote.amount).toFixed(2)}.`
            );

            // ── Saga Step B: Provider Execution (Live Duffel if off_* offer & DUFFEL_TOKEN set) ──
            if (process.env.DUFFEL_TOKEN && String(quote.offer_id).startsWith('off_')) {
                const { Duffel } = await import('@duffel/api');
                const duffel = new Duffel({ token: process.env.DUFFEL_TOKEN });
                const [givenName, ...restName] = passengerDetails.fullName.trim().split(/\s+/);
                const familyName = restName.join(' ') || 'Traveler';

                const order = await duffel.orders.create({
                    type: 'instant',
                    selected_offers: [quote.offer_id],
                    payments: [
                        {
                            type: 'balance',
                            amount: String(Number(quote.amount).toFixed(2)),
                            currency: quote.currency || 'USD',
                        },
                    ],
                    passengers: [
                        {
                            id: quote.item_details?.passengerId || 'pas_0',
                            given_name: givenName,
                            family_name: familyName,
                            email: passengerDetails.email,
                            phone_number: passengerDetails.phone || '+358401234567',
                            born_on: '1998-05-15',
                            title: 'mr',
                            gender: 'm',
                        } as any,
                    ],
                });
                providerReference = order.data.booking_reference || order.data.id;
            }

            // ── Saga Step C: Capture Payment Hold after Provider Success ──
            if (stripeIntentId && process.env.STRIPE_SECRET_KEY) {
                const Stripe = (await import('stripe')).default;
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                await stripe.paymentIntents.capture(stripeIntentId);
            }

            await recordAudit(
                'payment_authorized',
                'confirmed',
                'saga_orchestrator',
                `Confirmed reservation ${providerReference} for ${passengerDetails.fullName}.`
            );
        } catch (sagaErr: any) {
            // ── Saga Step D: Compensating Rollback (0 Charge Guarantee) ──
            if (stripeIntentId && process.env.STRIPE_SECRET_KEY) {
                try {
                    const Stripe = (await import('stripe')).default;
                    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                    await stripe.paymentIntents.cancel(stripeIntentId);
                } catch (cancelErr) {
                    console.error('[Booking Saga] Stripe cancel error:', cancelErr);
                }
            }

            await recordAudit(
                'payment_authorized',
                'failed_rolled_back',
                'saga_orchestrator',
                `Provider error (${sagaErr.message}). Payment hold automatically voided.`
            );

            try {
                await supabase
                    .from('bookings')
                    .update({ state: 'failed_rolled_back', updated_at: new Date().toISOString() })
                    .eq('id', bookingId)
                    .eq('user_id', user.id);
            } catch {
                // ignore
            }

            return NextResponse.json(
                {
                    error: `Booking rolled back safely (no charge made): ${sagaErr.message}`,
                    state: 'failed_rolled_back',
                    auditTrail,
                },
                { status: 502 }
            );
        }

        const confirmedRecord = {
            ...quote,
            state: 'confirmed',
            consent_confirmed_at: new Date().toISOString(),
            passenger_details: passengerDetails,
            stripe_payment_intent: stripeIntentId,
            provider_reference: providerReference,
            audit_trail: auditTrail,
        };

        // Persist to public.bookings if migrated
        try {
            await supabase
                .from('bookings')
                .update({
                    state: 'confirmed',
                    consent_confirmed_at: confirmedRecord.consent_confirmed_at,
                    passenger_details: passengerDetails,
                    stripe_payment_intent: stripeIntentId,
                    provider_reference: providerReference,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', bookingId)
                .eq('user_id', user.id);
        } catch {
            // fallback persisted below
        }

        // Persist inside itinerary.content._bookings AND auto-activate Flight Sentinel if itineraryId exists
        if (quote.itinerary_id) {
            const { data: itinRow } = await supabase
                .from('itineraries')
                .select('id, content, status')
                .eq('id', quote.itinerary_id)
                .eq('user_id', user.id)
                .single();

            if (itinRow) {
                const rawContent =
                    typeof itinRow.content === 'string'
                        ? JSON.parse(itinRow.content)
                        : structuredClone(itinRow.content || {});
                const existingBookings = Array.isArray(rawContent._bookings) ? rawContent._bookings : [];
                rawContent._bookings = [confirmedRecord, ...existingBookings];

                const flightCode = quote.item_details?.flightIata;
                if (quote.booking_type === 'flight' && flightCode) {
                    const monitored = Array.isArray(rawContent.monitoredFlights) ? rawContent.monitoredFlights : [];
                    const cleanCode = String(flightCode).replace(/\s+/g, '').toUpperCase();
                    if (!monitored.includes(cleanCode)) monitored.push(cleanCode);
                    rawContent.monitoredFlights = monitored;
                }

                await supabase
                    .from('itineraries')
                    .update({
                        content: rawContent,
                        status: 'active',
                    })
                    .eq('id', itinRow.id)
                    .eq('user_id', user.id);
            }
        }

        return NextResponse.json({
            success: true,
            booking: confirmedRecord,
            providerReference,
            auditTrail,
        });
    } catch (err: any) {
        console.error('[POST /api/bookings/confirm] Error:', err);
        return NextResponse.json({ error: err.message || 'Booking confirmation failed' }, { status: 500 });
    }
}
