import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { JapanLeadMagnet } from '@/components/landing/JapanLeadMagnet';

export const metadata: Metadata = {
    title: 'The Ultimate 7-Day Japan Itinerary: Tokyo, Kyoto, & Osaka | iWillTravel',
    description: 'An AI-optimized 7-day itinerary for Japan targeting solo travelers and digital nomads. Discover hidden gems, transport hacks, and budget tips.',
    openGraph: {
        title: 'The Ultimate 7-Day Japan Itinerary: Tokyo, Kyoto, & Osaka',
        description: 'An AI-optimized 7-day itinerary for Japan targeting solo travelers and digital nomads. Discover hidden gems, transport hacks, and budget tips.',
        type: 'article',
    }
};

export default async function JapanBlogPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    const schemaMarkup = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'The Ultimate 7-Day Japan Itinerary: Tokyo, Kyoto, & Osaka',
        description: metadata.description,
        author: {
            '@type': 'Organization',
            name: 'iWillTravel',
        },
        publisher: {
            '@type': 'Organization',
            name: 'iWillTravel',
            logo: {
                '@type': 'ImageObject',
                url: 'https://iwilltravel.ai/logo.png'
            }
        },
        datePublished: new Date().toISOString(),
        dateModified: new Date().toISOString(),
    };

    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-200 font-body pb-24 relative overflow-x-clip">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
            />

            {/* Ambient Lighting */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[380px] bg-gradient-to-b from-sky-500/[0.04] via-slate-500/[0.02] to-transparent blur-3xl pointer-events-none" />

            {/* Top Navigation */}
            <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 pt-10">
                <Link 
                    href={`/${locale}/blogs`} 
                    className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors card-3d-minimal px-3 py-1.5 rounded-full"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Intelligence Archive
                </Link>
            </div>

            <article className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 md:pt-14 relative z-10">
                <header className="text-center max-w-3xl mx-auto mb-12 space-y-4">
                    <div className="flex items-center justify-center gap-3 text-xs font-mono text-slate-400 uppercase tracking-wider">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-300">Itineraries</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5 text-slate-400"><Calendar className="w-3.5 h-3.5 text-slate-500" /> Read Time: 5 min</span>
                    </div>

                    <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal text-gradient-platinum leading-tight tracking-tight">
                        The Ultimate 7-Day Japan Itinerary
                    </h1>

                    <p className="text-sm md:text-base text-slate-400 font-light leading-relaxed max-w-2xl mx-auto">
                        Tokyo, Kyoto, and Osaka. A multi-agent optimized itinerary designed to bypass tourist friction and unlock genuine cultural flow.
                    </p>
                </header>

                {/* Hero Image */}
                <div className="w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden mb-12 border border-white/[0.07] bg-slate-900">
                    <img 
                        src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop" 
                        alt="Tokyo streets at twilight" 
                        className="w-full h-full object-cover opacity-80"
                    />
                </div>

                <div className="max-w-3xl mx-auto space-y-10">
                    <section className="card-3d-minimal rounded-2xl p-6 sm:p-8 space-y-4 text-slate-300 text-sm leading-relaxed font-light">
                        <p>
                            Planning travel through Japan requires precise timing. The Golden Corridor — encompassing Tokyo, Kyoto, and Osaka — offers extraordinary cultural depth, yet conventional itineraries result in dense queues and missed local neighborhood nuance.
                        </p>
                        <p>
                            We structured this 7-day route using agentic travel intelligence to optimize Shinkansen departure slots, transit walking routes, and regional culinary hours.
                        </p>
                    </section>

                    <section className="card-3d-minimal rounded-2xl p-6 sm:p-8 space-y-4">
                        <h2 className="font-serif text-2xl font-normal text-slate-200 flex items-center gap-2 border-b border-white/[0.07] pb-3">
                            <MapPin className="w-4 h-4 text-slate-400" /> Days 1–3: Tokyo Corridor
                        </h2>
                        <ul className="space-y-4 text-xs sm:text-sm text-slate-300 font-light">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400/80 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="text-slate-200 font-medium">Day 1:</strong> Arrive at Narita or Haneda. Provision digital transit card on device. Check into Shinjuku / Shibuya quarters. Twilight exploration through Omoide Yokocho.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400/80 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="text-slate-200 font-medium">Day 2:</strong> Dawn walk through Meiji Jingu inner forest before peak hours. Traverse Harajuku backstreets into Shibuya. Evening dining in Daikanyama.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400/80 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="text-slate-200 font-medium">Day 3:</strong> Cultural morning in Asakusa (Senso-ji). Sumida River water bus to Odaiba for maritime viewpoints and contemporary exhibits.
                                </div>
                            </li>
                        </ul>
                    </section>
                    
                    <section className="card-3d-minimal rounded-2xl p-6 sm:p-8 space-y-4">
                        <h2 className="font-serif text-2xl font-normal text-slate-200 flex items-center gap-2 border-b border-white/[0.07] pb-3">
                            <MapPin className="w-4 h-4 text-slate-400" /> Days 4–5: Kyoto Sanctuary
                        </h2>
                        <p className="text-xs text-slate-400 font-light">
                            Board the Tokaido Shinkansen bullet train from Tokyo Station to Kyoto (approx. 2h 15m).
                        </p>
                        <ul className="space-y-4 text-xs sm:text-sm text-slate-300 font-light">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400/80 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="text-slate-200 font-medium">Day 4:</strong> Arrival in Kyoto. Ascend Fushimi Inari past the midpoint summit to bypass valley congestion. Twilight stroll along Shirakawa canal in Gion.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400/80 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="text-slate-200 font-medium">Day 5:</strong> Early morning at Tenryu-ji garden and Arashiyama groves. Traditional tea ceremony in Uji or evening Kaiseki dinner.
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="card-3d-minimal rounded-2xl p-6 sm:p-8 space-y-4">
                        <h2 className="font-serif text-2xl font-normal text-slate-200 flex items-center gap-2 border-b border-white/[0.07] pb-3">
                            <MapPin className="w-4 h-4 text-slate-400" /> Days 6–7: Osaka Gastronomy
                        </h2>
                        <p className="text-xs text-slate-400 font-light">
                            A rapid 30-minute Special Rapid train connects Kyoto directly to Osaka Station.
                        </p>
                        <ul className="space-y-4 text-xs sm:text-sm text-slate-300 font-light">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400/80 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="text-slate-200 font-medium">Day 6:</strong> Osaka Castle park walk. Late afternoon into evening exploring Dotonbori, Amerikamura, and Kitashinchi for regional specialties.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400/80 mt-0.5 shrink-0" />
                                <div>
                                    <strong className="text-slate-200 font-medium">Day 7:</strong> Last-minute artisanal provisions in Namba. Direct Haruka express train to Kansai International Airport (KIX).
                                </div>
                            </li>
                        </ul>
                    </section>
                </div>
            </article>

            {/* Injected Lead Magnet / CTA */}
            <div className="max-w-4xl mx-auto mt-16 px-4 sm:px-6 relative z-10">
                <div className="card-3d-minimal rounded-3xl overflow-hidden">
                    <JapanLeadMagnet />
                </div>
            </div>
            
            <div className="max-w-3xl mx-auto mt-16 px-4 text-center space-y-4 relative z-10">
                <p className="text-slate-400 font-light text-xs sm:text-sm">
                    Require a personalized route? Adjust trip duration, accommodation standards, or dietary parameters directly with our agent collective.
                </p>
                <Link href="/plan-trip" className="inline-block">
                    <button className="btn-3d-minimal rounded-full px-8 py-3 text-xs font-medium">
                        Configure With Route Planner
                    </button>
                </Link>
            </div>
        </div>
    );
}
