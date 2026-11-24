import {
    discoveryAgent,
    planningAgent,
    researchAgent,
    financialAnalysisAgent,
    localExperienceAgent,
    routeOptimizationAgent,
    sustainabilityAgent,
    finalComposerAgent,
} from '@/app/api/agent-itinerary/agents';
import { PlanResultSchema, ResearchResultSchema } from '@/app/api/agent-itinerary/schemas';
import type {
    AgentInput,
    AgentLog,
    FinalItinerary,
    ResearchResult,
    FlightAnalysis,
    BudgetResult,
    OptimizedRoute,
    SustainabilityResult,
} from '@/app/api/agent-itinerary/types';
import { logPipelineRun, getActiveModel } from '@/utils/ai-config';

export interface PipelineResult {
    itinerary: FinalItinerary;
    research: ResearchResult;
    flightAnalysis: FlightAnalysis;
    budgetCheck: BudgetResult;
    optimizedRoute: OptimizedRoute;
    sustainability: SustainabilityResult;
    agentLogs: AgentLog[];
    totalMs: number;
}

/** Caller provides this context for logging; userId can be null for guests. */
export interface PipelineContext {
    userId?: string | null;
    onSkeleton?: (plan: any) => void;
}

export async function executeItineraryPipeline(
    input: AgentInput,
    onLog?: (log: AgentLog) => void,
    ctx?: PipelineContext
): Promise<PipelineResult> {
    const agentLogs: AgentLog[] = [];
    const pipelineStart = Date.now();

    const streamLog = (agent: string, startMs: number, status: AgentLog['status'], details?: string) => {
        const log: AgentLog = {
            agent,
            durationMs: Date.now() - startMs,
            status,
            details,
            timestamp: new Date().toISOString(),
        };
        if (status !== 'running') {
            agentLogs.push(log);
        }
        if (onLog) onLog(log);
    };

    // Agent 1: Discovery (Grounding First)
    let t = Date.now();
    streamLog('Agent 1: Discovery', t, 'running', `Searching verified venues in ${input.destination}...`);
    const discovery = await discoveryAgent(input);
    input.discoveredVenues = discovery.venues;
    streamLog(
        'Agent 1: Discovery',
        t,
        discovery.venues.length > 0 ? 'success' : 'warning',
        `Found ${discovery.venues.length} verified venues via ${discovery.source}.`
    );

    // Agent 2: Planning (Zod-enforced + Truth Pool grounded)
    t = Date.now();
    streamLog('Agent 2: Planning', t, 'running', `Architecting ${input.days}-day geo-clustered skeleton...`);
    const plan = await planningAgent(input);
    const planValidation = PlanResultSchema.safeParse(plan);
    streamLog(
        'Agent 2: Planning',
        t,
        plan.error || !planValidation.success ? 'error' : 'success',
        plan.details
    );
    if (plan.error) throw new Error(plan.details || 'Strategic planning failed');

    // Emit instant skeleton preview so UI can display days/neighborhoods while enrichment runs
    if (ctx?.onSkeleton) {
        ctx.onSkeleton(plan);
    }

    // Parallel Wave: Agent 3 (Research) + Agent 5 (Local Experience)
    t = Date.now();
    const t5 = Date.now();
    streamLog('Agent 3: Research', t, 'running', 'Verifying opening hours, weather, AQI & market rates...');
    streamLog('Agent 5: Experience', t5, 'running', 'Curating neighborhood dining & local experiences...');

    const [research, experienceResult] = await Promise.all([
        researchAgent(plan, input),
        localExperienceAgent(plan, input),
    ]);

    const researchValidation = ResearchResultSchema.safeParse(research);
    streamLog(
        'Agent 3: Research',
        t,
        research.error ? 'error' : researchValidation.success ? 'success' : 'warning',
        research.details
    );
    streamLog('Agent 5: Experience', t5, 'success', `Enriched ${experienceResult.experiences.length} days.`);

    // Agent 4: Logic Checker & Financial Analysis (Budget + Flights + Opening Hours Audit)
    t = Date.now();
    const { flightAnalysis, budgetCheck, logicAudit } = financialAnalysisAgent(
        research.flights,
        research.hotels,
        input.budget,
        input.days,
        plan,
        input.customBudget,
        input.currency,
        research.placeDetails,
        input.startDate
    );
    streamLog(
        'Agent 4: Logic Checker',
        t,
        logicAudit.isValid && logicAudit.warnings.length === 0 ? 'success' : 'warning',
        logicAudit.isValid
            ? logicAudit.warnings.length > 0
                ? `Audit passed with ${logicAudit.warnings.length} temporal warning(s) queued for auto-heal.`
                : 'Financial & temporal audit passed.'
            : `Audit issues: ${logicAudit.issues.join(', ')}`
    );

    // Agent 6: Logistics (Inter-city backtrack removal + Intra-day GPS 2-Opt route sorting)
    t = Date.now();
    const optimizedRoute = routeOptimizationAgent(plan, research.placeDetails, discovery.venues);
    streamLog(
        'Agent 6: Logistics',
        t,
        'success',
        `Saved ${optimizedRoute.intraDayDistanceSavedKm ?? 0} km intra-day walking (${optimizedRoute.removedBacktracks} backtracks removed).`
    );

    // Agent 7: Sustainability
    t = Date.now();
    const sustainability = await sustainabilityAgent(input, research, optimizedRoute);
    streamLog(
        'Agent 7: Sustainability',
        t,
        'success',
        `ESG Grade ${sustainability.report.grade} (${sustainability.report.total_co2_kg} kg CO2).`
    );

    // Agent 8: Global Composer (Temporal schedule reconciliation + Zod narrative assembly)
    t = Date.now();
    streamLog('Agent 8: Composer', t, 'running', 'Synthesizing final narrative, insider tips & transit routes...');
    const itinerary = await finalComposerAgent({
        input,
        plan,
        research,
        experiences: experienceResult,
        flightAnalysis,
        budgetCheck,
        optimizedRoute,
        sustainability,
    });
    if (itinerary.blackboardState) {
        itinerary.blackboardState.groundingSource = discovery.source;
    }
    streamLog('Agent 8: Composer', t, 'success', `Assembled "${itinerary.title}".`);

    const totalMs = Date.now() - pipelineStart;

    const totalInputTokens = (plan._tokens?.inputTokens ?? 0) + (itinerary._tokens?.inputTokens ?? 0);
    const totalOutputTokens = (plan._tokens?.outputTokens ?? 0) + (itinerary._tokens?.outputTokens ?? 0);
    itinerary._tokens = {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
    };

    // Persist pipeline run for benchmarking / thesis evidence (fire-and-forget)
    const activeModel = await getActiveModel().catch(() => 'unknown');
    logPipelineRun({
        userId: ctx?.userId ?? null,
        destination: input.destination,
        days: input.days,
        budget: input.budget,
        travelStyle: input.travelStyle,
        totalMs,
        success: true,
        agentLogs,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        model: activeModel,
    }).catch(() => {});

    return {
        itinerary,
        research,
        flightAnalysis,
        budgetCheck,
        optimizedRoute,
        sustainability,
        agentLogs,
        totalMs,
    };
}
