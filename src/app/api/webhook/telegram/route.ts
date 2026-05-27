import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCache } from '@/utils/cache';
import { executeItineraryPipeline } from '@/lib/agents/pipeline';
import { parseTelegramMessage } from '@/lib/agents/telegram-parser';
import { formatItineraryForTelegram } from '@/lib/telegram/formatter';
import { checkItineraryQuota, deductUsage, deductCredits } from '@/utils/usage';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
        }),
    });
}

export async function POST(req: Request) {
    if (!TELEGRAM_TOKEN) return NextResponse.json({ error: 'Telegram token not set' }, { status: 500 });

    try {
        const body = await req.json();
        const message = body.message;
        if (!message) return NextResponse.json({ ok: true });

        const chatId = message.chat.id;
        const text = message.text || '';

        const supabase = createAdminClient();

        // 1. Check if user is linked
        const { data: linkData } = await supabase
            .from('telegram_users')
            .select('user_id')
            .eq('telegram_id', chatId)
            .single();

        // 2. Handle /start and Linking
        if (text.startsWith('/start')) {
            const parts = text.split(' ');
            if (parts.length > 1) {
                const linkCode = parts[1];
                const userId = await getCache(`tg_link_${linkCode}`) as string;

                if (userId) {
                    await supabase
                        .from('telegram_users')
                        .upsert({ telegram_id: chatId, user_id: userId });
                    
                    await sendTelegramMessage(chatId, "✅ *Account Linked!* You can now generate itineraries directly from here. Just tell me where you want to go!");
                    return NextResponse.json({ ok: true });
                }
            }

            await sendTelegramMessage(chatId, "👋 *Welcome to iWillTravel!* \n\nPlease link your account from the website to get started, or simply type your travel destination and duration!");
            return NextResponse.json({ ok: true });
        }

        if (!linkData) {
            await sendTelegramMessage(chatId, "⚠️ *Account Not Linked.* \n\nPlease go to [iWillTravel](https://wanderplan.ai) and link your Telegram account in Settings to use the agent pipeline.");
            return NextResponse.json({ ok: true });
        }

        const userId = linkData.user_id;

        // 3. Process Travel Request
        await sendTelegramMessage(chatId, "🤖 *Agent Pipeline Initialized...* \nAnalyzing your request and gathering data. This may take up to 30 seconds.");

        try {
            // NLP Parse
            const agentInput = await parseTelegramMessage(text);
            
            // SaaS Quota Check
            const quota = await checkItineraryQuota(userId, agentInput.days);
            if (!quota.allowed) {
                await sendTelegramMessage(chatId, `❌ *Quota Reached:* ${quota.reason}`);
                return NextResponse.json({ ok: true });
            }

            // Execute Pipeline
            const result = await executeItineraryPipeline(agentInput);
            
            // Format Response
            const formatted = formatItineraryForTelegram(result.itinerary);
            await sendTelegramMessage(chatId, formatted);

            // Deduct Usage
            await deductUsage(userId, 'itinerary', 1);

        } catch (err: any) {
            console.error('[Telegram Webhook] Pipeline Error:', err);
            await sendTelegramMessage(chatId, "❌ *Error:* I encountered an issue while generating your itinerary. Please try again with more details.");
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('[Telegram Webhook] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
