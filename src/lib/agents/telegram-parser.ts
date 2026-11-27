import { z } from 'zod';
import { generateStructuredWithRetry } from '@/utils/ai-config';
import type { AgentInput } from '@/app/api/agent-itinerary/types';

const ParsedTripIntentSchema = z.object({
    destination: z.string().min(2),
    days: z.number().int().min(1).max(30).default(5),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    budget: z.enum(['budget', 'moderate', 'luxury', 'custom']).default('moderate'),
    travelStyle: z.enum(['relaxed', 'balanced', 'adventure', 'cultural']).default('balanced'),
    travelerType: z.enum(['single', 'couple', 'family', 'friends']).default('single'),
    interests: z.array(z.string()).default(['Culture', 'Food']),
    transport: z.enum(['public', 'rental', 'walking']).default('public'),
    originCity: z.string().optional(),
    includeFlights: z.boolean().optional().default(false),
    includeHotels: z.boolean().optional().default(false),
    customBudget: z.number().optional(),
    currency: z.string().optional().default('USD'),
});

/**
 * Deterministic regex fallback parser so natural-language trip prompts
 * still work instantaneously even if LLM quota is temporarily unavailable.
 */
export function fallbackParseTripPrompt(message: string): AgentInput {
    const text = message.trim();
    const lower = text.toLowerCase();

    // Extract days (e.g., "5 days", "7-day", "weekend", "1 week", "2 weeks")
    let days = 5;
    const dayMatch = lower.match(/\b(\d{1,2})\s*[-\s]?\s*(?:day|days|d|night|nights)\b/);
    if (dayMatch) {
        days = Math.min(30, Math.max(1, parseInt(dayMatch[1], 10)));
    } else if (/\bweekend\b/.test(lower)) {
        days = 3;
    } else if (/\b(?:two|2)\s*weeks?\b/.test(lower)) {
        days = 14;
    } else if (/\b(?:one|1|a)\s*week\b/.test(lower)) {
        days = 7;
    }

    // Extract destination after "in", "to", "for", or leading capitalized words
    let destination = 'Tokyo, Japan';
    const destMatch = text.match(/\b(?:in|to|visit|visiting|for)\s+([A-Z][a-zA-Z\s,]{2,35}?)(?=\s+(?:for|with|on|in|from|budget|luxury|couple|solo|family|friends|and|,|$))/);
    if (destMatch?.[1]) {
        destination = destMatch[1].trim().replace(/,$/, '');
    } else {
        const cleaned = text
            .replace(/\b\d+\s*[-\s]?\s*(?:day|days|night|nights)\b/gi, '')
            .replace(/\b(?:trip|itinerary|plan|vacation|holiday|weekend|in|to|for|couple|solo|family|friends|budget|luxury|mid-range)\b/gi, '')
            .trim();
        if (cleaned.length >= 2) {
            destination = cleaned.split(/[,.]/)[0].trim();
        }
    }

    const travelerType: AgentInput['travelerType'] =
        /\b(?:couple|honeymoon|romantic|partner|wife|husband)\b/.test(lower) ? 'couple'
        : /\b(?:family|kids|children|parents)\b/.test(lower) ? 'family'
        : /\b(?:friends|group|squad|mates)\b/.test(lower) ? 'friends'
        : 'single';

    const budget: AgentInput['budget'] =
        /\b(?:luxury|5-star|five-star|upscale|high-end|splurge|fine dining)\b/.test(lower) ? 'luxury'
        : /\b(?:cheap|budget|backpack|backpacker|hostel|affordable|low cost)\b/.test(lower) ? 'budget'
        : 'moderate';

    const travelStyle: AgentInput['travelStyle'] =
        /\b(?:relax|relaxed|slow|chill|easy|unhurried|laid-back)\b/.test(lower) ? 'relaxed'
        : /\b(?:packed|adventure|fast|intense|active|hiking|thrill)\b/.test(lower) ? 'adventure'
        : 'balanced';

    const transport: AgentInput['transport'] =
        /\b(?:rental car|rent a car|drive|driving|road trip)\b/.test(lower) ? 'rental'
        : /\b(?:walk|walking|uber|rideshare|on foot)\b/.test(lower) ? 'walking'
        : 'public';

    const interests: string[] = [];
    if (/\b(?:food|ramen|dining|street food|cuisine|restaurants|cafe|coffee|culinary)\b/.test(lower)) interests.push('Food');
    if (/\b(?:culture|temple|temples|museum|museums|history|historic|shrine|art|heritage)\b/.test(lower)) interests.push('Culture');
    if (/\b(?:nature|park|parks|beach|mountain|scenic|hike|outdoors|garden)\b/.test(lower)) interests.push('Nature');
    if (/\b(?:nightlife|bars|club|clubs|party|drinks|pub)\b/.test(lower)) interests.push('Nightlife');
    if (/\b(?:photo|photography|instagram|views|viewpoint)\b/.test(lower)) interests.push('Photography');
    if (/\b(?:shop|shopping|market|markets|boutique|vintage)\b/.test(lower)) interests.push('Shopping');
    if (/\b(?:adventure|sport|surf|ski|dive|climb|kayak)\b/.test(lower)) interests.push('Adventure');
    if (interests.length === 0) interests.push('Culture', 'Food');

    const fromMatch = text.match(/\b(?:from|flying from|departing)\s+([A-Z][a-zA-Z\s]{2,20})(?=[,.]|$)/);
    const originCity = fromMatch?.[1]?.trim();
    const includeFlights = Boolean(originCity || /\b(?:flight|flights|flying)\b/.test(lower));
    const includeHotels = /\b(?:hotel|hotels|stay|resort|accommodation)\b/.test(lower);

    return {
        destination,
        days,
        budget,
        travelStyle,
        travelerType,
        interests,
        transport,
        ...(originCity ? { originCity } : {}),
        includeFlights,
        includeHotels,
        currency: 'USD',
    };
}

export async function parseTelegramMessage(message: string): Promise<AgentInput> {
    const prompt = `Convert the user's natural-language trip request into a structured JSON object for our travel itinerary pipeline.

User Message: "${message}"

Return ONLY valid raw JSON matching this exact structure:
{
  "destination": "City, Country (e.g. 'Kyoto, Japan' or 'Paris, France')",
  "days": 5,
  "budget": "budget" | "moderate" | "luxury" | "custom",
  "travelStyle": "relaxed" | "balanced" | "adventure" | "cultural",
  "travelerType": "single" | "couple" | "family" | "friends",
  "interests": ["Culture", "Food"],
  "transport": "public" | "rental" | "walking",
  "originCity": "Optional departure city if mentioned",
  "includeFlights": false,
  "includeHotels": false,
  "customBudget": 2500,
  "currency": "USD"
}

Rules:
- Map interests to any of: "Culture", "Food", "Nature", "Nightlife", "Photography", "Shopping", "Adventure".
- Defaults if unspecified: days=5, budget="moderate", travelStyle="balanced", travelerType="single", transport="public", interests=["Culture", "Food"].`;

    try {
        const { data } = await generateStructuredWithRetry(prompt, ParsedTripIntentSchema, {
            role: 'analytical',
            maxRetries: 1,
        });
        return data as AgentInput;
    } catch (err) {
        console.warn('[Trip Intent Parser] LLM parse fallback triggered:', err);
        return fallbackParseTripPrompt(message);
    }
}
