import { NextResponse } from 'next/server';
import { requirePlan } from '@/utils/require-plan';
import { deductUsage, deductCredits } from '@/utils/usage';

const MAX_TEXT_LENGTH = 1_000;

const VOICE_MAPPING: Record<string, string> = {
    en: 'JBFqnCBsd6RMkjVDRZzb', // George
    es: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    fr: 'FGY2WhTYpPnrIDTdsKH5', // Laura
    de: 'IKne3meq5aSn9XLyUdCD', // Charlie
    it: 'N2lVS1w4EtoT3dr4eOWO', // Callum
    pt: 'SAz9YHcvj6GT2YYXdXww', // River
    zh: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
    ja: 'Xb7hH8MSUJpSbSDYk0k2', // Alice
    ko: 'XrExE9yKIg1WjnnlVkGX', // Matilda
    ar: 'cgSgspJ2msm6clMCkdW9', // Jessica
    hi: 'cjVigY5qzO86Huf0OWal', // Eric
    fi: 'iP95p4xoKVk53GoZ742B', // Chris
    tr: 'nPczCjzI2devNBz1zQrb', // Brian
};

export async function POST(req: Request) {
    // Require authentication + plan check for voice TTS
    const planResult = await requirePlan('voice', { minutes: 1 });
    if ('error' in planResult) return planResult.error;
    const { user, useCredits } = planResult;

    try {
        const { text, lang = 'en' } = await req.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'text is required' }, { status: 400 });
        }

        if (text.length > MAX_TEXT_LENGTH) {
            return NextResponse.json(
                { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.` },
                { status: 400 }
            );
        }

        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
        if (!ELEVENLABS_API_KEY) {
            return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
        }

        const voiceId = VOICE_MAPPING[lang] ?? VOICE_MAPPING['en'];

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.3,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const message: string = (errorBody as any)?.detail?.message ?? 'ElevenLabs API request failed';
            throw new Error(message);
        }

        const audioBuffer = await response.arrayBuffer();

        // Deduct usage (1 TTS call ~= 1 minute)
        if (useCredits) {
            await deductCredits(user.id, 1);
        } else {
            await deductUsage(user.id, 'voice_minutes', 1);
        }

        return new Response(audioBuffer, {
            headers: { 'Content-Type': 'audio/mpeg' },
        });

    } catch (error) {
        console.error('TTS Error:', error);
        // Security: never leak internal error details to the client
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
