/**
 * GET /api/jobs/:id — status, progress logs and (when finished) the result of a
 * background itinerary job.
 *
 * Access: the job's owner. Guest jobs (no user) are readable by anyone holding
 * the unguessable job id (UUID), which is only returned to the guest who started it.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getItineraryJob } from '@/lib/jobs/itinerary-jobs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const job = await getItineraryJob(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (job.user_id) {
        const { data: { user } } = await (await createClient()).auth.getUser();
        if (!user || user.id !== job.user_id) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
    }

    const { user_id: _uid, ...publicJob } = job;
    return NextResponse.json(publicJob, {
        headers: { 'Cache-Control': 'no-store' },
    });
}
