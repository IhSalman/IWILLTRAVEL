/** SEO helpers: absolute URLs, canonicals and JSON-LD builders. */
import { getSiteUrl } from '@/utils/site-url';

export const SITE_NAME = 'iWillTravel';

export function absoluteUrl(path = '/'): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Guides are written in English, so every locale canonicalises to the /en URL. */
export function guideCanonical(slug: string): string {
    return `/en/blogs/${slug}`;
}

/** Turn a relative image (e.g. /api/place-photo?…) into an absolute URL for OG/JSON-LD. */
export function absoluteImage(src?: string | null): string | undefined {
    if (!src) return undefined;
    return absoluteUrl(src);
}

export function organizationJsonLd() {
    return {
        '@type': 'Organization',
        name: SITE_NAME,
        url: getSiteUrl(),
    };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: it.name,
            item: absoluteUrl(it.path),
        })),
    };
}

/** Safely embed JSON-LD (prevents `</script>` injection from content). */
export function jsonLdScript(data: unknown): string {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}
