/**
 * Server-only Supabase admin client factory.
 * Uses the service role key — MUST only be called from Server Components or API routes.
 * A fresh client is created per call to avoid session/state leaks between requests.
 */
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('Supabase admin environment variables are not configured.');
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
