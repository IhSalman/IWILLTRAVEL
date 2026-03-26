import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    MapPin, Thermometer, Wifi, DollarSign,
    Shield, Calendar, ChevronLeft, Lightbulb,
    Info, Compass, Star
} from 'lucide-react';
import Script from 'next/script';
import { routing } from '@/i18n/routing';

// Tell Next.js to pre-render all standard city slugs at build time
export async function generateStaticParams() {
    const params: { locale: string; slug: string }[] = [];

    // We can't easily await inside generateStaticParams synchronously without making the whole thing async
    // Since Next.js supports async generateStaticParams, we can fetch from Supabase.

    try {
        const supabase = await createClient();
        const { data: destinations } = await supabase.from('destinations').select('slug');

        if (destinations) {
            for (const locale of routing.locales) {
                for (const dest of destinations) {
                    if (dest.slug) {
                        params.push({ locale, slug: dest.slug });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error generating static params for destinations:", error);
    }

    return params;
}

// Dynamically generate SEO metadata based on the city slug
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;

    const supabase = await createClient();
    const { data: dest } = await supabase
        .from('destinations')
        .select('name, country, meta_title, meta_description, image_url')
        .eq('slug', resolvedParams.slug)
        .single();

    if (!dest) {
        return { title: 'Destination Not Found' };
    }

    const title = dest.meta_title || `${dest.name}, ${dest.country} Travel Guide | Travel AI`;
    const description = dest.meta_description || `Discover the best of ${dest.name}. Detailed travel guides, costs, tips, and attractions.`;
    const headerImage = dest.image_url || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [headerImage],
            type: 'website',
            siteName: 'Travel AI',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [headerImage],
        }
    };
}

export default async function CityTravelGuidePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const resolvedParams = await params;

    const supabase = await createClient();
    const { data: dbDest } = await supabase
        .from('destinations')
        .select('*')
        .eq('slug', resolvedParams.slug)
        .single();

    if (!dbDest) {
        notFound();
    }

    // Map DB fields back to the format the UI expects
    const dest = {
        id: dbDest.id,
        slug: dbDest.slug,
        name: dbDest.name,
        country: dbDest.country,
        image: dbDest.image_url || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80',
        cost: dbDest.cost_per_day || 0,
        safety: dbDest.safety_score || 0,
        temp: dbDest.temperature || 0,
        internet: dbDest.internet_speed || 0,
        tags: dbDest.vibes || [],
        metaTitle: dbDest.meta_title || '',
        metaDescription: dbDest.meta_description || '',
        heroDescription: dbDest.hero_description || '',
        overview: dbDest.overview || '',
        bestTimeToVisit: {
            months: dbDest.best_time_months || '',
            reason: dbDest.best_time_reason || ''
        },
        topAttractions: dbDest.top_attractions || [],
        localTips: dbDest.local_tips || [],
        costBreakdown: dbDest.cost_breakdown || [],
        faqs: dbDest.faqs || []
    };

    // Structured Data (JSON-LD) for rich Google Search results
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "TouristDestination",
                "name": dest.name,
                "description": dest.overview,
                "image": dest.image,
                "touristType": dest.tags.map((tag: string) => ({
                    "@type": "Audience",
                    "audienceType": tag
                }))
            },
            {
                "@type": "FAQPage",
                "mainEntity": dest.faqs.map((faq: any) => ({
                    "@type": "Question",
                    "name": faq.q,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": faq.a
                    }
                }))
            }
        ]
    };

    return (
        <div className="min-h-screen bg-background">
            <Script
                id="destination-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Hero Section */}
            <div className="relative h-[60vh] md:h-[70vh] w-full">
                <div className="absolute inset-0">
                    <Image
                        src={dest.image}
                        alt={`Travel guide to ${dest.name}, ${dest.country}`}
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-black/20" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-end">
                    <div className="container pb-10">
                        <Link href={`/${resolvedParams.locale}/discover`} className="inline-flex items-center text-sm font-medium text-white/80 hover:text-white mb-6 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 transition-colors">
                            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Discover
                        </Link>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {dest.tags.map((tag: string) => (
                                <Badge key={tag} className="bg-primary hover:bg-primary/90 text-white border-none font-semibold px-3 py-1">
                                    {tag}
                                </Badge>
                            ))}
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
                            {dest.name}
                        </h1>
                        <div className="flex items-center text-xl md:text-2xl text-white/90 font-medium mb-6 drop-shadow-md">
                            <MapPin className="w-6 h-6 mr-2 text-sunset" /> {dest.country}
                        </div>

                        <p className="text-lg md:text-xl text-white/90 max-w-3xl font-medium leading-relaxed drop-shadow-md">
                            {dest.heroDescription}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Container */}
            <div className="container py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* Left Column: Extensive Content (SEO Goldmine) */}
                    <div className="lg:col-span-2 space-y-12">

                        {/* Quick Stats Banner */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card border rounded-3xl p-6 shadow-sm">
                            <div className="flex flex-col gap-1 items-center text-center">
                                <DollarSign className="w-6 h-6 text-emerald-500 mb-1" />
                                <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Est. Cost</span>
                                <span className="text-lg font-black">${dest.cost} <span className="text-sm font-normal text-muted-foreground">/w</span></span>
                            </div>
                            <div className="flex flex-col gap-1 items-center text-center">
                                <Shield className="w-6 h-6 text-blue-500 mb-1" />
                                <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Safety</span>
                                <span className="text-lg font-black">{dest.safety}<span className="text-sm font-normal text-muted-foreground">/10</span></span>
                            </div>
                            <div className="flex flex-col gap-1 items-center text-center">
                                <Thermometer className="w-6 h-6 text-orange-500 mb-1" />
                                <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Climate</span>
                                <span className="text-lg font-black">{dest.temp}°C</span>
                            </div>
                            <div className="flex flex-col gap-1 items-center text-center">
                                <Wifi className="w-6 h-6 text-sky-500 mb-1" />
                                <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Internet</span>
                                <span className="text-lg font-black">{dest.internet} <span className="text-sm font-normal text-muted-foreground">Mbps</span></span>
                            </div>
                        </div>

                        {/* Overview Section */}
                        <section className="prose prose-lg dark:prose-invert max-w-none">
                            <h2 className="text-3xl font-black mb-6 border-b pb-4">Overview of {dest.name}</h2>
                            <div className="text-muted-foreground leading-loose" dangerouslySetInnerHTML={{ __html: dest.overview.replace(/\n\n/g, '<br/><br/>') }} />
                        </section>

                        {/* Best Time to Visit Callout */}
                        <section className="bg-primary/5 border border-primary/20 rounded-3xl p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <Calendar className="w-8 h-8 text-primary" />
                                <h3 className="text-2xl font-black text-foreground">Best Time To Visit</h3>
                            </div>
                            <div className="text-xl font-bold text-primary mb-2">{dest.bestTimeToVisit.months}</div>
                            <p className="text-muted-foreground leading-relaxed font-medium">{dest.bestTimeToVisit.reason}</p>
                        </section>

                        {/* Top Attractions */}
                        <section>
                            <h2 className="text-3xl font-black mb-6 border-b pb-4 flex items-center gap-2"><Star className="w-7 h-7 text-sunset" /> Top Attractions in {dest.name}</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {dest.topAttractions.map((attr: any, i: number) => (
                                    <Card key={i} className="bg-card hover:border-primary/50 transition-colors">
                                        <CardContent className="p-5">
                                            <h4 className="text-xl font-bold text-foreground mb-2">{attr.name}</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{attr.description}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>

                        {/* Local Tips */}
                        <section>
                            <h2 className="text-3xl font-black mb-6 border-b pb-4 flex items-center gap-2"><Lightbulb className="w-7 h-7 text-yellow-500" /> Insider Tips for Travelers</h2>
                            <ul className="space-y-4">
                                {dest.localTips.map((tip: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 bg-muted/50 p-4 rounded-2xl">
                                        <div className="mt-0.5 bg-yellow-500/20 p-1.5 rounded-full shrink-0">
                                            <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                        </div>
                                        <span className="text-foreground font-medium leading-relaxed">{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* FAQ Section (For FAQ Schema) */}
                        <section>
                            <h2 className="text-3xl font-black mb-6 border-b pb-4">Frequently Asked Questions</h2>
                            <div className="space-y-4">
                                {dest.faqs.map((faq: any, i: number) => (
                                    <div key={i} className="border rounded-2xl p-6 bg-card">
                                        <h4 className="text-lg font-bold text-foreground mb-3">{faq.q}</h4>
                                        <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Sticky Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">

                            {/* CTA Card */}
                            <Card className="border-primary/20 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden border-2">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
                                <CardContent className="p-8 relative z-10">
                                    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-6">
                                        <Compass className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-2">Ready to visit {dest.name}?</h3>
                                    <p className="text-muted-foreground mb-6 font-medium">Let our AI build a personalized itinerary for you, completely free.</p>
                                    <Link href={`/${resolvedParams.locale}/plan-trip?destination=${encodeURIComponent(dest.name)}`} className="w-full">
                                        <Button className="w-full h-14 text-lg font-bold rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                                            Plan Your Trip Now
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>

                            {/* Cost Breakdown */}
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="font-bold text-lg mb-4 uppercase tracking-widest text-muted-foreground text-center border-b pb-4">Weekly Budget</h3>
                                    <div className="space-y-5 mt-4">
                                        {dest.costBreakdown.map((item: any, i: number) => {
                                            // Calculate percentage relative to max cost in breakdown just for visual bar
                                            const maxCost = Math.max(...dest.costBreakdown.map((c: any) => c.amount));
                                            const widthPercent = Math.max(10, Math.round((item.amount / maxCost) * 100));

                                            return (
                                                <div key={i}>
                                                    <div className="flex justify-between text-sm font-bold text-foreground mb-2">
                                                        <span>{item.category}</span>
                                                        <span>${item.amount}</span>
                                                    </div>
                                                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all duration-1000"
                                                            style={{ width: `${widthPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div className="pt-4 border-t mt-4 flex justify-between items-center text-xl font-black">
                                            <span>Total Est.</span>
                                            <span className="text-primary">${dest.cost}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center mt-2">Prices are approximate estimates for one person for 7 days.</p>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
