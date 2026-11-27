/** Absolute base URL of the site (no trailing slash), for links in emails, Stripe and Telegram. */
export function getSiteUrl(): string {
    return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/$/, '');
}
