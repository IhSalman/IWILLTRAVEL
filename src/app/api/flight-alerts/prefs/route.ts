/**
 * PUT /api/flight-alerts/prefs  { kinds?: { delay: true, gate: false, … }, minDelayMinutes?: 30 }
 * Which flight changes the user wants emails about.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuth } from '@/utils/auth';
import { resolvePrefs } from '@/lib/flight-status/diff';

export async function PUT(req: Request) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('alert_prefs').eq('id', auth.user.id).maybeSingle();
    const current = resolvePrefs(profile?.alert_prefs);
    // resolvePrefs keeps only known kinds and a sane delay threshold.
    const next = resolvePrefs({
        kinds: { ...current.kinds, ...(typeof body.kinds === 'object' && body.kinds ? body.kinds : {}) },
        minDelayMinutes: body.minDelayMinutes ?? current.minDelayMinutes,
    });

    const { error } = await supabase.from('profiles').update({ alert_prefs: next }).eq('id', auth.user.id);
    if (error) return NextResponse.json({ error: 'Could not save preferences' }, { status: 500 });
    return NextResponse.json({ prefs: next });
}
