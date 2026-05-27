import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { generateContent, logAiUsage } from '@/utils/ai-config';

const MAX_TEXT_LENGTH = 500;
const ALLOWED_VOICES = new Set(['Puck', 'Kore', 'Charon', 'Fenrir', 'Aoede', 'Helios']);

export async function POST(req: Request) {
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
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

        const safeVoice = ALLOWED_VOICES.has(voice) ? voice : 'Kore';

        const { audio, usage, model } = await generateContent(text.trim(), {
            role: 'analytical',
            modalities: ['AUDIO'],
            speechConfig: { voiceName: safeVoice }
        });

        if (!audio) {
            return NextResponse.json({ error: 'No audio returned from TTS model' }, { status: 502 });
        }

        logAiUsage({
            userId: authResult.user.id,
            featureType: 'tts',
            ...usage,
            model,
        }).catch(() => {});

        return NextResponse.json({ audio });
    } catch (error) {
        console.error('TTS error:', error);
        return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
    }
}
