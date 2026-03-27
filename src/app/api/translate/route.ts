import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCache, setCache } from '@/utils/cache';
import { requirePlan } from '@/utils/require-plan';
import { deductUsage, deductCredits } from '@/utils/usage';
import { getActiveModel, extractTokens, logAiUsage } from '@/utils/ai-config';
import crypto from 'node:crypto';

const MAX_TEXT_LENGTH = 5_000;
const MAX_BASE64_LENGTH = 14_000_000; // ~10 MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const ALLOWED_VOICES = new Set(['Puck', 'Kore', 'Charon', 'Fenrir']);

export async function POST(req: Request) {
    // Security: require authentication + plan check for translation
    const planResult = await requirePlan('translation');
    if ('error' in planResult) return planResult.error;
    const { user, useCredits } = planResult;

    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'placeholder_gemini_key') {
            return NextResponse.json({ error: 'Translation service is not configured' }, { status: 500 });
        }

        // Initialize SDK inside the handler — avoids build-time crash if env is missing
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Safely parse JSON payload
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

            // Validate MIME type against whitelist
            const mimeType = typeof imageMimeType === 'string' ? imageMimeType.toLowerCase() : 'image/jpeg';
            if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
                return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 });
            }

            const activeModelName = await getActiveModel();
            const model = genAI.getGenerativeModel({ model: activeModelName });

            // Sanitize language param before embedding in prompt
            const safeTargetLang = targetLang ? String(targetLang).trim().replace(/[^a-zA-Z0-9\- ]/g, '') : 'English';

            const prompt = `You are a strict and expert translator. Look at this image and:
1. Extract ALL visible text from the image
2. TRANSLATE the extracted text EXACTLY into ${safeTargetLang}. DO NOT output in the original language if it differs from ${safeTargetLang}.

Return a JSON object with exactly these fields:
- extractedText: all text visible in the image (original language)
- translatedText: the full translation strictly in ${safeTargetLang}
- detectedLanguage: what language you detected in the image

Return ONLY valid JSON, no markdown.`;

            let result;
            try {
                result = await model.generateContent([
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: imageBase64,
                        },
                    },
                    { text: prompt },
                ]);
            } catch (aiError) {
                console.error('Vision API error:', aiError);
                return NextResponse.json({ error: 'Image processing failed' }, { status: 502 });
            }

            const raw = result.response.text().trim();
            const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();

            // Guard against unparseable AI responses
            const imgTokens = extractTokens(result.response);
            logAiUsage({
                userId: user.id,
                featureType: 'translate-image',
                inputTokens: imgTokens.inputTokens,
                outputTokens: imgTokens.outputTokens,
                totalTokens: imgTokens.totalTokens,
                model: activeModelName,
            }).catch(() => {});

            // Deduct usage
            if (useCredits) {
                deductCredits(user.id, 1).catch(() => {});
            } else {
                deductUsage(user.id, 'translation_tokens', imgTokens.totalTokens).catch(() => {});
            }

            try {
                return NextResponse.json(JSON.parse(cleaned));
            } catch {
                console.error('Failed to parse Gemini image JSON:', raw);
                return NextResponse.json({ error: 'Invalid response from AI model' }, { status: 502 });
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

        // Secure cache key via SHA-256 hash (avoids oversized keys with large text)
        const cacheKeyObj = { text: safeText, sourceLang: safeSourceLang, targetLang: safeTargetLang, type };
        const hash = crypto.createHash('sha256').update(JSON.stringify(cacheKeyObj)).digest('hex');
        const cacheKey = `translate_${hash}`;

        try {
            const cachedResult = await getCache(cacheKey);
            if (cachedResult) {
                return NextResponse.json(cachedResult);
            }
        } catch (cacheError) {
            console.warn('Cache retrieval failed, continuing without cache:', cacheError);
        }

        const activeModelName = await getActiveModel();
        const model = genAI.getGenerativeModel({
            model: activeModelName,
            systemInstruction: `You are a professional, direct, and strict translator. Your ONLY job is to output the final translated text in the EXACT requested target language. Never supply explanations. Never leave the text in the original language.`,
            generationConfig: {
                temperature: 0.1,
                responseMimeType: type === 'grammar' ? 'application/json' : 'text/plain',
            },
        });

        let prompt = '';
        if (type === 'grammar') {
            prompt = `Analyze the grammar of this ${safeSourceLang} text: "${safeText}"
Return a JSON object with:
- correctedText: the corrected version
- explanation: brief explanation of corrections made (or "No corrections needed")
- score: grammar score from 0-100
- englishTranslation: English translation if not already English
Return ONLY valid JSON.`;
        } else {
            prompt = `Translate the following text from ${safeSourceLang} absolutely strictly into ${safeTargetLang}. 
Do not output in English unless ${safeTargetLang} is English. 
Return ONLY the translation in ${safeTargetLang}, no formatting, no explanations, no quotes.
Text: "${safeText}"`;
        }

        let output: string;
        let textTokens = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        try {
            const result = await model.generateContent(prompt);
            output = result.response.text().trim();
            textTokens = extractTokens(result.response);
        } catch (aiError) {
            console.error('LLM generation error:', aiError);
            return NextResponse.json({ error: 'Translation generation failed' }, { status: 502 });
        }

        logAiUsage({
            userId: user.id,
            featureType: type === 'grammar' ? 'grammar-check' : 'translate',
            inputTokens: textTokens.inputTokens,
            outputTokens: textTokens.outputTokens,
            totalTokens: textTokens.totalTokens,
            model: activeModelName,
        }).catch(() => {});

        // Deduct usage
        if (useCredits) {
            deductCredits(user.id, 1).catch(() => {});
        } else {
            deductUsage(user.id, 'translation_tokens', textTokens.totalTokens).catch(() => {});
        }

        if (type === 'grammar') {
            try {
                const parsed = JSON.parse(output);
                await setCache(cacheKey, parsed).catch(e => console.warn('Cache set failed:', e));
                return NextResponse.json(parsed);
            } catch {
                console.error('Failed to parse Gemini grammar JSON:', output);
                return NextResponse.json({ error: 'Invalid grammar response from AI' }, { status: 502 });
            }
        }

        const responseObj = { translatedText: output };
        await setCache(cacheKey, responseObj).catch(e => console.warn('Cache set failed:', e));
        return NextResponse.json(responseObj);
    } catch (error) {
        console.error('Translation error:', error);
        // Security: never leak internal error details to the client
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
