import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCache, setCache } from '@/utils/cache';
import { getActiveModel, logAiUsage } from '@/utils/ai-config';
import { requirePlan } from '@/utils/require-plan';
import { deductUsage, deductCredits } from '@/utils/usage';
import crypto from 'node:crypto';

import {
  strategyPlannerAgent,
  dataFetcherAgent,
  localGuideAgent,
  routePlannerAgent,
  reviewerAgent,
  itineraryWriterAgent,
} from './agents';
import type { AgentLog } from './types';

// ─── Input Schema ───
const AgentRequestSchema = z.object({
  destination: z.string().min(1).max(200),
  days: z.number().int().min(1).max(30),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.enum(['budget', 'moderate', 'luxury', 'custom']),
  travelStyle: z.enum(['relaxed', 'balanced', 'adventure', 'cultural']),
  travelerType: z.enum(['single', 'couple', 'family', 'friends']),
  interests: z.array(z.string()).max(8).optional().default([]),
  transport: z.enum(['public', 'rental', 'walking']).optional().default('public'),
  originCity: z.string().optional(),
  includeFlights: z.boolean().optional().default(false),
  includeHotels: z.boolean().optional().default(false),
  customBudget: z.number().positive().optional(),
  currency: z.string().min(3).max(3).optional().default('USD'),
});

export async function POST(req: Request) {
  const agentLogs: AgentLog[] = [];
  const pipelineStart = Date.now();

  try {
    // ─── 1. Auth + Plan ───
    const planResult = await requirePlan('itinerary', { days: undefined });
    if ('error' in planResult) return planResult.error;
    const { user, plan: userPlan, useCredits } = planResult;

    // ─── 2. Validate ───
    const body = await req.json();
    const parsed = AgentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }
    const input = parsed.data;

    // ─── 2.1 Plan day limit ───
    if (input.days > userPlan.limits.maxItineraryDays) {
      return NextResponse.json(
        { error: `Your ${userPlan.plan} plan supports up to ${userPlan.limits.maxItineraryDays}-day itineraries. Upgrade or buy credits.`, upgradeRequired: true, limitReached: true },
        { status: 429 }
      );
    }

    // ─── 2.5 Cache check ───
    // NOTE: Cache key includes flights/hotels flags so flight/hotel data is always fresh when toggled
    const cacheKeyObj = {
      dest: input.destination, days: input.days, budget: input.budget,
      style: input.travelStyle, type: input.travelerType,
      interests: [...input.interests].sort(), transport: input.transport,
      includeFlights: input.includeFlights, includeHotels: input.includeHotels,
      originCity: input.originCity || null,
      agent: 'v4-4agent',
    };
    const hash = crypto.createHash('sha256').update(JSON.stringify(cacheKeyObj)).digest('hex');
    const cacheKey = `agent_itinerary_v4_${hash}`;
    const cached = await getCache(cacheKey) as { itinerary: any; flights: any[]; hotels: any[] } | null;
    if (cached) {
      console.log('[Pipeline] Cache HIT — returning full cached response');
      return NextResponse.json({ itinerary: cached.itinerary, flights: cached.flights || [], hotels: cached.hotels || [], fromCache: true });
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[Pipeline] Starting 4-Agent Itinerary V4 for ${input.destination}`);
    console.log(`${'═'.repeat(60)}`);

    // ─── 1. Data Fetcher (Flights & Hotels first) ───
    let t = Date.now();
    const scout = await dataFetcherAgent(input);
    agentLogs.push({ agent: 'Data Fetcher', durationMs: Date.now() - t, status: 'success' });

    // ─── 2. Strategy Planner ───
    t = Date.now();
    const mission = await strategyPlannerAgent(input, scout);
    agentLogs.push({ agent: 'Strategy Planner', durationMs: Date.now() - t, status: 'success' });

    // ─── 3. Local Guide (POIs) ───
    t = Date.now();
    const pois = await localGuideAgent(input, mission, scout.hotels);
    agentLogs.push({ agent: 'Local Guide', durationMs: Date.now() - t, status: 'success' });

    // ─── 4. Route Planner (Draft 1) ───
    t = Date.now();
    let plan = await routePlannerAgent(pois, input, mission, scout);
    agentLogs.push({ agent: 'Route Planner', durationMs: Date.now() - t, status: plan.plan.length ? 'success' : 'error' });

    if (!plan.plan.length) {
      return NextResponse.json({ error: 'Route Planner failed to generate a plan.' }, { status: 500 });
    }

    // ─── 5. The Reviewer (Refinement Loop) ───
    t = Date.now();
    const qaResult = await reviewerAgent(plan, pois, input, scout);
    agentLogs.push({ agent: 'Reviewer', durationMs: Date.now() - t, status: qaResult.isValid ? 'success' : 'error' });

    if (!qaResult.isValid) {
      console.log(`[Pipeline] Reviewer Rejected Draft 1. Requesting Refinement.\nCritique: ${qaResult.critique}`);
      t = Date.now();
      plan = await routePlannerAgent(pois, input, mission, scout, qaResult.critique);
      agentLogs.push({ agent: 'Route Planner (Refinement)', durationMs: Date.now() - t, status: plan.plan.length ? 'success' : 'error' });
    } else {
      console.log('[Pipeline] Reviewer Approved Draft 1.');
    }

    // ─── 6. Itinerary Writer (Final Assembly) ───
    t = Date.now();
    const itinerary = await itineraryWriterAgent({
      input, plan, scout, pois
    });
    agentLogs.push({ agent: 'Itinerary Writer', durationMs: Date.now() - t, status: 'success' });

    const totalMs = Date.now() - pipelineStart;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[Pipeline] COMPLETE in ${(totalMs / 1000).toFixed(1)}s`);
    agentLogs.forEach(l => console.log(`  ${l.agent}: ${l.durationMs}ms [${l.status}]`));
    console.log(`${'─'.repeat(60)}\n`);

    // ─── Log Usage with real token sums ───
    try {
      // Sum tokens from LLM agents (Planning/Orchestrator, Logistics, Composer)
      const orchTokens = (mission as any)?._tokens || { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
      const planTokens = (plan as any)?._tokens || { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
      const composerTokens = (itinerary as any)?._tokens || { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
      
      const totalInputTokens = orchTokens.inputTokens + planTokens.inputTokens + composerTokens.inputTokens;
      const totalOutputTokens = orchTokens.outputTokens + planTokens.outputTokens + composerTokens.outputTokens;
      const totalTokens = orchTokens.totalTokens + planTokens.totalTokens + composerTokens.totalTokens;

      const activeModelName = await getActiveModel();
      await logAiUsage({
        userId: user.id,
        featureType: 'itinerary',
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens,
        model: activeModelName,
        requestData: {
          destination: input.destination,
          days: input.days,
          budget: input.budget,
          agent: '4-agent-v4',
          pipelineMs: totalMs,
          agentLogs: agentLogs.map(l => ({ agent: l.agent, ms: l.durationMs, status: l.status })),
        },
      });
    } catch (logErr) {
      console.error('[Pipeline] Log failed:', logErr);
    }

    // ─── Cache & Deduct Usage ───
    const flightsResult = input.includeFlights ? scout.flights : [];
    const hotelsResult = input.includeHotels ? scout.hotels : [];
    // Cache the full response payload (itinerary + flights + hotels)
    await setCache(cacheKey, { itinerary, flights: flightsResult, hotels: hotelsResult });

    // Deduct usage or credits
    if (useCredits) {
      await deductCredits(user.id, 1);
    } else {
      await deductUsage(user.id, 'itinerary');
    }

    // ─── Trigger Async Blog Generation (Phase 7) ───
    try {
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const host = req.headers.get('host') || 'localhost:3000';
      const url = `${protocol}://${host}/api/admin/process-itinerary-to-blog`;
      
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itinerary, input })
      }).catch(err => console.error('[Pipeline] Async blog generation fetch failed:', err.message));
    } catch (e) {
      console.error('[Pipeline] Error initiating async blog trigger:', e);
    }

    console.log(`[Pipeline] Scout results → flights: ${flightsResult.length}, hotels: ${hotelsResult.length}`);

    return NextResponse.json({
      itinerary,
      flights: flightsResult,
      hotels: hotelsResult,
      agentInfo: {
        version: '4-agent-v4',
        pipelineMs: totalMs,
        agents: agentLogs.map(l => ({ name: l.agent, ms: l.durationMs, status: l.status })),
      },
    });

  } catch (error: any) {
    console.error('[Pipeline] Fatal error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
