/**
 * Agent 6: Logistics & Route Optimization Agent
 * Pure code — detects and removes geographic backtracks in city sequence.
 */

import type { PlanResult, OptimizedRoute } from '../types';

export function routeOptimizationAgent(plan: PlanResult): OptimizedRoute {
    console.log('[Agent 6: Logistics] Optimizing routes...');

    if (!plan.plan.length) return { optimizedRoute: [], removedBacktracks: 0, routeChanged: false };

    const citySequence = plan.plan.map(d => d.city);
    const optimized: string[] = [];
    let removedBacktracks = 0;

    for (const city of citySequence) {
        if (optimized.length > 0 && optimized[optimized.length - 1] === city) continue;
        const prevIdx = optimized.indexOf(city);
        if (prevIdx !== -1 && prevIdx < optimized.length - 1) {
            removedBacktracks++;
            continue;
        }
        optimized.push(city);
    }

    console.log(`[Agent 6: Route] ${optimized.join(' → ')}, backtracks removed: ${removedBacktracks}`);
    return { optimizedRoute: optimized, removedBacktracks, routeChanged: removedBacktracks > 0 };
}
