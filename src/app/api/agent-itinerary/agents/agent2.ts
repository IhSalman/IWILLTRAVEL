/**
 * Agent 2: Strategic Planning Agent
 * LLM-powered itinerary skeleton generator with strict geo-clustering.
 * Uses verified data from Agent 1 (Discovery) to eliminate hallucinations.
 */

import { generateContent } from '@/utils/ai-config';
import type { AgentInput, PlanResult } from '../types';

export async function planningAgent(input: AgentInput): Promise<PlanResult> {
    console.log('[Agent 2: Planning] Starting skeleton generation...');

    if (!input.destination) return { plan: [], error: 'missing_required_data', details: 'destination is required' };
    if (input.days < 1) return { plan: [], error: 'missing_required_data', details: 'duration_days must be >= 1' };
    
    // Fallback if Discovery failed
    const venues = input.discoveredVenues || [];

    const paceGuide = input.travelStyle === 'relaxed'
        ? '2-3 activities/day — long visits, leisurely lunch breaks, no rushing'
        : input.travelStyle === 'adventure'
        ? '4-5 activities/day — packed schedule with tight transitions'
        : '3-4 activities/day — balanced mix of depth and variety';

    const venuesContext = venues.length
        ? `\nVERIFIED VENUE POOL (MUST USE THESE WHEREVER POSSIBLE TO ELIMINATE HALLUCINATIONS):\n${venues.map((v: any) => `- ${v.name} (${v.types?.[0] || 'Venue'}) - ${v.address}`).join('\n')}\n`
        : '';

    const prompt = `You are the world's most precise Strategic Planning Agent. Your output powers a production travel app.

MISSION: Build a day-by-day itinerary skeleton that is:
1. GEOGRAPHICALLY FLAWLESS — every activity on a given day must be within the SAME neighborhood or district.
2. HYPER-SPECIFIC — use exact real place names, not generic descriptions.
3. GROUNDED — use the verified venue pool provided below. Do NOT invent locations.

${venuesContext}

INPUT:
- Destination: ${input.destination}
- Duration: ${input.days} days
- Interests: ${input.interests.join(', ')}
- Travel Style: ${input.travelStyle} (${paceGuide})
- Traveler Type: ${input.travelerType}
- Budget Level: ${input.budget}

OUTPUT SCHEMA (return ONLY this JSON):
{
  "plan": [
    {
      "day": 1,
      "city": "Exact city name",
      "neighborhood": "Specific district",
      "neighborhoodDescription": "1 sentence logic",
      "activities": ["Exact Real Place Name 1", "Exact Real Place Name 2"],
      "transitNote": "Transit logic"
    }
  ],
  "researchPlan": ["Tasks for Agent 3"]
}

STRICT RULE: If the pool contains venues, 100% of your activities MUST come from the pool.`;

    try {
        const result = await generateContent(prompt, { role: 'creative', json: true });
        let text = result.text;
        
        // Clean up markdown code blocks if they exist (though json: true should handle it on some models)
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

        let parsed: any;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            console.error('[Agent 2] JSON Parse failed:', text);
            return { plan: [], error: 'invalid_json', details: 'LLM returned invalid JSON' };
        }

        return {
            plan: parsed.plan || [],
            researchPlan: parsed.researchPlan || [],
            details: `Generated ${parsed.plan?.length || 0} days using ${venues.length} verified spots.`,
            _tokens: result.usage
        };
    } catch (error: any) {
        console.error('[Agent 2: Planning] Error:', error);
        return { plan: [], error: 'llm_failure', details: error.message };
    }
}
