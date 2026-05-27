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
import { z } from 'zod';
import crypto from 'node:crypto';
import { getCache, setCache } from '@/utils/cache';
import { deductUsage, deductCredits } from '@/utils/usage';
import { getActiveModel, logAiUsage } from '@/utils/ai-config';
import { requirePlan } from '@/utils/require-plan';
import type { AgentLog, StreamEvent } from './types';
import { executeItineraryPipeline } from '@/lib/agents/pipeline';

// --- Input Validation Schema ---------------------------------------------------

const AgentRequestSchema = z.object({
    destination: z.string().min(2),
    days: z.number().int().min(1).max(30),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    budget: z.enum(['budget', 'moderate', 'luxury', 'custom']),
    travelStyle: z.enum(['relaxed', 'balanced', 'adventure', 'cultural']),
    travelerType: z.enum(['single', 'couple', 'family', 'friends']),
    interests: z.array(z.string()).default([]),
    transport: z.enum(['public', 'rental', 'walking']),
    originCity: z.string().optional(),
    includeFlights: z.boolean().optional().default(false),
    includeHotels: z.boolean().optional().default(false),
    customBudget: z.number().optional(),
    currency: z.string().optional().default('USD'),
});

// --- POST Handler --------------------------------------------------------------

export async function POST(req: Request) {
    const planResult = await requirePlan('itinerary', { allowGuest: true });
    if ('error' in planResult) return planResult.error;
    const { user, useCredits } = planResult;

    try {
        const body = await req.json();
        const parsed = AgentRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
        }
        const input = parsed.data;

        // Cache lookup
        const hash = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
        const cacheKey = `agent_itinerary_${hash}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return new Response(`event: result\ndata: ${JSON.stringify({ itinerary: cached, agents: [], fromCache: true })}\n\n`, {
                headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
            });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const agentLogs: AgentLog[] = [];
                const pipelineStart = Date.now();

                const streamLog = (agent: string, startMs: number, status: AgentLog['status'], details?: string) => {
                    const log: AgentLog = { agent, durationMs: Date.now() - startMs, status, details, timestamp: new Date().toISOString() };
                    agentLogs.push(log);
                    controller.enqueue(encoder.encode(`event: log\ndata: ${JSON.stringify(log)}\n\n`));
                };

                try {
                    const result = await executeItineraryPipeline(input, (log) => {
                        controller.enqueue(encoder.encode(`event: log\ndata: ${JSON.stringify(log)}\n\n`));
                    }, { userId: user?.id ?? null });

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

                    // Async cleanup
                    (async () => {
                        if (user) useCredits ? await deductCredits(user.id, 1) : await deductUsage(user.id, 'itinerary', 1);
                        await setCache(cacheKey, itinerary);
                        const activeModelName = await getActiveModel();
                        const totalInputTokens = (result.itinerary._tokens?.inputTokens || 0); // Simplified for now
                        const totalOutputTokens = (result.itinerary._tokens?.outputTokens || 0);
                        
                        await logAiUsage({
                            userId: user ? user.id : 'guest',
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
