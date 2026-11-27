import crypto from 'node:crypto';
import { NextResponse, after } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCache, setCache } from '@/utils/cache';
import { createItineraryJob, runItineraryJob } from '@/lib/jobs/itinerary-jobs';
import { parseTelegramMessage } from '@/lib/agents/telegram-parser';
import { formatItineraryForTelegram } from '@/lib/telegram/formatter';
import { checkItineraryQuota, deductUsage, deductCredits } from '@/utils/usage';
import { runGroundedItineraryChat } from '@/lib/agents/copilot-concierge';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

// Full itinerary generation can take ~30–70 s.
export const maxDuration = 300;

/**
 * Telegram sends the secret given to setWebhook (secret_token) in this header.
 * Without it anyone could POST fake updates and act as a linked user.
 */
function isFromTelegram(req: Request): boolean {
    if (!TELEGRAM_WEBHOOK_SECRET) return false;
    const got = req.headers.get('x-telegram-bot-api-secret-token') || '';
    const a = Buffer.from(got);
    const b = Buffer.from(TELEGRAM_WEBHOOK_SECRET);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function sendTelegramMessage(chatId: number, text: string) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
        }),
    });
}

function isConversationalFollowUp(text: string): boolean {
    if (text.startsWith('/new ')) return false;
    return /\b(swap|replace|change|move|remove|drop|add|relax|tired|rain|weather|next stop|day\s*\d|hours|open|budget|undo)\b/i.test(
        text
    );
}

export async function POST(req: Request) {
    if (!isFromTelegram(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!TELEGRAM_TOKEN) return NextResponse.json({ error: 'Telegram token not set' }, { status: 500 });

    try {
        const body = await req.json();
        const message = body.message;
        if (!message) return NextResponse.json({ ok: true });

        // Telegram retries slow or failed deliveries; process each update only once.
        if (typeof body.update_id === 'number') {
            const seenKey = `tg_update_${body.update_id}`;
            if (await getCache(seenKey)) return NextResponse.json({ ok: true, duplicate: true });
            await setCache(seenKey, { seen: true });
        }

        const chatId = message.chat.id;
        const text = (message.text || '').trim();

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
                const userId = (await getCache(`tg_link_${linkCode}`)) as string;

                if (userId) {
                    await supabase
                        .from('telegram_users')
                        .upsert({ telegram_id: chatId, user_id: userId });

                    await sendTelegramMessage(
                        chatId,
                        '✅ *Account Linked!* You can generate new trips (e.g. _"3 days in Kuopio"_) or chat with your active trip Co-Pilot (e.g. _"swap Day 1 afternoon for a cozy cafe"_ or _"what is my next stop?"_).'
                    );
                    return NextResponse.json({ ok: true });
                }
            }

            await sendTelegramMessage(
                chatId,
                '👋 *Welcome to iWillTravel DGIS!* \n\nLink your account from Settings on the web app to generate verified itineraries and adjust your active trip live on the road!'
            );
            return NextResponse.json({ ok: true });
        }

        if (!linkData) {
            await sendTelegramMessage(
                chatId,
                '⚠️ *Account Not Linked.* \n\nPlease visit iWillTravel Settings to link your Telegram account.'
            );
            return NextResponse.json({ ok: true });
        }

        const userId = linkData.user_id;

        // 3. Check if traveler has an active/saved itinerary and sent a conversational modification/query (§6.6.3)
        if (isConversationalFollowUp(text)) {
            const { data: latestTrip } = await supabase
                .from('itineraries')
                .select('id, title, status')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (latestTrip) {
                try {
                    const chatRes = await runGroundedItineraryChat({
                        userId,
                        itineraryId: latestTrip.id,
                        message: text,
                    });
                    const prefix = chatRes.mutated
                        ? `🔄 *Live Itinerary Updated (${latestTrip.title})*\n`
                        : `🧭 *Trip Co-Pilot (${latestTrip.title})*\n`;
                    await sendTelegramMessage(chatId, `${prefix}\n${chatRes.reply}`);
                    return NextResponse.json({ ok: true });
                } catch (chatErr) {
                    console.warn('[Telegram Co-Pilot] Falling back to pipeline:', chatErr);
                }
            }
        }

        // 4. Otherwise generate a new trip as a BACKGROUND JOB.
        // Telegram expects a quick 200; running the 30–70 s pipeline inline caused
        // timeouts and retried (duplicate) deliveries.
        const cleanPrompt = text.replace(/^\/new\s+/i, '');

        try {
            const agentInput = await parseTelegramMessage(cleanPrompt);

            const quota = await checkItineraryQuota(userId, agentInput.days);
            if (!quota.allowed) {
                await sendTelegramMessage(chatId, `❌ *Quota Reached:* ${quota.reason}`);
                return NextResponse.json({ ok: true });
            }

            const jobId = await createItineraryJob({ userId, input: agentInput, source: 'telegram', meta: { chatId } });
            await sendTelegramMessage(
                chatId,
                `🧭 Planning *${agentInput.days} days in ${agentInput.destination}*…\nChecking real places and opening hours — I'll message you when it's ready (usually under a minute).`
            );

            after(() =>
                runItineraryJob(jobId, {
                    onSuccess: async (result) => {
                        // Save so later messages can modify this trip conversationally.
                        await supabase.from('itineraries').insert({
                            user_id: userId,
                            city_id: agentInput.destination.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                            title: result.itinerary.title,
                            content: {
                                itinerary: result.itinerary,
                                flights: result.research.flights,
                                hotels: result.research.hotels,
                                flightAnalysis: result.flightAnalysis,
                            },
                            days: agentInput.days,
                            start_date: agentInput.startDate ?? null,
                            end_date: agentInput.endDate ?? null,
                            budget: agentInput.budget,
                            travel_style: agentInput.travelStyle,
                            traveler_type: agentInput.travelerType,
                            interests: agentInput.interests,
                            status: 'active',
                        });
                        await sendTelegramMessage(chatId, formatItineraryForTelegram(result.itinerary));
                        if (quota.creditsAvailable) await deductCredits(userId, 1);
                        else await deductUsage(userId, 'itinerary', 1);
                    },
                    onFailure: async () => {
                        await sendTelegramMessage(
                            chatId,
                            '❌ Sorry — I couldn’t build that trip. Try a destination and length, e.g. "3 days in Kuopio".'
                        );
                    },
                })
            );
        } catch (err: any) {
            console.error('[Telegram Webhook] Pipeline Error:', err);
            await sendTelegramMessage(
                chatId,
                '❌ *Error:* Encountered an issue generating your itinerary. Please specify destination and duration (e.g. "3 days in Kuopio").'
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('[Telegram Webhook] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
