import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { generateContent, logAiUsage } from '@/utils/ai-config';

const MAX_CONTENT_LENGTH = 5_000;

export async function POST(req: Request) {
    // Require authentication to protect Gemini API credits
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
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

        const systemPrompt = `You are a travel content analyzer. Given a travel post, extract:
1. travel_style: one of "budget", "luxury", "backpacking", "family", "solo", "couple", "group" (or null)
2. season: one of "spring", "summer", "autumn", "winter" (or null if unclear)
3. destination_type: one of "city", "beach", "nature", "cultural", "adventure", "mixed"
4. tags: array of 3-5 relevant tags (lowercase, single words or short phrases)

Respond with ONLY valid JSON in this format:
{"travel_style": "...", "season": "...", "destination_type": "...", "tags": ["...", "..."]}

Post Content:
${content}`;

        const result = await generateContent(systemPrompt, { 
            role: 'analytical', 
            json: true 
        });

        // Log token usage
        logAiUsage({
            userId: authResult.user.id,
            featureType: 'tag-post',
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            totalTokens: result.usage.totalTokens,
            model: result.model,
        }).catch(() => {});

        try {
            return NextResponse.json(JSON.parse(result.text.trim()));
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
