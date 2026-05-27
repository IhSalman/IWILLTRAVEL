import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/utils/cache';
import { requirePlan } from '@/utils/require-plan';
import { deductUsage, deductCredits } from '@/utils/usage';
import { generateContent, logAiUsage } from '@/utils/ai-config';
import crypto from 'node:crypto';

const MAX_TEXT_LENGTH = 5_000;
const MAX_BASE64_LENGTH = 14_000_000; // ~10 MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

export async function POST(req: Request) {
    const planResult = await requirePlan('translation', { allowGuest: true });
    if ('error' in planResult) return planResult.error;
    const { user, useCredits } = planResult;

    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const { text, sourceLang, targetLang, type, imageBase64, imageMimeType } = body;

        // ── IMAGE MODE ────────────────────────────────────────────────────────────
        if (type === 'image' && imageBase64) {
            if (typeof imageBase64 !== 'string') {
                return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
            }
            if (imageBase64.length > MAX_BASE64_LENGTH) {
                return NextResponse.json({ error: 'Image is too large (max 10 MB)' }, { status: 413 });
            }

            const mimeType = typeof imageMimeType === 'string' ? imageMimeType.toLowerCase() : 'image/jpeg';
            if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
                return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 });
            }

            const safeTargetLang = targetLang ? String(targetLang).trim().replace(/[^a-zA-Z0-9\- ]/g, '') : 'English';
            const prompt = `Look at this image and:
1. Extract ALL visible text from the image
2. TRANSLATE the extracted text EXACTLY into ${safeTargetLang}. DO NOT output in the original language if it differs from ${safeTargetLang}.

Return a JSON object with:
- extractedText: all text visible in the image (original language)
- translatedText: the full translation strictly in ${safeTargetLang}
- detectedLanguage: what language you detected in the image`;

            const { text: aiResponse, usage, model } = await generateContent(prompt, {
                role: 'analytical',
                json: true,
                image: { mimeType, data: imageBase64 },
                systemInstruction: "You are a strict and expert visual translator. Return ONLY valid JSON."
            });

            logAiUsage({
                userId: user?.id || 'guest',
                featureType: 'translate-image',
                ...usage,
                model,
            }).catch(() => {});

            if (user) {
                if (useCredits) deductCredits(user.id, 1).catch(() => {});
                else deductUsage(user.id, 'translation_tokens', usage.totalTokens).catch(() => {});
            }

            try {
                return NextResponse.json(JSON.parse(aiResponse));
            } catch {
                return NextResponse.json({ error: 'Failed to parse visual translation' }, { status: 502 });
            }
        }

        // ── TEXT / GRAMMAR MODE ───────────────────────────────────────────────────
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return NextResponse.json({ error: 'Missing or invalid text' }, { status: 400 });
        }
        if (text.length > MAX_TEXT_LENGTH) {
            return NextResponse.json({ error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` }, { status: 413 });
        }
        if (type !== 'grammar' && !targetLang) {
            return NextResponse.json({ error: 'Missing target language' }, { status: 400 });
        }

        const safeText = text.trim();
        const safeSourceLang = sourceLang ? String(sourceLang).trim() : 'auto-detect';
        const safeTargetLang = targetLang ? String(targetLang).trim() : 'English';

        const hash = crypto.createHash('sha256').update(JSON.stringify({ text: safeText, sourceLang: safeSourceLang, targetLang: safeTargetLang, type })).digest('hex');
        const cacheKey = `translate_${hash}`;

        try {
            const cachedResult = await getCache(cacheKey);
            if (cachedResult) return NextResponse.json(cachedResult);
        } catch {}

        let prompt = '';
        let systemInstruction = "You are a professional, direct, and strict translator. Your ONLY job is to output the final translated text in the EXACT requested target language. Never supply explanations.";
        
        if (type === 'grammar') {
            systemInstruction = "You are a grammar expert. Analyze text and provide corrections in JSON format.";
            prompt = `Analyze the grammar of this ${safeSourceLang} text: "${safeText}"
Return a JSON object with:
- correctedText: the corrected version
- explanation: brief explanation of corrections made (or "No corrections needed")
- score: grammar score from 0-100
- englishTranslation: English translation if not already English`;
        } else {
            prompt = `Translate the following text from ${safeSourceLang} absolutely strictly into ${safeTargetLang}. 
Do not output in English unless ${safeTargetLang} is English. 
Text: "${safeText}"`;
        }

        const { text: aiResponse, usage, model } = await generateContent(prompt, {
            role: 'analytical',
            json: type === 'grammar',
            systemInstruction
        });

        logAiUsage({
            userId: user?.id || 'guest',
            featureType: type === 'grammar' ? 'grammar-check' : 'translate',
            ...usage,
            model,
        }).catch(() => {});

        if (user) {
            if (useCredits) deductCredits(user.id, 1).catch(() => {});
            else deductUsage(user.id, 'translation_tokens', usage.totalTokens).catch(() => {});
        }

        let result;
        if (type === 'grammar') {
            try {
                result = JSON.parse(aiResponse);
            } catch {
                return NextResponse.json({ error: 'Invalid response from AI' }, { status: 502 });
            }
        } else {
            result = { translatedText: aiResponse.trim() };
        }

        await setCache(cacheKey, result).catch(() => {});
        return NextResponse.json(result);
    } catch (error) {
        console.error('Translation error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
