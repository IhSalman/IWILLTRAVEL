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
