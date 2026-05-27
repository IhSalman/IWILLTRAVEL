import { NextResponse } from 'next/server';
import { requirePlan } from '@/utils/require-plan';
import { deductUsage, deductCredits } from '@/utils/usage';
import { streamContent, logAiUsage } from '@/utils/ai-config';

const MAX_TEXT_LENGTH = 5_000;

export async function POST(req: Request) {
    const planResult = await requirePlan('translation');
    if ('error' in planResult) return planResult.error;
    const { user, useCredits } = planResult;

    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const { text, sourceLang, targetLang } = body;

        if (!text || typeof text !== 'string' || text.trim() === '') {
            return NextResponse.json({ error: 'Missing or invalid text' }, { status: 400 });
        }
        if (text.length > MAX_TEXT_LENGTH) {
            return NextResponse.json({ error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` }, { status: 413 });
        }
        if (!targetLang) {
            return NextResponse.json({ error: 'Missing target language' }, { status: 400 });
        }

        const safeText = text.trim();
        const safeSourceLang = sourceLang ? String(sourceLang).trim() : 'auto-detect';
        const safeTargetLang = String(targetLang).trim();

        const systemInstruction = "You are a professional, direct, and strict translator. Your ONLY job is to output the final translated text in the EXACT requested target language. Never supply explanations.";
        const prompt = `Translate the following text from ${safeSourceLang} absolutely strictly into ${safeTargetLang}. 
Do not output in English unless ${safeTargetLang} is English. 
Text: "${safeText}"`;

        const { stream, model, getUsage } = await streamContent(prompt, {
            role: 'analytical',
            systemInstruction
        });

        // We wrap the stream to log usage once it finishes
        const [clientStream, loggingStream] = stream.tee();

        // Background task to read the logging stream and log usage
        (async () => {
            const reader = loggingStream.getReader();
            try {
                while (true) {
                    const { done } = await reader.read();
                    if (done) break;
                }
                const usage = await getUsage();
                logAiUsage({
                    userId: user?.id || 'guest',
                    featureType: 'translate-stream',
                    ...usage,
                    model,
                }).catch(() => {});

                if (user) {
                    if (useCredits) deductCredits(user.id, 1).catch(() => {});
                    else deductUsage(user.id, 'translation_tokens', usage.totalTokens).catch(() => {});
                }
            } catch (error) {
                console.error('Error logging streaming translation usage:', error);
            }
        })();

        return new Response(clientStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Streaming translation error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
