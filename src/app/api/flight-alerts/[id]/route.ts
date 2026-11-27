/**
 * DELETE /api/flight-alerts/:id  → stop tracking a flight (removes it and its alert history)
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuth } from '@/utils/auth';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await createAdminClient()
        .from('tracked_flights')
        .delete()
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .select('id');
    if (error) return NextResponse.json({ error: 'Could not remove this flight' }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
}
