import { NextResponse } from 'next/server';
import { parseTelegramMessage, fallbackParseTripPrompt } from '@/lib/agents/telegram-parser';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
        if (!prompt || prompt.length < 3) {
            return NextResponse.json({ error: 'Please describe your trip in a few words.' }, { status: 400 });
        }

        const parsed = await parseTelegramMessage(prompt);
        return NextResponse.json({ parsed });
    } catch (err: any) {
        try {
            const body = await req.clone().json().catch(() => ({}));
            const fallback = fallbackParseTripPrompt(body?.prompt || '');
            return NextResponse.json({ parsed: fallback });
        } catch {
            return NextResponse.json({ error: err?.message || 'Failed to parse prompt' }, { status: 500 });
        }
    }
}
