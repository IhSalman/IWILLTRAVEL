import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/utils/site-url';
import { createPublicClient } from '@/utils/supabase/public';
import { destinations } from '@/data/destinations';
import { allAirports } from '@/lib/airports';

// Rebuilt at most hourly, so new guides appear in the sitemap automatically.
export const revalidate = 3600;

const LOCALES = ['en', 'es'] as const;

function localized(base: string, path: string, opts: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>) {
    return {
        url: `${base}/en${path}`,
        alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${base}/${l}${path}`])) },
        ...opts,
    };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = getSiteUrl();
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        localized(base, '', { lastModified: now, changeFrequency: 'daily', priority: 1 }),
        localized(base, '/blogs', { lastModified: now, changeFrequency: 'daily', priority: 0.9 }),
        localized(base, '/plan-trip', { lastModified: now, changeFrequency: 'weekly', priority: 0.8 }),
        localized(base, '/discover', { lastModified: now, changeFrequency: 'weekly', priority: 0.8 }),
        localized(base, '/pricing', { lastModified: now, changeFrequency: 'monthly', priority: 0.6 }),
        localized(base, '/flights', { lastModified: now, changeFrequency: 'daily', priority: 0.7 }),
        localized(base, '/airports', { lastModified: now, changeFrequency: 'weekly', priority: 0.6 }),
        localized(base, '/compensation', { lastModified: now, changeFrequency: 'monthly', priority: 0.6 }),
        localized(base, '/visa-hub', { lastModified: now, changeFrequency: 'monthly', priority: 0.6 }),
        localized(base, '/travel-research', { lastModified: now, changeFrequency: 'weekly', priority: 0.5 }),
        localized(base, '/translate', { lastModified: now, changeFrequency: 'monthly', priority: 0.4 }),
        localized(base, '/community', { lastModified: now, changeFrequency: 'weekly', priority: 0.4 }),
        { url: `${base}/en/blogs/japan-7-day-itinerary`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    ];

    const destinationPages: MetadataRoute.Sitemap = destinations
        .filter((d) => !d.slug.includes('/'))
        .map((d) => localized(base, `/discover/${d.slug}`, { lastModified: now, changeFrequency: 'monthly', priority: 0.7 }));

    // Published guides (English content → /en URL only; /es canonicalises to it).
    let guides: MetadataRoute.Sitemap = [];
    try {
        const { data } = await createPublicClient()
            .from('blogs')
            .select('*') // '*' so this works before and after the updated_at migration
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(5000);
        guides = (data || [])
            .filter((b: any) => b.slug && b.slug !== 'japan-7-day-itinerary')
            .map((b: any) => ({
                url: `${base}/en/blogs/${b.slug}`,
                lastModified: new Date(b.updated_at || b.published_at || now),
                changeFrequency: 'monthly' as const,
                priority: 0.8,
            }));
    } catch (err) {
        console.warn('[sitemap] Could not load guides:', err);
    }

    // Airport guides for major airports (live boards refresh, so they change daily).
    const airportPages: MetadataRoute.Sitemap = allAirports()
        .filter((a) => a.size === 1)
        .map((a) => localized(base, `/airports/${a.iata}`, { lastModified: now, changeFrequency: 'daily', priority: 0.5 }));

    return [...staticPages, ...guides, ...destinationPages, ...airportPages];
}
