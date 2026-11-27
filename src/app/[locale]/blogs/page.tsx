import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { BlogsClient } from '@/components/blog/BlogsClient';
import type { BlogItem } from '@/components/blog/BlogCard';
import NewsletterSignup from '@/components/blog/NewsletterSignup';
import { createPublicClient } from '@/utils/supabase/public';
import { absoluteUrl, breadcrumbJsonLd, jsonLdScript, SITE_NAME } from '@/lib/seo';

export const revalidate = 3600;

const TITLE = 'Travel Guides & Day-by-Day Itineraries';
const DESCRIPTION =
    'Free day-by-day travel itineraries for weekends, 3-day, 5-day and week-long trips — every place verified with live Google Maps data, with photos, opening hours and map links.';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${TITLE} | ${SITE_NAME}`,
        description: DESCRIPTION,
        alternates: { canonical: '/en/blogs' },
        openGraph: { type: 'website', url: '/en/blogs', title: TITLE, description: DESCRIPTION, siteName: SITE_NAME },
        twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
    };
}

export default async function BlogsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);

    let blogs: BlogItem[] = [];
    try {
        const { data } = await createPublicClient()
            .from('blogs')
            .select('*') // '*' so this works before and after the updated_at migration
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(300);
        blogs = (data as BlogItem[]) || [];
    } catch {
        blogs = [];
    }

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: TITLE,
        description: DESCRIPTION,
        url: absoluteUrl('/en/blogs'),
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: blogs.length,
            itemListElement: blogs.slice(0, 50).map((b, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: absoluteUrl(`/en/blogs/${b.slug}`),
                name: b.title,
            })),
        },
    };

    return (
        <div className="relative min-h-screen bg-background px-4 pb-24 pt-14 text-slate-200 sm:px-6 md:pt-20 lg:px-8 overflow-x-clip">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(itemList) }} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: jsonLdScript(breadcrumbJsonLd([{ name: 'Home', path: '/en' }, { name: 'Travel guides', path: '/en/blogs' }])),
                }}
            />
            <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-sunrise-300/[0.05] blur-[120px]" />

            <div className="relative mx-auto max-w-7xl">
                <header className="mb-14 max-w-3xl">
                    <span className="eyebrow mb-4 block">Travel guides</span>
                    <h1 className="font-heading text-5xl leading-[1.02] text-slate-100 sm:text-6xl md:text-7xl">
                        Itineraries where
                        <br />
                        <em className="text-sunrise-300">every place is real.</em>
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                        Day-by-day plans for weekends, long weekends and week-long trips. Each one is built from live map data —
                        real venues, opening hours and photos — and you can customise any of them in a minute.
                    </p>
                </header>

                <BlogsClient blogs={blogs} />

                <div className="mt-24 rounded-3xl border border-white/[0.08] p-6 sm:p-12">
                    <NewsletterSignup />
                </div>
            </div>
        </div>
    );
}
