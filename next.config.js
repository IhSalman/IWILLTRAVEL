const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development
});

const nextConfig = {
    reactStrictMode: true,
    serverExternalPackages: ['apify-client', 'amadeus', '@duffel/api', 'axios'],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'plus.unsplash.com',
            },
            { protocol: 'https', hostname: 'maps.googleapis.com' },
            { protocol: 'https', hostname: 'places.googleapis.com' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            { protocol: 'https', hostname: 'api.mapbox.com' },
        ]
    },
    // Allow LAN devices (mobile phones, other computers) to access the dev server
    allowedDevOrigins: ['192.168.0.101'],
    // Security headers applied to all responses
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    // Note: microphone is intentionally allowed — needed by the Translate page (Web Speech API)
                    {
                        key: 'Permissions-Policy',
                        // microphone=(self) is required for voice translation (Web Speech API)
                        value: 'camera=(), microphone=(self), geolocation=(self), browsing-topics=()',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://tp-em.com http://tp-em.com https://maps.googleapis.com https://maps.gstatic.com https://www.clarity.ms https://*.clarity.ms https://va.vercel-scripts.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://tp-em.com http://tp-em.com",
                            "font-src 'self' https://fonts.gstatic.com https://tp-em.com http://tp-em.com",
                            // Allow self, data URIs, blobs, and all HTTPS image sources (avatars, noise textures, maps, etc.)
                            "img-src 'self' data: blob: https:",
                            "media-src 'self' blob:",
                            // ws/wss needed for Next.js HMR in dev; include all known external API origins
                            "connect-src 'self' ws: wss: https://tp-em.com http://tp-em.com https://*.supabase.co https://generativelanguage.googleapis.com https://api.elevenlabs.io https://api.amadeus.com https://maps.googleapis.com https://maps.gstatic.com https://places.googleapis.com https://routes.googleapis.com https://aerialview.googleapis.com https://weather.googleapis.com https://airquality.googleapis.com https://api.mapbox.com https://api.resend.com https://tpu.googleapis.com https://*.clarity.ms https://c.bing.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
                            "frame-src https://www.google.com https://maps.google.com",
                            "frame-ancestors 'none'",
                        ].join('; '),
                    },
                ],
            },
        ];
    },
};

// Chain the plugins: Intl -> PWA -> Export
module.exports = withPWA(withNextIntl(nextConfig));
