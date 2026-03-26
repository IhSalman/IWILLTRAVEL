const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'plus.unsplash.com',
            }
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
                    { key: 'Permissions-Policy', value: 'camera=(), geolocation=()' },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "font-src 'self' https://fonts.gstatic.com",
                            // Allow self, data URIs, blobs, and all HTTPS image sources (avatars, noise textures, maps, etc.)
                            "img-src 'self' data: blob: https:",
                            "media-src 'self' blob:",
                            // ws/wss needed for Next.js HMR in dev; include all known external API origins
                            "connect-src 'self' ws: wss: https://*.supabase.co https://generativelanguage.googleapis.com https://api.elevenlabs.io https://api.amadeus.com https://maps.googleapis.com https://maps.gstatic.com https://api.mapbox.com https://api.resend.com https://places.googleapis.com https://tpu.googleapis.com",
                            "frame-ancestors 'none'",
                        ].join('; '),
                    },
                ],
            },
        ];
    },
};

module.exports = withNextIntl(nextConfig);
