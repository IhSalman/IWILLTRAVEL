/**
 * POST /api/subscription/checkout
 * Body: { plan: 'starter' | 'pro', billing: 'monthly' | 'yearly' }
 *
 * Starts a Stripe Checkout subscription session and returns its URL.
 * The plan is activated by the Stripe webhook, not here.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/utils/auth';
import { createPlanCheckout } from '@/utils/stripe';

const BodySchema = z.object({
    plan: z.enum(['starter', 'pro']),
    billing: z.enum(['monthly', 'yearly']).default('monthly'),
});

export async function POST(req: Request) {
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid plan or billing cycle' }, { status: 400 });
    }

    try {
        const url = await createPlanCheckout(user, parsed.data.plan, parsed.data.billing);
        return NextResponse.json({ url });
    } catch (error) {
        console.error('[Subscription Checkout] Error:', error);
        return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 });
    }
}
