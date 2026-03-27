/**
 * POST /api/credits/purchase
 *
 * Adds credits to user's balance (placeholder for Stripe webhook integration).
 * In production, this would be called by a Stripe webhook after payment confirmation.
 * For now, it validates the pack and adds credits directly.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { addCredits } from '@/utils/usage';
import { CREDIT_PACKS } from '@/utils/plan-limits';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    try {
        const body = await req.json();
        const { packName } = body;

        if (!packName || typeof packName !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid pack name' }, { status: 400 });
        }

        const pack = CREDIT_PACKS.find(p => p.name.toLowerCase() === packName.toLowerCase());
        if (!pack) {
            return NextResponse.json({ error: 'Invalid credit pack' }, { status: 400 });
        }

        // TODO: In production, validate Stripe payment session/webhook here
        // For now, we add credits directly for development/testing

        await addCredits(user.id, pack.credits);

        // Log the purchase
        const supabase = createAdminClient();
        await supabase.from('ai_usage_logs').insert({
            user_id: user.id,
            feature_type: 'credit_purchase',
            tokens_used: 0,
            cost_estimate: pack.priceEur,
            request_data: { pack: pack.name, credits: pack.credits, price: pack.priceEur },
        });

        return NextResponse.json({
            success: true,
            pack: pack.name,
            creditsAdded: pack.credits,
            message: `Successfully added ${pack.credits} credits to your account.`,
        });
    } catch (error) {
        console.error('[Credits Purchase] Error:', error);
        return NextResponse.json({ error: 'Failed to process credit purchase' }, { status: 500 });
    }
}
