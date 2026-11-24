/**
 * Combined Auth + Plan Validation Middleware
 *
 * Usage in API routes:
 *   const result = await requirePlan('itinerary', { days: 5 });
 *   if ('error' in result) return result.error;
 *   const { user, plan, supabase, useCredits } = result;
 *
 *   // After successful operation:
 *   if (useCredits) await deductCredits(user.id, 1);
 *   else await deductUsage(user.id, 'itinerary');
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import {
    getUserPlan,
    checkItineraryQuota,
    checkTranslationQuota,
    checkVoiceQuota,
    type UserPlanInfo,
    type QuotaResult,
} from './usage';
import { PLAN_LIMITS } from './plan-limits';
import { consumeGuestQuota } from './guest-limit';

type FeatureType = 'itinerary' | 'translation' | 'voice';

interface PlanSuccess {
    user: User | null;
    supabase: SupabaseClient;
    plan: UserPlanInfo;
    useCredits: boolean; // true if quota exceeded but credits are available
}

interface PlanFailure {
    error: NextResponse;
}

interface PlanOptions {
    days?: number;         // For itinerary requests
    minutes?: number;      // For voice TTS requests
    tokens?: number;       // For translation requests
    allowGuest?: boolean;  // Allow unauthenticated requests for the "Small Win" funnel
}

export async function requirePlan(
    feature: FeatureType,
    options: PlanOptions = {}
): Promise<PlanSuccess | PlanFailure> {
    // 1. Authenticate
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        if (options.allowGuest) {
            // Guest mode: free tier limits so they can experience the "Small win",
            // capped per IP per day to protect API costs.
            if (!(await consumeGuestQuota(feature))) {
                return {
                    error: NextResponse.json(
                        {
                            error: 'You have used your free guest preview for today. Sign up free to plan more trips.',
                            signupRequired: true,
                            limitReached: true,
                        },
                        { status: 429 }
                    ),
                };
            }
            return {
                user: null,
                supabase,
                plan: { plan: 'free', limits: { ...PLAN_LIMITS.free, maxItineraryDays: 14 }, status: 'active', billingCycle: null } as UserPlanInfo,
                useCredits: false
            };
        }
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    // 2. Get plan
    const plan = await getUserPlan(user.id);

    if (plan.status !== 'active') {
        return {
            error: NextResponse.json(
                { error: 'Your subscription is not active. Please renew.', upgradeRequired: true },
                { status: 403 }
            ),
        };
    }

    // 3. Check quota based on feature type
    let quota: QuotaResult;
    switch (feature) {
        case 'itinerary':
            quota = await checkItineraryQuota(user.id, options.days ?? 1);
            break;
        case 'translation':
            quota = await checkTranslationQuota(user.id, options.tokens ?? 100);
            break;
        case 'voice':
            quota = await checkVoiceQuota(user.id, options.minutes ?? 1);
            break;
    }

    if (!quota.allowed) {
        return {
            error: NextResponse.json(
                {
                    error: quota.reason || 'Usage limit exceeded',
                    upgradeRequired: quota.upgradeRequired,
                    limitReached: true,
                },
                { status: 429 }
            ),
        };
    }

    // Determine if credits should be used (quota exceeded but credits available)
    const useCredits = !!quota.creditsAvailable && quota.creditsAvailable > 0;

    return { user, supabase, plan, useCredits };
}
