/**
 * Agent 4: Logic Checker & Financial Analysis Agent
 * Performs a dual audit: 
 * 1. Financial: Merges flight pricing analytics and budget constraint optimization.
 * 2. Logical: Validates structural integrity and temporal consistency (Thesis Section 4.9).
 */

import type { Flight, Hotel, FlightAnalysis, BudgetResult, PlanResult } from '../types';

function parseDurationMinutes(dur?: string): number {
    if (!dur) return 9999;
    const isoMatch = dur.match(/PT(\d+)H(?:(\d+)M)?/);
    if (isoMatch) return parseInt(isoMatch[1]) * 60 + parseInt(isoMatch[2] || '0');
    const humanMatch = dur.match(/(\d+)h\s*(\d+)?m?/i);
    if (humanMatch) return parseInt(humanMatch[1]) * 60 + parseInt(humanMatch[2] || '0');
    return 9999;
}

export interface LogicAudit {
    isValid: boolean;
    issues: string[];
    warnings: string[];
}

export function financialAnalysisAgent(
    flights: Flight[],
    hotels: Hotel[],
    budgetLevel: string,
    days: number,
    plan: PlanResult, // Added plan for logic checking
    customBudget?: number,
    currency?: string
): { 
    flightAnalysis: FlightAnalysis; 
    budgetCheck: BudgetResult;
    logicAudit: LogicAudit;
} {
    console.log('[Agent 4: Logic Checker] Starting comprehensive audit...');

    // ─── Part A: Logical Consistency Audit ──────────────────────────────────
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // 1. Duration Check
    const planDays = plan.plan.length;
    if (planDays !== days) {
        issues.push(`Duration mismatch: User requested ${days} days, but Agent 2 planned ${planDays} days.`);
    }

    // 2. Temporal Flow Check
    const dates = plan.plan.map(d => d.date);
    const sortedDates = [...dates].sort();
    if (JSON.stringify(dates) !== JSON.stringify(sortedDates)) {
        issues.push('Temporal error: The planned days are not in chronological order.');
    }

    // 3. City Connectivity Warning
    const cities = plan.plan.map(d => d.city);
    for (let i = 0; i < cities.length - 1; i++) {
        if (cities[i] !== cities[i+1]) {
            warnings.push(`Transit detected: Day ${i+1} (${cities[i]}) → Day ${i+2} (${cities[i+1]}). Ensure travel time is accounted for.`);
        }
    }

    const logicAudit: LogicAudit = {
        isValid: issues.length === 0,
        issues,
        warnings
    };

    // ─── Part B: Flight Analysis ──────────────────────────────────────────
    let flightAnalysis: FlightAnalysis;
    if (!flights.length) {
        flightAnalysis = { cheapestDay: null, averagePrice: 0, lowestPrice: 0, bestOption: null, recommendation: 'No flight data available.' };
    } else {
        const prices = flights.map(f => f.price).filter(p => p > 0);
        const lowestPrice = Math.min(...prices);
        const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const cheapest = flights.reduce((best, f) => f.price < best.price ? f : best, flights[0]);
        
        let bestOption = cheapest;
        for (const f of flights) {
            if (f.price <= bestOption.price * 1.05) {
                if ((f.stops ?? 99) < (bestOption.stops ?? 99)) bestOption = f;
            }
        }
        
        const fastest = [...flights].sort((a, b) => parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration))[0];
        const recommendation = `Best value: ${bestOption.airline} at $${lowestPrice.toFixed(0)}. Fastest: ${fastest.airline} (${fastest.duration}).`;
        
        flightAnalysis = { cheapestDay: null, averagePrice, lowestPrice, bestOption, recommendation };
    }

    // ─── Part C: Budget Optimization ──────────────────────────────────────
    const currLabel = currency || 'USD';
    let totalBudget: number;
    if (customBudget && customBudget > 0) {
        totalBudget = customBudget;
    } else {
        const dailyBudgets: Record<string, number> = { budget: 80, moderate: 150, luxury: 400, custom: 150 };
        totalBudget = (dailyBudgets[budgetLevel] || 150) * days;
    }

    const flightsCost = flights.length > 0 ? Math.min(...flights.map(f => f.price || 0)) : 0;
    const hotelsCost = hotels.length > 0 ? Math.min(...hotels.map(h => h.price || 0)) * Math.max(1, days - 1) : 0;
    const totalCost = flightsCost + hotelsCost;
    const isWithinBudget = totalCost <= totalBudget;
    const dailyBudgetRemaining = Math.max(0, (totalBudget - totalCost) / days);

    const adjustments: string[] = [];
    if (!isWithinBudget) {
        adjustments.push(`Est. cost (${currLabel} ${totalCost.toFixed(0)}) exceeds budget (${currLabel} ${totalBudget.toFixed(0)})`);
        adjustments.push('Consider downgrading hotel tier or reducing duration.');
    } else {
        adjustments.push(`Budget on track: ~${currLabel} ${dailyBudgetRemaining.toFixed(0)}/day remaining.`);
    }

    const budgetCheck = { isWithinBudget, totalCost, flightsCost, hotelsCost, dailyBudgetRemaining, adjustments };

    console.log(`[Agent 4: Logic Checker] Audit complete. Cost: ${currLabel} ${totalCost.toFixed(0)}. Logic Valid: ${logicAudit.isValid}`);
    
    return { flightAnalysis, budgetCheck, logicAudit };
}
