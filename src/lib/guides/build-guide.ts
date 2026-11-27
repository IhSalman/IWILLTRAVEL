/**
 * Grounded guide generator.
 *
 * 1. Plans a real trip with the 8-agent pipeline (verified venues, hours, routes).
 * 2. Converts it into clean guide data (reusing the PDF model builder).
 * 3. One LLM call writes ONLY the prose (title, meta description, intro, FAQ, tips)
 *    from those verified facts — nothing is written from model memory.
 * 4. A quality gate decides whether the guide can auto-publish.
 */
import { z } from 'zod';
import { executeItineraryPipeline } from '@/lib/agents/pipeline';
import { buildItineraryPdfModel } from '@/lib/pdf/build-model';
import { generateStructuredWithRetry } from '@/utils/ai-config';
import { getSiteUrl } from '@/utils/site-url';
import type { AgentInput } from '@/app/api/agent-itinerary/types';
import type { GuideDay, ItineraryGuideContent } from './types';

export interface GuideTopic {
    destination: string; // "Kyoto, Japan"
    days: number;
}

export interface BuiltGuide {
    slug: string;
    title: string;
    seoTitle: string;
    metaDescription: string;
    heroImage?: string;
    content: ItineraryGuideContent;
    gate: { passed: boolean; reasons: string[] };
    totalMs: number;
}

const ProseSchema = z.object({
    seoTitle: z.string().min(20).max(70),
    metaDescription: z.string().min(80).max(170),
    intro: z.string().min(400),
    whoItsFor: z.string().min(40),
    faq: z.array(z.object({ q: z.string().min(8), a: z.string().min(20) })).min(4).max(6),
    tips: z.array(z.string().min(15)).min(4).max(6),
});

/**
 * Practical "know before you go" tips — the things people search for
 * ("<city> travel tips", "things to know before visiting <city>").
 * Written from general knowledge, so the prompt restricts it to stable facts:
 * no prices, fares, opening times or anything that changes month to month.
 */
const PRACTICAL_TOPICS = [
    'Arriving from the airport',
    'Getting around',
    'Money and tipping',
    'Staying safe',
    'Book ahead',
    'Local etiquette',
    'When to go',
    'Save money',
] as const;

const PracticalSchema = z.object({
    beforeYouGo: z
        .array(z.object({ topic: z.enum(PRACTICAL_TOPICS), tip: z.string().min(60).max(420) }))
        .min(5)
        .max(8),
});

export const slugify = (s: string) =>
    s
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

export function guideSlug(topic: GuideTopic): string {
    return `${topic.days}-days-in-${slugify(topic.destination.split(',')[0])}-itinerary`;
}

export function guideKeyword(topic: GuideTopic): string {
    const city = topic.destination.split(',')[0].trim();
    return topic.days === 2 ? `weekend in ${city} itinerary` : `${topic.days} days in ${city} itinerary`;
}

function facts(content: Omit<ItineraryGuideContent, 'intro' | 'whoItsFor' | 'faq' | 'tips'>, extra: { tips: string[]; customs: string[] }) {
    const lines: string[] = [
        `Destination: ${content.destination}`,
        `Length: ${content.days} days`,
        content.quickFacts.bestTime ? `Best time to visit: ${content.quickFacts.bestTime}` : '',
        content.quickFacts.budget ? `Budget estimate: ${content.quickFacts.budget}` : '',
    ];
    for (const d of content.plan) {
        lines.push(`\nDay ${d.day}: ${d.title}${d.area ? ` (${d.area})` : ''}`);
        for (const s of d.stops) {
            lines.push(
                `- ${s.name}${s.category ? ` [${s.category}]` : ''}${s.rating ? ` rated ${s.rating}/5 (${s.totalRatings ?? 0} reviews)` : ''}${
                    s.description ? ` — ${s.description.slice(0, 220)}` : ''
                }`
            );
        }
    }
    if (extra.tips.length) lines.push(`\nPlanner tips: ${extra.tips.join(' | ')}`);
    if (extra.customs.length) lines.push(`Local customs: ${extra.customs.join(' | ')}`);
    return lines.filter(Boolean).join('\n');
}

export async function buildGroundedGuide(topic: GuideTopic): Promise<BuiltGuide> {
    const city = topic.destination.split(',')[0].trim();
    const keyword = guideKeyword(topic);

    // 1. Real, verified trip (flights/hotels off — not needed for a guide).
    //    A guide needs full days: if the balanced plan leaves a day with < 3 stops,
    //    retry once at a fuller pace (cheap — Places data is cached) and keep the better plan.
    const planTrip = (travelStyle: AgentInput['travelStyle']) =>
        executeItineraryPipeline(
            {
                destination: topic.destination,
                days: topic.days,
                budget: 'moderate',
                travelStyle,
                travelerType: 'couple',
                interests: ['culture', 'food', 'sightseeing'],
                transport: 'public',
                includeFlights: false,
                includeHotels: false,
                currency: 'EUR',
            },
            undefined,
            { userId: null }
        );
    const minStops = (r: Awaited<ReturnType<typeof planTrip>>) =>
        Math.min(...((r.itinerary as any).days || []).map((d: any) => d.activities?.length ?? 0), 99);

    let result = await planTrip('balanced');
    let paceLabel = 'Balanced — 3–4 stops a day';
    let totalMs = result.totalMs;
    if (minStops(result) < 3) {
        const fuller = await planTrip('adventure');
        totalMs += fuller.totalMs;
        if (minStops(fuller) > minStops(result)) {
            result = fuller;
            paceLabel = 'Full days — 4–5 stops a day';
        }
    }
    const it: any = result.itinerary;

    // 2. Clean, verified guide data (same builder as the PDF export).
    const model = buildItineraryPdfModel({
        itinerary: it,
        meta: { destination: topic.destination, pace: 'Balanced', transportation: 'Public transport' },
        siteUrl: getSiteUrl(),
    });

    const plan: GuideDay[] = model.days.map((d, di) => ({
        day: d.day,
        title: d.title,
        area: d.area,
        summary: d.summary,
        routeUrl: d.routeUrl,
        eat: d.eat.map((e) => ({ label: e.label, url: e.url })),
        stops: d.stops.map((s, si) => {
            const raw = it.days?.[di]?.activities?.[si] || {};
            return {
                name: s.title,
                time: s.time,
                category: s.category,
                description: s.description,
                address: s.address,
                mapsUrl: s.mapsUrl,
                photoUrl: typeof s.photoUrl === 'string' && s.photoUrl.startsWith('/api/place-photo') ? s.photoUrl : undefined,
                rating: s.rating,
                totalRatings: s.totalRatings,
                hours: Array.isArray(raw.openingHours) ? raw.openingHours.slice(0, 7) : undefined,
                tip: s.tip,
                lat: s.lat,
                lng: s.lng,
                verified: s.verified,
            };
        }),
    }));

    const allStops = plan.flatMap((d) => d.stops);
    const verifiedRate = allStops.length ? allStops.filter((s) => s.verified).length / allStops.length : 0;
    const photoRate = allStops.length ? allStops.filter((s) => s.photoUrl).length / allStops.length : 0;

    const base = {
        is_structured_json: true as const,
        kind: 'itinerary_guide' as const,
        version: 2 as const,
        destination: topic.destination,
        city,
        days: topic.days,
        keyword,
        quickFacts: {
            bestTime: model.bestTime,
            budget: model.budgetEstimate,
            gettingAround: 'Public transport and walking',
            pace: paceLabel,
        },
        plan,
        verifiedAt: new Date().toISOString(),
        stats: { stops: allStops.length, verifiedRate: Math.round(verifiedRate * 100) / 100, photoRate: Math.round(photoRate * 100) / 100 },
    };

    // 3. Prose from verified facts only.
    const prompt = `You are a travel editor writing an SEO-friendly itinerary guide for iWillTravel.
Write ONLY from the FACTS below. Do not add places, prices, opening hours or claims that are not in the facts.
Target search phrase: "${keyword}". Write naturally for travellers; British English; no clickbait, no emojis.

FACTS
${facts(base, { tips: model.travelTips, customs: model.localCustoms })}

Return JSON:
{
  "seoTitle": "<= 60 characters, must contain '${city}' and the trip length, e.g. '${topic.days} Days in ${city}: A Day-by-Day Itinerary'",
  "metaDescription": "120-155 characters, mention ${city}, ${topic.days} days and that every place is verified",
  "intro": "150-250 words: what this ${topic.days}-day plan covers and why it flows well, referencing real stops from the facts",
  "whoItsFor": "1-2 sentences on who this plan suits",
  "faq": [{"q": "question a traveller searching this would ask", "a": "answer using only the facts"}],  // 5 items
  "tips": ["practical tip"]  // 5 items, from the facts
}`;

    const stopNames = allStops.slice(0, 14).map((st) => st.name).join(', ');
    const practicalPrompt = `You are a careful travel editor. Write the practical "know before you go" tips that travellers most often search for before a trip to ${topic.destination}.
Cover these topics, one item each (skip a topic only if it truly does not apply): ${PRACTICAL_TOPICS.join(', ')}.
Rules:
- Only stable, widely known facts (e.g. which transit card or app to use, whether tipping is expected, common scams, which sights need timed tickets).
- NO prices, fares, exact opening times, phone numbers or year-specific events. If something changes often, tell the reader to check the official source.
- Where it fits, mention places from this itinerary: ${stopNames}.
- 1-3 concrete sentences per tip, British English, no emojis, no filler.
Return JSON: { "beforeYouGo": [{ "topic": "<one of the topics>", "tip": "..." }] }`;

    const [prose, practical] = await Promise.all([
        generateStructuredWithRetry(prompt, ProseSchema, { role: 'creative', maxRetries: 2 }),
        // Optional section: a failure here must not block the guide.
        generateStructuredWithRetry(practicalPrompt, PracticalSchema, { role: 'creative', maxRetries: 2 }).catch(() => null),
    ]);
    const p = prose.data;
    const seen = new Set<string>();
    const beforeYouGo = (practical?.data.beforeYouGo ?? []).filter((t) => (seen.has(t.topic) ? false : (seen.add(t.topic), true)));

    const content: ItineraryGuideContent = {
        ...base,
        intro: p.intro,
        whoItsFor: p.whoItsFor,
        faq: p.faq.slice(0, 5),
        tips: p.tips.slice(0, 5),
        ...(beforeYouGo.length ? { beforeYouGo } : {}),
    };

    // 4. Quality gate.
    const reasons: string[] = [];
    if (plan.length !== topic.days) reasons.push(`expected ${topic.days} days, got ${plan.length}`);
    if (plan.some((d) => d.stops.length < 3)) reasons.push('a day has fewer than 3 stops');
    if (verifiedRate < 0.9) reasons.push(`only ${Math.round(verifiedRate * 100)}% of stops verified (need 90%)`);
    if (photoRate < 0.5) reasons.push(`only ${Math.round(photoRate * 100)}% of stops have photos (need 50%)`);
    if (!p.seoTitle.toLowerCase().includes(city.toLowerCase())) reasons.push('title does not mention the destination');

    const heroStop = [...allStops]
        .filter((s) => s.photoUrl)
        .sort((a, b) => (b.rating ?? 0) * Math.log10(10 + (b.totalRatings ?? 0)) - (a.rating ?? 0) * Math.log10(10 + (a.totalRatings ?? 0)))[0];

    return {
        slug: guideSlug(topic),
        title: p.seoTitle,
        seoTitle: p.seoTitle,
        metaDescription: p.metaDescription,
        heroImage: heroStop?.photoUrl?.replace(/&w=\d+/, '&w=1200'),
        content,
        gate: { passed: reasons.length === 0, reasons },
        totalMs,
    };
}
