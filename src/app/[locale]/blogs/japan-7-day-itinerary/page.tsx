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

    // Schema Markup for SEO
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
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
            />

            {/* Minimalist Top Navigation */}
            <nav className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 py-4 px-6 md:px-12 shadow-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Link 
                        href={`/${locale}/blogs`} 
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Travel Blog
                    </Link>
                    <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">iWillTravel Reports</span>
                </div>
            </nav>

            <article className="max-w-4xl mx-auto px-4 md:px-8 pt-12 md:pt-20">
                <header className="text-center max-w-3xl mx-auto mb-12 space-y-6">
                    <div className="flex items-center justify-center gap-4 text-sm font-bold text-blue-600 uppercase tracking-widest">
                        <span>Itineraries</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1.5 text-slate-500"><Calendar className="w-4 h-4" /> Read Time: 5 min</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
                        The Ultimate 7-Day Japan Itinerary
                    </h1>

                    <p className="text-lg md:text-2xl text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto italic">
                        Tokyo, Kyoto, and Osaka. An AI-optimized guide designed to help you avoid the crowds and experience the real Japan.
                    </p>
                </header>

                {/* Hero Image */}
                <div className="w-full aspect-[16/9] md:aspect-[21/9] rounded-[2rem] overflow-hidden mb-16 shadow-lg border border-slate-200">
                    <img 
                        src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop" 
                        alt="Tokyo neon streets at night" 
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="max-w-3xl mx-auto space-y-12">
                    <section className="prose prose-lg md:prose-xl prose-slate max-w-none text-slate-700 leading-relaxed font-serif">
                        <p>
                            Planning a trip to Japan can be overwhelming. The golden route — touching Tokyo, Kyoto, and Osaka — is famous for a reason, but blindly following old guidebooks leads to standing in massive lines and missing the hidden neighborhood spots that make the country so magical.
                        </p>
                        <p>
                            We built this 7-day itinerary using AI trained on the latest travel data to optimize routing, costs, and timing. Whether you are a solo traveler, digital nomad, or vacationer, this is how you do Japan right.
                        </p>
                    </section>

                    <section className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
                        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                            <MapPin className="w-6 h-6 text-pink-500" /> Days 1-3: Tokyo 
                        </h2>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-1 shrink-0" />
                                <div>
                                    <strong>Day 1:</strong> Arrive at Narita or Haneda. Grab a Suica card on your phone. Head to Shinjuku. Explore the neon-lit Omoide Yokocho (Memory Lane) for incredible yakitori.
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-1 shrink-0" />
                                <div>
                                    <strong>Day 2:</strong> Early morning at Meiji Shrine before the crowds. Walk through Harajuku. Evening in Shibuya (see the crossing) and grab dinner in a hidden Izakaya.
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-1 shrink-0" />
                                <div>
                                    <strong>Day 3:</strong> Cultural day in Asakusa (Senso-ji Temple). Take the water bus to Odaiba for futuristic vibes and the TeamLab Planets exhibition.
                                </div>
                            </li>
                        </ul>
                    </section>
                    
                    <section className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
                        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                            <MapPin className="w-6 h-6 text-indigo-500" /> Days 4-5: Kyoto
                        </h2>
                        <p className="prose text-slate-700 leading-relaxed font-serif mb-6">
                            Take the Shinkansen (Bullet Train) from Tokyo to Kyoto (approx 2h 15m). Kyoto is the traditional heart of Japan.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-1 shrink-0" />
                                <div>
                                    <strong>Day 4:</strong> Arrive in Kyoto. Head straight to the Fushimi Inari Shrine (go as far up the mountain as your legs allow to escape the tourists). Evening walk through Gion.
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-1 shrink-0" />
                                <div>
                                    <strong>Day 5:</strong> Arashiyama Bamboo Grove (arrive by 7 AM to avoid crowds), followed by Tenryu-ji Temple. Enjoy a traditional Kaiseki dinner.
                                </div>
                            </li>
                        </ul>
                    </section>

                    <section className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
                        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                            <MapPin className="w-6 h-6 text-amber-500" /> Days 6-7: Osaka
                        </h2>
                        <p className="prose text-slate-700 leading-relaxed font-serif mb-6">
                            A quick train ride from Kyoto brings you to the nation's kitchen. Osaka is gritty, fun, and delicious.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-1 shrink-0" />
                                <div>
                                    <strong>Day 6:</strong> Explore Osaka Castle. In the evening, Dotonbori is a must. Eat Takoyaki, Okonomiyaki, and enjoy the vibrant street life.
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-1 shrink-0" />
                                <div>
                                    <strong>Day 7:</strong> Last minute shopping in Namba or Umeda. Head to Kansai International Airport (KIX) for your flight home.
                                </div>
                            </li>
                        </ul>
                    </section>
                </div>
            </article>

            {/* Injected Lead Magnet / CTA */}
            <div className="max-w-5xl mx-auto mt-20 px-4 md:px-8">
                <div className="rounded-[3rem] overflow-hidden shadow-2xl">
                    <JapanLeadMagnet />
                </div>
            </div>
            
            <div className="max-w-4xl mx-auto mt-16 px-4 text-center">
                <p className="text-slate-500 font-serif mb-6 text-xl">
                    Want to customize this itinerary for yourself? Extend it to 14 days, remove Osaka, or focus entirely on vegan food?
                </p>
                <Link href="/plan-trip" className="inline-block px-8 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
                    Plan Your Custom Trip with AI
                </Link>
            </div>
        </div>
    );
}
