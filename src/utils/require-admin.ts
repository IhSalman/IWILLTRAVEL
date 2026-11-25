/**
 * Server-side admin guard for /api/admin/* routes.
 *
 * The /admin pages are protected in src/proxy.ts, but the proxy does not run for
 * /api routes, so every admin API must call this itself.
 * Admin = profiles.is_admin === true for the signed-in user.
 */
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function requireAdmin(): Promise<{ user: User } | { error: NextResponse }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const { data: profile } = await createAdminClient()
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.is_admin !== true) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { user };
}
