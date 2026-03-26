import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';

const THEMES = {
    light: {
        bg: '#ffffff',
        text: '#1f2937',
        accent: '#3b82f6',
        accentLight: '#dbeafe',
        coverBg: '#0c1821',
        tipBg: '#fffbeb',
        tipBorder: '#f59e0b',
        packingBg: '#f0fdf4',
    },
    dark: {
        bg: '#0f172a',
        text: '#f8fafc',
        accent: '#60a5fa',
        accentLight: '#1e293b',
        coverBg: '#020617',
        tipBg: '#1e1b4b',
        tipBorder: '#4338ca',
        packingBg: '#064e3b',
    },
};

export async function POST(req: Request) {
    // Require authentication before processing
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
        const body = await req.json();
        const { itinerary, theme = 'light' } = body;

        if (!itinerary || typeof itinerary !== 'object' || !itinerary.title) {
            return NextResponse.json({ error: 'A valid itinerary object with a title is required.' }, { status: 400 });
        }

        const activeTheme = THEMES[theme as keyof typeof THEMES] ?? THEMES.light;

        // Note: For real PDF generation use puppeteer, html-pdf-node, or an external service like PDFShift.
        // This endpoint currently returns the theme config for client-side print stylesheets.
        console.log(`PDF export requested with theme: ${theme} for trip: ${itinerary.title}`);

        return NextResponse.json({
            message: 'PDF theme configuration returned. Use window.print() on the client with the provided theme.',
            theme: activeTheme,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'PDF generation failed';
        console.error('PDF Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
