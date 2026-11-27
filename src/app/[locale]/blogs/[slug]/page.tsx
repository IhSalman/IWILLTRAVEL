import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ArrowUpRight, MapPin } from 'lucide-react';
import { Link } from '@/i18n/routing';
import NewsletterSignup from '@/components/blog/NewsletterSignup';
import { GuideArticle } from '@/components/blog/GuideArticle';
import { createPublicClient } from '@/utils/supabase/public';
import { isItineraryGuide, type ItineraryGuideContent } from '@/lib/guides/types';
import {
    absoluteImage,
    absoluteUrl,
    breadcrumbJsonLd,
    guideCanonical,
    jsonLdScript,
    organizationJsonLd,
    SITE_NAME,
} from '@/lib/seo';

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { locale: string; slug: string };

async function getGuide(slug: string) {
    const { data } = await createPublicClient()
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
    return data as any;
}

function parseContent(raw: string): { guide?: ItineraryGuideContent; legacy?: any; markdown?: string } {
    try {
        const parsed = JSON.parse(raw);
        if (isItineraryGuide(parsed)) return { guide: parsed };
        if (parsed?.is_structured_json) return { legacy: parsed };
    } catch {
        /* markdown */
    }
    return { markdown: raw };
}

export async function generateStaticParams() {
    try {
        const { data } = await createPublicClient().from('blogs').select('slug').eq('status', 'published').limit(500);
        return (data || []).filter((b: any) => b.slug).map((b: any) => ({ locale: 'en', slug: b.slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { slug } = await params;
    const blog = await getGuide(slug);
    if (!blog) return { title: 'Guide not found', robots: { index: false } };

    // Some older titles already end in "| iWillTravel" — don't append the brand twice.
    const title = String(blog.metadata?.seoTitle || blog.title).replace(/\s*[|–-]\s*iWillTravel\s*$/i, '');
    const description = blog.excerpt || undefined;
    const image = absoluteImage(blog.image_url);
    const canonical = guideCanonical(slug);
    return {
        title: `${title} | ${SITE_NAME}`,
        description,
        keywords: blog.metadata?.seoKeywords,
        alternates: { canonical },
        openGraph: {
            type: 'article',
            url: canonical,
            title,
            description,
            siteName: SITE_NAME,
            publishedTime: blog.published_at || undefined,
            modifiedTime: blog.updated_at || blog.published_at || undefined,
            images: image ? [{ url: image, width: 1200, height: 800, alt: title }] : undefined,
        },
        twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
    };
}

async function getRelated(blog: any) {
    const supabase = createPublicClient();
    const destination = blog.metadata?.destination;
    const out: any[] = [];
    if (destination) {
        const { data } = await supabase
            .from('blogs')
            .select('slug, title, excerpt, image_url, metadata')
            .eq('status', 'published')
            .eq('metadata->>destination', destination)
            .neq('slug', blog.slug)
            .limit(3);
        out.push(...(data || []));
    }
    if (out.length < 3) {
        const { data } = await supabase
            .from('blogs')
            .select('slug, title, excerpt, image_url, metadata')
            .eq('status', 'published')
            .neq('slug', blog.slug)
            .order('published_at', { ascending: false })
            .limit(6);
        for (const b of data || []) if (out.length < 3 && !out.some((o) => o.slug === b.slug)) out.push(b);
    }
    return out;
}

function guideJsonLd(blog: any, guide: ItineraryGuideContent | undefined, canonical: string) {
    const url = absoluteUrl(canonical);
    const graph: any[] = [
        {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: blog.metadata?.seoTitle || blog.title,
            description: blog.excerpt,
            image: absoluteImage(blog.image_url) ? [absoluteImage(blog.image_url)] : undefined,
            datePublished: blog.published_at,
            dateModified: blog.updated_at || blog.published_at,
            mainEntityOfPage: url,
            author: organizationJsonLd(),
            publisher: organizationJsonLd(),
        },
        breadcrumbJsonLd([
            { name: 'Home', path: '/en' },
            { name: 'Travel guides', path: '/en/blogs' },
            { name: blog.title, path: canonical },
        ]),
    ];
    if (guide) {
        graph.push({
            '@context': 'https://schema.org',
            '@type': 'TouristTrip',
            name: blog.title,
            description: blog.excerpt,
            touristType: guide.quickFacts.pace,
            itinerary: {
                '@type': 'ItemList',
                numberOfItems: guide.stats.stops,
                itemListElement: guide.plan.flatMap((d) => d.stops).map((s, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    item: {
                        '@type': 'TouristAttraction',
                        name: s.name,
                        ...(s.address ? { address: s.address } : {}),
                        ...(s.lat != null && s.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng } } : {}),
                        ...(s.photoUrl ? { image: absoluteImage(s.photoUrl) } : {}),
                        url: s.mapsUrl,
                    },
                })),
            },
        });
        if (guide.faq.length) {
            graph.push({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: guide.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            });
        }
    }
    return graph;
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
    const { locale, slug } = await params;
    setRequestLocale(locale);

    const blog = await getGuide(slug);
    if (!blog) notFound();

    const { guide, legacy, markdown } = parseContent(blog.content);
    const related = await getRelated(blog);
    const canonical = guideCanonical(slug);
    const published = blog.published_at
        ? new Date(blog.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
    const updated =
        blog.updated_at && blog.updated_at !== blog.published_at
            ? new Date(blog.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : '';

    return (
        <div className="relative min-h-screen bg-background pb-24 text-slate-200 overflow-x-clip">
            {guideJsonLd(blog, guide, canonical).map((ld, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
            ))}

            <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-sunrise-300/[0.05] blur-[120px]" />

            <article className="relative mx-auto max-w-3xl px-4 pt-10 sm:px-6 md:pt-14">
                <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-500">
                    <Link href="/blogs" className="inline-flex items-center gap-1.5 hover:text-slate-200">
                        <ArrowLeft className="h-3.5 w-3.5" /> All travel guides
                    </Link>
                </nav>

                <header className="mb-10 space-y-4">
                    <p className="eyebrow">
                        {guide ? `${guide.days}-day itinerary · ${guide.city}` : blog.category || 'Travel guide'}
                    </p>
                    <h1 className="font-heading text-4xl leading-[1.05] text-slate-100 sm:text-5xl md:text-6xl">{blog.title}</h1>
                    {blog.excerpt && <p className="text-lg leading-relaxed text-slate-400">{blog.excerpt}</p>}
                    <p className="text-xs text-slate-500">
                        {published && <>Published {published}</>}
                        {updated && <> · Updated {updated}</>}
                        {guide && <> · {guide.stats.stops} places verified on Google Maps</>}
                    </p>
                </header>

                {blog.image_url && (
                    <figure className="mb-12 overflow-hidden rounded-2xl bg-white/[0.03]">
                        <img
                            src={blog.image_url}
                            alt={guide ? `${guide.city} — ${blog.title}` : blog.title}
                            width={1200}
                            height={675}
                            fetchPriority="high"
                            className="aspect-[16/9] w-full object-cover"
                        />
                    </figure>
                )}

                {guide && (
                    <nav aria-label="Days" className="mb-12 flex flex-wrap gap-2">
                        {guide.beforeYouGo && guide.beforeYouGo.length > 0 && (
                            <a href="#travel-tips" className="rounded-full border border-sunrise-300/40 px-3 py-1.5 text-xs text-sunrise-300 hover:border-sunrise-300/70">
                                Travel tips
                            </a>
                        )}
                        {guide.plan.map((d) => (
                            <a key={d.day} href={`#day-${d.day}`} className="rounded-full border border-white/[0.1] px-3 py-1.5 text-xs text-slate-300 hover:border-white/25 hover:text-slate-100">
                                Day {d.day}
                                {d.area ? ` · ${d.area}` : ''}
                            </a>
                        ))}
                    </nav>
                )}

                {guide ? (
                    <GuideArticle guide={guide} />
                ) : legacy ? (
                    <LegacyGuide content={legacy} />
                ) : (
                    <div className="prose-invert space-y-4 leading-relaxed text-slate-300 [&_a]:text-sunrise-300 [&_h2]:font-heading [&_h2]:text-3xl [&_h2]:text-slate-100 [&_h3]:text-xl [&_h3]:text-slate-100">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || ''}</ReactMarkdown>
                    </div>
                )}

                {related.length > 0 && (
                    <section className="mt-20 border-t border-white/[0.08] pt-10">
                        <h2 className="font-heading text-3xl text-slate-100">More travel guides</h2>
                        <div className="mt-6 grid gap-5 sm:grid-cols-3">
                            {related.map((r) => (
                                <Link key={r.slug} href={`/blogs/${r.slug}` as any} className="group block">
                                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white/[0.03]">
                                        {r.image_url && (
                                            <img src={r.image_url} alt={r.title} width={400} height={300} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                                        )}
                                    </div>
                                    <p className="mt-3 text-sm leading-snug text-slate-200 group-hover:text-sunrise-300">{r.title}</p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </article>

            <div className="relative mx-auto mt-20 max-w-3xl px-4 sm:px-6">
                <div className="rounded-3xl border border-white/[0.08] p-6 sm:p-10">
                    <NewsletterSignup />
                </div>
            </div>
        </div>
    );
}

/** Older AI-written posts (pre-v2): kept readable in the new style. */
function LegacyGuide({ content }: { content: any }) {
    return (
        <div className="space-y-12">
            {content.introduction && <p className="text-lg leading-relaxed text-slate-300">{content.introduction}</p>}
            {Array.isArray(content.places) && content.places.length > 0 && (
                <section className="space-y-5">
                    <h2 className="font-heading text-3xl text-slate-100">Places to see</h2>
                    {content.places.map((p: any, i: number) => (
                        <div key={i} className="grid gap-5 rounded-2xl border border-white/[0.08] p-4 sm:grid-cols-[200px_1fr]">
                            {p.image_url && <img src={p.image_url} alt={p.alt || p.name} width={400} height={300} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />}
                            <div className="space-y-2">
                                <h3 className="flex items-center gap-2 text-lg text-slate-100">
                                    <MapPin className="h-4 w-4 text-slate-500" /> {p.name}
                                </h3>
                                <p className="text-sm leading-relaxed text-slate-400">{p.description}</p>
                                {p.map_link && (
                                    <a href={p.map_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-sunrise-300 hover:underline">
                                        View on map <ArrowUpRight className="h-3.5 w-3.5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </section>
            )}
            {content.itinerary && (
                <section className="space-y-3">
                    <h2 className="font-heading text-3xl text-slate-100">Suggested itinerary</h2>
                    <div className="space-y-3 leading-relaxed text-slate-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.itinerary}</ReactMarkdown>
                    </div>
                </section>
            )}
            {(content.budget || content.weather || content.food) && (
                <section className="grid gap-5 md:grid-cols-3">
                    {[
                        ['Budget', content.budget],
                        ['Weather', content.weather],
                        ['Food', content.food],
                    ]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                            <div key={k} className="rounded-2xl border border-white/[0.08] p-5">
                                <h3 className="eyebrow mb-2">{k}</h3>
                                <p className="text-sm leading-relaxed text-slate-400">{v}</p>
                            </div>
                        ))}
                </section>
            )}
            {Array.isArray(content.tips) && content.tips.length > 0 && (
                <section className="space-y-3">
                    <h2 className="font-heading text-3xl text-slate-100">Tips</h2>
                    <ul className="list-disc space-y-2 pl-5 text-slate-300">
                        {content.tips.map((t: string, i: number) => (
                            <li key={i}>{t}</li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
