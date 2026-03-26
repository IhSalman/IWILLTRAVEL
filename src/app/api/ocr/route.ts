import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '@/utils/auth';
import { getActiveModel, extractTokens, logAiUsage } from '@/utils/ai-config';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
// ~10 MB base64 limit (base64 encodes 3 bytes → 4 chars, so 10MB ≈ 13.6M chars)
const MAX_BASE64_LENGTH = 14_000_000;

export async function POST(req: Request) {
    // Require authentication to protect Gemini API credits
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
        }

        const { imageBase64, mimeType, targetLang } = await req.json();

        if (!imageBase64 || !targetLang || typeof targetLang !== 'string') {
            return NextResponse.json({ error: 'Missing image data or target language' }, { status: 400 });
        }

        // Sanitize targetLang before embedding in AI prompt
        const safeTargetLang = targetLang.trim().replace(/[^a-zA-Z0-9\- ]/g, '').substring(0, 50);

        // Validate mimeType is a safe image type
        const safeMimeType = typeof mimeType === 'string' ? mimeType.toLowerCase() : 'image/jpeg';
        if (!ALLOWED_MIME_TYPES.has(safeMimeType)) {
            return NextResponse.json(
                { error: `Unsupported image type. Allowed: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}` },
                { status: 400 }
            );
        }

        // Prevent excessively large payloads
        if (typeof imageBase64 === 'string' && imageBase64.length > MAX_BASE64_LENGTH) {
            return NextResponse.json({ error: 'Image is too large. Maximum size is 10 MB.' }, { status: 400 });
        }

        const activeModelName = await getActiveModel();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: activeModelName });

        const prompt = `Extract ALL text visible in this image and translate it to ${safeTargetLang}.
Format your response as:
ORIGINAL TEXT:
[extracted text in original language]
TRANSLATED TEXT:
[translation to ${safeTargetLang}]
If no text is found, respond with "No text detected in image."`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: safeMimeType,
                },
            },
        ]);

        const response = result.response;
        const text = response.text().trim();

        // Log token usage
        const tokens = extractTokens(response);
        logAiUsage({
            userId: authResult.user.id,
            featureType: 'ocr',
            inputTokens: tokens.inputTokens,
            outputTokens: tokens.outputTokens,
            totalTokens: tokens.totalTokens,
            model: activeModelName,
        }).catch(() => {});

        return NextResponse.json({ result: text });
    } catch (error) {
        console.error('OCR Translation error:', error);
        // Security: never leak internal error details to the client
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
