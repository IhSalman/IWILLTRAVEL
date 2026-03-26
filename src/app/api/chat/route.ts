import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getActiveModel, logAiUsage } from '@/utils/ai-config';

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2_000;

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Safely parse JSON payload
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const { messages, contextCity } = body;

        // Input validation: messages must be an array with size limits
        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }
        if (messages.length > MAX_MESSAGES) {
            return NextResponse.json({ error: `Too many messages (max ${MAX_MESSAGES})` }, { status: 400 });
        }

        // Validate each message has role and content within size limits
        for (const m of messages) {
            if (!m.role || !m.content || typeof m.content !== 'string') {
                return NextResponse.json({ error: 'Each message must have a role and content' }, { status: 400 });
            }
            if (m.content.length > MAX_MESSAGE_LENGTH) {
                return NextResponse.json(
                    { error: `Message content exceeds max length of ${MAX_MESSAGE_LENGTH} characters` },
                    { status: 400 }
                );
            }
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
        }

        const systemPrompt = `You are a senior travel consultant at a premium travel agency. You have deep destination expertise and deliver a seamless trip planning experience.

## Critical Rules
- **NEVER introduce yourself or state your identity.** Just respond naturally as if you're mid-conversation.
- **NEVER repeat who you are** across messages. No "As your consultant…" or "I'm here to help…" openings.
- **Minimise questions.** Gather multiple details from a single user response. If a user says "I want to go to Bali for a week with my partner", extract destination, duration, and traveller type all at once — do NOT ask about each separately.
- **Be efficient.** 1-2 sentences max per response. Get to the point fast.
- **Infer intelligently.** If a user says "beach trip", assume relaxed style and nature interest. If they say "luxury", assume moderate-to-high budget. Only ask when genuinely ambiguous.
- **Default smartly.** If budget isn't mentioned, assume "moderate". If style isn't mentioned, infer from context. If interests aren't stated, infer from destination + style.

## Destination Support
- **You can plan trips to ANY city or destination in the world.** There are no restrictions.
- Accept any city, town, or region the user mentions.
- If a destination is very obscure, you may ask for the country to clarify, but NEVER tell the user a destination is "not available".
- For the destination field in TRIP_PLAN, use the format "City, Country".

## Conversation Approach
- Jump straight into helpful responses — no preamble, no identity statements.
- Combine multiple topics in one turn: "Bali for 7 days sounds great — couple's trip, moderate budget, and a mix of beach and culture work for you?"
- When you have enough info (destination + duration + at least a sense of style), confirm everything in one compact summary and offer to generate.
- Keep the tone warm but efficient — like texting a knowledgeable friend who happens to be a travel expert.

## Plan Output
When ready (destination, duration, budget, traveller type, interests gathered or inferred), present a brief summary and ask "Shall I create your itinerary?". On confirmation, output:
<TRIP_PLAN>
{
  "ready": true,
  "destination": "City, Country",
  "days": 5,
  "budget": "budget|moderate|luxury",
  "travelStyle": "relaxed|balanced|adventure|cultural",
  "travelerType": "single|couple|family",
  "interests": ["nature", "food", "culture"],
  "specialRequests": "any special notes"
}
</TRIP_PLAN>
Only output the JSON after explicit confirmation.`;

        // Security: use the SDK which sends API key via headers, not URL query strings
        const activeModelName = await getActiveModel();
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: activeModelName,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 2048,
            },
        });

        // Build chat history for the SDK
        const chatHistory = [
            { role: 'user' as const, parts: [{ text: systemPrompt }] },
            { role: 'model' as const, parts: [{ text: 'Understood. Ready to help plan trips.' }] },
            ...messages.slice(0, -1).map((m: any) => ({
                role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
                parts: [{ text: String(m.content) }],
            })),
        ];

        const lastMessage = messages[messages.length - 1];

        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessageStream(String(lastMessage.content));

        // Stream the response using SSE format
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let totalChunks = 0;
                try {
                    for await (const chunk of result.stream) {
                        const text = chunk.text();
                        if (text) {
                            totalChunks++;
                            const sseData = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`;
                            controller.enqueue(encoder.encode(sseData));
                        }
                    }
                    controller.close();

                    // Log usage after stream completes
                    const response = await result.response;
                    const meta = response?.usageMetadata;
                    logAiUsage({
                        userId: user!.id,
                        featureType: 'chat',
                        inputTokens: meta?.promptTokenCount ?? 0,
                        outputTokens: meta?.candidatesTokenCount ?? 0,
                        totalTokens: meta?.totalTokenCount ?? 0,
                        model: activeModelName,
                    }).catch(() => {});
                } catch (err) {
                    console.error('Stream error:', err);
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Chat Error:', error);
        // Security: never leak internal error details to the client
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
