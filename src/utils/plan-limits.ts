/**
 * SaaS Plan Limits Configuration
 *
 * Central source of truth for all plan-based limits.
 * Used by usage.ts and require-plan.ts to enforce quotas.
 */

export type PlanType = 'free' | 'pro' | 'nomads_pro';

export interface PlanLimits {
    maxItinerariesPerMonth: number;
    maxItineraryDays: number;
    voiceMinutesPerMonth: number;
    translationTokensPerMonth: number; // -1 = unlimited
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    free: {
        maxItinerariesPerMonth: 1,
        maxItineraryDays: 3,
        voiceMinutesPerMonth: 0,
        translationTokensPerMonth: 1000,
    },
    pro: {
        maxItinerariesPerMonth: 10,
        maxItineraryDays: 12,
        voiceMinutesPerMonth: 30,
        translationTokensPerMonth: -1, // unlimited
    },
    nomads_pro: {
        maxItinerariesPerMonth: 30,
        maxItineraryDays: 9999, // effectively unlimited
        voiceMinutesPerMonth: 600,
        translationTokensPerMonth: -1, // unlimited
    },
};

/**
 * Credit pack definitions (for reference / validation).
 */
export const CREDIT_PACKS = [
    { name: 'Starter',     credits: 300,  priceEur: 10  },
    { name: 'Explorer',    credits: 1000, priceEur: 35  },
    { name: 'Nomad Pack',  credits: 2500, priceEur: 70  },
    { name: 'Ultra',       credits: 5000, priceEur: 130 },
] as const;

/**
 * Helper to get the current billing period string (YYYY-MM).
 */
export function getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
