/**
 * IndexNow: tell Bing, Yandex, Seznam etc. about new/updated URLs immediately.
 * (Google uses the sitemap + Search Console instead.)
 * Enabled only when INDEXNOW_KEY is set; the key is served at /indexnow-key.txt.
 */
import { getSiteUrl } from '@/utils/site-url';

export async function pingIndexNow(urls: string[]): Promise<boolean> {
    const key = process.env.INDEXNOW_KEY;
    if (!key || !urls.length) return false;
    const site = new URL(getSiteUrl());
    const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
            host: site.host,
            key,
            keyLocation: `${site.origin}/indexnow-key.txt`,
            urlList: urls,
        }),
        signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 202;
}
