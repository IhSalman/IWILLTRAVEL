import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { generateContent, logAiUsage } from '@/utils/ai-config';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BASE64_LENGTH = 14_000_000;

export async function POST(req: Request) {
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
        const { imageBase64, mimeType, targetLang } = await req.json();

        if (!imageBase64 || !targetLang || typeof targetLang !== 'string') {
            return NextResponse.json({ error: 'Missing image data or target language' }, { status: 400 });
        }

        const safeTargetLang = targetLang.trim().replace(/[^a-zA-Z0-9\- ]/g, '').substring(0, 50);
        const safeMimeType = typeof mimeType === 'string' ? mimeType.toLowerCase() : 'image/jpeg';
        
        if (!ALLOWED_MIME_TYPES.has(safeMimeType)) {
            return NextResponse.json(
                { error: `Unsupported image type. Allowed: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}` },
                { status: 400 }
            );
        }

        if (typeof imageBase64 === 'string' && imageBase64.length > MAX_BASE64_LENGTH) {
            return NextResponse.json({ error: 'Image is too large. Maximum size is 10 MB.' }, { status: 400 });
        }

        const prompt = `Extract ALL text visible in this image and translate it to ${safeTargetLang}.
Format your response as:
ORIGINAL TEXT:
[extracted text in original language]
TRANSLATED TEXT:
[translation to ${safeTargetLang}]
If no text is found, respond with "No text detected in image."`;

        const { text, usage, model } = await generateContent(prompt, {
            role: 'analytical',
            image: { mimeType: safeMimeType, data: imageBase64 }
        });

        logAiUsage({
            userId: authResult.user.id,
            featureType: 'ocr',
            ...usage,
            model,
        }).catch(() => {});

        return NextResponse.json({ result: text });
    } catch (error) {
        console.error('OCR Translation error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
