import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import NewsletterSignup from '@/components/blog/NewsletterSignup';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Calendar, ArrowLeft, MapPin, Sparkles, ExternalLink } from 'lucide-react';
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

    // Check if content is structured JSON
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
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
            
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
                
                {/* Header Section */}
                <header className="text-center max-w-3xl mx-auto mb-12 space-y-6">
                    <div className="flex items-center justify-center gap-4 text-sm font-bold text-blue-600 uppercase tracking-widest">
                        <span>{blog.category}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1.5 text-slate-500"><Calendar className="w-4 h-4" /> {date}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
                        {blog.title}
                    </h1>

                    <p className="text-lg md:text-2xl text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto italic">
                        {blog.excerpt}
                    </p>
                </header>

                {/* Hero Image */}
                {blog.image_url && (
                    <div className="w-full aspect-[16/9] md:aspect-[21/9] rounded-[2rem] overflow-hidden mb-16 md:mb-24 shadow-lg border border-slate-200">
                        <img 
                            src={blog.image_url} 
                            alt={blog.title} 
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Content Section */}
                <div className="max-w-3xl mx-auto">
                    {structuredContent ? (
                        <div className="space-y-16 md:space-y-24">
                            
                            {/* Introduction */}
                            <section className="prose prose-lg md:prose-2xl prose-slate max-w-none text-slate-700 leading-relaxed font-serif">
                                <p>{structuredContent.introduction}</p>
                            </section>

                            <hr className="border-slate-200" />

                            {/* Places Section */}
                            <section className="space-y-10">
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Destinations to Explore</h2>
                                
                                <div className="space-y-8">
                                    {structuredContent.places?.map((place: any, i: number) => (
                                        <div key={i} className="flex flex-col md:flex-row gap-6 md:gap-8 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="md:w-2/5 shrink-0 aspect-[4/3] overflow-hidden rounded-2xl">
                                                <img src={place.image_url} alt={place.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex flex-col justify-center gap-4">
                                                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                                    <MapPin className="w-6 h-6 text-blue-500 shrink-0" /> {place.name}
                                                </h3>
                                                <p className="text-slate-600 text-lg leading-relaxed font-serif">
                                                    {place.description}
                                                </p>
                                                <a 
                                                    href={place.map_link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center w-fit gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest mt-2"
                                                >
                                                    <ExternalLink className="w-4 h-4" /> Open in Google Maps
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Itinerary */}
                            <section className="space-y-8">
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Suggested Itinerary</h2>
                                <div className="prose prose-lg md:prose-xl prose-slate max-w-none text-slate-700 leading-relaxed font-serif prose-headings:font-bold prose-headings:text-slate-900">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{structuredContent.itinerary || ''}</ReactMarkdown>
                                </div>
                            </section>

                            {/* Budget & Weather Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Budget Box - Light Blue highlight */}
                                <section className="bg-blue-50 border-l-8 border-blue-500 rounded-r-2xl p-8">
                                    <h3 className="text-xl font-black text-blue-900 uppercase tracking-widest mb-4">Budget Guide</h3>
                                    <p className="text-slate-700 text-lg leading-relaxed">{structuredContent.budget}</p>
                                </section>

                                {/* Weather Box - Amber highlight */}
                                <section className="bg-amber-50 border-l-8 border-amber-500 rounded-r-2xl p-8">
                                    <h3 className="text-xl font-black text-amber-900 uppercase tracking-widest mb-4">Best Time to Visit</h3>
                                    <p className="text-slate-700 text-lg leading-relaxed">{structuredContent.weather}</p>
                                </section>
                            </div>

                            {/* Food Section */}
                            <section className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm flex flex-col md:flex-row">
                                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center space-y-6">
                                    <h2 className="text-3xl md:text-4xl font-black text-slate-900">Local Flavors</h2>
                                    <p className="text-slate-600 leading-relaxed text-lg md:text-xl font-serif">{structuredContent.food}</p>
                                </div>
                                <div className="md:w-1/2 aspect-square md:aspect-auto">
                                    <img src={structuredContent.food_image_url} alt="Local Food" className="w-full h-full object-cover" />
                                </div>
                            </section>

                            {/* Tips Callout */}
                            <section className="bg-emerald-50 border border-emerald-200 p-8 md:p-12 rounded-[2rem]">
                                <h2 className="text-2xl md:text-3xl font-black text-emerald-900 mb-8 flex items-center gap-3">
                                    <Sparkles className="w-8 h-8 text-emerald-600" /> Essential Travel Tips
                                </h2>
                                <ul className="space-y-6">
                                    {structuredContent.tips?.map((tip: string, i: number) => (
                                        <li key={i} className="flex gap-6 items-start">
                                            <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-emerald-200 text-emerald-900 font-bold text-sm mt-1">
                                                {i + 1}
                                            </span>
                                            <span className="text-emerald-900/80 leading-relaxed text-lg md:text-xl font-serif">{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                        </div>
                    ) : (
                        <div className="prose prose-lg md:prose-xl prose-slate max-w-none text-slate-700 leading-relaxed font-serif
                            prose-headings:font-black prose-headings:text-slate-900 prose-headings:tracking-tight
                            prose-a:text-blue-600 hover:prose-a:text-blue-800
                            prose-img:rounded-[2rem] prose-img:shadow-md
                        ">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {blog.content}
                            </ReactMarkdown>
                        </div>
                    )}

                    {/* Author / Disclaimer */}
                    <div className="mt-20 pt-10 border-t border-slate-200 flex flex-col sm:flex-row gap-6 items-center justify-between text-center sm:text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-lg">iW</div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-lg">iWillTravel Intelligence</h4>
                                <p className="text-slate-500">AI-curated travel reports.</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 max-w-xs italic">
                            This report was dynamically generated to bring you the best and most accurate travel insights.
                        </p>
                    </div>
                </div>
            </article>

            {/* Newsletter Section */}
            <div className="max-w-4xl mx-auto mt-24 px-4 md:px-8">
                <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden p-8 md:p-16">
                    <NewsletterSignup />
                </div>
            </div>
        </div>
    );
}
