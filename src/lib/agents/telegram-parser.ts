import { OpenAI } from 'openai';
import { getActiveModel } from '@/utils/ai-config';
import type { AgentInput } from '@/app/api/agent-itinerary/types';

export async function parseTelegramMessage(message: string): Promise<AgentInput> {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
    const model = await getActiveModel();

    const client = new OpenAI({
        apiKey: apiKey,
        baseURL: process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : undefined,
    });

    const systemPrompt = `
You are a travel planning assistant. Your task is to convert a user's natural language request into a structured JSON object for a travel itinerary pipeline.

The structured JSON must follow this schema:
{
    "destination": string,
    "days": number (1-30),
    "startDate": string (ISO date, optional),
    "endDate": string (ISO date, optional),
    "budget": "budget" | "moderate" | "luxury" | "custom",
    "travelStyle": "relaxed" | "balanced" | "adventure" | "cultural",
    "travelerType": "single" | "couple" | "family" | "friends",
    "interests": string[],
    "transport": "public" | "rental" | "walking",
    "originCity": string (optional),
    "includeFlights": boolean (default false),
    "includeHotels": boolean (default false),
    "customBudget": number (optional),
    "currency": string (default "USD")
}

Defaults if not specified:
- days: 5
- budget: "moderate"
- travelStyle: "balanced"
- travelerType: "single"
- transport: "public"
- interests: []

User Message: "${message}"

Return ONLY the JSON object.
`;

    const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'system', content: systemPrompt }],
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Failed to parse message');

    return JSON.parse(content) as AgentInput;
}
