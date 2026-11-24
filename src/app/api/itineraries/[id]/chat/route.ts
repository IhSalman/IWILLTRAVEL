/**
 * POST /api/itineraries/[id]/chat
 * Stateful, API-grounded Conversational Travel Co-Pilot endpoint (Thesis §6.6.3).
 * Works across Next.js Web (cookies) and Flutter Mobile (Bearer JWT).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/utils/auth';
import { runGroundedItineraryChat } from '@/lib/agents/copilot-concierge';

const ChatRequestSchema = z.object({
    message: z.string().min(2).max(1500),
    history: z
        .array(
            z.object({
                role: z.enum(['user', 'assistant']),
                content: z.string().max(2000),
            })
        )
        .max(20)
        .optional()
        .default([]),
});

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth();
    if ('error' in auth) return auth.error;
    const { user } = auth;

    try {
        const { id } = await params;
        const body = await req.json();
        const parsed = ChatRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid chat message', details: parsed.error.flatten() }, { status: 400 });
        }

        const result = await runGroundedItineraryChat({
            userId: user.id,
            itineraryId: id,
            message: parsed.data.message,
            history: parsed.data.history,
        });

        return NextResponse.json(result);
    } catch (err: any) {
        console.error('[Itinerary Co-Pilot Chat] Error:', err);
        return NextResponse.json({ error: err.message || 'Co-Pilot chat failed' }, { status: 500 });
    }
}
