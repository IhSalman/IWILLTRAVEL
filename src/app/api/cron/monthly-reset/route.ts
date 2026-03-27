/**
 * POST /api/cron/monthly-reset
 *
 * Resets monthly usage counters for all subscription users.
 * Protected by CRON_SECRET header to prevent unauthorized access.
 *
 * Deployment: Set up as a Vercel Cron Job or external scheduler
 * to run at the start of each month.
 *
 * Example cron expression: 0 0 1 * * (1st of every month at midnight)
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCurrentPeriod } from '@/utils/plan-limits';

export async function POST(req: Request) {
    // Security: validate cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createAdminClient();
        const period = getCurrentPeriod();

        // 1. Create fresh usage rows for the new month (all active subscribers)
        const { data: activeUsers, error: fetchError } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('status', 'active');

        if (fetchError) throw fetchError;

        let resetCount = 0;
        if (activeUsers && activeUsers.length > 0) {
            const newRows = activeUsers.map((u: { user_id: string }) => ({
                user_id: u.user_id,
                period,
                itineraries_generated: 0,
                voice_minutes_used: 0,
                translation_tokens_used: 0,
            }));

            // Upsert — if row already exists for this period, reset to 0
            const { error: upsertError } = await supabase
                .from('user_usage')
                .upsert(newRows, { onConflict: 'user_id,period' });

            if (upsertError) throw upsertError;
            resetCount = activeUsers.length;
        }

        // 2. Expire old credits
        const { data: expiredCredits, error: creditError } = await supabase
            .from('user_credits')
            .update({ balance: 0, updated_at: new Date().toISOString() })
            .lt('expires_at', new Date().toISOString())
            .gt('balance', 0)
            .select('user_id');

        const expiredCount = expiredCredits?.length || 0;
        if (creditError) console.error('[Cron] Credit expiry error:', creditError);

        // 3. Log the reset event
        await supabase.from('ai_usage_logs').insert({
            user_id: null,
            feature_type: 'monthly_reset',
            tokens_used: 0,
            cost_estimate: 0,
            request_data: {
                period,
                usersReset: resetCount,
                creditsExpired: expiredCount,
                timestamp: new Date().toISOString(),
            },
        });

        console.log(`[Cron] Monthly reset complete: ${resetCount} users reset, ${expiredCount} credit accounts expired.`);

        return NextResponse.json({
            success: true,
            period,
            usersReset: resetCount,
            creditsExpired: expiredCount,
        });
    } catch (error) {
        console.error('[Cron] Monthly reset error:', error);
        return NextResponse.json({ error: 'Monthly reset failed' }, { status: 500 });
    }
}
