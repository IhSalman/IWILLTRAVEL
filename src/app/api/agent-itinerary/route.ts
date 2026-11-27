/**
 * Agent Itinerary API Route
 *
 * Standardized 8-agent pipeline orchestration (Agent 1 - Agent 8):
 *
 *   Agent 1  -> Discovery (Deterministic Grounding - Google Places)
 *   Agent 2  -> Planning (LLM Strategy - Skeleton Generation)
 *   Agent 3  -> Market Research (Deterministic - Flights/Hotels)
 *   Agent 4  -> Financial Audit (Deterministic - Pricing & Budget Analysis)
 *   Agent 5  -> Cultural Specialist (LLM - Local Experience & Enrichment)
 *   Agent 6  -> Logistics (Deterministic - Route Optimization)
 *   Agent 7  -> Sustainability (Deterministic - ESG Scorecard)
 *   Agent 8  -> Global Composer (LLM - Final Assembly & Narrative)
 *
 * Grounding First: Agent 1 acquires all necessary data BEFORE Agent 2 begins planning.
 */

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCache, setCache } from '@/utils/cache';
import { deductUsage, deductCredits } from '@/utils/usage';
import { getActiveModel, logAiUsage } from '@/utils/ai-config';
import { requirePlan } from '@/utils/require-plan';
import type { AgentLog, StreamEvent } from './types';
import { executeItineraryPipeline } from '@/lib/agents/pipeline';
import { AgentRequestSchema } from './request-schema';

// Input validation lives in ./request-schema (shared with background jobs).

// The 8-agent pipeline usually takes 30–70 s; allow headroom (Vercel max on Hobby is 300 s).
export const maxDuration = 300;

// --- POST Handler --------------------------------------------------------------

export async function POST(req: Request) {
    // Validate before checking quota so a bad request never uses up a guest's daily trip.
    const body = await req.json().catch(() => null);
    const preParsed = AgentRequestSchema.safeParse(body);
    if (!preParsed.success) {
        return NextResponse.json({ error: 'Invalid request', details: preParsed.error.flatten() }, { status: 400 });
    }

    const planResult = await requirePlan('itinerary', { allowGuest: true });
    if ('error' in planResult) return planResult.error;
    const { user, useCredits } = planResult;

    try {
        const input = preParsed.data;

        // Cache lookup
        const hash = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
        const cacheKey = `agent_itinerary_${hash}`;
        const cached: any = await getCache(cacheKey);
        if (cached) {
            const payload = cached?.itinerary
                ? { ...cached, fromCache: true }
                : { itinerary: cached, flights: [], hotels: [], flightAnalysis: null, agents: [], fromCache: true };
            return new Response(`event: result\ndata: ${JSON.stringify(payload)}\n\n`, {
                headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
            });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const result = await executeItineraryPipeline(
                        input,
                        (log) => {
                            controller.enqueue(encoder.encode(`event: log\ndata: ${JSON.stringify(log)}\n\n`));
                        },
                        {
                            userId: user?.id ?? null,
                            onSkeleton: (skeletonPlan) => {
                                controller.enqueue(
                                    encoder.encode(`event: skeleton\ndata: ${JSON.stringify({ plan: skeletonPlan.plan })}\n\n`)
                                );
                            },
                        }
                    );

                    const { itinerary, research, flightAnalysis, agentLogs, totalMs } = result;

                    const resultData = { 
                        itinerary, 
                        flights: research.flights, 
                        hotels: research.hotels, 
                        flightAnalysis, 
                        agents: agentLogs, 
                        totalMs, 
                        fromCache: false 
                    };
                    
                    controller.enqueue(encoder.encode(`event: result\ndata: ${JSON.stringify(resultData)}\n\n`));

                    // Charge usage BEFORE closing the stream. Work scheduled after the response
                    // ends can be frozen by the serverless runtime, which let trips go uncounted.
                    if (user) {
                        try {
                            if (useCredits) await deductCredits(user.id, 1);
                            else await deductUsage(user.id, 'itinerary', 1);
                        } catch (usageErr) {
                            console.error('[Agent Itinerary] Usage deduction failed:', usageErr);
                        }
                    }
                    await setCache(cacheKey, resultData).catch(() => {});

                    // Best-effort analytics only
                    (async () => {
                        const activeModelName = await getActiveModel();
                        const totalInputTokens = (result.itinerary._tokens?.inputTokens || 0); // Simplified for now
                        const totalOutputTokens = (result.itinerary._tokens?.outputTokens || 0);
                        
                        await logAiUsage({
                            userId: user ? user.id : null,
                            featureType: 'agent_itinerary',
                            inputTokens: totalInputTokens,
                            outputTokens: totalOutputTokens,
                            totalTokens: totalInputTokens + totalOutputTokens,
                            model: activeModelName,
                            requestData: { destination: input.destination, days: input.days },
                        }).catch(() => {});
                    })();

                    controller.close();
                } catch (error: any) {
                    controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`));
                    controller.close();
                }
            }
        });

        return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
