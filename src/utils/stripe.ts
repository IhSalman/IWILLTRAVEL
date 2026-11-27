/**
 * Stripe helpers — Checkout sessions for credit packs and subscriptions.
 *
 * Money is NEVER granted here. Credits / plans are only applied by the
 * signed webhook at /api/webhooks/stripe after Stripe confirms payment.
 */
import Stripe from 'stripe';
import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';
import { CREDIT_PACKS, PLAN_PRICING, type PlanType } from '@/utils/plan-limits';
import { getSiteUrl } from '@/utils/site-url';

export { getSiteUrl };

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    if (!stripeClient) stripeClient = new Stripe(key);
    return stripeClient;
}



export type PaidPlan = Exclude<PlanType, 'free' | 'enterprise'>;
export type BillingCycle = 'monthly' | 'yearly';

export function findCreditPack(packName: string) {
    return CREDIT_PACKS.find(p => p.name.toLowerCase() === packName.toLowerCase()) ?? null;
}

/** Reuse the user's Stripe customer so subscriptions and purchases stay linked. */
async function getOrCreateCustomer(user: User): Promise<string> {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (data?.stripe_customer_id) return data.stripe_customer_id as string;

    const customer = await getStripe().customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
    });

    await supabase
        .from('user_subscriptions')
        .upsert(
            { user_id: user.id, stripe_customer_id: customer.id, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        );

    return customer.id;
}

export async function createCreditCheckout(user: User, packName: string): Promise<string> {
    const pack = findCreditPack(packName);
    if (!pack) throw new Error('Invalid credit pack');

    const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        customer: await getOrCreateCustomer(user),
        client_reference_id: user.id,
        line_items: [{
            quantity: 1,
            price_data: {
                currency: 'eur',
                unit_amount: pack.priceEur * 100,
                product_data: { name: `${pack.name} credit pack (${pack.credits} credits)` },
            },
        }],
        metadata: { userId: user.id, kind: 'credits', pack: pack.name },
        success_url: `${getSiteUrl()}/dashboard?checkout=success`,
        cancel_url: `${getSiteUrl()}/pricing?checkout=cancelled`,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return session.url;
}

export async function createPlanCheckout(user: User, plan: PaidPlan, billing: BillingCycle): Promise<string> {
    const price = PLAN_PRICING[plan];
    const amount = billing === 'yearly' ? price.yearly : price.monthly;
    const metadata = { userId: user.id, kind: 'subscription', plan, billing };

    const session = await getStripe().checkout.sessions.create({
        mode: 'subscription',
        customer: await getOrCreateCustomer(user),
        client_reference_id: user.id,
        line_items: [{
            quantity: 1,
            price_data: {
                currency: 'eur',
                unit_amount: Math.round(amount * 100),
                recurring: { interval: billing === 'yearly' ? 'year' : 'month' },
                product_data: { name: `IWILLTRAVEL ${plan[0].toUpperCase()}${plan.slice(1)} (${billing})` },
            },
        }],
        metadata,
        subscription_data: { metadata },
        allow_promotion_codes: true,
        success_url: `${getSiteUrl()}/dashboard?checkout=success`,
        cancel_url: `${getSiteUrl()}/pricing?checkout=cancelled`,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return session.url;
}
