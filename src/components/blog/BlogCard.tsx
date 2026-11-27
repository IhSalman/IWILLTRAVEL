import { Link } from '@/i18n/routing';
import { ArrowUpRight } from 'lucide-react';

export interface BlogItem {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    image_url?: string | null;
    category?: string;
    published_at: string;
    updated_at?: string | null;
    metadata?: { destination?: string; days?: number; kind?: string; grounding?: { stops?: number } } | null;
}

export function BlogCard({ blog, priority = false }: { blog: BlogItem; priority?: boolean }) {
    const city = blog.metadata?.destination?.split(',')[0];
    const days = blog.metadata?.days;
    const label = [days ? `${days} days` : null, city, blog.metadata?.kind === 'itinerary_guide' ? 'verified places' : null]
        .filter(Boolean)
        .join(' · ');

    return (
        <Link href={`/blogs/${blog.slug}` as any} className="group block">
            <article>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/[0.03]">
                    {blog.image_url && (
                        <img
                            src={blog.image_url}
                            alt={blog.title}
                            width={800}
                            height={600}
                            loading={priority ? 'eager' : 'lazy'}
                            decoding="async"
                            className="h-full w-full object-cover saturate-[0.8] transition-all duration-[1200ms] ease-out group-hover:scale-[1.04] group-hover:saturate-100"
                        />
                    )}
                    <span className="absolute right-3 top-3 flex h-9 w-9 -translate-y-1 items-center justify-center rounded-full bg-background/60 text-slate-100 opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <ArrowUpRight className="h-4 w-4" />
                    </span>
                </div>
                {label && <p className="mt-4 text-xs text-sunrise-300">{label}</p>}
                <h2 className="mt-1 font-heading text-2xl leading-tight text-slate-100 group-hover:text-sunrise-300 transition-colors">{blog.title}</h2>
                {blog.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{blog.excerpt}</p>}
            </article>
        </Link>
    );
}
