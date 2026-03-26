import { createClient } from '@/utils/supabase/server';
import { BlogCard } from '@/components/blog/BlogCard';
import NewsletterSignup from '@/components/blog/NewsletterSignup';
import { Compass, Sparkles, Filter } from 'lucide-react';

export default async function BlogsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const supabase = await createClient();

    const { data: blogs, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pt-32 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
            
            <div className="max-w-7xl mx-auto relative z-10">
                {/* Hero Section */}
                <header className="text-center space-y-6 mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold tracking-widest uppercase">
                        <Compass className="w-5 h-5 text-blue-500" /> Intelligence Archive
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900">
                        Global Explorations
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
                        In-depth AI-curated analysis of cities, countries, and the most magnificent wonders of our world.
                    </p>
                </header>

                {/* Filter / Search Bar (Placeholder UI) */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-12 pb-6 border-b border-slate-200">
                    <div className="flex items-center gap-6">
                        {['all', 'country', 'city', 'wonder'].map((cat) => (
                            <button 
                                key={cat}
                                className="text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-widest">
                        <Filter className="w-4 h-4" /> Sorting by: Newest
                    </div>
                </div>

                {/* Blog Grid */}
                {blogs && blogs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-24">
                        {blogs.map((blog) => (
                            <BlogCard key={blog.id} blog={blog} locale={locale} />
                        ))}
                    </div>
                ) : (
                    <div className="py-32 bg-white rounded-[2rem] border border-slate-200 shadow-sm text-center space-y-6">
                        <Sparkles className="w-16 h-16 text-slate-300 mx-auto" />
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Archive Initializing...</h2>
                        <p className="text-slate-500 text-lg max-w-sm mx-auto">
                            The Blog agents are currently processing new reports. Check back soon.
                        </p>
                    </div>
                )}

                {/* Newsletter Section */}
                <div className="mt-32">
                    <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden p-8 md:p-16">
                        <NewsletterSignup />
                    </div>
                </div>
            </div>
        </div>
    );
}
