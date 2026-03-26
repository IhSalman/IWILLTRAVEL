/**
 * Shared authentication helper for API route handlers.
 * Eliminates repeated auth boilerplate across all routes.
 *
 * Usage:
 *   const authResult = await requireAuth();
 *   if ('error' in authResult) return authResult.error;
 *   const { user, supabase } = authResult;
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { User, SupabaseClient } from '@supabase/supabase-js';

type AuthSuccess = { user: User; supabase: SupabaseClient };
type AuthFailure = { error: NextResponse };

export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return {
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    return { user, supabase };
}
