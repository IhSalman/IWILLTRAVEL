/**
 * POST /api/credits/purchase
 *
 * Starts a Stripe Checkout session for a credit pack and returns its URL.
 * Credits are added ONLY by the signed Stripe webhook (/api/webhooks/stripe)
 * after payment succeeds — never by this route.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { createCreditCheckout, findCreditPack } from '@/utils/stripe';

export async function POST(req: Request) {
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    try {
        const body = await req.json().catch(() => ({}));
        const packName = typeof body?.packName === 'string' ? body.packName : '';

        if (!findCreditPack(packName)) {
            return NextResponse.json({ error: 'Invalid credit pack' }, { status: 400 });
        }

        const url = await createCreditCheckout(user, packName);
        return NextResponse.json({ url });
    } catch (error) {
        console.error('[Credits Purchase] Error:', error);
        return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 });
    }
}
