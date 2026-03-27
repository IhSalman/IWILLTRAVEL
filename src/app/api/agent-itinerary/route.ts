import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCache, setCache } from '@/utils/cache';
import { getActiveModel, logAiUsage } from '@/utils/ai-config';
import { requirePlan } from '@/utils/require-plan';
import { deductUsage, deductCredits } from '@/utils/usage';
import crypto from 'node:crypto';

import {
  travelPlanningAgent,
  travelResearchAgent,
  localExperienceAgent,
  flightAnalysisAgent,
  budgetOptimizationAgent,
  routeOptimizationAgent,
  finalComposerAgent,
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
    const cacheKeyObj = {
      dest: input.destination, days: input.days, budget: input.budget,
      style: input.travelStyle, type: input.travelerType,
      interests: [...input.interests].sort(), transport: input.transport,
      agent: 'v3-9agent',
    };
    const hash = crypto.createHash('sha256').update(JSON.stringify(cacheKeyObj)).digest('hex');
    const cacheKey = `agent_itinerary_${hash}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ itinerary: cached, fromCache: true });
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[Pipeline] Starting 9-Agent Itinerary for ${input.destination}, ${input.days} days`);
    console.log(`${'═'.repeat(60)}`);

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 1: TRAVEL PLANNING AGENT (LLM — Structure)
    // ═══════════════════════════════════════════════════════════════════════
    let t = Date.now();
    const plan = await travelPlanningAgent(input);
    agentLogs.push({ agent: 'TravelPlanning', durationMs: Date.now() - t, status: plan.error ? 'error' : 'success', details: plan.error });

    if (plan.error || !plan.plan.length) {
      console.error('[Pipeline] Agent 1 failed:', plan.details);
      return NextResponse.json({ error: 'Planning agent failed. Please retry.', details: plan.details }, { status: 500 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 2 + 3: RESEARCH + EXPERIENCE (Parallel — Tools)
    // ═══════════════════════════════════════════════════════════════════════
    t = Date.now();
    const [research, experiences] = await Promise.all([
      travelResearchAgent(plan, input),
      localExperienceAgent(plan, input),
    ]);
    const researchTime = Date.now() - t;
    agentLogs.push({ agent: 'TravelResearch', durationMs: researchTime, status: research.error ? 'error' : 'success', details: research.error });
    agentLogs.push({ agent: 'LocalExperience', durationMs: researchTime, status: experiences.error ? 'error' : 'success', details: experiences.error });

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 4: FLIGHT ANALYSIS (Pure code)
    // ═══════════════════════════════════════════════════════════════════════
    t = Date.now();
    const flightAnalysis = flightAnalysisAgent(research.flights);
    agentLogs.push({ agent: 'FlightAnalysis', durationMs: Date.now() - t, status: 'success' });

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 5: BUDGET OPTIMIZATION (Pure code)
    // ═══════════════════════════════════════════════════════════════════════
    t = Date.now();
    const budgetCheck = budgetOptimizationAgent(
      research.flights, research.hotels, input.budget, input.days,
      input.customBudget, input.currency,
    );
    agentLogs.push({ agent: 'BudgetOptimization', durationMs: Date.now() - t, status: 'success' });

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 6: ROUTE OPTIMIZATION (Pure code)
    // ═══════════════════════════════════════════════════════════════════════
    t = Date.now();
    const optimizedRoute = routeOptimizationAgent(plan);
    agentLogs.push({ agent: 'RouteOptimization', durationMs: Date.now() - t, status: 'success' });

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 9: FINAL COMPOSER (LLM — merges 7 Personalization + 8 Safety)
    // ═══════════════════════════════════════════════════════════════════════
    t = Date.now();
    const itinerary = await finalComposerAgent({
      input, plan, research, experiences, flightAnalysis, budgetCheck, optimizedRoute,
    });
    agentLogs.push({ agent: 'FinalComposer', durationMs: Date.now() - t, status: 'success' });

    const totalMs = Date.now() - pipelineStart;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[Pipeline] COMPLETE in ${(totalMs / 1000).toFixed(1)}s`);
    agentLogs.forEach(l => console.log(`  ${l.agent}: ${l.durationMs}ms [${l.status}]`));
    console.log(`${'─'.repeat(60)}\n`);

    // ─── Log Usage with real token sums ───
    try {
      // Sum tokens from LLM agents (1 = planning, 9 = composer)
      const planTokens = (plan as any)?._tokens || { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
      const composerTokens = (itinerary as any)?._tokens || { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
      const totalInputTokens = planTokens.inputTokens + composerTokens.inputTokens;
      const totalOutputTokens = planTokens.outputTokens + composerTokens.outputTokens;
      const totalTokens = planTokens.totalTokens + composerTokens.totalTokens;

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
          agent: '9-agent-v3',
          pipelineMs: totalMs,
          agentLogs: agentLogs.map(l => ({ agent: l.agent, ms: l.durationMs, status: l.status })),
        },
      });
    } catch (logErr) {
      console.error('[Pipeline] Log failed:', logErr);
    }

    // ─── Cache & Deduct Usage ───
    await setCache(cacheKey, itinerary);

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

    return NextResponse.json({
      itinerary,
      flights: input.includeFlights ? research.flights : [],
      hotels: input.includeHotels ? research.hotels : [],
      flightAnalysis: input.includeFlights ? { recommendation: flightAnalysis.recommendation, bestOption: flightAnalysis.bestOption } : null,
      agentInfo: {
        version: '9-agent-v3',
        pipelineMs: totalMs,
        agents: agentLogs.map(l => ({ name: l.agent, ms: l.durationMs, status: l.status })),
      },
    });

  } catch (error: any) {
    console.error('[Pipeline] Fatal error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
