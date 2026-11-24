'use client';

import { Link } from '@/i18n/routing';
import { Calendar, Clock, ArrowRight, MapPin, Globe, Sparkles } from 'lucide-react';

export interface BlogItem {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    image_url?: string;
    category: 'country' | 'city' | 'wonder';
    published_at: string;
    author?: string;
}

interface BlogCardProps {
    blog: BlogItem;
    locale: string;
}

const CategoryIcons = {
    country: <Globe className="w-3 h-3 text-sky-300" />,
    city: <MapPin className="w-3 h-3 text-emerald-300" />,
    wonder: <Sparkles className="w-3 h-3 text-amber-300" />,
};

export function BlogCard({ blog, locale }: BlogCardProps) {
    const date = new Date(blog.published_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <Link href={`/blogs/${blog.slug}`} className="block h-full group">
            <div className="h-full flex flex-col apple-glass-card rounded-3xl overflow-hidden hover:border-white/25 transition-all">
                {/* Image / Thumbnail */}
                <div className="relative h-52 w-full overflow-hidden bg-slate-900 border-b border-white/[0.08]">
                    {blog.image_url ? (
                        <img
                            src={blog.image_url}
                            alt={blog.title}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-35">
                            <Sparkles className="w-8 h-8 text-slate-400" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute top-3.5 left-3.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider apple-liquid-glass text-white">
                            {CategoryIcons[blog.category] || CategoryIcons.city} {blog.category}
                        </span>
                    </div>
                </div>

                <div className="p-6 flex flex-col flex-grow space-y-3">
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" /> {date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> 5 min read
                        </span>
                    </div>

                    <h3 className="font-serif text-xl font-bold text-white group-hover:text-sky-100 transition-colors leading-snug line-clamp-2">
                        {blog.title}
                    </h3>

                    <p className="text-xs text-slate-300/80 line-clamp-3 leading-relaxed flex-grow">
                        {blog.excerpt}
                    </p>

                    <div className="pt-4 mt-2 border-t border-white/[0.08] flex items-center justify-between text-xs font-semibold text-white">
                        <span className="group-hover:text-sky-200 transition-colors">Read Guide</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
