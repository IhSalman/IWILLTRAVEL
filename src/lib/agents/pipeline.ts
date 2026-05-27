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
import type { AgentInput, AgentLog, FinalItinerary, ResearchResult, FlightAnalysis, BudgetResult, OptimizedRoute, SustainabilityResult, ExperienceResult } from '@/app/api/agent-itinerary/types';
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
            timestamp: new Date().toISOString() 
        };
        agentLogs.push(log);
        if (onLog) onLog(log);
    };

    // Agent 1: Discovery (Grounding First)
    let t = Date.now();
    const discovery = await discoveryAgent(input);
    (input as any).discoveredVenues = discovery.venues;
    streamLog('Agent 1: Discovery', t, 'success', `Found ${discovery.venues.length} verified venues.`);

    // Agent 2: Planning
    t = Date.now();
    const plan = await planningAgent(input);
    streamLog('Agent 2: Planning', t, plan.error ? 'error' : 'success', plan.details);
    if (plan.error) throw new Error(plan.details);

    // Agent 3: Research
    t = Date.now();
    const research = await researchAgent(plan, input);
    streamLog('Agent 3: Research', t, research.error ? 'error' : 'success', research.details);

    // Agent 4: Logic Checker & Financial Analysis (Budget + Flights)
    t = Date.now();
    const { flightAnalysis, budgetCheck, logicAudit } = financialAnalysisAgent(
        research.flights,
        research.hotels,
        input.budget,
        input.days,
        plan,
        input.customBudget,
        input.currency
    );
    streamLog('Agent 4: Logic Checker', t, logicAudit.isValid ? 'success' : 'warning', 
        logicAudit.isValid ? 'Audit passed.' : `Audit issues: ${logicAudit.issues.join(', ')}`);

    // Agent 5: Local Experience
    t = Date.now();
    const experienceResult = await localExperienceAgent(plan, input);
    streamLog('Agent 5: Experience', t, 'success');

    // Agent 6: Logistics (Route)
    t = Date.now();
    const optimizedRoute = routeOptimizationAgent(plan);
    streamLog('Agent 6: Logistics', t, 'success');

    // Agent 7: Sustainability
    t = Date.now();
    const sustainability = await sustainabilityAgent(input, research, optimizedRoute);
    streamLog('Agent 7: Sustainability', t, 'success');

    // Agent 8: Global Composer
    t = Date.now();
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
    streamLog('Agent 8: Composer', t, 'success');

    const totalMs = Date.now() - pipelineStart;

    // Persist pipeline run for benchmarking / thesis evidence (fire-and-forget)
    const activeModel = await getActiveModel().catch(() => 'unknown');
    logPipelineRun({
        userId:       ctx?.userId ?? null,
        destination:  input.destination,
        days:         input.days,
        budget:       input.budget,
        travelStyle:  input.travelStyle,
        totalMs,
        success:      true,
        agentLogs,
        inputTokens:  itinerary._tokens?.inputTokens ?? 0,
        outputTokens: itinerary._tokens?.outputTokens ?? 0,
        model:        activeModel,
    }).catch(() => {});

    return {
        itinerary,
        research,
        flightAnalysis,
        budgetCheck,
        optimizedRoute,
        sustainability,
        agentLogs,
        totalMs
    };
}
