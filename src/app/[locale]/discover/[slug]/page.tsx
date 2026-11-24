import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Metadata } from 'next';
import Image from 'next/image';
import { Link, routing } from '@/i18n/routing';
import {
    MapPin, Thermometer, Wifi, DollarSign,
    Shield, Calendar, ChevronLeft, Lightbulb,
    Info, Compass, Star, ArrowRight, Sparkles, Search
} from 'lucide-react';
import Script from 'next/script';
import { destinations as curatedDestinations } from '@/data/destinations';

function findCuratedDestination(slug: string) {
    const clean = slug.toLowerCase().trim();
    return curatedDestinations.find(
        (d) =>
            d.slug === clean ||
            d.slug.startsWith(`${clean}-`) ||
            d.name.toLowerCase().replace(/\s+/g, '-') === clean
    );
}

// Pre-render curated + DB city slugs at build time
export async function generateStaticParams() {
    const slugSet = new Set<string>(curatedDestinations.map((d) => d.slug));

    try {
        const supabase = await createClient();
        const { data: dbDests } = await supabase.from('destinations').select('slug');
        if (dbDests) {
            for (const dest of dbDests) {
                if (dest.slug) slugSet.add(dest.slug);
            }
        }
    } catch {
        // Curated slugs still pre-render cleanly
    }

    const allSlugs = Array.from(slugSet);
    const params: { locale: string; slug: string }[] = [];
    for (const locale of routing.locales) {
        for (const slug of allSlugs) {
            params.push({ locale, slug });
        }
    }
    return params;
}

// Dynamically generate SEO metadata from DB or curated destination
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;

    let dbDest: any = null;
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from('destinations')
            .select('name, country, meta_title, meta_description, image_url')
            .eq('slug', resolvedParams.slug)
            .single();
        dbDest = data;
    } catch {
        // Fallback to curated catalog
    }

    const curated = findCuratedDestination(resolvedParams.slug);
    const name = dbDest?.name || curated?.name;
    const country = dbDest?.country || curated?.country;

    if (!name) {
        return { title: 'Destination Not Found | iWillTravel' };
    }

    const title = dbDest?.meta_title || `${name}, ${country} Travel Guide — Costs, Best Season & Tips | iWillTravel`;
    const description =
        dbDest?.meta_description ||
        curated?.heroDescription ||
        `Discover ${name}, ${country}: daily costs, safety index, optimal travel months, neighborhood highlights, and AI itinerary planning.`;
    const headerImage =
        dbDest?.image_url ||
        curated?.image ||
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [headerImage],
            type: 'website',
            siteName: 'iWillTravel',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [headerImage],
        },
    };
}

export default async function CityTravelGuidePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const resolvedParams = await params;

    let dbDest: any = null;
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from('destinations')
            .select('*')
            .eq('slug', resolvedParams.slug)
            .single();
        dbDest = data;
    } catch {
        // Seamless fallback to curated data
    }

    const curated = findCuratedDestination(resolvedParams.slug);

    if (!dbDest && !curated) {
        notFound();
    }

    const dailyCost = dbDest?.cost_estimate_weekly
        ? Math.round(dbDest.cost_estimate_weekly / 7)
        : curated?.cost || 115;
    const weeklyCost = dbDest?.cost_estimate_weekly || dailyCost * 7;

    const cityName = dbDest?.name || curated!.name;
    const countryName = dbDest?.country || curated!.country;

    const dest = {
        id: dbDest?.id || curated?.id || resolvedParams.slug,
        slug: dbDest?.slug || curated?.slug || resolvedParams.slug,
        name: cityName,
        country: countryName,
        image:
            dbDest?.image_url ||
            curated?.image ||
            'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80',
        tags: dbDest?.tags || curated?.tags || ['Cultural', 'Sightseeing'],
        dailyCost,
        weeklyCost,
        temp: dbDest?.climate_temp_c ?? curated?.temp ?? 22,
        internet: dbDest?.internet_speed_mbps ?? curated?.internet ?? 100,
        safety: dbDest?.safety_rating ?? curated?.safety ?? 8.5,
        heroDescription:
            dbDest?.hero_description ||
            curated?.heroDescription ||
            `Experience the neighborhoods, culinary scene, and architectural heritage of ${cityName}.`,
        overview:
            dbDest?.overview ||
            curated?.overview ||
            `${cityName} offers rich neighborhood variety best explored with geo-clustered daily planning.`,
        bestTimeToVisit: dbDest?.best_time_to_visit || {
            months: curated?.bestMonths || 'Spring & Autumn',
            reason: curated?.bestSeasonReason || 'Comfortable temperatures, clear skies, and lighter queues at major landmarks.',
        },
        topAttractions:
            (Array.isArray(dbDest?.top_attractions) && dbDest.top_attractions.length > 0
                ? dbDest.top_attractions
                : curated?.highlights) || [],
        localTips:
            (Array.isArray(dbDest?.local_tips) && dbDest.local_tips.length > 0
                ? dbDest.local_tips
                : curated?.localTips) || [],
        costBreakdown:
            (Array.isArray(dbDest?.cost_breakdown) && dbDest.cost_breakdown.length > 0
                ? dbDest.cost_breakdown
                : [
                    { category: 'Accommodation (7 nights)', amount: Math.round(weeklyCost * 0.46) },
                    { category: 'Dining & Local Cafés', amount: Math.round(weeklyCost * 0.30) },
                    { category: 'Transit, Museums & Experiences', amount: Math.round(weeklyCost * 0.24) },
                ]),
        faqs:
            (Array.isArray(dbDest?.faqs) && dbDest.faqs.length > 0
                ? dbDest.faqs
                : [
                    {
                        q: `How many days should I plan for ${cityName}?`,
                        a: `Most travelers find 4 to 7 days ideal for exploring ${cityName}’s core neighborhoods without rushing, plus one regional day excursion.`,
                    },
                    {
                        q: `Do I need a visa to visit ${countryName}?`,
                        a: `Entry rules depend on your passport nationality. Use our Visa & Border Hub to verify visa-free stays, e-visas, and required documents for ${countryName}.`,
                    },
                ]),
    };

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'TouristDestination',
                name: dest.name,
                description: dest.heroDescription,
                image: dest.image,
                touristType: dest.tags.map((tag: string) => ({
                    '@type': 'Audience',
                    audienceType: tag,
                })),
            },
            {
                '@type': 'FAQPage',
                mainEntity: dest.faqs.map((faq: any) => ({
                    '@type': 'Question',
                    name: faq.q,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: faq.a,
                    },
                })),
            },
        ],
    };

    const paragraphs = dest.overview.split(/\n\n+/).filter(Boolean);

    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-100 font-body relative overflow-x-clip">
            <Script
                id="destination-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Hero Section */}
            <div className="relative h-[56vh] md:h-[64vh] w-full overflow-hidden border-b border-white/[0.08]">
                <div className="absolute inset-0">
                    <Image
                        src={dest.image}
                        alt={`Travel guide to ${dest.name}, ${dest.country}`}
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0f] via-[#0b0c0f]/55 to-transparent" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-end">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
                        <Link
                            href="/discover"
                            className="inline-flex items-center text-xs font-medium text-slate-200 hover:text-white mb-6 apple-liquid-glass px-3.5 py-1.5 rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> All Destinations
                        </Link>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {dest.tags.map((tag: string) => (
                                <span
                                    key={tag}
                                    className="px-3 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider apple-glass-pill text-slate-100"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-bold text-white mb-2 tracking-tight">
                            {dest.name}
                        </h1>
                        <div className="flex items-center text-sm md:text-base text-slate-300 mb-4">
                            <MapPin className="w-4 h-4 mr-1.5 text-sky-300" /> {dest.country}
                        </div>

                        <p className="text-sm md:text-base text-slate-200/90 max-w-2xl leading-relaxed">
                            {dest.heroDescription}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Traveler Telemetry Banner */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 apple-glass-card rounded-[26px] p-6 tabular-nums">
                            <div className="flex flex-col gap-1 items-center text-center">
                                <DollarSign className="w-5 h-5 text-emerald-400 mb-1" />
                                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Avg Daily</span>
                                <span className="text-lg font-heading font-bold text-white">
                                    ${dest.dailyCost}<span className="text-xs font-mono text-slate-400 font-normal">/day</span>
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 items-center text-center">
                                <Shield className="w-5 h-5 text-sky-300 mb-1" />
                                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Safety Index</span>
                                <span className="text-lg font-heading font-bold text-white">
                                    {dest.safety}<span className="text-xs font-mono text-slate-400 font-normal">/10</span>
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 items-center text-center">
                                <Thermometer className="w-5 h-5 text-amber-300 mb-1" />
                                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Avg Climate</span>
                                <span className="text-lg font-heading font-bold text-white">{dest.temp}°C</span>
                            </div>
                            <div className="flex flex-col gap-1 items-center text-center">
                                <Wifi className="w-5 h-5 text-indigo-300 mb-1" />
                                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Avg Wi-Fi</span>
                                <span className="text-lg font-heading font-bold text-white">
                                    {dest.internet} <span className="text-xs font-mono text-slate-400 font-normal">Mbps</span>
                                </span>
                            </div>
                        </div>

                        {/* Overview Section */}
                        <section className="apple-glass-card rounded-[26px] p-6 sm:p-8 space-y-4">
                            <h2 className="font-heading text-2xl font-bold text-white border-b border-white/[0.08] pb-3">
                                Destination Overview
                            </h2>
                            <div className="text-slate-200/90 text-sm sm:text-base leading-relaxed space-y-4">
                                {paragraphs.map((para: string, idx: number) => (
                                    <p key={idx}>{para}</p>
                                ))}
                            </div>
                        </section>

                        {/* Best Time to Visit */}
                        <section className="apple-glass-card rounded-[26px] p-6 sm:p-8 space-y-3">
                            <div className="flex items-center gap-2.5 text-amber-200">
                                <Calendar className="w-5 h-5" />
                                <h3 className="font-heading text-xl font-bold text-white">Best Time to Visit</h3>
                            </div>
                            <div className="text-sm font-mono font-semibold text-sky-300">{dest.bestTimeToVisit.months}</div>
                            <p className="text-slate-300 text-sm leading-relaxed">{dest.bestTimeToVisit.reason}</p>
                        </section>

                        {/* Top Attractions */}
                        {dest.topAttractions.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="font-heading text-2xl font-bold text-white flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-300" /> Essential Neighborhoods & Sights
                                </h2>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {dest.topAttractions.map((attr: any, i: number) => (
                                        <div key={i} className="apple-glass-card card-3d-interactive rounded-2xl p-5">
                                            <h4 className="font-heading text-base font-bold text-white mb-1.5">{attr.name}</h4>
                                            <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">{attr.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Local Tips */}
                        {dest.localTips.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="font-heading text-2xl font-bold text-white flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-amber-300" /> Practical Traveler Tips
                                </h2>
                                <div className="space-y-3">
                                    {dest.localTips.map((tip: string, i: number) => (
                                        <div key={i} className="apple-glass-card rounded-2xl p-4 flex items-start gap-3">
                                            <div className="mt-0.5 p-1.5 rounded-xl apple-glass-pill text-sky-300 shrink-0">
                                                <Info className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-xs sm:text-sm text-slate-200 leading-relaxed">{tip}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* FAQ Section */}
                        <section className="space-y-4">
                            <h2 className="font-heading text-2xl font-bold text-white">Frequently Asked Questions</h2>
                            <div className="space-y-3">
                                {dest.faqs.map((faq: any, i: number) => (
                                    <div key={i} className="apple-glass-card rounded-2xl p-5">
                                        <h4 className="font-semibold text-sm text-white mb-1.5">{faq.q}</h4>
                                        <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">{faq.a}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Sticky Traveler Action Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">

                            {/* Primary AI Planner CTA Card */}
                            <div className="apple-liquid-glass rounded-[28px] p-7 text-left space-y-4">
                                <div className="w-11 h-11 rounded-2xl apple-glass-pill flex items-center justify-center text-sky-300">
                                    <Compass className="w-5 h-5" />
                                </div>
                                <h3 className="font-heading text-2xl font-bold text-white">
                                    Plan Your Trip to {dest.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-200/85 leading-relaxed">
                                    Generate a neighborhood-clustered day-by-day itinerary with verified Google Places stops, transit times, flights, and hotels.
                                </p>
                                <div className="space-y-2.5 pt-2">
                                    <Link
                                        href={`/plan-trip?destination=${encodeURIComponent(`${dest.name}, ${dest.country}`)}` as any}
                                        className="block"
                                    >
                                        <button className="w-full h-12 text-xs sm:text-sm rounded-full btn-apple-primary inline-flex items-center justify-center gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            <span>Build {dest.name} Itinerary</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </Link>
                                    <Link href="/visa-hub" className="block">
                                        <button className="w-full h-10 text-xs font-medium rounded-full btn-apple-glass inline-flex items-center justify-center gap-2">
                                            <Shield className="w-3.5 h-3.5 text-emerald-300" />
                                            <span>Check {dest.country} Visa Rules</span>
                                        </button>
                                    </Link>
                                    <Link href="/travel-research" className="block">
                                        <button className="w-full h-10 text-xs font-medium rounded-full btn-apple-glass inline-flex items-center justify-center gap-2">
                                            <Search className="w-3.5 h-3.5 text-sky-300" />
                                            <span>Deep-Dive Local Research</span>
                                        </button>
                                    </Link>
                                </div>
                            </div>

                            {/* Weekly Cost Breakdown */}
                            <div className="apple-glass-card rounded-[26px] p-6 space-y-4 tabular-nums">
                                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 border-b border-white/[0.08] pb-3 text-center">
                                    7-Day Budget Estimate
                                </h3>
                                <div className="space-y-4 pt-1">
                                    {dest.costBreakdown.map((item: any, i: number) => {
                                        const maxCost = Math.max(...dest.costBreakdown.map((c: any) => c.amount));
                                        const widthPercent = Math.max(14, Math.round((item.amount / maxCost) * 100));

                                        return (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex justify-between text-xs font-mono text-slate-200">
                                                    <span>{item.category}</span>
                                                    <span className="font-semibold text-white">${item.amount}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/[0.07] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-sky-400 to-emerald-300 rounded-full"
                                                        style={{ width: `${widthPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-mono">7-Day Total (1 Traveler)</span>
                                        <span className="text-white text-lg font-heading font-bold">${dest.weeklyCost}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 text-center">
                                        Mid-range estimate (~${dest.dailyCost}/day) excluding international airfare.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
