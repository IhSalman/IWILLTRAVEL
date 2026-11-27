'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { BlogCard, type BlogItem } from '@/components/blog/BlogCard';

const LENGTHS = [
    { id: 'all', label: 'Any length' },
    { id: '2', label: 'Weekend' },
    { id: '3', label: '3 days' },
    { id: '5', label: '5 days' },
    { id: '7', label: 'A week' },
];

export function BlogsClient({ blogs }: { blogs: BlogItem[] }) {
    const [length, setLength] = useState('all');
    const [destination, setDestination] = useState('all');
    const [query, setQuery] = useState('');

    const destinations = useMemo(() => {
        const set = new Map<string, number>();
        for (const b of blogs) {
            const city = b.metadata?.destination?.split(',')[0];
            if (city) set.set(city, (set.get(city) || 0) + 1);
        }
        return Array.from(set.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([c]) => c)
            .slice(0, 12);
    }, [blogs]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return blogs.filter((b) => {
            const days = b.metadata?.days;
            const city = b.metadata?.destination?.split(',')[0];
            const okLength = length === 'all' || String(days) === length;
            const okDest = destination === 'all' || city === destination;
            const okQuery =
                !q ||
                b.title?.toLowerCase().includes(q) ||
                b.excerpt?.toLowerCase().includes(q) ||
                b.metadata?.destination?.toLowerCase().includes(q);
            return okLength && okDest && okQuery;
        });
    }, [blogs, length, destination, query]);

    const chip = (active: boolean) =>
        `rounded-full border px-3.5 py-1.5 text-xs transition-colors whitespace-nowrap ${
            active ? 'border-slate-100 bg-slate-100 text-background' : 'border-white/[0.1] text-slate-300 hover:border-white/25 hover:text-slate-100'
        }`;

    return (
        <div>
            <div className="mb-10 space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {LENGTHS.map((l) => (
                            <button key={l.id} type="button" onClick={() => setLength(l.id)} className={chip(length === l.id)}>
                                {l.label}
                            </button>
                        ))}
                    </div>
                    <label className="relative w-full md:w-72">
                        <span className="sr-only">Search guides</span>
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search a city or country"
                            className="h-11 w-full rounded-full border border-white/[0.1] bg-transparent pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunrise-300/60 focus:outline-none"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-100" aria-label="Clear search">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </label>
                </div>
                {destinations.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                        <button type="button" onClick={() => setDestination('all')} className={chip(destination === 'all')}>
                            All destinations
                        </button>
                        {destinations.map((d) => (
                            <button key={d} type="button" onClick={() => setDestination(d)} className={chip(destination === d)}>
                                {d}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((b, i) => (
                        <BlogCard key={b.id} blog={b} priority={i < 3} />
                    ))}
                </div>
            ) : (
                <div className="mx-auto max-w-md py-20 text-center">
                    <h2 className="font-heading text-3xl text-slate-100">
                        {blogs.length === 0 ? 'New guides are on the way' : 'No guides match that yet'}
                    </h2>
                    <p className="mt-3 text-sm text-slate-400">
                        {blogs.length === 0
                            ? 'A new verified itinerary guide is published every day.'
                            : 'Try another filter — or plan this trip yourself in under a minute.'}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        {(length !== 'all' || destination !== 'all' || query) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLength('all');
                                    setDestination('all');
                                    setQuery('');
                                }}
                                className="btn-apple-glass h-10 rounded-full px-5 text-sm"
                            >
                                Clear filters
                            </button>
                        )}
                        <Link href="/plan-trip" className="btn-apple-primary inline-flex h-10 items-center rounded-full px-5 text-sm">
                            Plan a trip
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
