/**
 * POST /api/jobs/itinerary — start itinerary generation in the background.
 * Returns 202 { jobId } immediately; poll GET /api/jobs/:id for progress/result.
 *
 * Same validation and plan/quota rules as the streaming /api/agent-itinerary route.
 * Usage is charged only when the job succeeds.
 */
import { NextResponse, after } from 'next/server';
import { requirePlan } from '@/utils/require-plan';
import { deductCredits, deductUsage } from '@/utils/usage';
import { AgentRequestSchema } from '@/app/api/agent-itinerary/request-schema';
import { createItineraryJob, runItineraryJob } from '@/lib/jobs/itinerary-jobs';

// The job runs inside this function's lifetime via after().
export const maxDuration = 300;

export async function POST(req: Request) {
    // Validate before checking quota so a bad request never uses up a guest's daily trip.
    const parsed = AgentRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const planResult = await requirePlan('itinerary', { allowGuest: true });
    if ('error' in planResult) return planResult.error;
    const { user, useCredits } = planResult;

    const jobId = await createItineraryJob({ userId: user?.id ?? null, input: parsed.data, source: 'web' });

    after(() =>
        runItineraryJob(jobId, {
            onSuccess: async () => {
                if (!user) return;
                if (useCredits) await deductCredits(user.id, 1);
                else await deductUsage(user.id, 'itinerary', 1);
            },
        })
    );

    return NextResponse.json({ jobId, status: 'queued' }, { status: 202 });
}
