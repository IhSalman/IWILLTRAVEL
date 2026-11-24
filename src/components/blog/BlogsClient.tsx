'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { BlogCard, type BlogItem } from '@/components/blog/BlogCard';
import { Search, Sparkles, X } from 'lucide-react';

const CATEGORIES = [
    { id: 'all', label: 'All Stories' },
    { id: 'city', label: 'Cities' },
    { id: 'country', label: 'Countries' },
    { id: 'wonder', label: 'Wonders' },
] as const;

export function BlogsClient({ blogs, locale }: { blogs: BlogItem[]; locale: string }) {
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [query, setQuery] = useState('');

    const filteredBlogs = useMemo(() => {
        return blogs.filter((b) => {
            const matchesCat = activeCategory === 'all' || b.category === activeCategory;
            const cleanQ = query.trim().toLowerCase();
            const matchesQuery =
                !cleanQ ||
                b.title?.toLowerCase().includes(cleanQ) ||
                b.excerpt?.toLowerCase().includes(cleanQ);
            return matchesCat && matchesQuery;
        });
    }, [blogs, activeCategory, query]);

    return (
        <div>
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-12">
                <div className="apple-liquid-glass p-1.5 rounded-full inline-flex items-center gap-1 self-start overflow-x-auto max-w-full">
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveCategory(cat.id)}
                                className={`relative px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                                    isActive ? 'text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="blogs-cat-pill"
                                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                        className="absolute inset-0 rounded-full bg-gradient-to-b from-white via-slate-100 to-slate-200 shadow-sm"
                                    />
                                )}
                                <span className="relative z-10">{cat.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search editorials..."
                        className="w-full h-11 pl-10 pr-9 rounded-full apple-liquid-glass text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-white/25"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Blog Grid */}
            {filteredBlogs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mb-20">
                    {filteredBlogs.map((blog) => (
                        <BlogCard key={blog.id} blog={blog} locale={locale} />
                    ))}
                </div>
            ) : (
                <div className="py-20 apple-glass-card rounded-3xl border-dashed text-center space-y-4 max-w-lg mx-auto mb-20 px-6">
                    <Sparkles className="w-8 h-8 text-sky-300 mx-auto" />
                    <h2 className="font-serif text-xl font-bold text-white">
                        {blogs.length === 0 ? 'Editorial Guides Updating' : 'No Matching Stories Found'}
                    </h2>
                    <p className="text-slate-300/80 text-xs max-w-sm mx-auto leading-relaxed">
                        {blogs.length === 0
                            ? 'Explore our 18+ interactive destination dossiers or generate a tailored itinerary while new long-form editorials publish.'
                            : 'Try clearing your filter or explore our interactive city guides on Discover.'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                        {(activeCategory !== 'all' || query) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveCategory('all');
                                    setQuery('');
                                }}
                                className="btn-apple-glass px-5 py-2 rounded-full text-xs font-medium"
                            >
                                Reset Filters
                            </button>
                        )}
                        <Link href="/discover" className="btn-apple-primary px-5 py-2 rounded-full text-xs font-semibold">
                            Explore Destination Guides →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
