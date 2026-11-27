/**
 * EU261 / UK261 delay & cancellation compensation rules (simplified, deterministic).
 *
 * Covers: flights departing the EU/EEA/Switzerland (any airline), or arriving there on an
 * EU-licensed airline; UK261 mirrors this for the UK with GBP amounts. Compensation is due for
 * arrival delays of 3h+ or short-notice cancellations, unless the airline proves
 * "extraordinary circumstances" (severe weather, air-traffic-control restrictions, security…).
 * Pure function: tested in src/lib/eu261.test.ts. Not legal advice.
 */

/** EU member states + EEA (IS, LI, NO) + Switzerland, which apply EU261. */
export const EU261_COUNTRIES = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
    'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH',
]);
export const UK_COUNTRIES = new Set(['GB']);

export type Scheme = 'EU261' | 'UK261';

export interface CompensationInput {
    /** ISO-2 country codes of the departure and arrival airports. */
    depCountry: string | null;
    arrCountry: string | null;
    /** ISO-2 country where the operating airline is licensed. */
    carrierCountry: string | null;
    distanceKm: number;
    /** Minutes late at the arrival gate (null when unknown). */
    arrivalDelayMinutes: number | null;
    cancelled?: boolean;
    /** Days of notice the airline gave for a cancellation (compensation applies under 14). */
    cancellationNoticeDays?: number | null;
}

export interface CompensationResult {
    eligible: 'yes' | 'maybe' | 'no';
    scheme: Scheme | null;
    /** e.g. "€400" or "£350" */
    amount: string | null;
    amountValue: number | null;
    reason: string;
}

function band(distanceKm: number, intraRegion: boolean): 0 | 1 | 2 {
    if (distanceKm <= 1500) return 0;
    if (distanceKm <= 3500 || intraRegion) return 1;
    return 2;
}

const AMOUNTS: Record<Scheme, { symbol: string; values: [number, number, number] }> = {
    EU261: { symbol: '€', values: [250, 400, 600] },
    UK261: { symbol: '£', values: [220, 350, 520] },
};

export function whichScheme(depCountry: string | null, arrCountry: string | null, carrierCountry: string | null): Scheme | null {
    const dep = depCountry?.toUpperCase() ?? '';
    const arr = arrCountry?.toUpperCase() ?? '';
    const carrier = carrierCountry?.toUpperCase() ?? '';
    if (EU261_COUNTRIES.has(dep)) return 'EU261';
    if (UK_COUNTRIES.has(dep)) return 'UK261';
    if (EU261_COUNTRIES.has(arr) && EU261_COUNTRIES.has(carrier)) return 'EU261';
    if (UK_COUNTRIES.has(arr) && UK_COUNTRIES.has(carrier)) return 'UK261';
    return null;
}

export function checkCompensation(input: CompensationInput): CompensationResult {
    const scheme = whichScheme(input.depCountry, input.arrCountry, input.carrierCountry);
    if (!scheme) {
        return { eligible: 'no', scheme: null, amount: null, amountValue: null, reason: 'EU261/UK261 only cover flights leaving the EU or UK, or arriving there on an EU/UK airline.' };
    }
    const region = scheme === 'EU261' ? EU261_COUNTRIES : UK_COUNTRIES;
    const intra = region.has(input.depCountry?.toUpperCase() ?? '') && region.has(input.arrCountry?.toUpperCase() ?? '');
    const { symbol, values } = AMOUNTS[scheme];
    const value = values[band(input.distanceKm, intra)];
    const amount = `${symbol}${value}`;

    if (input.cancelled) {
        if (input.cancellationNoticeDays != null && input.cancellationNoticeDays >= 14) {
            return { eligible: 'no', scheme, amount: null, amountValue: null, reason: 'Cancellations announced 14 or more days ahead are not compensated (you are still owed a refund or rebooking).' };
        }
        return { eligible: 'maybe', scheme, amount, amountValue: value, reason: `Short-notice cancellations can earn up to ${amount} under ${scheme}, unless the airline offered a close alternative flight or the cause was extraordinary (e.g. severe weather).` };
    }

    const delay = input.arrivalDelayMinutes;
    if (delay === null) return { eligible: 'maybe', scheme, amount, amountValue: value, reason: `If you reach your destination 3+ hours late you may be owed ${amount} under ${scheme}.` };
    if (delay < 180) {
        return { eligible: 'no', scheme, amount: null, amountValue: null, reason: `Compensation starts at a 3-hour arrival delay; this flight arrived ${delay} minutes late.` };
    }
    return {
        eligible: 'yes',
        scheme,
        amount,
        amountValue: value,
        reason: `Arriving ${Math.floor(delay / 60)}h ${delay % 60}m late on a ${Math.round(input.distanceKm).toLocaleString('en')} km flight qualifies for ${amount} under ${scheme}, unless the airline shows extraordinary circumstances (severe weather, air traffic control restrictions, security issues).`,
    };
}
