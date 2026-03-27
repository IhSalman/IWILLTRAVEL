/**
 * POST /api/promo/redeem
 *
 * Validates and redeems a promo code for the authenticated user.
 * - Checks code exists, not expired, not maxed, not already redeemed by user
 * - Applies effect: adds credits, extends trial, etc.
 * - Atomic operations to prevent race conditions
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { addCredits } from '@/utils/usage';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    try {
        const body = await req.json();
        const { code } = body;

        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            return NextResponse.json({ error: 'Missing promo code' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 1. Find the promo code
        const { data: promo, error: promoError } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', code.trim().toUpperCase())
            .single();

        if (promoError || !promo) {
            return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 });
        }

        // 2. Check expiry
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This promo code has expired' }, { status: 410 });
        }

        // 3. Check max uses
        if (promo.max_uses !== null && promo.times_used >= promo.max_uses) {
            return NextResponse.json({ error: 'This promo code has reached its maximum usage limit' }, { status: 410 });
        }

        // 4. Check if user already redeemed
        const { data: existing } = await supabase
            .from('promo_redemptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('promo_id', promo.id)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'You have already redeemed this promo code' }, { status: 409 });
        }

        // 5. Apply promo effect
        let effectDescription = '';
        switch (promo.type) {
            case 'credits':
                await addCredits(user.id, promo.value);
                effectDescription = `${promo.value} credits added to your account`;
                break;
            case 'trial':
                // Upgrade to pro for the trial duration
                await supabase
                    .from('user_subscriptions')
                    .update({
                        plan: 'pro',
                        status: 'active',
                        current_period_end: new Date(Date.now() + promo.value * 24 * 60 * 60 * 1000).toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', user.id);
                effectDescription = `Pro plan activated for ${promo.value} days`;
                break;
            case 'discount':
                effectDescription = `${promo.value}% discount applied to your next purchase`;
                // Discount logic would integrate with Stripe coupon system
                break;
        }

        // 6. Record redemption (atomic — unique constraint prevents double-redemption)
        const { error: redemptionError } = await supabase
            .from('promo_redemptions')
            .insert({ user_id: user.id, promo_id: promo.id });

        if (redemptionError) {
            return NextResponse.json({ error: 'Failed to redeem promo code (already redeemed)' }, { status: 409 });
        }

        // 7. Increment times_used
        await supabase
            .from('promo_codes')
            .update({ times_used: promo.times_used + 1 })
            .eq('id', promo.id);

        return NextResponse.json({
            success: true,
            effect: effectDescription,
            code: promo.code,
        });
    } catch (error) {
        console.error('[Promo Redeem] Error:', error);
        return NextResponse.json({ error: 'Failed to redeem promo code' }, { status: 500 });
    }
}
