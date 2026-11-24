/**
 * Daily limits for signed-out visitors (the "small win" funnel).
 *
 * Counts requests per hashed IP per UTC day in the `api_cache` table.
 * The raw IP is never stored (salted SHA-256), keeping this GDPR-friendly.
 * Not perfectly atomic, but enough to stop a single visitor or bot from
 * running up Google Places / LLM costs.
 */
import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { getCache, setCache } from '@/utils/cache';

export const GUEST_DAILY_LIMITS = {
    itinerary: 1,
    translation: 20,
    voice: 0,
} as const;

export type GuestFeature = keyof typeof GUEST_DAILY_LIMITS;

async function getClientIpHash(): Promise<string> {
    const h = await headers();
    const ip =
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        h.get('x-real-ip') ||
        'unknown';
    const salt = process.env.GUEST_IP_SALT || 'iwilltravel-guest';
    return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/** Returns true and records the use if the guest is still under today's limit. */
export async function consumeGuestQuota(feature: GuestFeature): Promise<boolean> {
    const limit = GUEST_DAILY_LIMITS[feature];
    if (limit <= 0) return false;

    const day = new Date().toISOString().slice(0, 10);
    const key = `guest-quota:${feature}:${day}:${await getClientIpHash()}`;

    const current = Number((await getCache(key) as { count?: number } | null)?.count ?? 0);
    if (current >= limit) return false;

    await setCache(key, { count: current + 1 });
    return true;
}
