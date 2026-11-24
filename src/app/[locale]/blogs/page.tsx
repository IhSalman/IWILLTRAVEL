import { createClient } from '@/utils/supabase/server';
import { BlogsClient } from '@/components/blog/BlogsClient';
import NewsletterSignup from '@/components/blog/NewsletterSignup';
import { Compass } from 'lucide-react';

export default async function BlogsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const supabase = await createClient();

    const { data: blogs } = await supabase
        .from('blogs')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

    return (
        <div className="min-h-screen bg-[#0b0c0f] text-slate-200 pt-28 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-x-clip font-body">
            {/* Ambient Lighting */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[380px] bg-gradient-to-b from-sky-500/[0.05] via-indigo-500/[0.02] to-transparent blur-3xl pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Hero Section */}
                <header className="text-center space-y-4 mb-14">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-glass-pill text-[11px] font-mono uppercase tracking-wider text-slate-300">
                        <Compass className="w-3.5 h-3.5 text-sky-300" /> Editorial Journal
                    </div>
                    <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white tracking-tight">
                        Global Explorations
                    </h1>
                    <p className="text-base text-slate-300/80 max-w-2xl mx-auto leading-relaxed">
                        In-depth cultural guides, overland rail corridors, and seasonal dossiers curated for thoughtful travelers.
                    </p>
                </header>

                <BlogsClient blogs={(blogs as any[]) || []} locale={locale} />

                {/* Newsletter Section */}
                <div className="mt-16">
                    <div className="apple-glass-card rounded-3xl overflow-hidden p-6 sm:p-12">
                        <NewsletterSignup />
                    </div>
                </div>
            </div>
        </div>
    );
}
