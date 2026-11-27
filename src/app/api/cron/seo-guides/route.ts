/**
 * GET /api/cron/seo-guides — daily grounded content engine (Vercel Cron).
 *
 * Mon–Sat: take the next "N days in <destination>" topic from `seo_topics`,
 *          plan a real trip with the 8-agent pipeline, write the guide from those
 *          verified facts, and AUTO-PUBLISH it if it passes the quality gate
 *          (otherwise it is saved as a draft with the reasons).
 * Sunday:  refresh the oldest published guide (> 60 days) so content stays current.
 *
 * Cost per run ≈ one user trip (less when the Places cache is warm).
 * Manual build: ?destination=<city, country>&days=N builds one guide directly.
 * Manual: an admin can unpublish any guide via PATCH /api/admin/blogs/:id.
 */
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/utils/supabase/admin';
import { buildGroundedGuide } from '@/lib/guides/build-guide';
import { pickNextTopic, saveGuide, updateTopic, upsertDemandTopics } from '@/lib/guides/topics';
import { pingIndexNow } from '@/lib/guides/indexnow';
import { absoluteUrl } from '@/lib/seo';

export const maxDuration = 300;

function revalidateGuide(slug: string) {
    for (const locale of ['en', 'es']) {
        revalidatePath(`/${locale}/blogs`);
        revalidatePath(`/${locale}/blogs/${slug}`);
    }
    revalidatePath('/sitemap.xml');
}

async function refreshOldestGuide() {
    const cutoff = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const { data } = await createAdminClient()
        .from('blogs')
        .select('id, slug, metadata, updated_at, published_at')
        .eq('status', 'published')
        .eq('metadata->>kind', 'itinerary_guide')
        .or(`updated_at.lt.${cutoff},and(updated_at.is.null,published_at.lt.${cutoff})`)
        .order('updated_at', { ascending: true, nullsFirst: true })
        .limit(1)
        .maybeSingle();
    if (!data?.metadata?.destination || !data.metadata.days) return null;

    const topic = { destination: String(data.metadata.destination), days: Number(data.metadata.days) };
    const guide = await buildGroundedGuide(topic);
    const saved = await saveGuide(guide, { ...topic, id: data.metadata.topic_id ?? undefined });
    revalidateGuide(guide.slug);
    return { mode: 'refresh', slug: guide.slug, status: saved.status, gate: guide.gate };
}

export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const forceNew = url.searchParams.get('mode') === 'new';

    // Manual: ?destination=Paris,%20France&days=3 builds that guide directly (no topic queue needed).
    const manualDestination = url.searchParams.get('destination')?.trim();
    if (manualDestination) {
        const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 3, 1), 10);
        try {
            const guide = await buildGroundedGuide({ destination: manualDestination, days });
            const saved = await saveGuide(guide, { destination: manualDestination, days });
            if (saved.status === 'published') {
                revalidateGuide(guide.slug);
                await pingIndexNow([absoluteUrl(`/en/blogs/${guide.slug}`)]).catch(() => {});
            }
            return NextResponse.json({
                mode: 'manual',
                slug: guide.slug,
                status: saved.status,
                gate: guide.gate,
                stats: guide.content.stats,
                practicalTips: guide.content.beforeYouGo?.length ?? 0,
                pipelineMs: guide.totalMs,
            });
        } catch (err: any) {
            console.error('[seo-guides] Manual build failed:', err);
            return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
        }
    }

    try {
        // Sundays: keep existing guides fresh (unless a new guide is explicitly requested).
        if (!forceNew && new Date().getUTCDay() === 0) {
            const refreshed = await refreshOldestGuide();
            if (refreshed) return NextResponse.json(refreshed);
        }

        const demandAdded = await upsertDemandTopics().catch(() => 0);
        const topic = await pickNextTopic();
        if (!topic) return NextResponse.json({ message: 'Topic queue is empty.', demandAdded });

        await updateTopic(topic.id, { attempts: topic.attempts + 1 });

        try {
            const guide = await buildGroundedGuide({ destination: topic.destination, days: topic.days });
            const saved = await saveGuide(guide, { destination: topic.destination, days: topic.days, id: topic.id });
            await updateTopic(topic.id, {
                status: saved.status,
                blog_id: saved.id,
                last_error: guide.gate.passed ? null : `Held as draft: ${guide.gate.reasons.join('; ')}`,
            });

            if (saved.status === 'published') {
                revalidateGuide(guide.slug);
                await pingIndexNow([absoluteUrl(`/en/blogs/${guide.slug}`)]).catch(() => {});
            }

            return NextResponse.json({
                mode: 'new',
                topic: topic.keyword,
                slug: guide.slug,
                status: saved.status,
                gate: guide.gate,
                stats: guide.content.stats,
                pipelineMs: guide.totalMs,
                demandAdded,
            });
        } catch (err: any) {
            await updateTopic(topic.id, { status: 'failed', last_error: String(err?.message || err).slice(0, 500) });
            throw err;
        }
    } catch (err: any) {
        console.error('[seo-guides] Failed:', err);
        return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
    }
}
