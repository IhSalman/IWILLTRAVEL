import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { requireAuth } from '@/utils/auth';

const MAX_TEXT_LENGTH = 500;
const ALLOWED_VOICES = new Set(['Puck', 'Kore', 'Charon', 'Fenrir']);

/**
 * POST /api/translate/tts
 * Body: { text: string; voice?: 'Puck' | 'Kore' | 'Charon' | 'Fenrir' }
 * Returns: { audio: string }  — base64-encoded raw PCM (Int16, 24 kHz, mono)
 */
export async function POST(req: Request) {
    // Security: require authentication to protect Gemini API credits
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'placeholder_gemini_key') {
            return NextResponse.json({ error: 'TTS service is not configured' }, { status: 500 });
        }

        // Initialize SDK inside the handler — avoids build-time crash if env is missing
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const { text, voice = 'Kore' } = body;

        if (!text || typeof text !== 'string' || !text.trim()) {
            return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }

        if (text.length > MAX_TEXT_LENGTH) {
            return NextResponse.json(
                { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
                { status: 413 }
            );
        }

        // Validate voice name against whitelist to prevent injection
        const safeVoice = ALLOWED_VOICES.has(voice) ? voice : 'Kore';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: text.trim() }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: safeVoice },
                    },
                },
            },
        } as any);

        const part = response.candidates?.[0]?.content?.parts?.[0] as any;
        const base64Audio = part?.inlineData?.data;

        if (!base64Audio) {
            return NextResponse.json({ error: 'No audio returned from TTS model' }, { status: 502 });
        }

        return NextResponse.json({ audio: base64Audio });
    } catch (error) {
        console.error('[TTS API Error]', error);
        // Security: never leak internal error details to the client
        return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
    }
}
