/**
 * SaaS Usage Enforcement Utilities
 *
 * All DB operations use the admin client (bypasses RLS) for atomic server-side checks.
 * These functions are called from API routes AFTER authentication.
 */
import { createAdminClient } from '@/utils/supabase/admin';
import { PLAN_LIMITS, getCurrentPeriod, type PlanType, type PlanLimits } from './plan-limits';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserPlanInfo {
    plan: PlanType;
    limits: PlanLimits;
    status: string;
    billingCycle: string | null;
}

export interface UsageInfo {
    itinerariesGenerated: number;
    voiceMinutesUsed: number;
    translationTokensUsed: number;
    period: string;
}

export interface CreditInfo {
    balance: number;
    expiresAt: string | null;
}

export interface QuotaResult {
    allowed: boolean;
    reason?: string;
    upgradeRequired?: boolean;
    creditsAvailable?: number;
}

// ─── Get User Plan ────────────────────────────────────────────────────────────

export async function getUserPlan(userId: string): Promise<UserPlanInfo> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('user_subscriptions')
        .select('plan, status, billing_cycle')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        // Default to free plan if no subscription record
        return { plan: 'free', limits: PLAN_LIMITS.free, status: 'active', billingCycle: null };
    }

    const plan = (data.plan as PlanType) || 'free';
    return {
        plan,
        limits: PLAN_LIMITS[plan] || PLAN_LIMITS.free,
        status: data.status,
        billingCycle: data.billing_cycle,
    };
}

// ─── Get or Create Monthly Usage ──────────────────────────────────────────────

export async function getOrCreateUsage(userId: string): Promise<UsageInfo> {
    const supabase = createAdminClient();
    const period = getCurrentPeriod();

    // Try to get existing usage row
    const { data } = await supabase
        .from('user_usage')
        .select('itineraries_generated, voice_minutes_used, translation_tokens_used, period')
        .eq('user_id', userId)
        .eq('period', period)
        .single();

    if (data) {
        return {
            itinerariesGenerated: data.itineraries_generated,
            voiceMinutesUsed: Number(data.voice_minutes_used),
            translationTokensUsed: data.translation_tokens_used,
            period: data.period,
        };
    }

    // Create a new usage row for this month
    const { data: newRow, error } = await supabase
        .from('user_usage')
        .insert({ user_id: userId, period })
        .select('itineraries_generated, voice_minutes_used, translation_tokens_used, period')
        .single();

    if (error || !newRow) {
        // Return zeros if insert fails (edge case)
        return { itinerariesGenerated: 0, voiceMinutesUsed: 0, translationTokensUsed: 0, period };
    }

    return {
        itinerariesGenerated: newRow.itineraries_generated,
        voiceMinutesUsed: Number(newRow.voice_minutes_used),
        translationTokensUsed: newRow.translation_tokens_used,
        period: newRow.period,
    };
}

// ─── Get Credit Balance ───────────────────────────────────────────────────────

export async function getCreditBalance(userId: string): Promise<CreditInfo> {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('user_credits')
        .select('balance, expires_at')
        .eq('user_id', userId)
        .single();

    if (!data) return { balance: 0, expiresAt: null };

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // Credits expired — zero them out
        await supabase
            .from('user_credits')
            .update({ balance: 0, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        return { balance: 0, expiresAt: data.expires_at };
    }

    return { balance: data.balance, expiresAt: data.expires_at };
}

// ─── Quota Checks ─────────────────────────────────────────────────────────────

export async function checkItineraryQuota(
    userId: string,
    requestedDays: number
): Promise<QuotaResult> {
    const planInfo = await getUserPlan(userId);
    const usage = await getOrCreateUsage(userId);
    const credits = await getCreditBalance(userId);

    // Check max days allowed
    if (requestedDays > planInfo.limits.maxItineraryDays) {
        if (credits.balance >= 1) {
            return { allowed: true, creditsAvailable: credits.balance }; // Credits bypass day limits
        }
        return {
            allowed: false,
            reason: `Your ${planInfo.plan} plan supports up to ${planInfo.limits.maxItineraryDays}-day itineraries. Upgrade your plan or use credits.`,
            upgradeRequired: true,
        };
    }

    // Check monthly itinerary quota
    if (usage.itinerariesGenerated >= planInfo.limits.maxItinerariesPerMonth) {
        if (credits.balance >= 1) {
            return { allowed: true, creditsAvailable: credits.balance }; // Use credits as overflow
        }
        return {
            allowed: false,
            reason: `You've used all ${planInfo.limits.maxItinerariesPerMonth} itineraries for this month. Upgrade or buy credits.`,
            upgradeRequired: true,
        };
    }

    return { allowed: true };
}

export async function checkTranslationQuota(userId: string, tokensNeeded: number = 100): Promise<QuotaResult> {
    const planInfo = await getUserPlan(userId);
    const usage = await getOrCreateUsage(userId);

    if (planInfo.limits.translationTokensPerMonth === -1) {
        return { allowed: true }; // Unlimited
    }

    if (usage.translationTokensUsed + tokensNeeded > planInfo.limits.translationTokensPerMonth) {
        const credits = await getCreditBalance(userId);
        if (credits.balance >= 1) {
            return { allowed: true, creditsAvailable: credits.balance };
        }
        return {
            allowed: false,
            reason: `Translation token limit reached (${planInfo.limits.translationTokensPerMonth}/month). Upgrade or buy credits.`,
            upgradeRequired: true,
        };
    }

    return { allowed: true };
}

export async function checkVoiceQuota(userId: string, minutesNeeded: number = 1): Promise<QuotaResult> {
    const planInfo = await getUserPlan(userId);
    const usage = await getOrCreateUsage(userId);

    if (planInfo.limits.voiceMinutesPerMonth <= 0 && planInfo.plan === 'free') {
        const credits = await getCreditBalance(userId);
        if (credits.balance >= minutesNeeded) {
            return { allowed: true, creditsAvailable: credits.balance };
        }
        return {
            allowed: false,
            reason: 'Voice translation is not available on the Free plan. Upgrade or buy credits.',
            upgradeRequired: true,
        };
    }

    if (usage.voiceMinutesUsed + minutesNeeded > planInfo.limits.voiceMinutesPerMonth) {
        const credits = await getCreditBalance(userId);
        if (credits.balance >= minutesNeeded) {
            return { allowed: true, creditsAvailable: credits.balance };
        }
        return {
            allowed: false,
            reason: `Voice minutes limit reached (${planInfo.limits.voiceMinutesPerMonth} min/month). Upgrade or buy credits.`,
            upgradeRequired: true,
        };
    }

    return { allowed: true };
}

// ─── Usage Deduction (Atomic) ─────────────────────────────────────────────────

export async function deductUsage(
    userId: string,
    type: 'itinerary' | 'voice_minutes' | 'translation_tokens',
    amount: number = 1
): Promise<void> {
    const supabase = createAdminClient();
    const period = getCurrentPeriod();

    // Ensure usage row exists
    await getOrCreateUsage(userId);

    const columnMap = {
        itinerary: 'itineraries_generated',
        voice_minutes: 'voice_minutes_used',
        translation_tokens: 'translation_tokens_used',
    };

    const column = columnMap[type];

    // Atomic increment via raw SQL RPC to prevent race conditions
    const { error } = await supabase.rpc('increment_usage', {
        p_user_id: userId,
        p_period: period,
        p_column: column,
        p_amount: amount,
    });

    // Fallback: if RPC doesn't exist yet, do a standard update
    if (error) {
        console.warn('[Usage] RPC increment_usage not available, using fallback update:', error.message);
        const usage = await getOrCreateUsage(userId);
        const currentVal = type === 'itinerary'
            ? usage.itinerariesGenerated
            : type === 'voice_minutes'
                ? usage.voiceMinutesUsed
                : usage.translationTokensUsed;

        await supabase
            .from('user_usage')
            .update({ [column]: currentVal + amount, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('period', period);
    }
}

// ─── Credit Deduction (Atomic) ────────────────────────────────────────────────

export async function deductCredits(userId: string, amount: number = 1): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    const supabase = createAdminClient();

    // Get current balance
    const { data: creditRow } = await supabase
        .from('user_credits')
        .select('balance, expires_at')
        .eq('user_id', userId)
        .single();

    if (!creditRow || creditRow.balance < amount) {
        return { success: false, error: 'Insufficient credits' };
    }

    // Check expiry
    if (creditRow.expires_at && new Date(creditRow.expires_at) < new Date()) {
        await supabase
            .from('user_credits')
            .update({ balance: 0, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        return { success: false, error: 'Credits have expired' };
    }

    const newBalance = creditRow.balance - amount;
    const { error } = await supabase
        .from('user_credits')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('balance', creditRow.balance); // Optimistic concurrency check

    if (error) {
        return { success: false, error: 'Failed to deduct credits (concurrent update)' };
    }

    return { success: true, newBalance };
}

// ─── Add Credits ──────────────────────────────────────────────────────────────

export async function addCredits(userId: string, amount: number): Promise<void> {
    const supabase = createAdminClient();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const { data: existing } = await supabase
        .from('user_credits')
        .select('balance, total_purchased')
        .eq('user_id', userId)
        .single();

    if (existing) {
        await supabase
            .from('user_credits')
            .update({
                balance: existing.balance + amount,
                total_purchased: existing.total_purchased + amount,
                expires_at: oneYearFromNow.toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
    } else {
        await supabase
            .from('user_credits')
            .insert({
                user_id: userId,
                balance: amount,
                total_purchased: amount,
                expires_at: oneYearFromNow.toISOString(),
            });
    }
}
