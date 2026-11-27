/**
 * SaaS Plan Limits Configuration
 *
 * Central source of truth for all plan-based limits.
 * Tiers: free → starter → pro → enterprise
 *
 * Design philosophy: Limit quantity on free, not usefulness.
 * Day caps removed — they feel artificial and hurt adoption.
 */

export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

export interface PlanLimits {
    /** -1 = unlimited */
    maxItinerariesPerMonth: number;
    /** Total lifetime itineraries. -1 = unlimited */
    maxItinerariesTotal: number;
    /** No longer used for gating — kept for display only. -1 = unlimited */
    maxItineraryDays: number;
    /** Voice translation minutes per month. -1 = unlimited */
    voiceMinutesPerMonth: number;
    /** Translation tokens per month. -1 = unlimited */
    translationTokensPerMonth: number;
    canExportPDF: boolean;
    hasPriorityModel: boolean;
    hasWhiteLabel: boolean;
    hasSustainabilityScore: boolean;
    hasLiveFlightData: boolean;
    hasLiveHotelData: boolean;
    canSaveAndShare: boolean;
    hasApiAccess: boolean;
    hasTeamSeats: boolean;
    /** Email alerts for tracked flights (delays, gates, cancellations, aircraft swaps). */
    hasFlightAlerts: boolean;
    /** Flights tracked at the same time. 0 = none, -1 = unlimited */
    maxTrackedFlights: number;
    /** Alerts when chosen aircraft models (A380, 747…) fly near / land at an airport. */
    hasAircraftWatches: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    /**
     * Free — "Try it"
     * 2 itineraries per month; extra trips via credit packs or an upgrade.
     */
    free: {
        maxItinerariesPerMonth: 2,
        maxItinerariesTotal: -1,
        maxItineraryDays: -1,
        voiceMinutesPerMonth: 0,
        translationTokensPerMonth: 0,
        canExportPDF: false,
        hasPriorityModel: false,
        hasWhiteLabel: false,
        hasSustainabilityScore: false,
        hasLiveFlightData: false,
        hasLiveHotelData: false,
        canSaveAndShare: false,
        hasApiAccess: false,
        hasTeamSeats: false,
        hasFlightAlerts: false,
        maxTrackedFlights: 0,
        hasAircraftWatches: false,
    },

    /**
     * Starter — €6/mo — "Occasional traveler"
     * Unlimited itineraries, save & share, hotels, PDF export.
     * Bridge between free and pro for light users.
     */
    starter: {
        maxItinerariesPerMonth: -1,
        maxItinerariesTotal: -1,
        maxItineraryDays: -1,
        voiceMinutesPerMonth: 0,
        translationTokensPerMonth: 0,
        canExportPDF: true,
        hasPriorityModel: true,
        hasWhiteLabel: false,
        hasSustainabilityScore: false,
        hasLiveFlightData: false,
        hasLiveHotelData: true,
        canSaveAndShare: true,
        hasApiAccess: false,
        hasTeamSeats: false,
        hasFlightAlerts: true,
        maxTrackedFlights: 5,
        hasAircraftWatches: false,
    },

    /**
     * Pro — €12/mo — "Serious traveler" ⭐ Most Popular
     * Everything in Starter + live flights, voice translation, ESG scoring.
     * The conversion target — positioned as the obvious choice.
     */
    pro: {
        maxItinerariesPerMonth: -1,
        maxItinerariesTotal: -1,
        maxItineraryDays: -1,
        voiceMinutesPerMonth: 10,
        translationTokensPerMonth: -1,
        canExportPDF: true,
        hasPriorityModel: true,
        hasWhiteLabel: false,
        hasSustainabilityScore: true,
        hasLiveFlightData: true,
        hasLiveHotelData: true,
        canSaveAndShare: true,
        hasApiAccess: false,
        hasTeamSeats: false,
        hasFlightAlerts: true,
        maxTrackedFlights: -1,
        hasAircraftWatches: true,
    },

    /**
     * Enterprise — Custom pricing — "Teams & B2B"
     * White-label, API access, team seats, dedicated support.
     * Contact form → custom quote.
     */
    enterprise: {
        maxItinerariesPerMonth: -1,
        maxItinerariesTotal: -1,
        maxItineraryDays: -1,
        voiceMinutesPerMonth: -1,
        translationTokensPerMonth: -1,
        canExportPDF: true,
        hasPriorityModel: true,
        hasWhiteLabel: true,
        hasSustainabilityScore: true,
        hasLiveFlightData: true,
        hasLiveHotelData: true,
        canSaveAndShare: true,
        hasApiAccess: true,
        hasTeamSeats: true,
        hasFlightAlerts: true,
        maxTrackedFlights: -1,
        hasAircraftWatches: true,
    },
};

/**
 * Monthly subscription pricing (EUR).
 */
export const PLAN_PRICING = {
    free:       { monthly: 0,  yearly: 0   },
    starter:    { monthly: 6,  yearly: 60  }, // €5/mo billed annually
    pro:        { monthly: 12, yearly: 115 }, // €9.55/mo billed annually
    enterprise: { monthly: 0,  yearly: 0   }, // Custom — contact sales
} as const;

/**
 * Helper to get the current billing period string (YYYY-MM).
 */
export function getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Credit pack options for manual top-ups.
 */
export const CREDIT_PACKS = [
    { name: 'Starter', priceEur: 2,  credits: 50 },
    { name: 'Traveler', priceEur: 5,  credits: 150 },
    { name: 'Expert', priceEur: 10, credits: 400 },
] as const;
