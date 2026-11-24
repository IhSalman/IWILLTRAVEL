import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import NewsletterSignup from '@/components/blog/NewsletterSignup';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Calendar, ArrowLeft, MapPin, Sparkles, ExternalLink, Compass } from 'lucide-react';
import Link from 'next/link';

export default async function BlogDetailPage({ params }: { params: Promise<{ locale: string, slug: string }> }) {
    const { locale, slug } = await params;
    const supabase = await createClient();

    const { data: blog, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    if (error || !blog) {
        notFound();
    }

    const date = new Date(blog.published_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    let structuredContent = null;
    try {
        const parsed = JSON.parse(blog.content);
        if (parsed.is_structured_json) {
            structuredContent = parsed;
        }
    } catch (e) {
        // Raw markdown
    }

    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-200 font-body pb-24 relative overflow-x-clip">
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
                {/* Header Section */}
                <header className="text-center max-w-3xl mx-auto mb-12 space-y-4">
                    <div className="flex items-center justify-center gap-3 text-xs font-mono text-slate-400 uppercase tracking-wider">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-300">{blog.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5 text-slate-400"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {date}</span>
                    </div>

                    <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal text-gradient-platinum leading-tight tracking-tight">
                        {blog.title}
                    </h1>

                    <p className="text-sm md:text-base text-slate-400 font-light leading-relaxed max-w-2xl mx-auto">
                        {blog.excerpt}
                    </p>
                </header>

                {/* Hero Image */}
                {blog.image_url && (
                    <div className="w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden mb-12 md:mb-16 border border-white/[0.07] bg-slate-900">
                        <img 
                            src={blog.image_url} 
                            alt={blog.title} 
                            className="w-full h-full object-cover opacity-85"
                        />
                    </div>
                )}

                {/* Content Section */}
                <div className="max-w-3xl mx-auto space-y-12">
                    {structuredContent ? (
                        <div className="space-y-12 md:space-y-16">
                            
                            {/* Introduction */}
                            <section className="text-slate-300 text-sm md:text-base leading-relaxed font-light card-3d-minimal rounded-2xl p-6 sm:p-8">
                                <p>{structuredContent.introduction}</p>
                            </section>

                            {/* Places Section */}
                            <section className="space-y-6">
                                <h2 className="font-serif text-2xl md:text-3xl font-normal text-slate-200">Destinations & Locales</h2>
                                
                                <div className="space-y-6">
                                    {structuredContent.places?.map((place: any, i: number) => (
                                        <div key={i} className="flex flex-col md:flex-row gap-6 card-3d-minimal rounded-2xl p-6 overflow-hidden">
                                            <div className="md:w-2/5 shrink-0 aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.06] bg-slate-900">
                                                <img src={place.image_url} alt={place.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex flex-col justify-center gap-3">
                                                <h3 className="font-serif text-xl font-normal text-slate-200 flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" /> {place.name}
                                                </h3>
                                                <p className="text-slate-300 text-xs font-light leading-relaxed">
                                                    {place.description}
                                                </p>
                                                {place.map_link && (
                                                    <a 
                                                        href={place.map_link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="inline-flex items-center w-fit gap-1.5 text-xs font-mono text-slate-300 hover:text-white transition-colors mt-1"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" /> View on Map
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Itinerary */}
                            {structuredContent.itinerary && (
                                <section className="space-y-4 card-3d-minimal rounded-2xl p-6 sm:p-8">
                                    <h2 className="font-serif text-2xl font-normal text-slate-200 border-b border-white/[0.07] pb-3">Suggested Itinerary</h2>
                                    <div className="text-slate-300 text-xs sm:text-sm font-light leading-relaxed space-y-3">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{structuredContent.itinerary}</ReactMarkdown>
                                    </div>
                                </section>
                            )}

                            {/* Budget & Weather Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {structuredContent.budget && (
                                    <section className="card-3d-minimal rounded-2xl p-6 space-y-2">
                                        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Budget Projection</h3>
                                        <p className="text-slate-300 text-xs font-light leading-relaxed">{structuredContent.budget}</p>
                                    </section>
                                )}

                                {structuredContent.weather && (
                                    <section className="card-3d-minimal rounded-2xl p-6 space-y-2">
                                        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Climate Season</h3>
                                        <p className="text-slate-300 text-xs font-light leading-relaxed">{structuredContent.weather}</p>
                                    </section>
                                )}
                            </div>

                            {/* Food Section */}
                            {structuredContent.food && (
                                <section className="card-3d-minimal rounded-2xl overflow-hidden flex flex-col md:flex-row">
                                    <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center space-y-3">
                                        <h2 className="font-serif text-2xl font-normal text-slate-200">Local Gastronomy</h2>
                                        <p className="text-slate-300 text-xs font-light leading-relaxed">{structuredContent.food}</p>
                                    </div>
                                    {structuredContent.food_image_url && (
                                        <div className="md:w-1/2 aspect-square md:aspect-auto border-l border-white/[0.06] bg-slate-900">
                                            <img src={structuredContent.food_image_url} alt="Local Food" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Tips Callout */}
                            {structuredContent.tips && structuredContent.tips.length > 0 && (
                                <section className="card-3d-minimal rounded-2xl p-6 sm:p-8 space-y-5">
                                    <h2 className="font-serif text-2xl font-normal text-slate-200 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-slate-400" /> Essential Dispatches
                                    </h2>
                                    <ul className="space-y-4">
                                        {structuredContent.tips.map((tip: string, i: number) => (
                                            <li key={i} className="flex gap-4 items-start">
                                                <span className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-white/[0.05] border border-white/10 text-slate-300 font-mono text-[11px] mt-0.5">
                                                    {i + 1}
                                                </span>
                                                <span className="text-slate-300 font-light text-xs sm:text-sm leading-relaxed">{tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                        </div>
                    ) : (
                        <div className="card-3d-minimal rounded-2xl p-6 sm:p-8 text-slate-300 text-xs sm:text-sm leading-relaxed font-light space-y-4">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {blog.content}
                            </ReactMarkdown>
                        </div>
                    )}

                    {/* Author / Source */}
                    <div className="pt-8 border-t border-white/[0.07] flex flex-col sm:flex-row gap-4 items-center justify-between text-center sm:text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl card-3d-minimal flex items-center justify-center text-slate-300 font-mono text-xs">iW</div>
                            <div>
                                <h4 className="font-serif text-sm font-normal text-slate-200">iWillTravel Intelligence</h4>
                                <p className="text-slate-400 text-xs font-light">Autonomous Travel Dossier</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 font-mono max-w-xs">
                            Verified by the iWillTravel multi-agent collective.
                        </p>
                    </div>
                </div>
            </article>

            {/* Newsletter Section */}
            <div className="max-w-4xl mx-auto mt-20 px-4 sm:px-6 relative z-10">
                <div className="card-3d-minimal rounded-3xl overflow-hidden p-6 sm:p-10">
                    <NewsletterSignup />
                </div>
            </div>
        </div>
    );
}
