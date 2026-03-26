import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '@/utils/auth';
import { getActiveModel, extractTokens, logAiUsage } from '@/utils/ai-config';

const MAX_CONTENT_LENGTH = 5_000;

export async function POST(req: Request) {
    // Require authentication to protect Gemini API credits
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
        }

        const { content, type } = await req.json();

        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'content is required' }, { status: 400 });
        }

        if (content.length > MAX_CONTENT_LENGTH) {
            return NextResponse.json(
                { error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters.` },
                { status: 400 }
            );
        }

        const activeModelName = await getActiveModel();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: activeModelName,
            generationConfig: {
                responseMimeType: 'application/json',
            },
        });

        const systemPrompt = `You are a travel content analyzer. Given a travel post, extract:
1. travel_style: one of "budget", "luxury", "backpacking", "family", "solo", "couple", "group" (or null)
2. season: one of "spring", "summer", "autumn", "winter" (or null if unclear)
3. destination_type: one of "city", "beach", "nature", "cultural", "adventure", "mixed"
4. tags: array of 3-5 relevant tags (lowercase, single words or short phrases)

Respond with ONLY valid JSON in this format:
{"travel_style": "...", "season": "...", "destination_type": "...", "tags": ["...", "..."]}

Post Content:
${content}`;

        const result = await model.generateContent(systemPrompt);
        const response = result.response;

        // Log token usage
        const tokens = extractTokens(response);
        logAiUsage({
            userId: authResult.user.id,
            featureType: 'tag-post',
            inputTokens: tokens.inputTokens,
            outputTokens: tokens.outputTokens,
            totalTokens: tokens.totalTokens,
            model: activeModelName,
        }).catch(() => {});

        try {
            return NextResponse.json(JSON.parse(response.text().trim()));
        } catch {
            console.error('JSON Parse Error in tag-post route');
            return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Tagging failed';
        console.error('Tagging Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
