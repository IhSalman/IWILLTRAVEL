/**
 * GET /api/subscription/status
 *
 * Returns the authenticated user's plan, monthly usage, credit balance, and limits.
 * Used by the frontend to display plan badges, usage meters, and upgrade prompts.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { getUserPlan, getOrCreateUsage, getCreditBalance } from '@/utils/usage';

export async function GET() {
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    try {
        const [plan, usage, credits] = await Promise.all([
            getUserPlan(user.id),
            getOrCreateUsage(user.id),
            getCreditBalance(user.id),
        ]);

        return NextResponse.json({
            plan: plan.plan,
            status: plan.status,
            billingCycle: plan.billingCycle,
            limits: plan.limits,
            usage: {
                itinerariesGenerated: usage.itinerariesGenerated,
                voiceMinutesUsed: usage.voiceMinutesUsed,
                translationTokensUsed: usage.translationTokensUsed,
                period: usage.period,
            },
            credits: {
                balance: credits.balance,
                expiresAt: credits.expiresAt,
            },
        });
    } catch (error) {
        console.error('[Subscription Status] Error:', error);
        return NextResponse.json({ error: 'Failed to retrieve subscription status' }, { status: 500 });
    }
}
