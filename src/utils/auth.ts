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
import { headers } from 'next/headers';

type AuthSuccess = { user: User; supabase: SupabaseClient };
type AuthFailure = { error: NextResponse };

export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
    const supabase = await createClient();
    
    // Check for Authorization header from mobile app
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    const {
        data: { user },
        error,
    } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

    if (error || !user) {
        return {
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    return { user, supabase };
}
