'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight, MapPin, Globe, Sparkles } from 'lucide-react';

interface BlogCardProps {
    blog: {
        id: string;
        slug: string;
        title: string;
        excerpt: string;
        image_url?: string;
        category: 'country' | 'city' | 'wonder';
        published_at: string;
        author?: string;
    };
    locale: string;
}

const CategoryIcons = {
    country: <Globe className="w-3 h-3" />,
    city: <MapPin className="w-3 h-3" />,
    wonder: <Sparkles className="w-3 h-3" />,
};

const CategoryColors = {
    country: 'bg-blue-100 text-blue-800 border-blue-200',
    city: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    wonder: 'bg-purple-100 text-purple-800 border-purple-200',
};

export function BlogCard({ blog, locale }: BlogCardProps) {
    const date = new Date(blog.published_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <Link href={`/${locale}/blogs/${blog.slug}`} className="block h-full group">
            <div className="h-full flex flex-col bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                {/* Image Placeholder/Hero */}
                <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                    {blog.image_url ? (
                        <img 
                            src={blog.image_url} 
                            alt={blog.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                            <Sparkles className="w-12 h-12 text-slate-400" />
                        </div>
                    )}
                    <div className="absolute top-4 left-4">
                        <Badge className={`uppercase tracking-widest text-[10px] font-bold px-3 py-1 flex items-center gap-1.5 shadow-sm ${CategoryColors[blog.category] || 'bg-slate-100 text-slate-800'}`}>
                            {CategoryIcons[blog.category]} {blog.category}
                        </Badge>
                    </div>
                </div>

                <div className="p-8 flex flex-col flex-grow space-y-4">
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-slate-400" /> {date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-slate-400" /> 5 min read</span>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
                        {blog.title}
                    </h3>

                    <p className="text-base text-slate-600 line-clamp-3 font-serif leading-relaxed flex-grow">
                        {blog.excerpt}
                    </p>

                    <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">Read Article</span>
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
