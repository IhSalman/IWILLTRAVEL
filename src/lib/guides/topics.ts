/**
 * SEO topic queue (table `seo_topics`) and guide publishing.
 *
 * Topics are "N days in <destination>" — real search phrases. They come from
 * the curated destination list (seeded by migration) and from what users
 * actually plan most (demand topics, added at lower priority).
 */
import { createAdminClient } from '@/utils/supabase/admin';
import type { BuiltGuide, GuideTopic } from './build-guide';
import { guideKeyword } from './build-guide';

export interface SeoTopicRow {
    id: string;
    destination: string;
    days: number;
    keyword: string;
    priority: number;
    status: 'queued' | 'published' | 'draft' | 'failed';
    attempts: number;
    blog_id: string | null;
}

const MAX_ATTEMPTS = 3;

/** `blogs.updated_at` is added by migration 20261130; until it runs, write without it. */
const missingUpdatedAt = (e: { message?: string } | null) => !!e?.message && /updated_at/.test(e.message);

/** Highest-priority queued topic (failed ones retried up to MAX_ATTEMPTS). */
export async function pickNextTopic(): Promise<SeoTopicRow | null> {
    const { data } = await createAdminClient()
        .from('seo_topics')
        .select('*')
        .or(`status.eq.queued,and(status.eq.failed,attempts.lt.${MAX_ATTEMPTS})`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
    return (data as SeoTopicRow) ?? null;
}

export async function updateTopic(id: string, patch: Partial<SeoTopicRow> & { last_error?: string | null }) {
    await createAdminClient().from('seo_topics').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
}

/**
 * Add topics for the destinations users plan most (last 90 days), so the
 * content follows real demand. Existing topics are left untouched.
 */
export async function upsertDemandTopics(limit = 10): Promise<number> {
    const supabase = createAdminClient();
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
        .from('itineraries')
        .select('city_id, days')
        .gte('created_at', since)
        .not('city_id', 'is', null)
        .limit(2000);

    const counts = new Map<string, { destination: string; days: number; n: number }>();
    for (const row of data || []) {
        const days = Math.min(Math.max(Number(row.days) || 3, 2), 7);
        const destination = String(row.city_id)
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .trim();
        if (!destination || destination.length < 3) continue;
        const key = `${destination.toLowerCase()}|${days}`;
        const cur = counts.get(key) || { destination, days, n: 0 };
        cur.n++;
        counts.set(key, cur);
    }

    const top = Array.from(counts.values()).filter((c) => c.n >= 2).sort((a, b) => b.n - a.n).slice(0, limit);
    if (!top.length) return 0;

    const { data: inserted } = await supabase
        .from('seo_topics')
        .upsert(
            top.map((t) => ({
                destination: t.destination,
                days: t.days,
                keyword: guideKeyword(t),
                priority: 40 + Math.min(t.n, 20), // below curated seeds (50+) unless very popular
                source: 'demand',
            })),
            { onConflict: 'destination_key,days', ignoreDuplicates: true }
        )
        .select('id');
    return inserted?.length ?? 0;
}

/**
 * Insert or refresh the guide in `blogs`. Published only when the quality gate
 * passed; otherwise saved as a draft with the reasons in metadata.
 */
export async function saveGuide(
    guide: BuiltGuide,
    topic: GuideTopic & { id?: string }
): Promise<{ id: string; status: 'published' | 'draft' }> {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const status = guide.gate.passed ? 'published' : 'draft';

    const metadata = {
        seoTitle: guide.seoTitle,
        seoKeywords: [guide.content.keyword, guide.content.city, `${guide.content.city} itinerary`, `things to do in ${guide.content.city}`, `${guide.content.city} travel tips`].join(', '),
        destination: guide.content.destination,
        days: guide.content.days,
        kind: 'itinerary_guide',
        topic_id: topic.id ?? null,
        grounding: guide.content.stats,
        gate: guide.gate,
        source: 'itinerary',
    };

    const { data: existing } = await supabase.from('blogs').select('id, status, published_at').eq('slug', guide.slug).maybeSingle();

    if (existing) {
        // Refresh: keep a live guide live even if this run's gate failed — don't
        // replace good content with a weaker run.
        if (existing.status === 'published' && !guide.gate.passed) {
            return { id: existing.id, status: 'published' };
        }
        const patch = {
            title: guide.title,
            excerpt: guide.metaDescription,
            content: JSON.stringify(guide.content),
            image_url: guide.heroImage ?? null,
            metadata,
            status: existing.status === 'published' ? 'published' : status,
            published_at: existing.published_at ?? (status === 'published' ? now : null),
        };
        const { error: upErr } = await supabase.from('blogs').update({ ...patch, updated_at: now }).eq('id', existing.id);
        if (missingUpdatedAt(upErr)) await supabase.from('blogs').update(patch).eq('id', existing.id);
        else if (upErr) throw new Error(`Could not update guide: ${upErr.message}`);
        return { id: existing.id, status: existing.status === 'published' ? 'published' : status };
    }

    const row = {
        title: guide.title,
        slug: guide.slug,
        excerpt: guide.metaDescription,
        content: JSON.stringify(guide.content),
        category: 'city', // blog_category enum: country | city | wonder; guide kind lives in metadata
        status,
        published_at: status === 'published' ? now : null,
        image_url: guide.heroImage ?? null,
        metadata,
    };
    let { data, error } = await supabase.from('blogs').insert({ ...row, updated_at: now }).select('id').single();
    if (missingUpdatedAt(error)) ({ data, error } = await supabase.from('blogs').insert(row).select('id').single());
    if (error || !data) throw new Error(`Could not save guide: ${error?.message}`);
    return { id: data.id as string, status };
}
