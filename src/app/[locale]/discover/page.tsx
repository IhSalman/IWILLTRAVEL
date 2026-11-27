import DiscoverClient from './DiscoverClient';
import { destinations as curatedDestinations } from '@/data/destinations';
import { createClient } from '@/utils/supabase/server';

export default async function DiscoverPage() {
    let merged = [...curatedDestinations];

    try {
        const supabase = await createClient();
        const { data: dbDestinations } = await supabase
            .from('destinations')
            .select('id, slug, name, country, image_url, cost_estimate_weekly, safety_rating, climate_temp_c, internet_speed_mbps, tags, hero_description');

        if (dbDestinations && dbDestinations.length > 0) {
            const existingSlugs = new Set(merged.map((d) => d.slug));
            const existingNames = new Set(merged.map((d) => d.name.toLowerCase()));

            for (const row of dbDestinations) {
                if (!row.slug || !row.name) continue;
                if (existingSlugs.has(row.slug) || existingNames.has(row.name.toLowerCase())) continue;

                merged.push({
                    id: String(row.id),
                    slug: row.slug,
                    name: row.name,
                    country: row.country || '',
                    image: row.image_url || 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=1400&q=80',
                    cost: row.cost_estimate_weekly ? Math.round(row.cost_estimate_weekly / 7) : 110,
                    safety: row.safety_rating || 8.5,
                    temp: row.climate_temp_c || 22,
                    internet: row.internet_speed_mbps || 90,
                    tags: Array.isArray(row.tags) ? row.tags.map((t: string) => (t === 'Culture' ? 'Cultural' : t)) : ['Cultural'],
                    heroDescription: row.hero_description || `Explore ${row.name}, ${row.country}.`,
                    overview: '',
                    bestMonths: 'Spring & Autumn',
                    bestSeasonReason: '',
                    highlights: [],
                    localTips: [],
                });
            }
        }
    } catch {
        // Gracefully render curated destinations if DB query is unavailable
    }

    return <DiscoverClient destinations={merged} />;
}
