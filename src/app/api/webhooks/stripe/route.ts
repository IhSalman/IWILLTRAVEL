/**
 * POST /api/webhooks/stripe
 *
 * The only place where paid credits and plans are granted.
 * - Verifies the Stripe signature (STRIPE_WEBHOOK_SECRET).
 * - Idempotent: each event id is recorded in `stripe_events`; replays are ignored.
 *
 * Events to enable in the Stripe dashboard:
 *   checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 */
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, findCreditPack } from '@/utils/stripe';
import { addCredits } from '@/utils/usage';
import { createAdminClient } from '@/utils/supabase/admin';
import type { PlanType } from '@/utils/plan-limits';

export const runtime = 'nodejs';

const PAID_PLANS: PlanType[] = ['starter', 'pro'];

export async function POST(req: Request) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers.get('stripe-signature');
    if (!secret || !signature) {
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
    } catch (err) {
        console.error('[Stripe Webhook] Signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Idempotency: claim the event id first. A duplicate insert means we already handled it.
    const { error: claimError } = await supabase
        .from('stripe_events')
        .insert({ id: event.id, type: event.type });
    if (claimError) {
        if (claimError.code === '23505') return NextResponse.json({ received: true, duplicate: true });
        console.error('[Stripe Webhook] Could not record event:', claimError.message);
        return NextResponse.json({ error: 'Storage error' }, { status: 500 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await syncSubscription(event.data.object as Stripe.Subscription);
                break;
        }
        return NextResponse.json({ received: true });
    } catch (err) {
        console.error(`[Stripe Webhook] Failed handling ${event.type}:`, err);
        // Release the claim so Stripe's retry can process it again.
        await supabase.from('stripe_events').delete().eq('id', event.id);
        return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId || session.client_reference_id;
    if (!userId) throw new Error(`Checkout session ${session.id} has no userId`);

    if (session.mode === 'payment' && session.metadata?.kind === 'credits') {
        if (session.payment_status !== 'paid') return; // async payment methods: wait

        const pack = findCreditPack(session.metadata.pack ?? '');
        if (!pack) throw new Error(`Unknown credit pack on session ${session.id}`);
        if (session.amount_total !== pack.priceEur * 100) {
            throw new Error(`Amount mismatch on session ${session.id}: ${session.amount_total}`);
        }

        await addCredits(userId, pack.credits);
        await createAdminClient().from('ai_usage_logs').insert({
            user_id: userId,
            feature_type: 'credit_purchase',
            tokens_used: 0,
            cost_estimate: pack.priceEur,
            request_data: { pack: pack.name, credits: pack.credits, stripeSession: session.id },
        });
        return;
    }

    if (session.mode === 'subscription' && session.subscription) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const subscription = await getStripe().subscriptions.retrieve(subId);
        await syncSubscription(subscription, userId);
    }
}

async function syncSubscription(sub: Stripe.Subscription, userIdHint?: string) {
    const supabase = createAdminClient();
    const userId = userIdHint || sub.metadata?.userId;
    if (!userId) throw new Error(`Subscription ${sub.id} has no userId metadata`);

    const requestedPlan = sub.metadata?.plan as PlanType | undefined;
    const isLive = sub.status === 'active' || sub.status === 'trialing';
    const plan: PlanType = isLive && requestedPlan && PAID_PLANS.includes(requestedPlan) ? requestedPlan : 'free';

    // current_period_end lives on subscription items in recent Stripe API versions.
    const periodEnd = sub.items?.data?.[0]?.current_period_end;

    const { error } = await supabase
        .from('user_subscriptions')
        .upsert(
            {
                user_id: userId,
                plan,
                // Lapsed / cancelled subscribers fall back to an active free plan
                // instead of being locked out of the app entirely.
                status: 'active',
                billing_cycle: plan === 'free' ? null : (sub.metadata?.billing ?? 'monthly'),
                stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
                stripe_subscription_id: sub.id,
                current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
        );
    if (error) throw new Error(`Failed to update subscription for ${userId}: ${error.message}`);
}
