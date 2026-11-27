import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/utils/site-url';

export default function robots(): MetadataRoute.Robots {
    const base = getSiteUrl();
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/api/place-photo'], // guide images are served via the photo proxy
            disallow: [
                '/api/',
                '/*/dashboard',
                '/*/admin',
                '/*/itineraries/', // private, per-user trips
                '/*/login',
                '/*/signup',
                '/*/onboarding',
            ],
        },
        sitemap: `${base}/sitemap.xml`,
        host: base,
    };
}
