/**
 * Cookie-free Supabase client for PUBLIC, cacheable reads (published guides,
 * sitemap). Using the cookie-based server client forces every page to render
 * dynamically; this one lets Next.js cache pages (ISR) for fast, crawlable SEO pages.
 * Anon key only — Row Level Security still applies.
 */
import { createClient } from '@supabase/supabase-js';

export function createPublicClient() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
