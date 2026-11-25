import { createAdminClient } from '@/utils/supabase/admin';

const IS_DEV = process.env.NODE_ENV === 'development';

export async function getCache(key: string): Promise<unknown | null> {
    try {
        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin
            .from('api_cache')
            .select('data')
            .eq('cache_key', key)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            console.error(`[Cache] Error fetching key "${key}":`, error.message);
            return null;
        }

        if (data) {
            if (IS_DEV) console.log(`[Cache] Hit for key: ${key}`);
            return data.data;
        }

        return null;
    } catch (e) {
        console.error(`[Cache] Exception fetching key "${key}":`, e);
        return null;
    }
}

/**
 * Read a cache entry only if it is younger than `maxAgeMs`.
 * Returns null when missing, expired, or on any error (callers then fetch fresh data).
 */
export async function getFreshCache<T = unknown>(key: string, maxAgeMs: number): Promise<T | null> {
    try {
        const { data, error } = await createAdminClient()
            .from('api_cache')
            .select('data, created_at')
            .eq('cache_key', key)
            .maybeSingle();
        if (error || !data) return null;
        const age = Date.now() - new Date(data.created_at).getTime();
        if (!Number.isFinite(age) || age > maxAgeMs) return null;
        return data.data as T;
    } catch {
        return null;
    }
}

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Cache-aside helper for paid API calls.
 * - Serves a fresh cached value when available.
 * - Otherwise runs `fetcher`, stores non-empty results, and returns them.
 * - Concurrent identical requests in the same instance share one fetch.
 * Empty results (null / []) are not cached so a transient failure is retried next time.
 */
export async function cached<T>(key: string, maxAgeMs: number, fetcher: () => Promise<T>): Promise<T> {
    const hit = await getFreshCache<T>(key, maxAgeMs);
    if (hit !== null && hit !== undefined) return hit;

    const pending = inFlight.get(key) as Promise<T> | undefined;
    if (pending) return pending;

    const run = (async () => {
        const value = await fetcher();
        const isEmpty = value === null || value === undefined || (Array.isArray(value) && value.length === 0);
        if (!isEmpty) await setCache(key, value);
        return value;
    })().finally(() => inFlight.delete(key));

    inFlight.set(key, run);
    return run;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export async function setCache(key: string, data: unknown): Promise<void> {
    try {
        const supabaseAdmin = createAdminClient();
        const { error } = await supabaseAdmin
            .from('api_cache')
            .upsert({ cache_key: key, data: data, created_at: new Date().toISOString() });

        if (error) {
            console.error(`[Cache] Error setting key "${key}":`, error.message);
        } else {
            if (IS_DEV) console.log(`[Cache] Successfully set key: ${key}`);
        }
    } catch (e) {
        console.error(`[Cache] Exception setting key "${key}":`, e);
    }
}
